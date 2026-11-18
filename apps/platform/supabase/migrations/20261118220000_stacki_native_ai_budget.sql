-- A separate five-dollar ceiling for native Stacki AI; the original ten-call pilot is retained.
begin;
create table if not exists public.gnr8_stacki_native_ai_reservations (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'gnr8:stacki:native-pilot-1' check (scope = 'gnr8:stacki:native-pilot-1'),
  created_at timestamptz not null default now(),
  state text not null default 'reserved' check (state in ('reserved', 'completed', 'uncertain')),
  reserved_micro_usd integer not null default 100000 check (reserved_micro_usd = 100000),
  input_tokens integer check (input_tokens between 0 and 64000),
  output_tokens integer check (output_tokens between 0 and 6000)
);
alter table public.gnr8_stacki_native_ai_reservations enable row level security;
revoke all on public.gnr8_stacki_native_ai_reservations from public, anon, authenticated;
grant select, insert, update on public.gnr8_stacki_native_ai_reservations to service_role;

create or replace function public.gnr8_stacki_native_ai_reserve() returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare reservation uuid; total_reserved bigint;
begin
  perform pg_advisory_xact_lock(18112026, 547);
  select coalesce(sum(reserved_micro_usd), 0) into total_reserved from gnr8_stacki_native_ai_reservations;
  if total_reserved + 100000 > 5000000 then raise exception 'gnr8_stacki_ai_budget_exceeded'; end if;
  insert into gnr8_stacki_native_ai_reservations default values returning id into reservation;
  return reservation;
end $$;

create or replace function public.gnr8_stacki_native_ai_finish(reservation_id uuid, input_tokens integer, output_tokens integer) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update gnr8_stacki_native_ai_reservations r
  set state = case when $2 between 0 and 64000 and $3 between 0 and 6000 then 'completed' else 'uncertain' end,
      input_tokens = case when $2 between 0 and 64000 then $2 else null end,
      output_tokens = case when $3 between 0 and 6000 then $3 else null end
  where r.id = $1 and r.state = 'reserved';
  if not found then raise exception 'gnr8_stacki_ai_reservation_missing'; end if;
end $$;
revoke all on function public.gnr8_stacki_native_ai_reserve() from public, anon, authenticated;
revoke all on function public.gnr8_stacki_native_ai_finish(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.gnr8_stacki_native_ai_reserve() to service_role;
grant execute on function public.gnr8_stacki_native_ai_finish(uuid, integer, integer) to service_role;
commit;
