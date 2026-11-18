-- Allow a native Stacki page source above 64 KB while retaining the same $5 trial ceiling.
begin;
alter table public.gnr8_stacki_native_ai_reservations
  drop constraint if exists gnr8_stacki_native_ai_reservations_reserved_micro_usd_check;
alter table public.gnr8_stacki_native_ai_reservations
  add constraint gnr8_stacki_native_ai_reservations_reserved_micro_usd_check
  check (reserved_micro_usd in (100000, 250000));
alter table public.gnr8_stacki_native_ai_reservations
  alter column reserved_micro_usd set default 250000;
alter table public.gnr8_stacki_native_ai_reservations
  drop constraint if exists gnr8_stacki_native_ai_reservations_input_tokens_check;
alter table public.gnr8_stacki_native_ai_reservations
  add constraint gnr8_stacki_native_ai_reservations_input_tokens_check
  check (input_tokens between 0 and 256000);

create or replace function public.gnr8_stacki_native_ai_reserve() returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare reservation uuid; total_reserved bigint;
begin
  perform pg_advisory_xact_lock(18112026, 547);
  select coalesce(sum(reserved_micro_usd), 0) into total_reserved from gnr8_stacki_native_ai_reservations;
  if total_reserved + 250000 > 5000000 then raise exception 'gnr8_stacki_ai_budget_exceeded'; end if;
  insert into gnr8_stacki_native_ai_reservations default values returning id into reservation;
  return reservation;
end $$;

create or replace function public.gnr8_stacki_native_ai_finish(reservation_id uuid, input_tokens integer, output_tokens integer) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update gnr8_stacki_native_ai_reservations r
  set state = case when $2 between 0 and 256000 and $3 between 0 and 6000 then 'completed' else 'uncertain' end,
      input_tokens = case when $2 between 0 and 256000 then $2 else null end,
      output_tokens = case when $3 between 0 and 6000 then $3 else null end
  where r.id = $1 and r.state = 'reserved';
  if not found then raise exception 'gnr8_stacki_ai_reservation_missing'; end if;
end $$;
commit;
