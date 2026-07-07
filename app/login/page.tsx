import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import { signIn } from "./actions";

type LoginPageProps = {
  searchParams?: Promise<{
    redirect?: string | string[];
    message?: string | string[];
  }>;
};

function getRedirectTarget(value: string | string[] | undefined) {
  if (typeof value === "string" && value.startsWith("/")) {
    return value;
  }

  return "/";
}

function getMessage(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  return undefined;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const redirectTo = getRedirectTarget(resolvedSearchParams?.redirect);
  const message = getMessage(resolvedSearchParams?.message);
  const user = await getCurrentUser();

  if (user) {
    redirect(redirectTo);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
              ParadeOne
            </p>
            <h1 className="text-4xl font-semibold">Professional Parade Management</h1>
            <p className="text-lg text-slate-400">
              Manage organizations, registrations, lineups, check-in, GPS tracking,
              and Mission Control from one place.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              href="/signup"
              className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-white"
            >
              Create Account
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        ) : null}

        <div className="mt-12 flex flex-1 items-start justify-center">
          <div className="w-full max-w-xl">
            <Card title="Sign in">
              <form action={signIn} className="mt-4 space-y-4">
                <input type="hidden" name="redirect" value={redirectTo} />
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Email</span>
                  <input
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-blue-400"
                    name="email"
                    type="email"
                    required
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Password</span>
                  <input
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-blue-400"
                    name="password"
                    type="password"
                    required
                  />
                </label>
                <div className="flex items-center justify-between gap-4 pt-2">
                  <p className="text-sm text-slate-400">
                    Sign in to continue to your redirect destination.
                  </p>
                  <Button type="submit">Sign in</Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
