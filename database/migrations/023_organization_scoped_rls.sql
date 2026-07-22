begin;

-- These helper functions are SECURITY DEFINER so policies can check membership
-- without recursively invoking organization_members RLS.
create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.is_event_organization_member(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    join public.organization_members om
      on om.organization_id = e.organization_id
    where e.id = target_event_id
      and om.user_id = auth.uid()
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.is_event_organization_member(uuid) from public;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_event_organization_member(uuid) to authenticated;

-- Remove the temporary authenticated-wide policies.
drop policy if exists authenticated_access_camp_guest_lookup_sessions on public.camp_guest_lookup_sessions;
drop policy if exists authenticated_access_camp_guests on public.camp_guests;
drop policy if exists authenticated_access_camp_nackte_waivers on public.camp_nackte_waivers;
drop policy if exists authenticated_access_check_ins on public.check_ins;
drop policy if exists authenticated_access_communication_channels on public.communication_channels;
drop policy if exists authenticated_access_communication_participants on public.communication_participants;
drop policy if exists authenticated_access_day_pass_attendees on public.day_pass_attendees;
drop policy if exists authenticated_access_day_pass_purchases on public.day_pass_purchases;
drop policy if exists authenticated_access_entries on public.entries;
drop policy if exists authenticated_access_entry_route_state_events on public.entry_route_state_events;
drop policy if exists authenticated_access_events on public.events;
drop policy if exists authenticated_access_mission_control_messages on public.mission_control_messages;
drop policy if exists authenticated_access_organization_members on public.organization_members;
drop policy if exists authenticated_access_organizations on public.organizations;
drop policy if exists authenticated_access_parade_routes on public.parade_routes;
drop policy if exists authenticated_access_participant_access_tokens on public.participant_access_tokens;
drop policy if exists authenticated_access_route_checkpoints on public.route_checkpoints;
drop policy if exists authenticated_access_staging_spots on public.staging_spots;

-- The waiver workflow now runs through trusted server routes. Remove the legacy
-- unrestricted database insert policy so personal waiver data is not writable
-- directly through the public API.
drop policy if exists "Allow public waiver inserts" on public.camp_nackte_waivers;

-- Organization-level data.
create policy organizations_member_select
  on public.organizations
  for select
  to authenticated
  using (public.is_organization_member(id));

create policy organizations_member_update
  on public.organizations
  for update
  to authenticated
  using (public.is_organization_member(id))
  with check (public.is_organization_member(id));

create policy organization_members_member_select
  on public.organization_members
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

-- Event-level data. Any authenticated member of the owning organization may
-- operate on these records. Application role checks remain responsible for
-- finer owner/admin/staff/volunteer distinctions.
create policy events_organization_members_all
  on public.events
  for all
  to authenticated
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy entries_event_members_all
  on public.entries
  for all
  to authenticated
  using (public.is_event_organization_member(event_id))
  with check (public.is_event_organization_member(event_id));

create policy staging_spots_event_members_all
  on public.staging_spots
  for all
  to authenticated
  using (public.is_event_organization_member(event_id))
  with check (public.is_event_organization_member(event_id));

create policy check_ins_event_members_all
  on public.check_ins
  for all
  to authenticated
  using (public.is_event_organization_member(event_id))
  with check (public.is_event_organization_member(event_id));

create policy parade_routes_event_members_all
  on public.parade_routes
  for all
  to authenticated
  using (public.is_event_organization_member(event_id))
  with check (public.is_event_organization_member(event_id));

create policy route_checkpoints_event_members_all
  on public.route_checkpoints
  for all
  to authenticated
  using (public.is_event_organization_member(event_id))
  with check (public.is_event_organization_member(event_id));

create policy entry_route_state_events_event_members_all
  on public.entry_route_state_events
  for all
  to authenticated
  using (public.is_event_organization_member(event_id))
  with check (public.is_event_organization_member(event_id));

-- Communications are directly organization-scoped.
create policy communication_channels_organization_members_all
  on public.communication_channels
  for all
  to authenticated
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy communication_participants_organization_members_all
  on public.communication_participants
  for all
  to authenticated
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy mission_control_messages_organization_members_all
  on public.mission_control_messages
  for all
  to authenticated
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy participant_access_tokens_organization_members_all
  on public.participant_access_tokens
  for all
  to authenticated
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

-- Camp Nackte guest, waiver, lookup, and day-pass tables intentionally have no
-- anon/authenticated policies. They remain accessible only to trusted server
-- code using the service role.

commit;
