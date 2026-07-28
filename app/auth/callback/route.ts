import { NextResponse, type NextRequest } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeRedirectPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(
    requestUrl.searchParams.get("redirect") ?? requestUrl.searchParams.get("next")
  );

  if (!code) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const email = user?.email?.trim().toLowerCase();
  const adminSupabase = createAdminSupabaseClient();

  if (user && email && adminSupabase) {
    const { data: invites, error: inviteLookupError } = await adminSupabase
      .from("organization_invites")
      .select("id, organization_id, role")
      .eq("email", email)
      .eq("status", "pending");

    if (!inviteLookupError) {
      for (const invite of invites ?? []) {
        const { error: membershipError } = await adminSupabase
          .from("organization_members")
          .upsert(
            {
              organization_id: invite.organization_id,
              user_id: user.id,
              member_email: email,
              role: invite.role,
            },
            { onConflict: "organization_id,user_id" }
          );

        if (membershipError) {
          continue;
        }

        await adminSupabase
          .from("organization_invites")
          .update({ status: "accepted" })
          .eq("id", invite.id)
          .eq("status", "pending");
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
