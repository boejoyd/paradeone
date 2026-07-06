create table parade_units (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  entry_number integer,
  name text not null,
  unit_type text,
  category text,
  captain_name text,
  captain_email text,
  captain_phone text,
  driver_name text,
  driver_phone text,
  vehicle_description text,
  check_in_status text not null default 'not_checked_in',
  gps_status text not null default 'not_enabled',
  staging_location text,
  lineup_position integer,
  announcer_script text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parade_units_check_in_status_check check (
    check_in_status in (
      'not_checked_in',
      'checked_in',
      'staged',
      'rolling',
      'completed',
      'issue'
    )
  ),
  constraint parade_units_gps_status_check check (
    gps_status in (
      'not_enabled',
      'waiting',
      'active',
      'stale',
      'lost'
    )
  )
);

create index parade_units_event_id_idx on parade_units (event_id);
create index parade_units_organization_id_idx on parade_units (organization_id);
create index parade_units_check_in_status_idx on parade_units (check_in_status);
create index parade_units_lineup_position_idx on parade_units (lineup_position);
create index parade_units_event_id_lineup_position_idx
  on parade_units (event_id, lineup_position);
