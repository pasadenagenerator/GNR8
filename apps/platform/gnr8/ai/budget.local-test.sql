-- Run only in a disposable local database after the pilot migration.
begin;
do $$
declare id uuid; blocked boolean; i integer;
begin
  if has_function_privilege('authenticated', 'public.gnr8_ai_trial_reserve()', 'execute')
     or has_table_privilege('anon', 'public.gnr8_ai_trial_reservations', 'select') then
    raise exception 'public access unexpectedly granted';
  end if;
  id := public.gnr8_ai_trial_reserve();
  blocked := false;
  begin perform public.gnr8_ai_trial_reserve();
  exception when others then blocked := sqlerrm = 'gnr8_ai_busy_or_reconciliation_required'; end;
  if not blocked then raise exception 'concurrent reservation accepted'; end if;
  perform public.gnr8_ai_trial_finish(id, null, null);
  blocked := false;
  begin perform public.gnr8_ai_trial_reserve();
  exception when others then blocked := sqlerrm = 'gnr8_ai_busy_or_reconciliation_required'; end;
  if not blocked then raise exception 'uncertain call did not block'; end if;
  -- Simulate an operator reconciling this fixture, not application behavior.
  update public.gnr8_ai_trial_reservations set state = 'completed';
  for i in 2..10 loop
    id := public.gnr8_ai_trial_reserve();
    perform public.gnr8_ai_trial_finish(id, 300, 100);
  end loop;
  blocked := false;
  begin perform public.gnr8_ai_trial_reserve();
  exception when others then blocked := sqlerrm = 'gnr8_ai_budget_exceeded'; end;
  if not blocked then raise exception 'eleventh attempt accepted'; end if;
  if (select sum(reserved_micro_usd) from public.gnr8_ai_trial_reservations) <> 75000 then
    raise exception 'reservation accounting changed';
  end if;
end $$;
rollback;
