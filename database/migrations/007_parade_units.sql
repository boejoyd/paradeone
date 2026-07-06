create table parade_units (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  entry_number integer,
  name text not null,
  unit_type text not null default 'float',
  category text,
  captain_name text,
  captain_email text,
  captain_phone text,
  driver_name text,
  driver_phone text,
  vehicle_description text,
  check_in_status text not null default 'not_checked_in' check (
    check_in_status in (
      'not_checked_in',
      'checked_in',
      'staged',
      'rolling',
      'completed',
      'issue'
    )
  ),
  gps_status text not null default 'not_enabled' check (
    gps_status in (
      'not_enabled',
      'waiting',
      'active',
      'stale',
      'lost'
    )
  ),
  staging_location text,
  lineup_position integer,
  announcer_script text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index parade_units_event_id_idx on parade_units(event_id);
create index parade_units_organization_id_idx on parade_units(organization_id);
create index parade_units_check_in_status_idx on parade_units(check_in_status);
create index parade_units_lineup_position_idx on parade_units(lineup_position);

create or replace function set_parade_units_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger parade_units_set_updated_at
before update on parade_units
for each row
execute function set_parade_units_updated_at();
