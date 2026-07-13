-- 018 must be applied first. This migration never matches or merges on name alone:
-- email is preferred, phone is used only for rows still unlinked, and groups with
-- more than one legal name or more than one matching guest remain untouched.

insert into camp_guests (legal_name, email, phone)
select min(trim(w.full_name)), min(w.normalized_email), min(nullif(w.normalized_phone, ''))
from camp_nackte_waivers w
where w.guest_id is null and w.normalized_email <> '' and trim(coalesce(w.full_name, '')) <> ''
group by w.normalized_email
having count(distinct lower(trim(w.full_name))) = 1
   and not exists (select 1 from camp_guests g where g.normalized_email = w.normalized_email);

create temporary table camp_email_waiver_links on commit drop as
select w.id as waiver_id, (array_agg(g.id order by g.id))[1] as guest_id
from camp_nackte_waivers w
join camp_guests g on g.normalized_email = w.normalized_email
where w.guest_id is null and w.normalized_email <> ''
  and w.normalized_email in (
    select normalized_email from camp_nackte_waivers
    where guest_id is null and normalized_email <> ''
    group by normalized_email having count(distinct lower(trim(full_name))) = 1
  )
group by w.id
having count(distinct g.id) = 1;

with ranked as (
  select l.waiver_id, l.guest_id,
    row_number() over (partition by l.guest_id order by w.signed_at desc, w.id desc) as position,
    exists (select 1 from camp_nackte_waivers current where current.guest_id = l.guest_id and current.status = 'current') as already_has_current
  from camp_email_waiver_links l join camp_nackte_waivers w on w.id = l.waiver_id
  where w.status = 'current'
)
update camp_nackte_waivers w set status = 'superseded'
from ranked r
where w.id = r.waiver_id and w.status = 'current' and (r.already_has_current or r.position > 1);

update camp_nackte_waivers w set guest_id = l.guest_id
from camp_email_waiver_links l where w.id = l.waiver_id and w.guest_id is null;

insert into camp_guests (legal_name, email, phone)
select min(trim(w.full_name)), min(nullif(w.normalized_email, '')), min(w.normalized_phone)
from camp_nackte_waivers w
where w.guest_id is null and w.normalized_phone <> '' and coalesce(w.normalized_email, '') = '' and trim(coalesce(w.full_name, '')) <> ''
group by w.normalized_phone
having count(distinct lower(trim(w.full_name))) = 1
   and not exists (select 1 from camp_guests g where g.normalized_phone = w.normalized_phone);

create temporary table camp_phone_waiver_links on commit drop as
select w.id as waiver_id, (array_agg(g.id order by g.id))[1] as guest_id
from camp_nackte_waivers w
join camp_guests g on g.normalized_phone = w.normalized_phone
where w.guest_id is null and w.normalized_phone <> '' and coalesce(w.normalized_email, '') = ''
  and w.normalized_phone in (
    select normalized_phone from camp_nackte_waivers
    where guest_id is null and normalized_phone <> '' and coalesce(normalized_email, '') = ''
    group by normalized_phone having count(distinct lower(trim(full_name))) = 1
  )
group by w.id
having count(distinct g.id) = 1;

with ranked as (
  select l.waiver_id, l.guest_id,
    row_number() over (partition by l.guest_id order by w.signed_at desc, w.id desc) as position,
    exists (select 1 from camp_nackte_waivers current where current.guest_id = l.guest_id and current.status = 'current') as already_has_current
  from camp_phone_waiver_links l join camp_nackte_waivers w on w.id = l.waiver_id
  where w.status = 'current'
)
update camp_nackte_waivers w set status = 'superseded'
from ranked r
where w.id = r.waiver_id and w.status = 'current' and (r.already_has_current or r.position > 1);

update camp_nackte_waivers w set guest_id = l.guest_id
from camp_phone_waiver_links l where w.id = l.waiver_id and w.guest_id is null;

update camp_nackte_waivers
set pdf_storage_path = split_part(pdf_url, '/storage/v1/object/public/camp-nackte-waivers/', 2)
where pdf_storage_path is null
  and pdf_url like '%/storage/v1/object/public/camp-nackte-waivers/%';

insert into storage.buckets (id, name, public)
values ('camp-nackte-waivers', 'camp-nackte-waivers', false)
on conflict (id) do update set public = false;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated staff can read Camp Nackte waivers') then
    create policy "Authenticated staff can read Camp Nackte waivers"
      on storage.objects for select to authenticated
      using (bucket_id = 'camp-nackte-waivers');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Waiver submissions can upload PDFs') then
    create policy "Waiver submissions can upload PDFs"
      on storage.objects for insert to anon, authenticated
      with check (bucket_id = 'camp-nackte-waivers');
  end if;
end $$;
