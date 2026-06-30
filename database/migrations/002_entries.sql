create table entries (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  entry_type text not null default 'float',
  status text not null default 'draft',
  contact_name text,
  contact_email text,
  contact_phone text,
  announcer_script text,
  estimated_length_feet int,
  created_at timestamptz not null default now()
);
