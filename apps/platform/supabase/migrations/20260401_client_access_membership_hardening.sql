-- ============================================================
-- Client Access Membership Model Hardening (Additive)
-- Date: 2026-04-01
-- Scope: explicit client memberships + client-scoped RLS
-- ============================================================

begin;

create extension if not exists pgcrypto;

do $$
begin
  create type public.client_membership_role_enum as enum ('owner', 'member');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.client_membership_invite_status_enum as enum ('pending', 'accepted', 'revoked', 'expired');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.client_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_organization_id uuid not null references public.organizations(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  role public.client_membership_role_enum not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists client_memberships_user_client_unique
  on public.client_memberships (user_id, client_organization_id);

create index if not exists client_memberships_user_id_idx
  on public.client_memberships (user_id);

create index if not exists client_memberships_client_org_idx
  on public.client_memberships (client_organization_id);

create index if not exists client_memberships_agency_client_idx
  on public.client_memberships (agency_id, client_organization_id);

create or replace function public.gnr8_validate_client_membership_scope()
returns trigger
language plpgsql
as $$
declare
  org_type text;
  org_agency_id uuid;
begin
  select o.organization_type::text, o.agency_id
    into org_type, org_agency_id
    from public.organizations o
   where o.id = new.client_organization_id;

  if org_type is distinct from 'client' then
    raise exception 'client_memberships requires organization_type=client';
  end if;

  if org_agency_id is null or org_agency_id <> new.agency_id then
    raise exception 'client_memberships agency_id must match organizations.agency_id';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_gnr8_validate_client_membership_scope on public.client_memberships;
create trigger trg_gnr8_validate_client_membership_scope
before insert or update of client_organization_id, agency_id, role
on public.client_memberships
for each row
execute function public.gnr8_validate_client_membership_scope();

create table if not exists public.client_membership_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  client_organization_id uuid not null references public.organizations(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  role public.client_membership_role_enum not null default 'member',
  status public.client_membership_invite_status_enum not null default 'pending',
  invited_by_user_id uuid references auth.users(id) on delete set null,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_membership_invites_email_idx
  on public.client_membership_invites (lower(email));

create index if not exists client_membership_invites_client_org_idx
  on public.client_membership_invites (client_organization_id);

create index if not exists client_membership_invites_status_idx
  on public.client_membership_invites (status);

create or replace function public.gnr8_validate_client_membership_invite_scope()
returns trigger
language plpgsql
as $$
declare
  org_type text;
  org_agency_id uuid;
begin
  select o.organization_type::text, o.agency_id
    into org_type, org_agency_id
    from public.organizations o
   where o.id = new.client_organization_id;

  if org_type is distinct from 'client' then
    raise exception 'client_membership_invites requires organization_type=client';
  end if;

  if org_agency_id is null or org_agency_id <> new.agency_id then
    raise exception 'client_membership_invites agency_id must match organizations.agency_id';
  end if;

  if new.status = 'accepted'::public.client_membership_invite_status_enum and new.accepted_by_user_id is null then
    raise exception 'accepted invite requires accepted_by_user_id';
  end if;

  if new.status <> 'accepted'::public.client_membership_invite_status_enum then
    new.accepted_at := null;
    if new.accepted_by_user_id is not null and new.status = 'pending'::public.client_membership_invite_status_enum then
      new.accepted_by_user_id := null;
    end if;
  elsif new.accepted_at is null then
    new.accepted_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_gnr8_validate_client_membership_invite_scope on public.client_membership_invites;
create trigger trg_gnr8_validate_client_membership_invite_scope
before insert or update of client_organization_id, agency_id, role, status, accepted_by_user_id, accepted_at
on public.client_membership_invites
for each row
execute function public.gnr8_validate_client_membership_invite_scope();

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
    $sql$
      insert into public.client_memberships (user_id, client_organization_id, agency_id, role)
      select
        m.user_id,
        o.id as client_organization_id,
        o.agency_id,
        case
          when lower(coalesce(m.role::text, 'member')) = 'owner' then 'owner'::public.client_membership_role_enum
          else 'member'::public.client_membership_role_enum
        end as role
      from public.memberships m
      join public.organizations o
        on o.id = %1$s
      where o.organization_type::text = 'client'
      on conflict (user_id, client_organization_id)
      do update
      set
        role = case
          when excluded.role = 'owner'::public.client_membership_role_enum
            or public.client_memberships.role = 'owner'::public.client_membership_role_enum
            then 'owner'::public.client_membership_role_enum
          else 'member'::public.client_membership_role_enum
        end,
        agency_id = excluded.agency_id,
        updated_at = now()
    $sql$,
    membership_org_expr
  );

  execute 'drop policy if exists organizations_select_member_scope on public.organizations';
  execute format(
    $sql$
      create policy organizations_select_member_scope
      on public.organizations
      for select
      using (
        exists (
          select 1
            from public.memberships m
           where m.user_id = auth.uid()
             and %1$s = organizations.id
        )
        or exists (
          select 1
            from public.memberships m
            join public.organizations member_org
              on member_org.id = %1$s
           where m.user_id = auth.uid()
             and member_org.organization_type::text = 'agency'
             and member_org.agency_id = organizations.agency_id
        )
        or exists (
          select 1
            from public.client_memberships cm
           where cm.user_id = auth.uid()
             and cm.client_organization_id = organizations.id
             and cm.agency_id = organizations.agency_id
        )
      )
    $sql$,
    membership_org_expr
  );

  execute 'drop policy if exists sites_select_member_agency_scope on public.sites';
  execute format(
    $sql$
      create policy sites_select_member_agency_scope
      on public.sites
      for select
      using (
        exists (
          select 1
            from public.memberships m
            join public.organizations member_org
              on member_org.id = %1$s
           where m.user_id = auth.uid()
             and member_org.organization_type::text = 'agency'
             and member_org.agency_id = sites.agency_id
        )
        or exists (
          select 1
            from public.client_memberships cm
           where cm.user_id = auth.uid()
             and cm.client_organization_id = sites.org_id
             and cm.agency_id = sites.agency_id
        )
      )
    $sql$,
    membership_org_expr
  );
end;
$$;

alter table public.client_memberships enable row level security;
alter table public.client_membership_invites enable row level security;

drop policy if exists client_memberships_select_own_rows on public.client_memberships;
create policy client_memberships_select_own_rows
on public.client_memberships
for select
using (auth.uid() = user_id);

commit;
