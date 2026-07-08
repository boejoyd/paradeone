alter table entries
  add column if not exists sms_opt_in boolean not null default false,
  add column if not exists sms_opt_in_at timestamptz,
  add column if not exists sms_opt_in_source text,
  add column if not exists privacy_policy_version text,
  add column if not exists terms_version text,
  add column if not exists sms_terms_version text;
