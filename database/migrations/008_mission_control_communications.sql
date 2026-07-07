create table mission_control_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  parade_unit_id uuid references entries(id) on delete set null,
  sender_user_id uuid,
  sender_type text not null default 'coc' check (
    sender_type in ('coc', 'float', 'volunteer', 'system')
  ),
  sender_name text,
  sender_role text,
  unit_name text,
  entry_number integer,
  message_body text not null,
  message_type text not null default 'chat' check (
    message_type in ('chat', 'status', 'assistance', 'system')
  ),
  created_at timestamptz not null default now()
);

create index mission_control_messages_organization_id_idx
  on mission_control_messages (organization_id);

create index mission_control_messages_event_id_idx
  on mission_control_messages (event_id);

create index mission_control_messages_parade_unit_id_idx
  on mission_control_messages (parade_unit_id);

create index mission_control_messages_created_at_idx
  on mission_control_messages (created_at);
