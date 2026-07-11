create table parade_routes (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null unique references events(id) on delete cascade,
  route_geometry jsonb,
  corridor_width_feet integer not null default 60 check (corridor_width_feet > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table route_checkpoints (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  checkpoint_type text not null check (
    checkpoint_type in ('route_start', 'intermediate', 'route_finish', 'dispersal_exit')
  ),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  geofence_radius_feet integer not null default 100 check (geofence_radius_feet > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index route_checkpoints_event_sort_idx
  on route_checkpoints(event_id, sort_order, created_at);

create unique index route_checkpoints_one_start_per_event_idx
  on route_checkpoints(event_id) where checkpoint_type = 'route_start';
create unique index route_checkpoints_one_finish_per_event_idx
  on route_checkpoints(event_id) where checkpoint_type = 'route_finish';
create unique index route_checkpoints_one_exit_per_event_idx
  on route_checkpoints(event_id) where checkpoint_type = 'dispersal_exit';

