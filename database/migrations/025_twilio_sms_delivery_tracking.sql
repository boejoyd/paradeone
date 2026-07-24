begin;

create or replace function private.normalize_sms_phone(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when regexp_replace(value, '[^0-9]', '', 'g') ~ '^1[0-9]{10}$'
      then '+' || regexp_replace(value, '[^0-9]', '', 'g')
    when regexp_replace(value, '[^0-9]', '', 'g') ~ '^[0-9]{10}$'
      then '+1' || regexp_replace(value, '[^0-9]', '', 'g')
    when regexp_replace(value, '[^0-9]', '', 'g') <> ''
      then '+' || regexp_replace(value, '[^0-9]', '', 'g')
    else null
  end;
$$;

revoke all on function private.normalize_sms_phone(text) from public;
revoke all on function private.normalize_sms_phone(text) from anon;
revoke all on function private.normalize_sms_phone(text) from authenticated;
grant execute on function private.normalize_sms_phone(text) to authenticated;

alter table public.entries
  add column if not exists contact_phone_normalized text generated always as (
    private.normalize_sms_phone(contact_phone)
  ) stored;

create index if not exists entries_contact_phone_normalized_idx
  on public.entries (contact_phone_normalized)
  where contact_phone_normalized is not null;

alter table public.communication_participants
  add column if not exists sms_consent_status text not null default 'unknown',
  add column if not exists sms_consent_updated_at timestamptz;

alter table public.communication_participants
  drop constraint if exists communication_participants_sms_consent_status_check;

alter table public.communication_participants
  add constraint communication_participants_sms_consent_status_check check (
    sms_consent_status in ('unknown', 'opted_in', 'opted_out')
  );

alter table public.mission_control_messages
  add column if not exists provider_message_sid text;

create unique index if not exists mission_control_messages_provider_message_sid_idx
  on public.mission_control_messages (provider_message_sid)
  where provider_message_sid is not null;

create table if not exists public.sms_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  mission_control_message_id uuid not null references public.mission_control_messages(id) on delete cascade,
  communication_participant_id uuid references public.communication_participants(id) on delete set null,
  parade_unit_id uuid references public.entries(id) on delete set null,
  recipient_phone text not null,
  provider_message_sid text not null unique,
  provider_status text not null default 'accepted',
  status_rank smallint not null default 10,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sms_deliveries_organization_id_idx
  on public.sms_deliveries (organization_id);

create index if not exists sms_deliveries_event_id_idx
  on public.sms_deliveries (event_id);

create index if not exists sms_deliveries_message_id_idx
  on public.sms_deliveries (mission_control_message_id);

alter table public.sms_deliveries enable row level security;

drop policy if exists sms_deliveries_organization_members_all
  on public.sms_deliveries;

create policy sms_deliveries_organization_members_all
  on public.sms_deliveries
  for all
  to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

commit;
