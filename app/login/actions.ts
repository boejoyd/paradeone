"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function getRedirectTarget(value: FormDataEntryValue | null) {
  const redirectValue = String(value ?? "").trim();

  if (redirectValue.startsWith("/")) {
    return redirectValue;
  }

  return "/";
}

function getLoginRedirect(redirectTo: string, message?: string) {
  const params = new URLSearchParams({ redirect: redirectTo });

  if (message) {
    params.set("message", message);
  }

  return `/login?${params.toString()}`;
}

function getErrorMessage(error: { message?: string } | null | undefined) {
  return error?.message?.trim() || "Authentication failed.";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = getRedirectTarget(formData.get("redirect"));

  if (!email || !password) {
    redirect(getLoginRedirect(redirectTo, "Please enter both your email and password."));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(getLoginRedirect(redirectTo, getErrorMessage(error)));
  }

  revalidatePath("/");
  redirect(redirectTo);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = getRedirectTarget(formData.get("redirect"));

  if (!email || !password) {
    redirect(getLoginRedirect(redirectTo, "Please enter both your email and password."));
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) {
    redirect(getLoginRedirect(redirectTo, getErrorMessage(error)));
  }

  if (data.session) {
    revalidatePath("/");
    redirect(redirectTo);
  }

  redirect(getLoginRedirect(redirectTo, "Please check your inbox to confirm your account before signing in."));
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  revalidatePath("/");
  redirect("/login");
}
