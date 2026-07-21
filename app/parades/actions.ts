"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ACTIVE_PARADE_KEY,
  ACTIVE_PARADE_MAX_AGE_SECONDS,
} from "@/lib/activeParade";
import { requireAccessibleEventContext } from "@/lib/organizations/access";

export async function activateParadeAction(formData: FormData) {
  const organizationSlug = String(formData.get("organizationSlug") || "").trim();
  const paradeId = String(formData.get("paradeId") || "").trim();
  const destination = String(formData.get("destination") || "parade").trim();

  if (!organizationSlug || !paradeId) {
    throw new Error("Organization and parade are required.");
  }

  await requireAccessibleEventContext(organizationSlug, paradeId);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PARADE_KEY, paradeId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ACTIVE_PARADE_MAX_AGE_SECONDS,
    path: "/",
  });

  redirect(
    destination === "mission-control"
      ? "/"
      : `/organizations/${encodeURIComponent(organizationSlug)}/parades/${encodeURIComponent(paradeId)}`
  );
}
