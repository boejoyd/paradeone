create table if not exists communication_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  channel_key text not null check (
    channel_key in ('broadcast', 'parade_units', 'volunteers', 'section_captains')
  ),
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, event_id, channel_key)
);

create index if not exists communication_channels_organization_id_idx
  on communication_channels (organization_id);

create index if not exists communication_channels_event_id_idx
  on communication_channels (event_id);

create table if not exists communication_participants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  participant_type text not null check (
    participant_type in ('parade_unit', 'volunteer', 'section_captain')
  ),
  participant_name text not null,
  participant_phone text not null,
  phone_normalized text not null,
  parade_unit_id uuid,
  volunteer_id uuid,
  unit_name text,
  entry_number integer,
  last_seen_phone text,
  last_sms_received_at timestamptz,
  last_sms_sent_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table communication_participants
  add column if not exists last_seen_phone text;

alter table communication_participants
  add column if not exists last_sms_received_at timestamptz;

alter table communication_participants
  add column if not exists last_sms_sent_at timestamptz;

create index if not exists communication_participants_organization_id_idx
  on communication_participants (organization_id);

create index if not exists communication_participants_event_id_idx
  on communication_participants (event_id);

create index if not exists communication_participants_phone_normalized_idx
  on communication_participants (phone_normalized);

create unique index if not exists communication_participants_unique_phone_ctx_idx
  on communication_participants (organization_id, event_id, phone_normalized)
  where is_active = true;

alter table mission_control_messages
  add column if not exists channel text not null default 'broadcast';

alter table mission_control_messages
  add column if not exists sender_phone text;

alter table mission_control_messages
  add column if not exists volunteer_id uuid;

alter table mission_control_messages
  add column if not exists direction text not null default 'outbound';

alter table mission_control_messages
  add column if not exists source text not null default 'app';

update mission_control_messages
set sender_type = 'parade_unit'
where sender_type = 'float';

alter table mission_control_messages
  drop constraint if exists mission_control_messages_sender_type_check;

alter table mission_control_messages
  add constraint mission_control_messages_sender_type_check check (
    sender_type in ('coc', 'parade_unit', 'volunteer', 'section_captain')
  );

alter table mission_control_messages
  drop constraint if exists mission_control_messages_channel_check;

alter table mission_control_messages
  add constraint mission_control_messages_channel_check check (
    channel in ('broadcast', 'parade_units', 'volunteers', 'section_captains')
  );

alter table mission_control_messages
  drop constraint if exists mission_control_messages_direction_check;

alter table mission_control_messages
  add constraint mission_control_messages_direction_check check (
    direction in ('inbound', 'outbound')
  );

alter table mission_control_messages
  drop constraint if exists mission_control_messages_source_check;

alter table mission_control_messages
  add constraint mission_control_messages_source_check check (
    source in ('app', 'sms')
  );

create index if not exists mission_control_messages_channel_idx
  on mission_control_messages (channel);

create index if not exists mission_control_messages_direction_idx
  on mission_control_messages (direction);

create index if not exists mission_control_messages_source_idx
  on mission_control_messages (source);

create index if not exists mission_control_messages_sender_phone_idx
  on mission_control_messages (sender_phone);
