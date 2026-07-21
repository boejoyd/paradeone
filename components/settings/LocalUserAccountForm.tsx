"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  createLocalUserAccount,
  type SettingsActionState,
} from "@/app/settings/actions";
import type { OrganizationRole } from "@/lib/auth";
import { getAssignableOrganizationRoles } from "@/lib/organizations/permissions";

export type ManageableOrganizationOption = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin";
};

type LocalUserAccountFormProps = {
  organizations: ManageableOrganizationOption[];
};

const INITIAL_STATE: SettingsActionState = {
  status: "idle",
  message: "",
};

export function LocalUserAccountForm({ organizations }: LocalUserAccountFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createLocalUserAccount,
    INITIAL_STATE
  );
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizations[0]?.id ?? ""
  );

  const selectedOrganization =
    organizations.find((organization) => organization.id === selectedOrganizationId) ??
    organizations[0];
  const assignableRoles = getAssignableOrganizationRoles(
    (selectedOrganization?.role ?? "admin") as OrganizationRole
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  if (!selectedOrganization) return null;

  return (
    <form ref={formRef} action={formAction} className="mt-5 space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-200">Organization</span>
          <select
            name="organizationId"
            value={selectedOrganization.id}
            onChange={(event) => setSelectedOrganizationId(event.target.value)}
            className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} ({organization.role})
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-200">Permission role</span>
          <select
            key={selectedOrganization.id}
            name="role"
            defaultValue={assignableRoles.find((role) => role.id === "staff")?.id ?? assignableRoles[0]?.id}
            className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
          >
            {assignableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label} — {role.description}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-200">Display name (optional)</span>
          <input
            name="displayName"
            type="text"
            maxLength={100}
            autoComplete="off"
            className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
            placeholder="Operations Volunteer"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-200">Login email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="off"
            className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
            placeholder="user@example.com"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-200">Temporary password</span>
          <input
            name="password"
            type="password"
            minLength={10}
            required
            autoComplete="new-password"
            className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-200">Confirm temporary password</span>
          <input
            name="confirmPassword"
            type="password"
            minLength={10}
            required
            autoComplete="new-password"
            className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
          />
        </label>
      </div>

      <div className="rounded-xl border border-amber-700/70 bg-amber-950/35 p-4 text-sm leading-6 text-amber-100">
        Share the temporary password securely. ParadeOne will require the new user to replace it at first sign-in.
      </div>

      {state.status !== "idle" ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={[
            "rounded-xl border p-3 text-sm",
            state.status === "success"
              ? "border-emerald-700 bg-emerald-950/40 text-emerald-200"
              : "border-red-700 bg-red-950/40 text-red-200",
          ].join(" ")}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create local account"}
      </button>
    </form>
  );
}
