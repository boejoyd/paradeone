"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addOrInviteOrganizationMember } from "@/lib/organizations/memberships";
import {
  requireOrganizationAccess,
  requireOrganizationRole,
  requireUser,
  type OrganizationRole,
} from "@/lib/auth";
import {
  canAssignOrganizationRole,
  canManageOrganizationMember,
  canManageOrganizationUsers,
  isOrganizationRole,
} from "@/lib/organizations/permissions";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { supabase } from "@/lib/supabase";

function parseRole(value: FormDataEntryValue | null): OrganizationRole {
  const role = String(value || "").trim();
  return isOrganizationRole(role) ? role : "volunteer";
}

function settingsPath(organizationSlug: string) {
  return `/organizations/${organizationSlug}/settings`;
}

function getAdminClient() {
  const adminSupabase = createAdminSupabaseClient();
  if (!adminSupabase) {
    throw new Error("Team management is not configured on this deployment.");
  }
  return adminSupabase;
}

async function requireTeamManager(organizationId: string) {
  const access = await requireOrganizationAccess(organizationId);
  if (!canManageOrganizationUsers(access.role)) {
    throw new Error("Your organization role cannot manage team members.");
  }
  return access;
}

async function ensureAnotherOwnerExists(
  organizationId: string,
  targetMembershipId: string
) {
  const adminSupabase = getAdminClient();
  const { count, error } = await adminSupabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .neq("id", targetMembershipId);

  if (error) throw new Error(error.message);
  if (!count) {
    throw new Error("The final organization owner cannot be demoted or removed.");
  }
}

export async function addOrganizationMemberOrInvite(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "").trim();
  const organizationSlug = String(formData.get("organizationSlug") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const role = parseRole(formData.get("role"));

  if (!organizationId || !organizationSlug || !email) {
    throw new Error("Organization, role, and email are required.");
  }

  const user = await requireUser();
  const access = await requireTeamManager(organizationId);

  if (!canAssignOrganizationRole(access.role, role)) {
    throw new Error("Your organization role cannot assign that permission level.");
  }

  await addOrInviteOrganizationMember({
    organizationId,
    email,
    role,
    invitedByUserId: user.id,
  });

  revalidatePath(settingsPath(organizationSlug));
}

export async function updateOrganizationMemberRole(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "").trim();
  const organizationSlug = String(formData.get("organizationSlug") || "").trim();
  const membershipId = String(formData.get("membershipId") || "").trim();
  const role = parseRole(formData.get("role"));

  if (!organizationId || !organizationSlug || !membershipId) {
    throw new Error("Missing team member information.");
  }

  const access = await requireTeamManager(organizationId);
  const adminSupabase = getAdminClient();
  const { data: target, error: targetError } = await adminSupabase
    .from("organization_members")
    .select("id, role")
    .eq("id", membershipId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (targetError || !target || !isOrganizationRole(target.role)) {
    throw new Error(targetError?.message || "Team member not found.");
  }

  if (
    !canManageOrganizationMember(access.role, target.role) ||
    !canAssignOrganizationRole(access.role, role)
  ) {
    throw new Error("Your organization role cannot make that role change.");
  }

  if (target.role === "owner" && role !== "owner") {
    await ensureAnotherOwnerExists(organizationId, membershipId);
  }

  const { error } = await adminSupabase
    .from("organization_members")
    .update({ role })
    .eq("id", membershipId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(settingsPath(organizationSlug));
}

export async function removeOrganizationMember(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "").trim();
  const organizationSlug = String(formData.get("organizationSlug") || "").trim();
  const membershipId = String(formData.get("membershipId") || "").trim();

  if (!organizationId || !organizationSlug || !membershipId) {
    throw new Error("Missing team member information.");
  }

  const access = await requireTeamManager(organizationId);
  const adminSupabase = getAdminClient();
  const { data: target, error: targetError } = await adminSupabase
    .from("organization_members")
    .select("id, role")
    .eq("id", membershipId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (targetError || !target || !isOrganizationRole(target.role)) {
    throw new Error(targetError?.message || "Team member not found.");
  }

  if (!canManageOrganizationMember(access.role, target.role)) {
    throw new Error("Your organization role cannot remove this team member.");
  }

  if (target.role === "owner") {
    await ensureAnotherOwnerExists(organizationId, membershipId);
  }

  const { error } = await adminSupabase
    .from("organization_members")
    .delete()
    .eq("id", membershipId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(settingsPath(organizationSlug));
}

export async function cancelOrganizationInvite(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "").trim();
  const organizationSlug = String(formData.get("organizationSlug") || "").trim();
  const inviteId = String(formData.get("inviteId") || "").trim();

  if (!organizationId || !organizationSlug || !inviteId) {
    throw new Error("Missing invitation information.");
  }

  const access = await requireTeamManager(organizationId);
  const adminSupabase = getAdminClient();
  const { data: invite, error: inviteError } = await adminSupabase
    .from("organization_invites")
    .select("id, role")
    .eq("id", inviteId)
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .maybeSingle();

  if (inviteError || !invite || !isOrganizationRole(invite.role)) {
    throw new Error(inviteError?.message || "Pending invitation not found.");
  }

  if (!canAssignOrganizationRole(access.role, invite.role)) {
    throw new Error("Your organization role cannot cancel this invitation.");
  }

  const { error } = await adminSupabase
    .from("organization_invites")
    .update({ status: "cancelled" })
    .eq("id", inviteId)
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  revalidatePath(settingsPath(organizationSlug));
}

type DestructiveActionInput = {
  organizationId: string;
  organizationSlug: string;
  expectedName: string;
  confirmationName: string;
  finalConfirmation: string;
};

async function supportsArchiveColumn(): Promise<boolean> {
  const { error } = await supabase
    .from("organizations")
    .select("archived_at")
    .limit(1);

  return !error;
}

function validateConfirmation(input: DestructiveActionInput) {
  const expected = input.expectedName.trim();
  const provided = input.confirmationName.trim();

  if (!expected || provided !== expected) {
    throw new Error("Organization name confirmation does not match.");
  }

  if (input.finalConfirmation !== "YES") {
    throw new Error("Final confirmation is required.");
  }
}

export async function archiveOrDeleteOrganization(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "").trim();
  const organizationSlug = String(formData.get("organizationSlug") || "").trim();
  const expectedName = String(formData.get("expectedName") || "").trim();
  const confirmationName = String(formData.get("confirmationName") || "").trim();
  const finalConfirmation = String(formData.get("finalConfirmation") || "").trim();

  if (!organizationId || !organizationSlug || !expectedName) {
    throw new Error("Missing organization data.");
  }

  await requireOrganizationRole(organizationId, ["owner"]);
  validateConfirmation({
    organizationId,
    organizationSlug,
    expectedName,
    confirmationName,
    finalConfirmation,
  });

  if (await supportsArchiveColumn()) {
    const { error } = await supabase
      .from("organizations")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", organizationId);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", organizationId);

    if (error) {
      throw new Error(error.message);
    }
  }

  redirect("/organizations");
}
