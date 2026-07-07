"use client";

import { useMemo, useState } from "react";
import { DangerZone } from "@/components/layout/DangerZone";
import { Button } from "@/components/ui/Button";
import { archiveOrDeleteOrganization } from "./actions";

type OrganizationDangerZoneFormProps = {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
};

export function OrganizationDangerZoneForm({
  organizationId,
  organizationSlug,
  organizationName,
}: OrganizationDangerZoneFormProps) {
  const [confirmationName, setConfirmationName] = useState("");
  const [finalConfirmation, setFinalConfirmation] = useState(false);

  const canSubmit = useMemo(() => {
    return confirmationName.trim() === organizationName.trim() && finalConfirmation;
  }, [confirmationName, finalConfirmation, organizationName]);

  return (
    <DangerZone
      description="This action is destructive. ParadeOne will archive this organization when archiving is supported. Otherwise, it will permanently delete the organization."
    >
      <form action={archiveOrDeleteOrganization} className="space-y-4">
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="organizationSlug" value={organizationSlug} />
        <input type="hidden" name="expectedName" value={organizationName} />
        <input type="hidden" name="finalConfirmation" value={finalConfirmation ? "YES" : ""} />

        <label className="grid gap-2">
          <span className="text-sm font-medium text-red-200">
            Type the organization name to continue
          </span>
          <input
            name="confirmationName"
            value={confirmationName}
            onChange={(event) => setConfirmationName(event.target.value)}
            className="rounded-xl border border-red-800 bg-slate-950 px-4 py-3 text-white"
            placeholder={organizationName}
            required
          />
        </label>

        <label className="flex items-start gap-2 text-sm text-red-200">
          <input
            type="checkbox"
            checked={finalConfirmation}
            onChange={(event) => setFinalConfirmation(event.target.checked)}
            className="mt-1"
            required
          />
          <span>
            I understand this is the final confirmation and this action cannot be
            safely undone.
          </span>
        </label>

        <Button type="submit" variant="secondary" disabled={!canSubmit}>
          Archive Organization
        </Button>
      </form>
    </DangerZone>
  );
}
