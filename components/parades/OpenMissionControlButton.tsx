import { activateParadeAction } from "@/app/parades/actions";
import { Button } from "@/components/ui/Button";

type OpenMissionControlButtonProps = {
  organizationSlug: string;
  paradeId: string;
  destination?: "parade" | "mission-control";
  label?: string;
};

export function OpenMissionControlButton({
  organizationSlug,
  paradeId,
  destination = "parade",
  label = "Open Parade",
}: OpenMissionControlButtonProps) {
  return (
    <form action={activateParadeAction}>
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <input type="hidden" name="paradeId" value={paradeId} />
      <input type="hidden" name="destination" value={destination} />
      <Button type="submit">{label}</Button>
    </form>
  );
}
