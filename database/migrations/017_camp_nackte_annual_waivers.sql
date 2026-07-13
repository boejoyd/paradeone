create table camp_guests (
  id uuid primary key default uuid_generate_v4(),
  quickbooks_customer_id text unique,
  legal_name text not null check (char_length(trim(legal_name)) > 0),
  preferred_name text,
  email text,
  phone text,
  identity_corrected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index camp_guests_email_lookup_idx on camp_guests(lower(email)) where email is not null;
create index camp_guests_phone_lookup_idx on camp_guests(phone) where phone is not null;

create table day_pass_purchases (
  id uuid primary key default uuid_generate_v4(),
  quickbooks_sales_receipt_id text unique,
  quickbooks_customer_id text,
  quickbooks_line_id text,
  purchaser_name text not null,
  purchaser_email text,
  purchaser_phone text,
  purchase_date date not null,
  admission_date date,
  quantity integer not null check (quantity > 0),
  source text not null,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quickbooks_sales_receipt_id, quickbooks_line_id)
);

create table day_pass_attendees (
  id uuid primary key default uuid_generate_v4(),
  purchase_id uuid not null references day_pass_purchases(id) on delete cascade,
  slot_number integer not null check (slot_number > 0),
  guest_id uuid references camp_guests(id) on delete set null,
  attendee_name text,
  confirmation_code text not null unique,
  created_at timestamptz not null default now(),
  unique (purchase_id, slot_number)
);

alter table camp_nackte_waivers
  add column guest_id uuid references camp_guests(id) on delete restrict,
  add column signed_at timestamptz,
  add column expires_at timestamptz,
  add column waiver_version text,
  add column status text check (status in ('current', 'expired', 'superseded', 'revoked')),
  add column pdf_storage_path text,
  add column pdf_hash text,
  add column confirmation_number text,
  add column linked_day_pass_purchase_id uuid references day_pass_purchases(id) on delete set null;

update camp_nackte_waivers
set signed_at = coalesce(created_at, now()),
    expires_at = coalesce(created_at, now()) + interval '1 year',
    waiver_version = 'legacy',
    status = case when coalesce(created_at, now()) + interval '1 year' > now() then 'current' else 'expired' end,
    confirmation_number = 'LEGACY-' || upper(substr(replace(id::text, '-', ''), 1, 12));

alter table camp_nackte_waivers
  alter column signed_at set not null,
  alter column expires_at set not null,
  alter column waiver_version set not null,
  alter column status set not null,
  alter column confirmation_number set not null;

create unique index camp_nackte_waivers_confirmation_idx on camp_nackte_waivers(confirmation_number);
create unique index camp_nackte_waivers_one_current_per_guest_idx
  on camp_nackte_waivers(guest_id) where status = 'current' and guest_id is not null;
create index camp_nackte_waivers_guest_status_idx on camp_nackte_waivers(guest_id, status, expires_at desc);
create index day_pass_attendees_guest_idx on day_pass_attendees(guest_id);

create table camp_guest_lookup_sessions (
  id uuid primary key default uuid_generate_v4(),
  token_hash text not null unique,
  guest_id uuid not null references camp_guests(id) on delete cascade,
  day_pass_purchase_id uuid references day_pass_purchases(id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index camp_guest_lookup_sessions_expiry_idx on camp_guest_lookup_sessions(expires_at);
