-- A Studio becomes launchable only after its exact site resources are verified.
begin;

create table public.gnr8_native_studio_bindings (
  site_id uuid primary key references public.sites(id) on delete restrict,
  agency_id uuid not null,
  client_id uuid not null,
  studio_origin text not null,
  repository text not null,
  repository_id bigint not null unique check (repository_id > 0),
  branch text not null,
  cloudflare_account_id text not null,
  github_app_id text not null,
  github_installation_id text not null,
  github_client_id text not null,
  studio_worker text not null,
  site_worker text not null,
  draft_bucket text not null,
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (studio_origin),
  constraint gnr8_native_studio_origin_chk check (studio_origin ~ '^https://[a-z0-9.-]+$'),
  constraint gnr8_native_studio_account_chk check (cloudflare_account_id ~ '^[a-f0-9]{32}$'),
  constraint gnr8_native_studio_branch_chk check (length(branch) between 1 and 200),
  constraint gnr8_native_studio_resource_chk check (
    studio_worker = 'gnr8-' || site_id::text || '-studio' and
    site_worker = 'gnr8-' || site_id::text || '-site' and
    draft_bucket = 'gnr8-' || site_id::text || '-drafts'
  )
);

create function public.gnr8_check_native_studio_binding()
returns trigger language plpgsql set search_path = public as $$
declare target record;
begin
  if TG_OP = 'UPDATE' then
    raise exception 'native_studio_binding_immutable';
  end if;
  select s.domain, b.github_owner, b.repository, b.repository_id, b.binding_state
    into target from public.sites s
    join public.gnr8_site_github_repository_bindings b on b.site_id = s.id
   where s.id = new.site_id and s.agency_id = new.agency_id
     and s.org_id = new.client_id and b.agency_id = new.agency_id
     and b.client_id = new.client_id;
  if not found then
    raise exception 'native_studio_binding_scope_mismatch';
  end if;
  if target.domain is null or target.binding_state <> 'bound' or
     new.studio_origin <> 'https://' || lower(target.domain) or
     new.repository <> target.github_owner || '/' || target.repository or
     new.repository_id <> target.repository_id or
     new.verified_at > now() or new.verified_at < now() - interval '1 day' then
    raise exception 'native_studio_binding_scope_mismatch';
  end if;
  return new;
end $$;

create trigger gnr8_native_studio_binding_guard
before insert or update on public.gnr8_native_studio_bindings
for each row execute function public.gnr8_check_native_studio_binding();

alter table public.gnr8_native_studio_bindings enable row level security;
alter table public.gnr8_native_studio_bindings force row level security;
revoke all on public.gnr8_native_studio_bindings from anon, authenticated;
grant select, insert on public.gnr8_native_studio_bindings to service_role;

commit;
