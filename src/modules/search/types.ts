export interface SearchClientHit {
  type: "client";
  id: string;
  name: string;
  externalCode: string | null;
  email: string | null;
}

export interface SearchInvoiceHit {
  type: "invoice";
  id: string;
  reference: string;
  amountRemaining: number;
  status: string;
  clientId: string;
}

export interface SearchResult {
  clients: SearchClientHit[];
  invoices: SearchInvoiceHit[];
}
