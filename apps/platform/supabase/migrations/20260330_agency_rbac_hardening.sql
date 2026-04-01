-- ============================================================
-- Agency Dashboard RBAC Hardening (Minimal, Additive, RLS-Ready)
-- Date: 2026-03-30
-- Scope: memberships foundation + minimal read policies for agencies
-- ============================================================

begin;

create extension if not exists pgcrypto;

do $$
begin
  create type public.membership_role_enum as enum ('owner', 'admin', 'member');
exception
  when duplicate_object then null;
end;
$$;

do $$
declare
  has_memberships boolean;
  has_org_id boolean;
  has_organization_id boolean;
  has_role boolean;
  has_created_at boolean;
begin
  select to_regclass('public.memberships') is not null into has_memberships;

  if has_memberships = false then
    create table public.memberships (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      organization_id uuid not null references public.organizations(id) on delete cascade,
      -- Backward-compatible alias used by existing data paths.
      org_id uuid not null references public.organizations(id) on delete cascade,
      role public.membership_role_enum not null default 'member',
      created_at timestamptz not null default now()
    );
  else
    alter table public.memberships
      add column if not exists id uuid default gen_random_uuid();

    update public.memberships
       set id = gen_random_uuid()
     where id is null;

    alter table public.memberships
      alter column id set default gen_random_uuid();

    if not exists (
      select 1
      from pg_constraint
      where conname = 'memberships_pkey'
        and conrelid = 'public.memberships'::regclass
    ) then
      alter table public.memberships
        add constraint memberships_pkey primary key (id);
    end if;

    alter table public.memberships
      add column if not exists user_id uuid;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'memberships'
        and column_name = 'org_id'
    ) into has_org_id;

    if has_org_id = false then
      alter table public.memberships
        add column org_id uuid;
    end if;

    alter table public.memberships
      add column if not exists organization_id uuid;

    update public.memberships
       set organization_id = org_id
     where organization_id is null
       and org_id is not null;

    update public.memberships
       set org_id = organization_id
     where org_id is null
       and organization_id is not null;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'memberships'
        and column_name = 'role'
    ) into has_role;

    if has_role = false then
      alter table public.memberships
        add column role public.membership_role_enum not null default 'member';
    else
      update public.memberships
         set role = 'member'
       where role is null
          or lower(role::text) not in ('owner', 'admin', 'member');

      begin
        alter table public.memberships
          alter column role type public.membership_role_enum
          using lower(role::text)::public.membership_role_enum;
      exception
        when undefined_function then
          alter table public.memberships
            alter column role type public.membership_role_enum
            using role::public.membership_role_enum;
      end;

      alter table public.memberships
        alter column role set default 'member'::public.membership_role_enum;
    end if;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'memberships'
        and column_name = 'created_at'
    ) into has_created_at;

    if has_created_at = false then
      alter table public.memberships
        add column created_at timestamptz not null default now();
    else
      update public.memberships
         set created_at = now()
       where created_at is null;

      alter table public.memberships
        alter column created_at set default now();
    end if;
  end if;
end;
$$;

create or replace function public.gnr8_sync_membership_organization_columns()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is null and new.org_id is not null then
    new.organization_id := new.org_id;
  end if;

  if new.org_id is null and new.organization_id is not null then
    new.org_id := new.organization_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gnr8_sync_membership_org_columns on public.memberships;
create trigger trg_gnr8_sync_membership_org_columns
before insert or update of organization_id, org_id
on public.memberships
for each row
execute function public.gnr8_sync_membership_organization_columns();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'memberships_user_id_fkey'
      and conrelid = 'public.memberships'::regclass
  ) then
    alter table public.memberships
      add constraint memberships_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'memberships_organization_id_fkey'
      and conrelid = 'public.memberships'::regclass
  ) then
    alter table public.memberships
      add constraint memberships_organization_id_fkey
      foreign key (organization_id)
      references public.organizations(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'memberships_org_id_fkey'
      and conrelid = 'public.memberships'::regclass
  ) then
    alter table public.memberships
      add constraint memberships_org_id_fkey
      foreign key (org_id)
      references public.organizations(id)
      on delete cascade;
  end if;
end;
$$;

create unique index if not exists memberships_organization_user_unique
  on public.memberships (organization_id, user_id)
  where organization_id is not null and user_id is not null;

create index if not exists memberships_user_id_idx
  on public.memberships (user_id);

create index if not exists memberships_organization_id_idx
  on public.memberships (organization_id);

alter table public.memberships enable row level security;
alter table public.organizations enable row level security;
alter table public.sites enable row level security;

drop policy if exists memberships_select_own_rows on public.memberships;
create policy memberships_select_own_rows
on public.memberships
for select
using (auth.uid() = user_id);

drop policy if exists organizations_select_member_scope on public.organizations;
drop policy if exists sites_select_member_agency_scope on public.sites;
do $$
declare
  has_org_id boolean := false;
  has_organization_id boolean := false;
  membership_org_expr text;
begin
  select exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'memberships'
       and column_name = 'org_id'
  ) into has_org_id;

  select exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'memberships'
       and column_name = 'organization_id'
  ) into has_organization_id;

  if has_organization_id and has_org_id then
    membership_org_expr := 'coalesce(m.organization_id, m.org_id)';
  elsif has_organization_id then
    membership_org_expr := 'm.organization_id';
  elsif has_org_id then
    membership_org_expr := 'm.org_id';
  else
    raise exception 'memberships schema mismatch: expected organization_id and/or org_id';
  end if;

  execute format(
    'create policy organizations_select_member_scope
     on public.organizations
     for select
     using (
       exists (
         select 1
           from public.memberships m
          where m.user_id = auth.uid()
            and %1$s = organizations.id
       )
     )',
    membership_org_expr
  );

  execute format(
    'create policy sites_select_member_agency_scope
     on public.sites
     for select
     using (
       exists (
         select 1
           from public.memberships m
           join public.organizations o
             on o.id = %1$s
          where m.user_id = auth.uid()
            and o.agency_id = sites.agency_id
       )
     )',
    membership_org_expr
  );
end;
$$;

commit;
