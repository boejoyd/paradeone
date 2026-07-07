"use server";

import { redirect } from "next/navigation";
import { requireOrganizationRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

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
