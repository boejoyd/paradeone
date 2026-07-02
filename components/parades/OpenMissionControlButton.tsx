"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ACTIVE_PARADE_KEY } from "@/lib/activeParade";

type OpenMissionControlButtonProps = {
  href: string;
  organizationName: string;
  organizationSlug: string;
  paradeId: string;
  paradeName: string;
};

export function OpenMissionControlButton({
  href,
  organizationName,
  organizationSlug,
  paradeId,
  paradeName,
}: OpenMissionControlButtonProps) {
  function setActiveParade() {
    window.localStorage.setItem(
      ACTIVE_PARADE_KEY,
      JSON.stringify({
        organizationName,
        organizationSlug,
        paradeId,
        paradeName,
      })
    );
  }

  return (
    <Link href={href} onClick={setActiveParade}>
      <Button>Open Parade</Button>
    </Link>
  );
}
