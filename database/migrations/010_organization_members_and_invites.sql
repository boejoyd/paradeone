create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,
  member_email text,
  role text not null check (role in ('owner', 'admin', 'staff', 'volunteer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_members_user_id_idx
  on organization_members (user_id);

create index if not exists organization_members_organization_id_idx
  on organization_members (organization_id);

create table if not exists organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'staff', 'volunteer')),
  invited_by_user_id uuid,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  unique (organization_id, email, status)
);

create index if not exists organization_invites_organization_id_idx
  on organization_invites (organization_id);

create index if not exists organization_invites_email_idx
  on organization_invites (email);
