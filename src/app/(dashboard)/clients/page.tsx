"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import type { ClientDTO } from "@/modules/clients/types";

interface EnrichedClient extends ClientDTO { invoiceCount: number; totalAmountDue: number; riskScore: number }
type ClientForm = { name: string; email: string; phone: string; externalCode: string };
const emptyForm: ClientForm = { name: "", email: "", phone: "", externalCode: "" };

export default function ClientsPage() {
  const [clients, setClients] = useState<EnrichedClient[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [editing, setEditing] = useState<EnrichedClient | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [clientsRes, invoicesRes, scoresRes] = await Promise.all([fetch("/api/v1/clients?limit=100"), fetch("/api/v1/invoices?limit=100"), fetch("/api/v1/scoring/clients")]);
      const [clientsData, invoicesData, scoresData] = await Promise.all([clientsRes.json(), invoicesRes.json(), scoresRes.json()]);
      const scoreItems = scoresData.items ?? [];
      setClients((clientsData.items ?? []).map((client: ClientDTO) => {
        const invoices = (invoicesData.items ?? []).filter((invoice: { clientId: string }) => invoice.clientId === client.id);
        const score = scoreItems.find((entry: { clientId: string }) => entry.clientId === client.id)?.result.score ?? 0;
        return { ...client, invoiceCount: invoices.length, totalAmountDue: invoices.reduce((sum: number, invoice: { amountRemaining: number | string }) => sum + Number(invoice.amountRemaining), 0), riskScore: score };
      }));
    } catch { setError("Impossible de charger les clients."); } finally { setLoading(false); }
  }
  useEffect(() => { void loadData(); }, []);

  const displayedClients = useMemo(() => clients.filter((client) => `${client.identity.name} ${client.contact.email ?? ""} ${client.externalCode ?? ""}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);
  function openCreate() { setEditing(null); setForm(emptyForm); setError(""); setFormOpen(true); }
  function openEdit(client: EnrichedClient) { setEditing(client); setForm({ name: client.identity.name, email: client.contact.email ?? "", phone: client.contact.phone ?? "", externalCode: client.externalCode ?? "" }); setError(""); setFormOpen(true); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    const payload = { externalCode: form.externalCode || undefined, identity: { name: form.name }, contact: { email: form.email || undefined, phone: form.phone || undefined } };
    const response = await fetch(editing ? `/api/v1/clients/${editing.id}` : "/api/v1/clients", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) { const body = await response.json().catch(() => ({})); setError(body.error ?? "Enregistrement impossible."); return; }
    setFormOpen(false); await loadData();
  }
  async function remove(client: EnrichedClient) {
    if (!window.confirm(`Supprimer ${client.identity.name} ?`)) return;
    const response = await fetch(`/api/v1/clients/${client.id}`, { method: "DELETE" });
    if (!response.ok) { setError("Suppression impossible : le client possède peut-être des factures."); return; }
    await loadData();
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Clients & Débiteurs</h1><p className="text-xs text-[#64748B]">Gérez votre base client et surveillez les risques</p></div><button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" />Ajouter un client</button></div>
    {error && <p className="rounded-xl bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">{error}</p>}
    {formOpen && <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:grid-cols-2"><div className="flex items-center justify-between sm:col-span-2"><h2 className="font-semibold">{editing ? "Modifier le client" : "Nouveau client"}</h2><button type="button" onClick={() => setFormOpen(false)}><X className="h-4 w-4" /></button></div><input required placeholder="Nom ou raison sociale" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border p-2 text-sm" /><input placeholder="Code externe" value={form.externalCode} onChange={(e) => setForm({ ...form, externalCode: e.target.value })} className="rounded-xl border p-2 text-sm" /><input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border p-2 text-sm" /><input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border p-2 text-sm" /><button className="rounded-xl bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white sm:col-span-2">Enregistrer</button></form>}
    <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm"><div className="border-b p-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un client, email ou code..." className="w-full rounded-xl border bg-[#F8FAFC] py-2 pl-9 pr-3 text-xs" /></div></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-[#F8FAFC] text-left text-xs text-[#64748B]"><th className="px-6 py-4">Nom / Contact</th><th>Code</th><th>Factures</th><th>Montant dû</th><th>Risque</th><th className="px-6 text-right">Actions</th></tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan={6} className="p-8 text-center text-xs">Chargement...</td></tr> : displayedClients.map((client) => <tr key={client.id}><td className="px-6 py-4"><p className="font-bold">{client.identity.name}</p><p className="text-xs text-[#64748B]">{client.contact.email || client.contact.phone || "—"}</p></td><td>{client.externalCode ?? "—"}</td><td>{client.invoiceCount}</td><td className="font-semibold">{client.totalAmountDue.toFixed(2)} €</td><td><RiskBadge score={client.riskScore} /></td><td className="px-6"><div className="flex justify-end gap-2"><Link href={`/clients/${client.id}`} className="rounded-lg border p-2 text-xs">Voir</Link><button onClick={() => openEdit(client)} className="rounded-lg border p-2"><Pencil className="h-3 w-3" /></button><button onClick={() => void remove(client)} className="rounded-lg border p-2 text-red-600"><Trash2 className="h-3 w-3" /></button></div></td></tr>)}{!loading && !displayedClients.length && <tr><td colSpan={6} className="p-8 text-center text-xs text-[#64748B]">Aucun client trouvé.</td></tr>}</tbody></table></div></div>
  </div>;
}
