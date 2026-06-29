create extension if not exists "uuid-ossp";

create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key,
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create table events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  event_date date,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table zones (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  zone_type text,
  created_at timestamptz not null default now()
);

create table sections (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  status text not null default 'holding',
  created_at timestamptz not null default now()
);

create table staging_spots (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  section_id uuid references sections(id) on delete set null,
  zone_id uuid references zones(id) on delete set null,
  spot_code text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  geofence_radius_feet int not null default 125,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, spot_code)
);

create table parade_numbers (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  number int not null,
  section_id uuid references sections(id) on delete set null,
  staging_spot_id uuid references staging_spots(id) on delete set null,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  unique (event_id, number)
);
