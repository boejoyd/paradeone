update camp_nackte_waivers
set pdf_storage_path = split_part(pdf_url, '/storage/v1/object/public/camp-nackte-waivers/', 2)
where pdf_storage_path is null
  and pdf_url like '%/storage/v1/object/public/camp-nackte-waivers/%'
  and split_part(pdf_url, '/storage/v1/object/public/camp-nackte-waivers/', 2) <> '';

update storage.buckets
set public = false
where id = 'camp-nackte-waivers';

do $$ begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated staff can read Camp Nackte waivers'
  ) then
    create policy "Authenticated staff can read Camp Nackte waivers"
      on storage.objects for select to authenticated
      using (bucket_id = 'camp-nackte-waivers');
  end if;
end $$;
