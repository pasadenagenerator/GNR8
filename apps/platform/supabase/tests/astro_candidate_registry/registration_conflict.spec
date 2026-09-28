# PostgreSQL isolationtester spec. PREPARED BUT NOT RUN.
# Load fixture.sql first in a separate fresh disposable database. The competing
# payload has the same candidate ID and idempotency key but a different immutable
# registration intent, so exactly one write wins and the waiter conflicts.

session "winner"
step "winner_begin" { begin; }
step "winner_create" {
  insert into gnr8_mvp12_test.concurrent_outcomes (scenario, session_name, status)
  select 'conflict', 'winner', gnr8_mvp12_test.register(gnr8_mvp12_test.registration_args(
      'astro_candidate_bbbbbbbbbbbb4bbb8bbbbbbbbbbbbbbb',
      'idem:mvp12:concurrent-conflict',
      '<!doctype html><html><body><p>winner</p></body></html>'
    ))->>'status';
}
step "winner_commit" { commit; }

session "conflict"
step "conflict_begin" { begin; }
step "conflict_create" {
  insert into gnr8_mvp12_test.concurrent_outcomes (scenario, session_name, status)
  select 'conflict', 'waiter', gnr8_mvp12_test.register(gnr8_mvp12_test.registration_args(
      'astro_candidate_bbbbbbbbbbbb4bbb8bbbbbbbbbbbbbbb',
      'idem:mvp12:concurrent-conflict',
      '<!doctype html><html><body><p>different</p></body></html>'
    ))->>'status';
}
step "conflict_assert" {
  do $$
  begin
    if (select pg_catalog.count(*) from gnr8_mvp12_test.concurrent_outcomes
        where scenario = 'conflict' and status = 'created') <> 1
      or (select pg_catalog.count(*) from gnr8_mvp12_test.concurrent_outcomes
          where scenario = 'conflict' and status = 'conflicting_write') <> 1
      or (select pg_catalog.count(*) from public.gnr8_astro_candidate_records
          where candidate_id = 'astro_candidate_bbbbbbbbbbbb4bbb8bbbbbbbbbbbbbbb') <> 1 then
      raise exception 'concurrent_conflicting_registration_failed';
    end if;
  end;
  $$;
}
step "conflict_commit" { commit; }

permutation "winner_begin" "winner_create" "conflict_begin" "conflict_create" "winner_commit" "conflict_assert" "conflict_commit"
