create table if not exists participant_access_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  organization_id uuid not null references organizations(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  entry_id uuid not null references entries(id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists participant_access_tokens_event_id_idx
  on participant_access_tokens (event_id);

create index if not exists participant_access_tokens_entry_id_idx
  on participant_access_tokens (entry_id);

create unique index if not exists participant_access_tokens_active_entry_idx
  on participant_access_tokens (entry_id)
  where revoked_at is null;
