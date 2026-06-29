create extension if not exists "uuid-ossp";

create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  event_date date,
  start_time time,
  city text,
  expected_entries int,
  staging_sections int,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);
