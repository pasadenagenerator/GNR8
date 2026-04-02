-- Client Settings Expansion (V2): canonical client contact fields on organizations.
-- Additive migration only.

alter table if exists public.organizations
  add column if not exists contact_person_name text;

alter table if exists public.organizations
  add column if not exists contact_email text;

alter table if exists public.organizations
  add column if not exists contact_phone text;
