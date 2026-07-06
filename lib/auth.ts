import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "./supabase/server";

export type OrganizationRole = "owner" | "admin" | "staff" | "volunteer";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getUserOrganizationIds(userId: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);

  if (error) {
    return [];
  }

  return (data ?? [])
    .map((item) => item.organization_id)
    .filter((id): id is string => typeof id === "string");
}

export async function requireOrganizationAccess(
  organizationId: string
): Promise<{ id: string; role: OrganizationRole }> {
  const user = await requireUser();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    redirect("/");
  }

  return {
    id: data.id,
    role: data.role as OrganizationRole,
  };
}

export async function requireOrganizationRole(
  organizationId: string,
  allowedRoles: readonly OrganizationRole[]
): Promise<User> {
  const user = await requireUser();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    redirect("/");
  }

  const role = data?.role as OrganizationRole | null;

  if (!role || !allowedRoles.includes(role)) {
    redirect("/");
  }

  return user;
}
