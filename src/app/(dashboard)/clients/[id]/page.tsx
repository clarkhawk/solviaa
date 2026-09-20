"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import type { ClientDTO } from "@/modules/clients/types";
import type { InvoiceDTO } from "@/modules/factures/types";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientDTO | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [score, setScore] = useState(0);
  useEffect(() => { void (async () => {
    const [clientRes, invoicesRes, scoresRes] = await Promise.all([fetch(`/api/v1/clients/${id}`), fetch(`/api/v1/invoices?clientId=${id}&limit=100`), fetch("/api/v1/scoring/clients")]);
    if (clientRes.ok) setClient(await clientRes.json());
    if (invoicesRes.ok) setInvoices((await invoicesRes.json()).items ?? []);
    if (scoresRes.ok) {
      const scoresData = await scoresRes.json();
      setScore(scoresData.items?.find((item: { clientId: string }) => item.clientId === id)?.result.score ?? 0);
    }
  })(); }, [id]);
  if (!client) return <p className="text-sm text-[#64748B]">Chargement du client...</p>;
  const outstanding = invoices.reduce((sum, invoice) => sum + Number(invoice.amountRemaining), 0);
  return <div className="space-y-6"><Link href="/clients" className="text-xs font-semibold text-[#4F46E5]">← Tous les clients</Link><div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-6"><div><h1 className="text-2xl font-bold">{client.identity.name}</h1><p className="mt-2 text-sm text-[#64748B]">{client.contact.email ?? "—"} · {client.contact.phone ?? "—"}</p><p className="mt-1 text-xs text-[#64748B]">Code : {client.externalCode ?? "—"}</p></div><RiskBadge score={score} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border bg-white p-5"><p className="text-xs text-[#64748B]">Factures</p><p className="mt-1 text-2xl font-bold">{invoices.length}</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-xs text-[#64748B]">Encours restant</p><p className="mt-1 text-2xl font-bold">{outstanding.toFixed(2)} €</p></div></div><div className="rounded-2xl border bg-white p-5"><h2 className="mb-3 font-semibold">Factures du client</h2>{invoices.length ? <div className="space-y-2">{invoices.map((invoice) => <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex justify-between rounded-xl bg-[#F8FAFC] p-3 text-sm hover:bg-[#EEF2FF]"><span>{invoice.reference}</span><span className="font-semibold">{Number(invoice.amountRemaining).toFixed(2)} €</span></Link>)}</div> : <p className="text-sm text-[#64748B]">Aucune facture.</p>}</div></div>;
}
