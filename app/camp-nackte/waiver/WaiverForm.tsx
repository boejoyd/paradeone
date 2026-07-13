"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

import { CAMP_NACKTE_WAIVER_TEXT, CAMP_NACKTE_WAIVER_VERSION } from "@/lib/campNackteWaiver";

type LookupResult = {
  lookupToken: string;
  visitDate?: string | null;
  guest: { preferredName: string | null; legalNameHint: string; maskedEmail: string | null; maskedPhone: string | null };
  currentWaiver: { signed_at: string; expires_at: string; confirmation_number: string } | null;
};

type AmbiguousLookupResult = {
  found: false;
  ambiguous: true;
  ambiguityToken: string;
  message: string;
};

export function CampNackteWaiverForm() {
  const router = useRouter();
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const [lookupType, setLookupType] = useState("phone");
  const [lookupValue, setLookupValue] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [ambiguityToken, setAmbiguityToken] = useState<string | null>(null);

  async function lookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setResult(null);
    const formData = new FormData(event.currentTarget);
    const submittedLookupType = String(formData.get("lookupType") || "");
    const submittedLookupValue = String(formData.get("lookupValue") || "");
    const response = await fetch("/camp-nackte/waiver/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lookupType: submittedLookupType, lookupValue: submittedLookupValue }) });
    const payload = await response.json().catch(() => null) as ({ found: true } & LookupResult) | AmbiguousLookupResult | { found?: false; message?: string; error?: string } | null;
    setBusy(false);
    if (!response.ok || !payload) { setMessage(payload && "error" in payload ? payload.error || "Guest lookup failed." : "Guest lookup failed."); return; }
    if (!payload.found && "ambiguous" in payload && payload.ambiguous) { setAmbiguityToken(payload.ambiguityToken); setShowCreateForm(false); setMessage(payload.message); return; }
    if (!payload.found) { setMessage(payload.message || "No matching guest was found."); setShowCreateForm(true); return; }
    setAmbiguityToken(null);
    setShowCreateForm(false);
    setResult(payload);
  }

  async function refineLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ambiguityToken) return;
    setBusy(true); setMessage("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/camp-nackte/waiver/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refine", ambiguityToken, refinementType: String(formData.get("refinementType") || ""), refinementValue: String(formData.get("refinementValue") || "") }),
    });
    const payload = await response.json().catch(() => null) as ({ found: true } & LookupResult) | AmbiguousLookupResult | { error?: string } | null;
    setBusy(false);
    if (!response.ok || !payload) { setMessage(payload && "error" in payload ? payload.error || "Unable to refine the lookup." : "Unable to refine the lookup."); return; }
    if (!("found" in payload) || !payload.found) {
      if ("ambiguous" in payload && payload.ambiguous) { setAmbiguityToken(payload.ambiguityToken); setMessage(payload.message); return; }
      setMessage("No matching guest was found."); return;
    }
    setAmbiguityToken(null); setMessage(""); setResult(payload);
  }

  async function createGuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setResult(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/camp-nackte/waiver/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        legalName: String(formData.get("legalName") || ""),
        preferredName: String(formData.get("preferredName") || ""),
        email: String(formData.get("email") || ""),
        phone: String(formData.get("phone") || ""),
        visitDate: String(formData.get("visitDate") || ""),
      }),
    });
    const payload = await response.json().catch(() => null) as ({ found: true } & LookupResult) | { error?: string } | null;
    setBusy(false);
    if (!response.ok || !payload || !("found" in payload) || !payload.found) { setMessage(payload && "error" in payload ? payload.error || "Unable to create or verify the guest record." : "Unable to create or verify the guest record."); return; }
    setShowCreateForm(false);
    setResult(payload);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result || result.currentWaiver || !signatureRef.current || signatureRef.current.isEmpty()) { setMessage("Please provide your signature."); return; }
    setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/camp-nackte/waiver/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lookupToken: result.lookupToken, visitDate: String(data.get("visitDate") || ""), signatureDataUrl: signatureRef.current.toDataURL("image/png") }) });
    const payload = await response.json().catch(() => null) as { error?: string; confirmationNumber?: string; expiresAt?: string; pdfUrl?: string } | null;
    setBusy(false);
    if (!response.ok) { setMessage(payload?.error || "Unable to save the waiver."); return; }
    const params = new URLSearchParams();
    if (payload?.confirmationNumber) params.set("confirmation", payload.confirmationNumber);
    if (payload?.expiresAt) params.set("expiresAt", payload.expiresAt);
    if (payload?.pdfUrl) params.set("pdf", payload.pdfUrl);
    router.push(`/camp-nackte/waiver/thank-you?${params.toString()}`);
  }

  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white md:px-8 md:py-12">
    <section className="mx-auto max-w-5xl space-y-8">
      <header className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Camp Nackte</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">Annual Guest Waiver</h1>
        <p className="mt-4 text-lg text-slate-300">Verify your guest record first. You only need to sign when your annual waiver is not current.</p>
      </header>

      {!result ? <form onSubmit={lookup} className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
        <h2 className="text-2xl font-bold">Find your guest record</h2>
        <p className="mt-2 text-sm text-slate-400">Your information is used only to locate your record. No public guest list is shown.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr_auto]">
          <select name="lookupType" value={lookupType} onChange={(event) => setLookupType(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"><option value="phone">Phone</option><option value="email">Email</option><option value="confirmation">Confirmation / pass code</option></select>
          <input name="lookupValue" value={lookupValue} onChange={(event) => setLookupValue(event.target.value)} required type={lookupType === "email" ? "email" : "text"} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" />
          <button disabled={busy} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold disabled:opacity-50">{busy ? "Checking…" : "Continue"}</button>
        </div>
      </form> : <>
        <section className="rounded-3xl border border-blue-800 bg-blue-950/30 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-300">Identity confirmation</p>
          <h2 className="mt-2 text-2xl font-bold">{result.guest.preferredName || result.guest.legalNameHint}</h2>
          <p className="mt-2 text-sm text-slate-300">Legal name: {result.guest.legalNameHint}</p>
          {result.guest.maskedEmail ? <p className="text-sm text-slate-300">Email: {result.guest.maskedEmail}</p> : null}
          {result.guest.maskedPhone ? <p className="text-sm text-slate-300">Phone: {result.guest.maskedPhone}</p> : null}
          <button type="button" onClick={() => setResult(null)} className="mt-4 text-sm text-blue-300 underline">This is not me</button>
        </section>
        {result.currentWaiver ? <section className="rounded-3xl border border-emerald-700 bg-emerald-950/40 p-8 text-center">
          <div className="text-4xl">✓</div><h2 className="mt-3 text-3xl font-bold">Your waiver is current</h2>
          <p className="mt-3 text-slate-200">You do not need to sign again.</p>
          <p className="mt-4 text-sm text-slate-300">Signed {new Date(result.currentWaiver.signed_at).toLocaleString()}</p>
          <p className="text-sm text-slate-300">Valid until the exact anniversary: {new Date(result.currentWaiver.expires_at).toLocaleString()}</p>
          <p className="mt-2 text-xs text-slate-400">After that exact timestamp, a new waiver is required before entering or using the property again.</p>
        </section> : <form onSubmit={submit} className="grid gap-8">
          <article className="rounded-3xl bg-white p-6 text-slate-950 md:p-10"><h2 className="text-3xl font-bold">Nackte LLC Waiver</h2><p className="mt-2 text-sm text-slate-500">Version {CAMP_NACKTE_WAIVER_VERSION}</p><div className="mt-8 whitespace-pre-wrap text-[17px] leading-9 text-slate-800">{CAMP_NACKTE_WAIVER_TEXT}</div></article>
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
            <label className="grid gap-2"><span>Date visiting Camp</span><input name="visitDate" type="date" required defaultValue={result.visitDate || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" /></label>
            <h2 className="mt-6 text-2xl font-bold">Signature</h2><div className="mt-5 overflow-hidden rounded-xl bg-white"><SignatureCanvas ref={signatureRef} canvasProps={{ className: "h-52 w-full" }} /></div>
            <button type="button" onClick={() => signatureRef.current?.clear()} className="mt-3 text-sm text-slate-300">Clear signature</button>
            <label className="mt-6 flex gap-3 text-sm text-slate-300"><input type="checkbox" required className="mt-1" /><span>I have read, understand, and agree to this waiver.</span></label>
          </section>
          <button disabled={busy} className="rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold disabled:opacity-50">{busy ? "Saving…" : "Sign Annual Waiver"}</button>
        </form>}
      </>}
      {message ? <p role="alert" className="rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-amber-200">{message}</p> : null}
      {!result && ambiguityToken ? <form onSubmit={refineLookup} className="rounded-3xl border border-amber-800 bg-amber-950/20 p-6 md:p-8">
        <h2 className="text-2xl font-bold">Provide one more detail</h2>
        <p className="mt-2 text-sm text-slate-300">This detail will be checked only against the possible records from your first search.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr_auto]">
          <select name="refinementType" defaultValue="email" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"><option value="email">Email</option><option value="phone">Phone</option><option value="confirmation">Confirmation code</option><option value="visit_date">Approximate last visit</option></select>
          <input name="refinementValue" required placeholder="Enter one more detail" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" />
          <button disabled={busy} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold disabled:opacity-50">{busy ? "Checking…" : "Refine match"}</button>
        </div>
        <button type="button" onClick={() => { setAmbiguityToken(null); setMessage(""); }} className="mt-4 text-sm text-slate-300 underline">Start over</button>
        <p className="mt-3 text-xs text-slate-400">If another detail cannot distinguish your record, please ask staff for assistance.</p>
      </form> : null}
      {!result && showCreateForm && !ambiguityToken ? <form onSubmit={createGuest} className="rounded-3xl border border-blue-800 bg-blue-950/20 p-6 md:p-8">
        <h2 className="text-2xl font-bold">I’m not listed — create my guest record and sign a waiver</h2>
        <p className="mt-2 text-sm text-slate-300">Enter your information below. If an exact email or phone match already exists, that guest record will be used instead of creating a duplicate.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2"><span>Legal name</span><input required name="legalName" autoComplete="name" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" /></label>
          <label className="grid gap-2"><span>Preferred name <span className="text-slate-500">(optional)</span></span><input name="preferredName" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" /></label>
          <label className="grid gap-2"><span>Email</span><input name="email" type="email" autoComplete="email" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" /></label>
          <label className="grid gap-2"><span>Phone</span><input name="phone" type="tel" autoComplete="tel" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" /></label>
          <label className="grid gap-2"><span>Date visiting Camp</span><input required name="visitDate" type="date" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" /></label>
        </div>
        <p className="mt-3 text-xs text-slate-400">Provide at least one contact method: email or phone.</p>
        <button disabled={busy} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold disabled:opacity-50">{busy ? "Continuing…" : "Create guest and continue"}</button>
      </form> : null}
    </section>
  </main>;
}
