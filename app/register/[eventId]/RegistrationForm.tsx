"use client";

import Link from "next/link";
import { useActionState } from "react";

import { VEHICLE_TYPE_OPTIONS } from "@/lib/entries/vehicleTypes";
import {
  initialRegistrationState,
  submitPublicRegistration,
} from "./actions";

export function RegistrationForm({ eventId }: { eventId: string }) {
  const action = submitPublicRegistration.bind(null, eventId);
  const [state, formAction, pending] = useActionState(action, initialRegistrationState);

  return (
    <form action={formAction} className="grid gap-5 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl sm:p-7">
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-200">Entry or organization name</span>
        <input name="entryName" required maxLength={160} className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white" />
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-200">Entry type</span>
          <select name="entryType" required defaultValue="float" className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white">
            <option value="float">Float</option>
            <option value="walking_group">Walking group</option>
            <option value="vehicle">Vehicle</option>
            <option value="band">Band</option>
            <option value="motorcycle_group">Motorcycle group</option>
            <option value="dignitary">Dignitary</option>
            <option value="sponsor">Sponsor</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-200">Vehicle or movement type</span>
          <select name="vehicleType" defaultValue="" className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white">
            <option value="">Not applicable</option>
            {VEHICLE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-200">Estimated total length in feet</span>
        <input name="estimatedLengthFeet" type="number" min="1" max="2000" required className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white" />
        <span className="text-xs text-slate-400">Include vehicles, trailers, walkers, and safety spacing.</span>
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-200">Primary contact name</span>
          <input name="contactName" required maxLength={160} autoComplete="name" className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-200">Contact phone</span>
          <input name="contactPhone" type="tel" maxLength={40} autoComplete="tel" className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white" />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-200">Contact email</span>
        <input name="contactEmail" type="email" required maxLength={254} autoComplete="email" className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white" />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-200">Announcer script</span>
        <textarea name="announcerScript" rows={7} maxLength={3000} className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white" />
        <span className="text-xs text-slate-400">Provide the wording the announcer should read as your entry passes the viewing stand.</span>
      </label>

      <label className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-200">
        <span className="flex items-start gap-3">
          <input name="acceptTerms" value="agree" type="checkbox" required className="mt-1 h-4 w-4" />
          <span className="leading-6">
            I confirm that this information is accurate and agree to follow the parade organizer&apos;s participation and safety requirements. I have reviewed the ParadeOne{" "}
            <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link> and{" "}
            <Link href="/terms" className="underline underline-offset-2">Terms of Service</Link>.
          </span>
        </span>
      </label>

      {state.status === "error" ? (
        <p role="alert" className="rounded-xl border border-red-700 bg-red-950/50 p-4 text-sm text-red-200">{state.message}</p>
      ) : null}

      <button type="submit" disabled={pending} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? "Submitting…" : "Submit Registration"}
      </button>
    </form>
  );
}
