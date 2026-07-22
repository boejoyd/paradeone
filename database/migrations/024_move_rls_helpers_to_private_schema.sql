begin;

-- Keep SECURITY DEFINER membership helpers outside Supabase's exposed API schema.
-- Existing RLS policies retain their function dependencies when the functions move.
create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

grant usage on schema private to authenticated;

alter function public.is_organization_member(uuid)
  set schema private;

alter function public.is_event_organization_member(uuid)
  set schema private;

revoke all on function private.is_organization_member(uuid) from public;
revoke all on function private.is_organization_member(uuid) from anon;
revoke all on function private.is_event_organization_member(uuid) from public;
revoke all on function private.is_event_organization_member(uuid) from anon;

grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.is_event_organization_member(uuid) to authenticated;

commit;
