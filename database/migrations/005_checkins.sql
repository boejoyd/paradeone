create table check_ins (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid not null references entries(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  staging_spot_id uuid references staging_spots(id) on delete set null,
  checked_in_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  distance_from_spot_feet double precision,
  method text not null default 'self',
  created_at timestamptz not null default now()
);
