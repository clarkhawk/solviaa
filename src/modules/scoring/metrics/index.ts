import type { MetricType, ScoringInput } from "../types";
import { CURRENCY_SCALE, type SupportedCurrency } from "@/shared/currencies";

export type MetricCalculator = (input: ScoringInput) => number;

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Ordre de grandeur "1 EUR ≈ N unités" pour la devise de l'input, 1 par défaut. */
function currencyScale(input: ScoringInput): number {
  return CURRENCY_SCALE[input.currency as SupportedCurrency] ?? 1;
}

export const METRIC_CALCULATORS: Record<MetricType, MetricCalculator> = {
  montant_en_retard: (input) => {
    return input.invoices
      .filter((i) => ["overdue", "partially_paid"].includes(i.status))
      .reduce((sum, i) => sum + Math.max(0, i.amount - i.amountPaid), 0);
  },

  anciennete_retard: (input) => {
    const now = today().getTime();
    const overdue = input.invoices.filter((i) => i.status === "overdue" || i.status === "partially_paid");
    if (overdue.length === 0) return 0;
    const maxDays = Math.max(
      ...overdue.map((i) => Math.max(0, Math.floor((now - new Date(i.dueAt).getTime()) / 86400000))),
    );
    return maxDays;
  },

  taux_retard_historique: (input) => {
    if (input.invoices.length === 0) return 0;
    const overdueCount = input.invoices.filter((i) => i.status === "overdue" || i.status === "partially_paid").length;
    return overdueCount / input.invoices.length;
  },

  nombre_factures_impayees: (input) => {
    return input.invoices.filter((i) => !["paid", "cancelled"].includes(i.status)).length;
  },

  montant_total_exposition: (input) => {
    return input.invoices
      .filter((i) => !["paid", "cancelled"].includes(i.status))
      .reduce((sum, i) => sum + Math.max(0, i.amount - i.amountPaid), 0);
  },
};

export const METRIC_NORMALIZERS: Record<MetricType, (raw: number, input: ScoringInput) => number> = {
  // Seuils historiquement calibrés en EUR (10 000 € de retard / 20 000 € d'exposition
  // = risque maximal). Mis à l'échelle par la devise de l'organisation pour que le
  // scoring reste pertinent en XOF, NGN, etc. — sans quoi ces seuils étaient atteints
  // dès les premières petites factures pour toute organisation hors zone euro.
  montant_en_retard: (raw, input) => Math.min(100, (raw / (10000 * currencyScale(input))) * 100),
  anciennete_retard: (raw) => Math.min(100, (raw / 90) * 100),
  taux_retard_historique: (raw) => raw * 100,
  nombre_factures_impayees: (raw) => Math.min(100, (raw / 10) * 100),
  montant_total_exposition: (raw, input) => Math.min(100, (raw / (20000 * currencyScale(input))) * 100),
};
