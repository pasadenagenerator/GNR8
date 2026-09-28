# PostgreSQL isolationtester spec. PREPARED BUT NOT RUN.
# Load fixture.sql first in a fresh disposable database. This single permutation
# proves that an identical concurrent retry waits for the winner and then returns
# idempotent with the original storedAt.

session "winner"
step "winner_begin" { begin; }
step "winner_create" {
  insert into gnr8_mvp12_test.concurrent_outcomes (scenario, session_name, status)
  select 'identical', 'winner', gnr8_mvp12_test.register(gnr8_mvp12_test.registration_args(
      'astro_candidate_aaaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa',
      'idem:mvp12:concurrent-identical'
    ))->>'status';
}
step "winner_commit" { commit; }

session "retry"
step "retry_begin" { begin; }
step "retry_create" {
  insert into gnr8_mvp12_test.concurrent_outcomes (scenario, session_name, status)
  select 'identical', 'retry', gnr8_mvp12_test.register(gnr8_mvp12_test.registration_args(
      'astro_candidate_aaaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa',
      'idem:mvp12:concurrent-identical',
      '<!doctype html><html><body><p>MVP 12</p></body></html>',
      '2030-01-01T00:00:00.000Z'
    ))->>'status';
}
step "retry_assert" {
  do $$
  begin
    if (select pg_catalog.count(*) from gnr8_mvp12_test.concurrent_outcomes
        where scenario = 'identical' and status = 'created') <> 1
      or (select pg_catalog.count(*) from gnr8_mvp12_test.concurrent_outcomes
          where scenario = 'identical' and status = 'idempotent') <> 1
      or (select stored_at_text from public.gnr8_astro_candidate_records
          where candidate_id = 'astro_candidate_aaaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa')
         <> '2026-09-28T10:00:00.000Z' then
      raise exception 'concurrent_identical_registration_failed';
    end if;
  end;
  $$;
}
step "retry_commit" { commit; }

permutation "winner_begin" "winner_create" "retry_begin" "retry_create" "winner_commit" "retry_assert" "retry_commit"
