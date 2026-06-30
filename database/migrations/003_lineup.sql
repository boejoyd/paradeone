alter table entries
add column parade_number integer,
add column lineup_position integer,
add column section text,
add column staging_spot text,
add column check_in_status text default 'not_checked_in',
add column checked_in_at timestamptz,
add column gps_lat double precision,
add column gps_lng double precision;
