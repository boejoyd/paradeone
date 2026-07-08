import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { OrganizationRole } from "@/lib/auth";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function ensureOrganizationMembership(input: {
  organizationId: string;
  userId: string;
  email?: string | null;
  role: OrganizationRole;
}) {
  const supabase = await createServerSupabaseClient();
  const normalizedEmail = input.email ? normalizeEmail(input.email) : null;

  const { error } = await supabase.from("organization_members").upsert(
    {
      organization_id: input.organizationId,
      user_id: input.userId,
      member_email: normalizedEmail,
      role: input.role,
    },
    { onConflict: "organization_id,user_id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function findExistingUserByEmail(email: string): Promise<{ id: string; email: string | null } | null> {
  const adminSupabase = createAdminSupabaseClient();
  if (!adminSupabase) {
    return null;
  }

  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(error.message);
    }

    const users = data.users ?? [];
    const match = users.find((user) => normalizeEmail(user.email ?? "") === email);
    if (match) {
      return { id: match.id, email: match.email ?? null };
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

export async function addOrInviteOrganizationMember(input: {
  organizationId: string;
  email: string;
  role: OrganizationRole;
  invitedByUserId: string;
}) {
  const supabase = await createServerSupabaseClient();
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const existingUser = await findExistingUserByEmail(normalizedEmail);

  if (existingUser) {
    await ensureOrganizationMembership({
      organizationId: input.organizationId,
      userId: existingUser.id,
      email: existingUser.email ?? normalizedEmail,
      role: input.role,
    });

    const { error: inviteCleanupError } = await supabase
      .from("organization_invites")
      .update({ status: "accepted" })
      .eq("organization_id", input.organizationId)
      .eq("email", normalizedEmail)
      .eq("status", "pending");

    if (inviteCleanupError) {
      throw new Error(inviteCleanupError.message);
    }

    return { status: "member_added" as const };
  }

  const { error } = await supabase.from("organization_invites").upsert(
    {
      organization_id: input.organizationId,
      email: normalizedEmail,
      role: input.role,
      invited_by_user_id: input.invitedByUserId,
      status: "pending",
    },
    { onConflict: "organization_id,email,status" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return { status: "invite_pending" as const };
}
