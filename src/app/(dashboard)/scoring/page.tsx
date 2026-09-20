"use client";

import { useEffect, useState } from "react";
import type { ScoringCriterion } from "@/modules/scoring/types";

interface ScoringConfig {
  criteria: ScoringCriterion[];
  riskThreshold: number;
}

interface ApiError {
  error: string;
  code?: string;
}

export default function ScoringPage() {
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/v1/scoring")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) {
          // L'API renvoie { error, code, requestId } sur 401/403/500 — jamais
          // { criteria, riskThreshold }. Sans cette vérification, ce corps
          // d'erreur finissait dans setConfig() et faisait planter le rendu
          // plus bas sur `config.criteria.filter(...)`.
          throw new Error((body as ApiError).error ?? "Impossible de charger la configuration.");
        }
        setConfig(body as ScoringConfig);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Erreur inconnue."));
  }, []);

  async function handleSave() {
    if (!config || totalWeight !== 1) return;
    const response = await fetch("/api/v1/scoring", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiError | null;
      setLoadError(body?.error ?? "Échec de l'enregistrement.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-xs text-[#B91C1C]">
        {loadError}
      </div>
    );
  }

  if (!config) {
    return <div className="text-sm text-[#64748B]">Chargement…</div>;
  }

  // Calculate total weight to show if it equals 1
  const totalWeight = config.criteria
    .filter(c => c.enabled)
    .reduce((sum, c) => sum + c.weight, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Configuration du scoring de risque IA</h1>
        <p className="text-xs text-[#64748B]">Définissez les critères qui composent votre score client (0–100)</p>
      </div>

      <div className="space-y-4">
        {config.criteria.map((c, i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition-colors hover:border-[#CBD5E1]">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1 block">Critère (Nom)</label>
              <input
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                value={c.name}
                onChange={(e) => {
                  const criteria = [...config.criteria];
                  criteria[i] = { ...c, name: e.target.value };
                  setConfig({ ...config, criteria });
                }}
              />
            </div>

            <div className="flex-1">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1 block">Type de métrique</label>
              <select
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                value={c.metricType}
                onChange={(e) => {
                  const criteria = [...config.criteria];
                  criteria[i] = { ...c, metricType: e.target.value as ScoringCriterion["metricType"] };
                  setConfig({ ...config, criteria });
                }}
              >
                <option value="montant_en_retard">Montant en retard</option>
                <option value="anciennete_retard">Ancienneté retard</option>
                <option value="taux_retard_historique">Taux retard historique</option>
                <option value="nombre_factures_impayees">Nb factures impayées</option>
                <option value="montant_total_exposition">Exposition totale</option>
              </select>
            </div>

            <div className="w-32">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1 flex justify-between">
                Poids <span>{Math.round(c.weight * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="w-full accent-[#4F46E5]"
                value={c.weight}
                onChange={(e) => {
                  const criteria = [...config.criteria];
                  criteria[i] = { ...c, weight: parseFloat(e.target.value) };
                  setConfig({ ...config, criteria });
                }}
              />
            </div>

            <div className="flex items-center justify-center pt-4 pl-4 border-l border-[#E2E8F0]">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={c.enabled}
                  onChange={(e) => {
                    const criteria = [...config.criteria];
                    criteria[i] = { ...c, enabled: e.target.checked };
                    setConfig({ ...config, criteria });
                  }}
                />
                <div className="w-9 h-5 bg-[#E2E8F0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E2E8F0] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4F46E5]"></div>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs font-semibold">
        <span className={totalWeight === 1 ? "text-[#10B981]" : "text-[#EF4444]"}>
          Total Poids Actif : {Math.round(totalWeight * 100)}% {totalWeight !== 1 && "(Doit être égal à 100%)"}
        </span>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 max-w-md">
            <h3 className="text-sm font-bold text-[#0F172A] mb-2">Seuil de risque (Critique)</h3>
            <p className="text-xs text-[#64748B] mb-4">
              Définit le score à partir duquel un client est considéré comme un risque majeur.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                className="w-full accent-[#EF4444]"
                value={config.riskThreshold}
                onChange={(e) => setConfig({ ...config, riskThreshold: parseInt(e.target.value) })}
              />
              <span className="rounded-xl bg-white border border-[#E2E8F0] px-3 py-1 font-bold text-[#EF4444] min-w-[60px] text-center shadow-sm">
                {config.riskThreshold}
              </span>
            </div>

            <div className="flex justify-between mt-2 text-[10px] text-[#94A3B8] px-1">
              <span>0 (Excellent)</span>
              <span>100 (Critique)</span>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSave}
              disabled={totalWeight !== 1}
              title={totalWeight !== 1 ? "Le total des poids actifs doit être égal à 100 %" : undefined}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#4F46E5]"
            >
              {saved ? "Enregistré ✓" : "Enregistrer la configuration"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
