import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import { signUp } from "@/app/login/actions";

type SignupPageProps = {
  searchParams?: Promise<{
    redirect?: string | string[];
  }>;
};

function getRedirectTarget(value: string | string[] | undefined) {
  if (typeof value === "string" && value.startsWith("/")) {
    return value;
  }

  return "/";
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const redirectTo = getRedirectTarget(resolvedSearchParams?.redirect);
  const user = await getCurrentUser();
  const loginHref = `/login?redirect=${encodeURIComponent(redirectTo)}`;

  if (user) {
    redirect(redirectTo);
  }

  return (
    <main className="min-h-screen bg-slate-900 px-6 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
            ParadeOne
          </p>
          <h1 className="text-4xl font-semibold">Create your account</h1>
          <p className="text-lg text-slate-300">
            Set up your account to start managing parade operations.
          </p>
        </div>

        <div className="mt-12 flex flex-1 items-start justify-center">
          <div className="w-full max-w-xl">
            <Card title="Create account">
              <form action={signUp} className="mt-4 space-y-4">
                <input type="hidden" name="redirect" value={redirectTo} />
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Email</span>
                  <input
                    className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-blue-400"
                    name="email"
                    type="email"
                    required
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Password</span>
                  <input
                    className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-blue-400"
                    name="password"
                    type="password"
                    required
                  />
                </label>
                <Button type="submit" variant="secondary">
                  Create Account
                </Button>
              </form>
              <div className="mt-6 text-sm text-slate-300">
                Already have an account?{" "}
                <Link
                  href={loginHref}
                  className="font-semibold text-slate-100 hover:text-blue-400"
                >
                  Sign In
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
