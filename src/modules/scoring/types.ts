export type MetricType =
  | "montant_en_retard"
  | "anciennete_retard"
  | "taux_retard_historique"
  | "nombre_factures_impayees"
  | "montant_total_exposition";

export interface ScoringCriterion {
  name: string;
  metricType: MetricType;
  weight: number;
  enabled: boolean;
}

export interface ScoringConfigDTO {
  id: string;
  organizationId: string;
  criteria: ScoringCriterion[];
  riskThreshold: number;
}

export interface InvoiceSnapshot {
  id: string;
  amount: number;
  amountPaid: number;
  dueAt: Date;
  status: string;
}

export interface PaymentSnapshot {
  id: string;
  amount: number;
  paidAt: Date;
}

export interface ScoringInput {
  clientId: string;
  invoices: InvoiceSnapshot[];
  paymentHistory: PaymentSnapshot[];
  /**
   * Devise de facturation de l'organisation (ex. "XOF", "EUR"). Optionnelle
   * pour rester compatible avec les appels/tests existants ; en son absence,
   * les seuils de scoring supposent l'EUR (comportement historique).
   */
  currency?: string;
}

export interface ScoringResult {
  score: number;
  breakdown: Record<string, number>;
  isAtRisk: boolean;
}

export interface ClientScoringEntry {
  clientId: string;
  clientName: string;
  result: ScoringResult;
}

export interface ClientScoringListDTO {
  riskThreshold: number;
  items: ClientScoringEntry[];
}

export const DEFAULT_CRITERIA: ScoringCriterion[] = [
  { name: "Montant en retard", metricType: "montant_en_retard", weight: 0.5, enabled: true },
  { name: "Ancienneté du retard", metricType: "anciennete_retard", weight: 0.3, enabled: true },
  { name: "Historique de retards", metricType: "taux_retard_historique", weight: 0.2, enabled: true },
];
