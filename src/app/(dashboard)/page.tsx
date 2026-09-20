"use client";

/**
 * @file page.tsx
 * @description Tableau de bord principal Solvia SaaS, conçu d'après la Maquette 1 (Finnova / Finly).
 * Affiche les indicateurs clés de recouvrement (KPIs), un panneau de contraste sombre pour les
 * impayés prioritaires, les prochaines échéances et la surveillance des clients à risque.
 *
 * Directives de design : zéro emoji, zéro dégradé parasite, couleurs de la palette Maquette 1,
 * typographie soignée et responsive.
 *
 * @module app/(dashboard)/page
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DashboardAnalytics } from "@/components/dashboard/analytics-section";
import { PresentationModeToggle } from "@/components/dashboard/presentation-mode";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingDown,
  UploadCloud,
  FileText,
  ArrowRight,
  Send,
  ShieldAlert,
  Loader2,
  Calendar,
  Search,
} from "lucide-react";

/**
 * Structure des données consolidées du tableau de bord.
 */
interface DashboardData {
  currency: string;
  counts: {
    upcoming: number;
    overdue: number;
    paid: number;
    partiallyPaid: number;
  };
  amounts: {
    outstanding: number;
    overdue: number;
    collectedThisMonth: number;
    collectionRate: number;
  };
  distribution: Array<{
    status: string;
    amount: number;
    count: number;
  }>;
  priorityInvoices: Array<{
    id: string;
    reference: string;
    amount: number;
    amountRemaining: number;
    dueAt: string;
    status: string;
  }>;
}

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Structure d'un client évalué par l'algorithme de scoring.
 */
interface AtRiskClient {
  clientId: string;
  clientName: string;
  result: {
    score: number;
    isAtRisk: boolean;
  };
}

interface SearchClientHit {
  type: "client";
  id: string;
  name: string;
  externalCode: string | null;
  email: string | null;
}

interface SearchInvoiceHit {
  type: "invoice";
  id: string;
  reference: string;
  amountRemaining: number;
  status: string;
  clientId: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [atRisk, setAtRisk] = useState<AtRiskClient[]>([]);
  const [riskThreshold, setRiskThreshold] = useState(70);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ clients: SearchClientHit[]; invoices: SearchInvoiceHit[] } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const [dashRes, scoringRes] = await Promise.all([
          fetch("/api/v1/invoices/dashboard"),
          fetch("/api/v1/scoring/clients"),
        ]);

        if (isMounted && dashRes.ok) {
          const dashJson = await dashRes.json();
          setData(dashJson);
        }

        if (isMounted && scoringRes.ok) {
          const scoringJson = await scoringRes.json();
          setRiskThreshold(scoringJson.riskThreshold ?? 70);
          setAtRisk(
            (scoringJson.items ?? [])
              .filter((item: AtRiskClient) => item.result.isAtRisk)
              .slice(0, 5),
          );
        }
      } catch (err) {
        console.error("Erreur lors du chargement des métriques :", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    let isMounted = true;
    setSearchLoading(true);

    const timer = window.setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(trimmed)}`)
        .then(async (response) => {
          if (!isMounted) return;
          if (!response.ok) {
            setSearchResults(null);
            return;
          }
          setSearchResults(await response.json());
        })
        .catch(() => {
          if (isMounted) setSearchResults(null);
        })
        .finally(() => {
          if (isMounted) setSearchLoading(false);
        });
    }, 300);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!searchPanelRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasSearchResults =
    !!searchResults && (searchResults.clients.length > 0 || searchResults.invoices.length > 0);

  return (
    <div className="space-y-8">
      {/* En-tête de page & Actions rapides */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Tableau de bord de recouvrement
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <PresentationModeToggle />

          <Link
            href="/import"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] shadow-sm transition-colors hover:bg-[#F8FAFC]"
          >
            <UploadCloud className="h-3.5 w-3.5 text-[#4F46E5]" />
            <span>Importer des factures</span>
          </Link>

          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#4338CA]"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Toutes les factures</span>
          </Link>
        </div>
      </div>

      <div className="relative max-w-xl" ref={searchPanelRef}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setSearchOpen(false);
          }}
          placeholder="Rechercher une facture, un client, un montant..."
          className="w-full rounded-xl border border-[#E2E8F0] bg-white py-2 pl-9 pr-4 text-xs text-[#0F172A] placeholder-[#94A3B8] shadow-sm transition-colors focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/10"
        />
        {searchOpen && searchQuery.trim().length >= 2 && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-lg">
            {searchLoading ? (
              <div className="flex items-center gap-2 p-4 text-xs text-[#64748B]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Recherche en cours...
              </div>
            ) : hasSearchResults ? (
              <div className="max-h-72 overflow-y-auto p-2">
                {searchResults.clients.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                      Clients
                    </p>
                    {searchResults.clients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                          router.push(`/clients/${client.id}`);
                        }}
                        className="block w-full rounded-lg px-2 py-2 text-left text-xs transition-colors hover:bg-[#F8FAFC]"
                      >
                        <p className="font-semibold text-[#0F172A]">{client.name}</p>
                        <p className="text-[11px] text-[#64748B]">
                          {client.externalCode ?? client.email ?? "Client"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.invoices.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                      Factures
                    </p>
                    {searchResults.invoices.map((invoice) => (
                      <button
                        key={invoice.id}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                          router.push(`/invoices/${invoice.id}`);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs transition-colors hover:bg-[#F8FAFC]"
                      >
                        <div>
                          <p className="font-semibold text-[#0F172A]">{invoice.reference}</p>
                          <p className="text-[11px] text-[#64748B]">Reste dû · {invoice.status}</p>
                        </div>
                        <span className="font-semibold text-[#0F172A]">
                          {formatCurrency(invoice.amountRemaining, data?.currency)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="p-4 text-xs text-[#64748B]">Aucun résultat pour « {searchQuery.trim()} »</p>
            )}
          </div>
        )}
      </div>

      {/* Grille des 4 KPI Cards inspirée de la Maquette 1 */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 : En retard (Overdue) */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">En retard</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FEF2F2] text-[#EF4444]">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-[#EF4444]">
              {loading ? "—" : formatCurrency(data?.amounts.overdue ?? 0, data?.currency)}
            </span>
            <span className="ml-1 text-xs text-[#64748B]">à recouvrer</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="rounded-md bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-bold text-[#991B1B]">
              Action requise
            </span>
            <span className="text-[11px] text-[#64748B]">{data?.counts.overdue ?? 0} facture(s)</span>
          </div>
        </div>

        {/* Card 2 : À venir (Due soon) */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">À venir</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-[#0F172A]">
              {loading ? "—" : formatCurrency(data?.amounts.outstanding ?? 0, data?.currency)}
            </span>
            <span className="ml-1 text-xs text-[#64748B]">encours ouvert</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold text-[#4F46E5]">
              Sous 30 jours
            </span>
            <span className="text-[11px] text-[#64748B]">{data?.counts.upcoming ?? 0} échéance(s) à venir</span>
          </div>
        </div>

        {/* Card 3 : Partiellement payées */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Partielles</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFFBEB] text-[#F59E0B]">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-[#F59E0B]">
              {loading ? "—" : data?.counts.partiallyPaid ?? 0}
            </span>
            <span className="ml-1 text-xs text-[#64748B]">factures</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="rounded-md bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-bold text-[#92400E]">
              Acomptes versés
            </span>
            <span className="text-[11px] text-[#64748B]">Solde restant dû</span>
          </div>
        </div>

        {/* Card 4 : Payées / Soldées */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Payées</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#10B981]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-[#10B981]">
              {loading ? "—" : formatCurrency(data?.amounts.collectedThisMonth ?? 0, data?.currency)}
            </span>
            <span className="ml-1 text-xs text-[#64748B]">ce mois</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-bold text-[#065F46]">
              Encaissement 100%
            </span>
            <span className="text-[11px] text-[#64748B]">Taux d&apos;encaissement : {data?.amounts.collectionRate ?? 0}%</span>
          </div>
        </div>
      </div>

      {/* Statistiques de recouvrement */}
      <DashboardAnalytics />

      {/* Section Contraste Sombre inspirée du bloc inférieur de la Maquette 1 */}
      <div className="rounded-3xl bg-[#1E1B4B] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div>
            <span className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white">
              Focus Impayés
            </span>
            <h2 className="mt-2 text-lg font-bold">Relances &amp; Actions Prioritaires</h2>
            <p className="text-xs text-[#94A3B8]">
              Générez vos messages de relance personnalisés par canal (WhatsApp, Email, Téléphone)
            </p>
          </div>

          <Link
            href="/relances"
            className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#4338CA]"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Ouvrir les relances</span>
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Liste des échéances imminentes */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Factures prioritaires
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-xs text-[#94A3B8]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement des données...
              </div>
            ) : data?.priorityInvoices && data.priorityInvoices.length > 0 ? (
              data.priorityInvoices.slice(0, 4).map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-3.5 transition-colors hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{inv.reference}</p>
                      <p className="text-[11px] text-[#94A3B8]">
                        Échéance : {new Date(inv.dueAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-white">
                      {formatCurrency(inv.amountRemaining, data.currency)}
                    </p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-white/5 p-6 text-center text-xs text-[#94A3B8]">
                Aucune facture en attente. Importez vos premières factures pour démarrer.
              </div>
            )}
          </div>

          {/* Répartition de l'encours et recommandations */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-white font-semibold text-xs">
                <ShieldAlert className="h-4 w-4 text-[#F59E0B]" />
                <span>Répartition de l&apos;encours</span>
              </div>
              <div className="mt-4 space-y-3">
                {data?.distribution.filter((item) => item.amount > 0).map((item) => {
                  const label = item.status === "overdue" ? "En retard" : item.status === "partially_paid" ? "Partiellement réglées" : item.status === "upcoming" ? "À venir" : "Réglées";
                  const width = data.amounts.outstanding > 0 ? Math.min(100, (item.amount / data.amounts.outstanding) * 100) : 0;
                  return (
                    <div key={item.status}>
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="text-[#CBD5E1]">{label} · {item.count}</span>
                        <span className="font-semibold text-white">{formatCurrency(item.amount, data.currency)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className={item.status === "overdue" ? "h-full rounded-full bg-[#FB7185]" : item.status === "partially_paid" ? "h-full rounded-full bg-[#FBBF24]" : "h-full rounded-full bg-[#818CF8]"} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
                {!loading && !data?.distribution.some((item) => item.amount > 0) && (
                  <p className="text-xs leading-relaxed text-[#94A3B8]">Aucun encours ouvert : vos indicateurs apparaîtront après l&apos;import des premières factures.</p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-[#94A3B8]">Relances IA disponibles</span>
              <Link
                href="/settings/ai-provider"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#818CF8] hover:text-white"
              >
                <span>Configurer votre clé IA</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Grille inférieure : Détails des échéances et Clients à risque */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Colonne 1 : Vue tabulaire des échéances */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Toutes les échéances à venir</h3>
              <p className="text-xs text-[#64748B]">Factures actives à recouvrer</p>
            </div>
            <Link
              href="/invoices"
              className="text-xs font-semibold text-[#4F46E5] hover:underline"
            >
              Voir tout
            </Link>
          </div>

          <div className="space-y-2.5">
            {data?.priorityInvoices && data.priorityInvoices.length > 0 ? (
              data.priorityInvoices.slice(0, 5).map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-colors hover:bg-white"
                >
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">{inv.reference}</p>
                    <p className="text-[11px] text-[#64748B]">
                      Échéance le {new Date(inv.dueAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#0F172A]">
                      {formatCurrency(inv.amountRemaining, data.currency)}
                    </span>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-[#64748B]">
                Aucune facture enregistrée pour le moment.
              </p>
            )}
          </div>
        </div>

        {/* Colonne 2 : Clients à risque élevé (Scoring Solvia) */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Clients à risque prioritaire</h3>
              <p className="text-xs text-[#64748B]">Score de risque ≥ {riskThreshold} / 100</p>
            </div>
            <Link
              href="/scoring"
              className="text-xs font-semibold text-[#4F46E5] hover:underline"
            >
              Règles de calcul
            </Link>
          </div>

          <div className="space-y-2.5">
            {atRisk.length > 0 ? (
              atRisk.map((c) => (
                <Link
                  key={c.clientId}
                  href={`/clients/${c.clientId}`}
                  className="flex items-center justify-between rounded-xl border border-[#FEE2E2] bg-[#FEF2F2]/50 p-3 transition-colors hover:bg-[#FEF2F2]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EF4444] text-white text-xs font-bold">
                      !
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0F172A]">{c.clientName}</p>
                      <p className="text-[10px] text-[#991B1B]">Probabilité de retard critique</p>
                    </div>
                  </div>

                  <span className="rounded-full bg-[#EF4444] px-2.5 py-0.5 text-xs font-bold text-white">
                    Score {c.result.score}
                  </span>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 text-center text-xs text-[#64748B]">
                Aucun client en situation de risque critique.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
