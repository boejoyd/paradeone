"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addOrInviteOrganizationMember } from "@/lib/organizations/memberships";
import { requireOrganizationRole, requireUser, type OrganizationRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function parseRole(value: FormDataEntryValue | null): OrganizationRole {
  const role = String(value || "").trim();

  if (role === "owner" || role === "admin" || role === "staff" || role === "volunteer") {
    return role;
  }

  return "volunteer";
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
  await requireOrganizationRole(organizationId, ["owner", "admin"]);

  await addOrInviteOrganizationMember({
    organizationId,
    email,
    role,
    invitedByUserId: user.id,
  });

  revalidatePath(`/organizations/${organizationSlug}/settings`);
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
