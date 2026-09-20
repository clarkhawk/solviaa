import { clientRepository } from "@/modules/clients/repository";
import { invoiceRepository } from "@/modules/factures/repository";
import type { SearchResult } from "./types";

export class SearchService {
  async search(organizationId: string, query: string, limit: number): Promise<SearchResult> {
    const perType = Math.ceil(limit / 2);
    const [clients, invoices] = await Promise.all([
      clientRepository.search(organizationId, query, perType),
      invoiceRepository.search(organizationId, query, perType),
    ]);

    return {
      clients: clients.map((client) => ({
        type: "client" as const,
        id: client.id,
        name: client.identity.name,
        externalCode: client.externalCode,
        email: client.contact.email ?? null,
      })),
      invoices: invoices.map((invoice) => ({
        type: "invoice" as const,
        id: invoice.id,
        reference: invoice.reference,
        amountRemaining: invoice.amountRemaining,
        status: invoice.status,
        clientId: invoice.clientId,
      })),
    };
  }
}

export const searchService = new SearchService();
