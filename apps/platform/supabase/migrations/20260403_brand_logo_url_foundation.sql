-- Brand / Logo System Foundation (additive).
-- Shared identity logo reference for agency + client organizations.

alter table public.organizations
  add column if not exists brand_logo_url text;

comment on column public.organizations.brand_logo_url is
  'Optional brand logo URL for organization identity rendering (agency/client workspace contexts).';
