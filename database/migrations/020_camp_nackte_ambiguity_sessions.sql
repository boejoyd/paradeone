create table camp_guest_ambiguity_sessions (
  id uuid primary key default uuid_generate_v4(),
  token_hash text not null unique,
  candidate_guest_ids uuid[] not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check (cardinality(candidate_guest_ids) > 1)
);

create index camp_guest_ambiguity_sessions_expiry_idx
  on camp_guest_ambiguity_sessions(expires_at);

alter table camp_guest_ambiguity_sessions enable row level security;
