export type ParadeUnitCheckInStatus =
  | "not_checked_in"
  | "checked_in"
  | "staged"
  | "rolling"
  | "completed"
  | "issue";

export type ParadeUnitGpsStatus =
  | "not_enabled"
  | "waiting"
  | "active"
  | "stale"
  | "lost";

export type ParadeUnit = {
  id: string;
  event_id: string;
  organization_id: string;
  entry_number: number | null;
  name: string;
  unit_type: string;
  category: string | null;
  captain_name: string | null;
  captain_email: string | null;
  captain_phone: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_description: string | null;
  check_in_status: ParadeUnitCheckInStatus;
  gps_status: ParadeUnitGpsStatus;
  staging_location: string | null;
  lineup_position: number | null;
  announcer_script: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ParadeUnitCreateInput = {
  event_id: string;
  organization_id: string;
  entry_number?: number | null;
  name: string;
  unit_type?: string;
  category?: string | null;
  captain_name?: string | null;
  captain_email?: string | null;
  captain_phone?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  vehicle_description?: string | null;
  check_in_status?: ParadeUnitCheckInStatus;
  gps_status?: ParadeUnitGpsStatus;
  staging_location?: string | null;
  lineup_position?: number | null;
  announcer_script?: string | null;
  notes?: string | null;
};

export type ParadeUnitUpdateInput = Partial<ParadeUnitCreateInput>;
