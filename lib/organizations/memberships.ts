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
  const supabase = createAdminSupabaseClient() ?? (await createServerSupabaseClient());
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

export async function createLocalOrganizationUser(input: {
  organizationId: string;
  email: string;
  password: string;
  displayName?: string | null;
  role: OrganizationRole;
  createdByUserId: string;
}) {
  const adminSupabase = createAdminSupabaseClient();
  if (!adminSupabase) {
    throw new Error("Local account creation is not configured on this deployment.");
  }

  const normalizedEmail = normalizeEmail(input.email);
  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const existingUser = await findExistingUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new Error(
      "An account with this email already exists. Add it through the organization invite screen instead."
    );
  }

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email: normalizedEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      display_name: input.displayName?.trim() || null,
    },
    app_metadata: {
      local_account: true,
      requires_password_change: true,
      created_by_user_id: input.createdByUserId,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Unable to create the local account.");
  }

  try {
    const { error: membershipError } = await adminSupabase
      .from("organization_members")
      .upsert(
        {
          organization_id: input.organizationId,
          user_id: data.user.id,
          member_email: normalizedEmail,
          role: input.role,
        },
        { onConflict: "organization_id,user_id" }
      );

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    const { error: inviteCleanupError } = await adminSupabase
      .from("organization_invites")
      .update({ status: "accepted" })
      .eq("organization_id", input.organizationId)
      .eq("email", normalizedEmail)
      .eq("status", "pending");

    if (inviteCleanupError) {
      throw new Error(inviteCleanupError.message);
    }
  } catch (membershipError) {
    await adminSupabase.auth.admin.deleteUser(data.user.id);
    throw membershipError;
  }

  return {
    id: data.user.id,
    email: normalizedEmail,
  };
}

export async function addOrInviteOrganizationMember(input: {
  organizationId: string;
  email: string;
  role: OrganizationRole;
  invitedByUserId: string;
}) {
  const adminSupabase = createAdminSupabaseClient();
  if (!adminSupabase) {
    throw new Error("Organization invitations are not configured on this deployment.");
  }

  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const existingUser = await findExistingUserByEmail(normalizedEmail);

  if (existingUser) {
    const { error: membershipError } = await adminSupabase
      .from("organization_members")
      .upsert(
        {
          organization_id: input.organizationId,
          user_id: existingUser.id,
          member_email: existingUser.email ?? normalizedEmail,
          role: input.role,
        },
        { onConflict: "organization_id,user_id" }
      );

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    const { error: inviteCleanupError } = await adminSupabase
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

  const { error } = await adminSupabase.from("organization_invites").upsert(
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
