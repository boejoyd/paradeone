import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import { signIn, signUp } from "./actions";

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
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
            ParadeOne
          </p>
          <h1 className="text-4xl font-semibold">Welcome back</h1>
          <p className="text-lg text-slate-400">
            Sign in to manage your parade operations or create a new account.
          </p>
        </div>

        {message ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
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
              <Button type="submit">Sign in</Button>
            </form>
          </Card>

          <Card title="Create account">
            <form action={signUp} className="mt-4 space-y-4">
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
              <Button type="submit" variant="secondary">
                Create account
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
