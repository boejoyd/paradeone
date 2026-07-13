"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { createCampGuest, linkPassSlotToGuest, markCampGuestIdentityCorrected, revokeCampWaiver } from "@/app/camp-nackte/waiver/submissions/actions";

type Submission = { id: string; guest_id: string | null; full_name: string | null; email: string | null; phone: string | null; visit_date: string | null; waiver_text: string | null; signature_data_url: string | null; signed_at: string; expires_at: string; waiver_version: string; status: string; confirmation_number: string; pdfOpenUrl: string | null };
type Guest = { id: string; legal_name: string; preferred_name: string | null; email: string | null; phone: string | null; identity_corrected_at: string | null };
type Purchase = { id: string; purchaser_name: string; purchase_date: string; admission_date: string | null; quantity: number; source: string };
type Slot = { id: string; purchase_id: string; guest_id: string | null; attendee_name: string | null; confirmation_code: string; slot_number: number };
type Filter = "all" | "current" | "expiring" | "expired" | "superseded" | "revoked";

function effectiveStatus(waiver: Submission, now: number) {
  return waiver.status === "current" && new Date(waiver.expires_at).getTime() <= now ? "expired" : waiver.status;
}

function dateValue(value: string) {
  const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function CampNackteWaiverSubmissionsClient({ submissions, guests, purchases, slots }: { submissions: Submission[]; guests: Guest[]; purchases: Purchase[]; slots: Slot[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [guestSearch, setGuestSearch] = useState("");
  const [copiedConfirmationId, setCopiedConfirmationId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const inThirtyDays = now + 30 * 86400000;
  const currentGuestIds = new Set(submissions.filter((item) => effectiveStatus(item, now) === "current" && item.guest_id).map((item) => item.guest_id));
  const unmatchedSlots = slots.filter((slot) => !slot.guest_id);
  const totals = {
    current: submissions.filter((item) => effectiveStatus(item, now) === "current").length,
    expiring: submissions.filter((item) => effectiveStatus(item, now) === "current" && new Date(item.expires_at).getTime() <= inThirtyDays).length,
    expired: submissions.filter((item) => effectiveStatus(item, now) === "expired").length,
    superseded: submissions.filter((item) => item.status === "superseded").length,
    revoked: submissions.filter((item) => item.status === "revoked").length,
    guestsWithoutWaiver: guests.filter((guest) => !currentGuestIds.has(guest.id)).length,
    purchasesWithoutAttendee: purchases.filter((purchase) => !slots.some((slot) => slot.purchase_id === purchase.id && slot.guest_id)).length,
    attendeesWithoutWaiver: slots.filter((slot) => slot.guest_id && !currentGuestIds.has(slot.guest_id)).length,
  };

  const filtered = useMemo(() => submissions.filter((item) => {
    const status = effectiveStatus(item, now);
    const matchesStatus = filter === "all" || (filter === "expiring" ? status === "current" && new Date(item.expires_at).getTime() <= inThirtyDays : status === filter);
    const matchesSearch = `${item.full_name || ""} ${item.email || ""} ${item.phone || ""} ${item.confirmation_number}`.toLowerCase().includes(search.trim().toLowerCase());
    const signedDate = dateValue(item.signed_at);
    return matchesStatus && matchesSearch && (!startDate || signedDate >= startDate) && (!endDate || signedDate <= endDate);
  }), [endDate, filter, inThirtyDays, now, search, startDate, submissions]);

  async function copyConfirmation(waiver: Submission) {
    try {
      await navigator.clipboard.writeText(waiver.confirmation_number);
      setCopiedConfirmationId(waiver.id);
      window.setTimeout(() => setCopiedConfirmationId((current) => current === waiver.id ? null : current), 1800);
    } catch {
      setCopiedConfirmationId(null);
    }
  }

  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Current", totals.current], ["Expiring ≤30 days", totals.expiring], ["Expired", totals.expired], ["Superseded", totals.superseded], ["Revoked", totals.revoked], ["Guests without waiver", totals.guestsWithoutWaiver], ["Purchases without attendee", totals.purchasesWithoutAttendee], ["Attendees without waiver", totals.attendeesWithoutWaiver]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="grid gap-3 md:grid-cols-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone, or confirmation" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" /><select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"><option value="all">All statuses</option><option value="current">Current</option><option value="expiring">Expiring within 30 days</option><option value="expired">Expired</option><option value="superseded">Superseded</option><option value="revoked">Revoked</option></select><label className="grid gap-1 text-sm text-slate-300">Signed on or after<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" /></label><label className="grid gap-1 text-sm text-slate-300">Signed on or before<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" /></label></div><p className="mt-3 text-sm text-slate-400">Showing {filtered.length} of {submissions.length} waiver records.</p></section>

    <section className="space-y-3">{filtered.map((waiver) => {
      const expanded = expandedId === waiver.id;
      return <article key={waiver.id} className="rounded-2xl border border-slate-800 bg-slate-900">
        <button type="button" onClick={() => setExpandedId(expanded ? null : waiver.id)} className="flex w-full flex-col gap-2 p-4 text-left md:flex-row md:items-center md:justify-between"><div><h2 className="font-semibold text-white">{waiver.full_name || "Unnamed guest"}</h2><p className="mt-1 text-sm text-slate-400">Signed {new Date(waiver.signed_at).toLocaleString()} · {waiver.confirmation_number}</p></div><div className="flex items-center gap-3"><span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase">{effectiveStatus(waiver, now)}</span><span className="text-xs uppercase tracking-wide text-slate-500">{expanded ? "Hide details" : "Show details"}</span></div></button>
        {expanded ? <div className="border-t border-slate-800 bg-slate-950/50 p-4"><div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><h3 className="font-semibold">Captured details</h3><dl className="mt-3 grid gap-3 text-sm"><div><dt className="text-slate-500">Legal name</dt><dd>{waiver.full_name || "—"}</dd></div><div><dt className="text-slate-500">Email</dt><dd>{waiver.email || "—"}</dd></div><div><dt className="text-slate-500">Phone</dt><dd>{waiver.phone || "—"}</dd></div><div><dt className="text-slate-500">Visit date</dt><dd>{waiver.visit_date || "—"}</dd></div><div><dt className="text-slate-500">Expiration</dt><dd>{new Date(waiver.expires_at).toLocaleString()}</dd></div><div><dt className="text-slate-500">Waiver version</dt><dd>{waiver.waiver_version}</dd></div></dl></div><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><h3 className="font-semibold">Actions and attachments</h3><div className="mt-3 flex flex-wrap gap-2">{waiver.pdfOpenUrl ? <a href={waiver.pdfOpenUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold">View PDF</a> : <span className="text-sm text-slate-400">No PDF reference</span>}{waiver.status === "current" ? <form action={revokeCampWaiver}><input type="hidden" name="waiverId" value={waiver.id} /><button className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-300">Revoke</button></form> : null}{waiver.guest_id ? <form action={markCampGuestIdentityCorrected}><input type="hidden" name="guestId" value={waiver.guest_id} /><button className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Mark identity corrected</button></form> : null}</div>{waiver.signature_data_url ? <Image unoptimized src={waiver.signature_data_url} alt="Captured waiver signature" width={480} height={180} className="mt-4 max-h-48 w-auto rounded-lg bg-white p-2" /> : <p className="mt-4 text-sm text-slate-400">No separate signature image retained.</p>}</div></div>{waiver.waiver_text ? <details className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4"><summary className="cursor-pointer font-semibold">Review captured waiver</summary><div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 p-3"><div><p className="text-xs uppercase tracking-wide text-slate-500">Confirmation number</p><p className="select-all font-mono text-sm text-white">{waiver.confirmation_number}</p></div><button type="button" onClick={() => void copyConfirmation(waiver)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">{copiedConfirmationId === waiver.id ? "Copied" : "Copy"}</button></div><pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{waiver.waiver_text}</pre></details> : null}</div> : null}
      </article>;
    })}</section>

    <div className="grid gap-6 lg:grid-cols-2"><form action={createCampGuest} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-bold">Create guest manually</h2><input required name="legalName" placeholder="Legal name" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" /><input name="preferredName" placeholder="Preferred name" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" /><input name="email" type="email" placeholder="Email" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" /><input name="phone" placeholder="Phone" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" /><button className="rounded-xl bg-blue-600 px-4 py-3 font-semibold">Create guest</button></form><section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-bold">Unmatched pass slots</h2><input value={guestSearch} onChange={(event) => setGuestSearch(event.target.value)} placeholder="Filter guest selector" className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" /><div className="mt-4 space-y-3">{unmatchedSlots.length ? unmatchedSlots.map((slot) => <form key={slot.id} action={linkPassSlotToGuest} className="grid gap-2 rounded-xl border border-slate-800 p-3"><p className="text-sm">{slot.attendee_name || `Slot ${slot.slot_number}`} · {slot.confirmation_code}</p><input type="hidden" name="slotId" value={slot.id} /><select required name="guestId" defaultValue="" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"><option value="" disabled>Select guest</option>{guests.filter((guest) => `${guest.legal_name} ${guest.preferred_name || ""} ${guest.email || ""} ${guest.phone || ""}`.toLowerCase().includes(guestSearch.trim().toLowerCase())).map((guest) => <option key={guest.id} value={guest.id}>{guest.legal_name}{guest.preferred_name ? ` (${guest.preferred_name})` : ""}</option>)}</select><button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold">Link attendee</button></form>) : <p className="text-sm text-slate-400">No unmatched pass slots.</p>}</div></section></div>

  </div>;
}
