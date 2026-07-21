"use server";

import { revalidatePath } from "next/cache";

import { requireUser, type OrganizationRole } from "@/lib/auth";
import { createLocalOrganizationUser } from "@/lib/organizations/memberships";
import {
  canAssignOrganizationRole,
  canManageOrganizationUsers,
  isOrganizationRole,
} from "@/lib/organizations/permissions";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SettingsActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function errorState(message: string): SettingsActionState {
  return { status: "error", message };
}

function successState(message: string): SettingsActionState {
  return { status: "success", message };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export async function createLocalUserAccount(
  _previousState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const organizationId = String(formData.get("organizationId") || "").trim();
  const displayName = String(formData.get("displayName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const requestedRole = String(formData.get("role") || "").trim();

  if (!organizationId || !email || !isOrganizationRole(requestedRole)) {
    return errorState("Organization, email, and permission role are required.");
  }

  if (!email.includes("@")) {
    return errorState("Enter a valid email address.");
  }

  if (displayName.length > 100) {
    return errorState("Display name must be 100 characters or fewer.");
  }

  if (password.length < 10) {
    return errorState("Temporary passwords must be at least 10 characters.");
  }

  if (password !== confirmPassword) {
    return errorState("The temporary passwords do not match.");
  }

  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership?.role) {
    return errorState("You do not have access to manage this organization.");
  }

  const managerRole = membership.role as OrganizationRole;
  if (!canManageOrganizationUsers(managerRole)) {
    return errorState("Only organization owners and admins can add accounts.");
  }

  if (!canAssignOrganizationRole(managerRole, requestedRole)) {
    return errorState("Your role cannot assign the selected permission level.");
  }

  try {
    await createLocalOrganizationUser({
      organizationId,
      email,
      password,
      displayName,
      role: requestedRole,
      createdByUserId: user.id,
    });
  } catch (error) {
    return errorState(getErrorMessage(error, "Unable to create the local account."));
  }

  revalidatePath("/settings");
  return successState(
    `Created ${email}. The user must replace the temporary password at first sign-in.`
  );
}

export async function changeOwnPassword(
  _previousState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (password.length < 10) {
    return errorState("Your new password must be at least 10 characters.");
  }

  if (password !== confirmPassword) {
    return errorState("The new passwords do not match.");
  }

  const user = await requireUser();
  const requiresPasswordChange = user.app_metadata?.requires_password_change === true;
  const adminSupabase = requiresPasswordChange ? createAdminSupabaseClient() : null;
  if (requiresPasswordChange && !adminSupabase) {
    return errorState("Password management is not configured on this deployment.");
  }

  const supabase = await createServerSupabaseClient();
  const { error: passwordError } = await supabase.auth.updateUser({ password });

  if (passwordError) {
    return errorState(passwordError.message);
  }

  if (requiresPasswordChange && adminSupabase) {
    const { error: metadataError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...user.app_metadata,
        requires_password_change: false,
      },
    });

    if (metadataError) {
      return errorState(
        "The password changed, but the first-sign-in requirement could not be cleared. Please submit it once more."
      );
    }
  }

  revalidatePath("/settings");
  return successState("Your password has been updated.");
}
