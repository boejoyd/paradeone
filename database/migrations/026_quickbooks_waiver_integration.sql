alter table day_pass_purchases
  add column if not exists status text not null default 'active'
    check (status in ('active', 'voided', 'refunded')),
  add column if not exists match_status text not null default 'matched'
    check (match_status in ('matched', 'unmatched', 'ambiguous')),
  add column if not exists quickbooks_sync_token text,
  add column if not exists raw_quickbooks_payload jsonb;

create table if not exists quickbooks_connections (
  realm_id text primary key,
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quickbooks_webhook_events (
  id uuid primary key default uuid_generate_v4(),
  event_key text not null unique,
  realm_id text not null,
  entity_name text not null,
  entity_id text not null,
  operation text not null,
  event_time timestamptz,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'processed', 'ignored', 'failed')),
  attempts integer not null default 0,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists quickbooks_webhook_events_pending_idx
  on quickbooks_webhook_events(status, created_at);

create table if not exists quickbooks_waiver_notifications (
  id uuid primary key default uuid_generate_v4(),
  purchase_id uuid not null unique references day_pass_purchases(id) on delete cascade,
  guest_id uuid references camp_guests(id) on delete set null,
  recipient_email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'not_needed')),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table quickbooks_connections is
  'Server-only encrypted QuickBooks OAuth credentials. Never expose through browser clients.';
comment on table quickbooks_webhook_events is
  'Durable, idempotent intake queue for signed Intuit webhook notifications.';
