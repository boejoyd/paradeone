import "server-only";

import { requireUser } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function requireQuickBooksAdministrator() {
  const user = await requireUser();
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("The database service is not configured.");
  const { data, error } = await supabase.from("organization_members")
    .select("id")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Owner or administrator access is required.");
  return user;
}
