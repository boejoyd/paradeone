-- Immediate security hardening for every application-owned table in public.
--
-- This migration closes the unauthenticated PostgREST exposure reported by
-- Supabase Security Advisor while preserving the application's current
-- signed-in behavior. A later migration can replace the authenticated policy
-- with narrower organization/role policies table by table.

begin;

-- Remove direct API access for unauthenticated callers. Public registration,
-- participant links, and waiver lookups are handled by server routes/actions
-- using the service-role client, so they do not require anon table access.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;

-- Enable RLS on every non-extension table owned by the application and add a
-- temporary authenticated-only policy where a table does not already have one.
do $$
declare
  table_record record;
  policy_name text;
begin
  for table_record in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not exists (
        select 1
        from pg_depend d
        where d.objid = c.oid
          and d.deptype = 'e'
      )
  loop
    execute format(
      'alter table public.%I enable row level security',
      table_record.table_name
    );

    policy_name := 'authenticated_access_' || table_record.table_name;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = table_record.table_name
        and policyname = policy_name
    ) then
      execute format(
        'create policy %I on public.%I for all to authenticated using (true) with check (true)',
        policy_name,
        table_record.table_name
      );
    end if;
  end loop;
end
$$;

commit;
