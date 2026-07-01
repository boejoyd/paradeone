import { StatusBadge } from "@/components/ui/StatusBadge";

type AssignedEntry = {
  id: string;
  name: string;
  check_in_status: string | null;
};

type StagingSpot = {
  id: string;
  spot_code: string;
  section: string | null;
  street_name: string | null;
  geofence_radius_feet: number;
  reserved_length_feet: number | null;
  entries?: AssignedEntry[] | AssignedEntry | null;
};

type StagingMapProps = {
  spots: StagingSpot[];
};

export function StagingMap({ spots }: StagingMapProps) {
  const groupedSpots = spots.reduce<Record<string, StagingSpot[]>>(
    (groups, spot) => {
      const section = spot.section || "Unassigned Section";

      if (!groups[section]) {
        groups[section] = [];
      }

      groups[section].push(spot);
      return groups;
    },
    {}
  );

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-500">
          Staging Map
        </p>
        <h3 className="mt-3 text-2xl font-bold text-white">
          Operational Layout
        </h3>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedSpots).map(([section, sectionSpots]) => (
          <div
            key={section}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xl font-semibold text-white">{section}</h4>
                <p className="text-sm text-slate-400">
                  {sectionSpots.length} staging spots
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
		{sectionSpots.map((spot) => {
  		const assignedEntry = Array.isArray(spot.entries)
 		   ? spot.entries[0]
		   : spot.entries;
		  const status = assignedEntry?.check_in_status || "empty";
		  return (
		    <div
		      key={spot.id}
		      className="rounded-2xl border border-slate-700 bg-slate-950 p-4"
		    >
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Spot
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {spot.spot_code}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    {spot.street_name || "No street assigned"}
                  </p>
		<p className="mt-3 text-sm font-semibold text-white">
		  {assignedEntry?.name || "Empty Spot"}
		</p>


		<div className="mt-2">
		  <StatusBadge status={status} />
		</div>

                  <p className="mt-3 text-xs text-slate-500">
                    Radius: {spot.geofence_radius_feet} ft
                  </p>
		  </div>
		  );
		})}

            </div>
          </div>
        ))}

        {spots.length === 0 && (
          <p className="text-slate-400">
            No staging spots yet. Add spots to build the map.
          </p>
        )}
      </div>
    </div>
  );
}
