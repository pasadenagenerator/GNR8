-- Internal GNR8 pilot only; never an agency/customer entitlement.
begin;
create table if not exists public.gnr8_ai_trial_reservations (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'gnr8:internal:pilot-1' check (scope = 'gnr8:internal:pilot-1'),
  created_at timestamptz not null default now(),
  state text not null default 'reserved' check (state in ('reserved', 'completed', 'uncertain')),
  reserved_micro_usd integer not null default 7500 check (reserved_micro_usd = 7500),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0)
);
alter table public.gnr8_ai_trial_reservations enable row level security;
revoke all on public.gnr8_ai_trial_reservations from public, anon, authenticated;
grant select, insert, update on public.gnr8_ai_trial_reservations to service_role;

create or replace function public.gnr8_ai_trial_reserve() returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare reservation uuid; total_count bigint; day_cost bigint; month_cost bigint;
begin
  perform pg_advisory_xact_lock(18112026, 540);
  if exists (select 1 from gnr8_ai_trial_reservations where state in ('reserved', 'uncertain')) then
    raise exception 'gnr8_ai_busy_or_reconciliation_required';
  end if;
  select count(*),
    coalesce(sum(reserved_micro_usd) filter (where created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'), 0),
    coalesce(sum(reserved_micro_usd) filter (where created_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'), 0)
    into total_count, day_cost, month_cost from gnr8_ai_trial_reservations;
  if total_count >= 10 or day_cost + 7500 > 1000000 or month_cost + 7500 > 5000000 then
    raise exception 'gnr8_ai_budget_exceeded';
  end if;
  insert into gnr8_ai_trial_reservations default values returning id into reservation;
  return reservation;
end $$;

create or replace function public.gnr8_ai_trial_finish(reservation_id uuid, input_tokens integer, output_tokens integer) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update gnr8_ai_trial_reservations r
  set state = case when $2 between 0 and 4000 and $3 between 0 and 1000 then 'completed' else 'uncertain' end,
    input_tokens = $2, output_tokens = $3
  where r.id = $1 and r.state = 'reserved';
  if not found then raise exception 'gnr8_ai_reservation_missing'; end if;
end $$;
revoke all on function public.gnr8_ai_trial_reserve() from public, anon, authenticated;
revoke all on function public.gnr8_ai_trial_finish(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.gnr8_ai_trial_reserve() to service_role;
grant execute on function public.gnr8_ai_trial_finish(uuid, integer, integer) to service_role;
commit;
