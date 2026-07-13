alter table camp_guests
  add column normalized_email text generated always as (lower(trim(email))) stored,
  add column normalized_phone text generated always as (
    case
      when length(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')) = 11
        and left(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 1) = '1'
      then right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10)
      else regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')
    end
  ) stored;

alter table camp_nackte_waivers
  add column normalized_email text generated always as (lower(trim(email))) stored,
  add column normalized_phone text generated always as (
    case
      when length(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')) = 11
        and left(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 1) = '1'
      then right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10)
      else regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')
    end
  ) stored;

create index camp_guests_normalized_email_idx on camp_guests(normalized_email) where normalized_email <> '';
create index camp_guests_normalized_phone_idx on camp_guests(normalized_phone) where normalized_phone <> '';
create index camp_nackte_waivers_normalized_email_idx on camp_nackte_waivers(normalized_email) where normalized_email <> '';
create index camp_nackte_waivers_normalized_phone_idx on camp_nackte_waivers(normalized_phone) where normalized_phone <> '';
