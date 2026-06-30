create table staging_spots (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  spot_code text not null,
  section text,
  street_name text,
  latitude double precision,
  longitude double precision,
  geofence_radius_feet int not null default 125,
  reserved_length_feet int,
  reserved_width_feet int,
  sort_order int,
  created_at timestamptz not null default now(),
  unique(event_id, spot_code)
);

alter table entries
add column staging_spot_id uuid references staging_spots(id) on delete set null;
