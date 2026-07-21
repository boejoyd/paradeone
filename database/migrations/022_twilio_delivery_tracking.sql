alter table communication_participants
  add column if not exists sms_consent_status text not null default 'unknown';

alter table communication_participants
  drop constraint if exists communication_participants_sms_consent_status_check;

alter table communication_participants
  add constraint communication_participants_sms_consent_status_check check (
    sms_consent_status in ('unknown', 'opted_in', 'opted_out')
  );

alter table communication_participants
  add column if not exists sms_opted_in_at timestamptz;

alter table communication_participants
  add column if not exists sms_opted_out_at timestamptz;

update communication_participants as participant
set
  sms_consent_status = 'opted_in',
  sms_opted_in_at = coalesce(participant.sms_opted_in_at, entry.sms_opt_in_at, now())
from entries as entry
where participant.parade_unit_id = entry.id
  and entry.sms_opt_in = true
  and participant.sms_consent_status = 'unknown';

create table if not exists sms_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  mission_control_message_id uuid references mission_control_messages(id) on delete set null,
  communication_participant_id uuid references communication_participants(id) on delete set null,
  parade_unit_id uuid references entries(id) on delete set null,
  to_phone text not null,
  provider_message_sid text unique,
  provider_status text not null default 'queued',
  error_code text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sms_deliveries_organization_id_idx
  on sms_deliveries (organization_id);

create index if not exists sms_deliveries_event_id_idx
  on sms_deliveries (event_id);

create index if not exists sms_deliveries_message_id_idx
  on sms_deliveries (mission_control_message_id);

create index if not exists sms_deliveries_participant_id_idx
  on sms_deliveries (communication_participant_id);

create index if not exists sms_deliveries_parade_unit_id_idx
  on sms_deliveries (parade_unit_id);

create index if not exists sms_deliveries_status_idx
  on sms_deliveries (provider_status);
