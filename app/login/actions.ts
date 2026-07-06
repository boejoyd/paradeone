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

  return "/dashboard";
}

function getLoginRedirect(redirectTo: string) {
  return `/login?redirect=${encodeURIComponent(redirectTo)}`;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = getRedirectTarget(formData.get("redirect"));

  if (!email || !password) {
    redirect(getLoginRedirect(redirectTo));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(getLoginRedirect(redirectTo));
  }

  revalidatePath("/");
  redirect(redirectTo);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = getRedirectTarget(formData.get("redirect"));

  if (!email || !password) {
    redirect(getLoginRedirect(redirectTo));
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
    redirect(getLoginRedirect(redirectTo));
  }

  if (data.session) {
    revalidatePath("/");
    redirect(redirectTo);
  }

  redirect(getLoginRedirect(redirectTo));
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  revalidatePath("/");
  redirect("/login");
}
