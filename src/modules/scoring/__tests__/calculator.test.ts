import { describe, it, expect } from "vitest";
import { ScoringCalculatorService } from "../calculator.service";
import type { ScoringInput } from "../types";
import { DEFAULT_CRITERIA } from "../types";

describe("ScoringCalculatorService", () => {
  const calculator = new ScoringCalculatorService();

  const baseInput: ScoringInput = {
    clientId: "client-1",
    invoices: [
      {
        id: "inv-1",
        amount: 1000,
        amountPaid: 0,
        dueAt: new Date("2025-01-01"),
        status: "overdue",
      },
    ],
    paymentHistory: [],
  };

  it("computes a score between 0 and 100", () => {
    const result = calculator.compute(baseInput, { criteria: DEFAULT_CRITERIA, riskThreshold: 70 });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.isAtRisk).toBeDefined();
  });

  it("returns zero score when no criteria enabled", () => {
    const result = calculator.compute(baseInput, {
      criteria: DEFAULT_CRITERIA.map((c) => ({ ...c, enabled: false })),
      riskThreshold: 70,
    });
    expect(result.score).toBe(0);
  });

  it("scales monetary thresholds to the organization's currency", () => {
    // 1000 XOF de retard ≈ 1,50 € — négligeable, ne doit pas saturer le score
    // comme le ferait 1000 € (bug historique : seuils codés en dur en EUR).
    const xofInput: ScoringInput = { ...baseInput, currency: "XOF" };
    const eurInput: ScoringInput = { ...baseInput, currency: "EUR" };

    const xofResult = calculator.compute(xofInput, { criteria: DEFAULT_CRITERIA, riskThreshold: 70 });
    const eurResult = calculator.compute(eurInput, { criteria: DEFAULT_CRITERIA, riskThreshold: 70 });

    expect(xofResult.score).toBeLessThan(eurResult.score);
  });
});
