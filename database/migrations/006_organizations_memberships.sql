alter table organizations
  add column if not exists description text,
  add column if not exists archived_at timestamptz;

create table if not exists organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'staff',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
