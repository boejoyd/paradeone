"use server";

import { redirect } from "next/navigation";
import { requireOrganizationRole } from "@/lib/auth";
import { createParadeUnit } from "@/lib/parade-units/service";

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createParadeUnitAction(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim();
  const eventId = String(formData.get("eventId") || "").trim();
  const organizationId = String(formData.get("organizationId") || "").trim();

  await requireOrganizationRole(organizationId, ["owner", "admin", "staff"]);

  const unit = await createParadeUnit({
    event_id: eventId,
    organization_id: organizationId,
    entry_number: parseOptionalNumber(formData.get("entryNumber")),
    name: String(formData.get("name") || "").trim(),
    category: String(formData.get("category") || "").trim() || null,
    unit_type: String(formData.get("unitType") || "").trim() || "float",
    captain_name: String(formData.get("captainName") || "").trim() || null,
    captain_email: String(formData.get("captainEmail") || "").trim() || null,
    captain_phone: String(formData.get("captainPhone") || "").trim() || null,
    driver_name: String(formData.get("driverName") || "").trim() || null,
    driver_phone: String(formData.get("driverPhone") || "").trim() || null,
    vehicle_description:
      String(formData.get("vehicleDescription") || "").trim() || null,
    announcer_script:
      String(formData.get("announcerScript") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
  });

  redirect(`/organizations/${slug}/parades/${eventId}/units/${unit.id}`);
}
