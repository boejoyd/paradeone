alter table entries
  add column route_state text not null default 'staged' check (
    route_state in ('staged', 'pushed_off', 'approaching_start', 'on_route', 'approaching_finish', 'completed')
  ),
  add column route_state_updated_at timestamptz not null default now(),
  add column approaching_start_at timestamptz,
  add column on_route_at timestamptz,
  add column approaching_finish_at timestamptz,
  add column route_completed_at timestamptz,
  add column finish_confirmed_at timestamptz,
  add column route_candidate_state text check (
    route_candidate_state is null or route_candidate_state in ('approaching_start', 'on_route', 'approaching_finish', 'completed')
  ),
  add column route_candidate_count integer not null default 0,
  add column route_candidate_since timestamptz,
  add column route_state_manual_override_at timestamptz;

update entries
set route_state = 'pushed_off', route_state_updated_at = coalesce(pushed_off_at, now())
where pushed_off_at is not null;

alter table check_ins
  add column accuracy_meters double precision check (accuracy_meters is null or accuracy_meters >= 0);

create table entry_route_state_events (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  entry_id uuid not null references entries(id) on delete cascade,
  from_state text,
  to_state text not null check (
    to_state in ('staged', 'pushed_off', 'approaching_start', 'on_route', 'approaching_finish', 'completed')
  ),
  transition_source text not null check (transition_source in ('automatic', 'manual', 'push_off')),
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  created_at timestamptz not null default now()
);

create index entry_route_state_events_entry_created_idx
  on entry_route_state_events(entry_id, created_at desc);

