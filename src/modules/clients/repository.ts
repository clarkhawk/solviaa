import type { Client } from "@prisma/client";
import { prisma } from "@/shared/db/prisma";
import { decryptPii, encryptPii, hashEmail } from "@/shared/crypto/encryption";
import type { ClientContact, ClientDTO, ClientIdentity, CreateClientInput, UpdateClientInput } from "./types";

function toIdentity(encrypted: Uint8Array): ClientIdentity {
  return JSON.parse(decryptPii(encrypted)) as ClientIdentity;
}

function toContact(encrypted: Uint8Array): ClientContact {
  return JSON.parse(decryptPii(encrypted)) as ClientContact;
}

function toDTO(record: Client): ClientDTO {
  return {
    id: record.id,
    organizationId: record.organizationId,
    externalCode: record.externalCode,
    identity: toIdentity(record.identityEncrypted),
    contact: toContact(record.contactEncrypted),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class ClientRepository {
  async findById(organizationId: string, id: string): Promise<ClientDTO | null> {
    const record = await prisma.client.findFirst({
      where: { id, organizationId },
    });
    return record ? toDTO(record) : null;
  }

  async findByExternalCode(organizationId: string, externalCode: string): Promise<ClientDTO | null> {
    const record = await prisma.client.findUnique({
      where: { organizationId_externalCode: { organizationId, externalCode } },
    });
    return record ? toDTO(record) : null;
  }

  async findByEmailHash(organizationId: string, emailHash: string): Promise<ClientDTO | null> {
    const record = await prisma.client.findFirst({
      where: { organizationId, emailHash },
    });
    return record ? toDTO(record) : null;
  }

  async list(organizationId: string, page: number, limit: number): Promise<{ items: ClientDTO[]; total: number }> {
    const [records, total] = await Promise.all([
      prisma.client.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.client.count({ where: { organizationId } }),
    ]);
    return { items: records.map(toDTO), total };
  }

  async findAll(organizationId: string): Promise<ClientDTO[]> {
    const records = await prisma.client.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toDTO);
  }

  async search(organizationId: string, query: string, limit: number): Promise<ClientDTO[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const records = await prisma.client.findMany({ where: { organizationId } });
    return records
      .map(toDTO)
      .filter((client) => {
        const haystack = [
          client.identity.name,
          client.identity.companyName,
          client.contact.email,
          client.contact.phone,
          client.externalCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, limit);
  }

  async create(organizationId: string, input: CreateClientInput): Promise<ClientDTO> {
    const emailHash = input.contact.email ? hashEmail(input.contact.email) : null;
    const record = await prisma.client.create({
      data: {
        organizationId,
        externalCode: input.externalCode ?? null,
        identityEncrypted: encryptPii(JSON.stringify(input.identity)),
        contactEncrypted: encryptPii(JSON.stringify(input.contact)),
        emailHash,
      },
    });
    return toDTO(record);
  }

  async update(organizationId: string, id: string, input: UpdateClientInput): Promise<ClientDTO> {
    const existing = await prisma.client.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new Error("Client not found");
    }

    const identity = input.identity ?? toIdentity(existing.identityEncrypted);
    const contact = input.contact ?? toContact(existing.contactEncrypted);
    const emailHash = contact.email ? hashEmail(contact.email) : existing.emailHash;

    const record = await prisma.client.update({
      where: { id },
      data: {
        externalCode: input.externalCode !== undefined ? input.externalCode : existing.externalCode,
        identityEncrypted: input.identity ? encryptPii(JSON.stringify(identity)) : undefined,
        contactEncrypted: input.contact ? encryptPii(JSON.stringify(contact)) : undefined,
        emailHash,
      },
    });
    return toDTO(record);
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await prisma.client.deleteMany({ where: { id, organizationId } });
  }
}

export const clientRepository = new ClientRepository();
