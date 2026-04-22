-- Agency client management entry points require editable client slugs.
-- Additive migration: introduces organizations.slug for client organizations.

alter table if exists public.organizations
  add column if not exists slug text;

-- Backfill deterministic slug for existing client organizations missing slug.
with normalized as (
  select
    o.id,
    lower(
      regexp_replace(
        regexp_replace(coalesce(o.name, ''), '[^a-zA-Z0-9]+', '-', 'g'),
        '(^-+|-+$)',
        '',
        'g'
      )
    ) as base_slug
  from public.organizations o
  where o.organization_type::text = 'client'
)
update public.organizations o
set slug = left(
  coalesce(nullif(n.base_slug, ''), 'client') || '-' || replace(o.id::text, '-', ''),
  120
)
from normalized n
where o.id = n.id
  and o.organization_type::text = 'client'
  and (o.slug is null or btrim(o.slug) = '');

create unique index if not exists organizations_client_agency_slug_uq
  on public.organizations (agency_id, lower(slug))
  where organization_type = 'client'::public.organization_type_enum;
