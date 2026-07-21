"use client";

import { useActionState } from "react";

import {
  changeOwnPassword,
  type SettingsActionState,
} from "@/app/settings/actions";

type PasswordChangeFormProps = {
  required: boolean;
};

const INITIAL_STATE: SettingsActionState = {
  status: "idle",
  message: "",
};

export function PasswordChangeForm({ required }: PasswordChangeFormProps) {
  const [state, formAction, pending] = useActionState(
    changeOwnPassword,
    INITIAL_STATE
  );

  return (
    <form action={formAction} className="mt-5 space-y-4">
      {required ? (
        <div className="rounded-xl border border-amber-600 bg-amber-950/40 p-4 text-sm leading-6 text-amber-100">
          This account is using a temporary password. Replace it before continuing to other ParadeOne tools.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-200">New password</span>
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
          <span className="text-sm font-medium text-slate-200">Confirm new password</span>
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
        className="inline-flex rounded-xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Updating password…" : required ? "Replace temporary password" : "Change password"}
      </button>
    </form>
  );
}
