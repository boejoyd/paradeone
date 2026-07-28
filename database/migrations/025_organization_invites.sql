-- Ensure the organization invitation table exists for Team & Permissions.
-- This migration is intentionally idempotent so it can repair deployments where
-- organization_members exists but organization_invites was never created.

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'staff', 'volunteer')),
  invited_by_user_id uuid,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Normalize email matching so duplicate pending invitations cannot differ only by case.
update public.organization_invites
set email = lower(trim(email))
where email <> lower(trim(email));

-- Replace any older status constraint with the statuses used by the application.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.organization_invites'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format(
      'alter table public.organization_invites drop constraint %I',
      constraint_name
    );
  end loop;
end
$$;

alter table public.organization_invites
  add constraint organization_invites_status_check
  check (status in ('pending', 'accepted', 'cancelled', 'revoked'));

create index if not exists organization_invites_organization_id_idx
  on public.organization_invites (organization_id);

create index if not exists organization_invites_email_idx
  on public.organization_invites (email);

create unique index if not exists organization_invites_org_email_status_idx
  on public.organization_invites (organization_id, lower(email), status);

-- Team management reads and writes invitations only through the server-side
-- service-role client. RLS prevents direct browser access.
alter table public.organization_invites enable row level security;

notify pgrst, 'reload schema';
