import type { Invoice, InvoiceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/shared/db/prisma";
import { decimalToNumber } from "./status";
import type { CreateInvoiceInput, InvoiceDTO, InvoiceFilters, UpdateInvoiceInput } from "./types";

function toDTO(record: Invoice): InvoiceDTO {
  const amount = decimalToNumber(record.amount);
  const amountPaid = decimalToNumber(record.amountPaid);
  return {
    id: record.id,
    organizationId: record.organizationId,
    clientId: record.clientId,
    reference: record.reference,
    amount,
    amountPaid,
    amountRemaining: Math.max(0, amount - amountPaid),
    issuedAt: record.issuedAt,
    dueAt: record.dueAt,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class InvoiceRepository {
  async findById(organizationId: string, id: string): Promise<InvoiceDTO | null> {
    const record = await prisma.invoice.findFirst({ where: { id, organizationId } });
    return record ? toDTO(record) : null;
  }

  async list(
    organizationId: string,
    page: number,
    limit: number,
    filters?: InvoiceFilters,
  ): Promise<{ items: InvoiceDTO[]; total: number }> {
    const where: Prisma.InvoiceWhereInput = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.dueBefore) where.dueAt = { ...((where.dueAt as object) ?? {}), lte: filters.dueBefore };
    if (filters?.dueAfter) where.dueAt = { ...((where.dueAt as object) ?? {}), gte: filters.dueAfter };

    const [records, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { dueAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { items: records.map(toDTO), total };
  }

  async search(organizationId: string, query: string, limit: number): Promise<InvoiceDTO[]> {
    const q = query.trim();
    if (!q) return [];

    const normalizedAmount = q.replace(/\s/g, "").replace(",", ".");
    const numericValue = Number(normalizedAmount);
    const or: Prisma.InvoiceWhereInput[] = [{ reference: { contains: q, mode: "insensitive" } }];
    if (!Number.isNaN(numericValue) && numericValue > 0) {
      or.push({ amount: numericValue });
    }

    const records = await prisma.invoice.findMany({
      where: { organizationId, OR: or },
      orderBy: { dueAt: "desc" },
      take: limit * 2,
    });

    const items = records.map(toDTO);
    if (Number.isNaN(numericValue) || numericValue <= 0) {
      return items.slice(0, limit);
    }

    const amountQuery = normalizedAmount;
    return items
      .filter(
        (invoice) =>
          invoice.reference.toLowerCase().includes(q.toLowerCase()) ||
          String(invoice.amount).includes(amountQuery) ||
          String(invoice.amountRemaining).includes(amountQuery),
      )
      .slice(0, limit);
  }

  async findOpenByClient(organizationId: string, clientId: string): Promise<InvoiceDTO[]> {
    const records = await prisma.invoice.findMany({
      where: {
        organizationId,
        clientId,
        status: { in: ["upcoming", "overdue", "partially_paid"] },
      },
      orderBy: { dueAt: "asc" },
    });
    return records.map(toDTO);
  }

  async create(organizationId: string, input: CreateInvoiceInput, status: InvoiceStatus): Promise<InvoiceDTO> {
    const record = await prisma.invoice.create({
      data: {
        organizationId,
        clientId: input.clientId,
        reference: input.reference,
        amount: input.amount,
        issuedAt: input.issuedAt,
        dueAt: input.dueAt,
        status,
      },
    });
    return toDTO(record);
  }

  async update(organizationId: string, id: string, data: UpdateInvoiceInput & { amountPaid?: number; status?: InvoiceStatus }): Promise<InvoiceDTO> {
    const record = await prisma.invoice.update({
      where: { id },
      data: {
        reference: data.reference,
        amount: data.amount,
        issuedAt: data.issuedAt,
        dueAt: data.dueAt,
        amountPaid: data.amountPaid,
        status: data.status,
      },
    });
    return toDTO(record);
  }

  async updateAmountPaid(organizationId: string, id: string, amountPaid: number, status: InvoiceStatus): Promise<InvoiceDTO> {
    const record = await prisma.invoice.update({
      where: { id },
      data: { amountPaid, status },
    });
    return toDTO(record);
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await prisma.invoice.deleteMany({ where: { id, organizationId } });
  }

  async findDueForAlerts(organizationId: string, today: Date): Promise<InvoiceDTO[]> {
    const in7 = new Date(today);
    in7.setDate(in7.getDate() + 7);

    const records = await prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ["upcoming", "overdue", "partially_paid"] },
        dueAt: { lte: in7 },
      },
    });
    return records.map(toDTO);
  }
}

export const invoiceRepository = new InvoiceRepository();
