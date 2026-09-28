# GNR8 Platform MVP 13 — Astro Registry Disposable Database Validation

Date: 2026-09-28

Status: `locally_validated_focused_prerequisite_fixture`

## MVP 13a revalidation result

The never-applied migration draft now uses the valid SQL special form
`coalesce(...)` instead of `pg_catalog.coalesce(...)`. The exact repository file
validated by the normal harness had SHA-256
`c3aaafe800b9a4d2b1f73b1eba2e5d3002a6b3b7f25e0c7ca1b4f7b0cc6e2154` before
execution. The harness printed the same hash and
`diagnosticCorrection=false`, applied that repository SQL without runtime
substitution, completed every required check, and reported
`RESULT locally validated`.

This means the corrected SQL is locally validated against the focused
prerequisite fixture. It is not a full migration-history replay, deployed-schema
compatibility result, deployment-readiness claim, or authorization to inspect or
apply anything hosted.

## Original MVP 13 failure and diagnostic evidence

Before the authorized MVP 13a correction, the MVP 12 candidate migration was
not locally validated. Its first execution in a new, task-owned PostgreSQL 15
database stopped at line 249 while creating
`gnr8_astro_candidate_has_exact_keys`: PostgreSQL resolves
`pg_catalog.coalesce(boolean, boolean)` as a function, but `COALESCE` is SQL
syntax and cannot be schema-qualified. The explicit migration transaction
rolled back, leaving zero candidate relations and zero candidate functions.

To gather bounded follow-on evidence without changing migration history, the
local harness optionally applies an in-memory diagnostic copy with exactly one
replacement: `pg_catalog.coalesce(` to `coalesce(`. The repository migration is
not modified during MVP 13. All remaining tests passed against that diagnostic
copy. Those passes were supplemental evidence for the correction later
authorized and validated by MVP 13a.

No deployed database, configured connection URL, hosted Supabase instance,
provider, DNS, billing, publish, route, UI, production adapter, or customer data
was read or changed. Product behavior changed: no deployed behavior.

## Environment and prerequisite provenance

- Host tooling: Docker 29.7.2 and Supabase CLI 2.90.0 were already installed;
  no host PostgreSQL server/client was on `PATH`. Supabase CLI was not used.
- Cached image only: `postgres:15`, selected with `--pull=never`; no image or
  software download occurred.
- Executed server: PostgreSQL `15.15 (Debian 15.15-1.pgdg13+1)` with UTF-8
  database encoding and `C` locale.
- Isolation runner: the image-bundled PostgreSQL `isolationtester` at
  `/usr/lib/postgresql/15/lib/pgxs/src/test/isolation/isolationtester`.
- Ownership: task database and migration objects were owned by
  `gnr8_mvp13_owner`, not a request-facing role.
- Roles: `anon`, `authenticated`, and `service_role` were NOLOGIN,
  NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, and NOBYPASSRLS;
  INHERIT remained enabled.
- Extension: `pgcrypto` was installed in `public`, matching the migration's
  `public.digest(...)` dependency.
- Default privileges: no relevant default ACL row named `anon`,
  `authenticated`, or `service_role`.
- The MVP 13a normal harness run used loopback endpoint
  `127.0.0.1:59278`; the random port was removed with the container. The earlier
  MVP 13 diagnostic run used `127.0.0.1:55708`, also removed.

This was a focused prerequisite-fixture run, not full migration-history replay.
The repository does not contain the original `organizations` creation and the
runtime tables are application-created. The test-only prerequisite therefore
declares the following inferred `organizations` shape explicitly:

- `id uuid primary key`
- `name text not null`
- `agency_id uuid not null references public.agencies(id) on delete restrict`
- `organization_type public.organization_type_enum not null`

It also declares only the checked-in agency, site, runtime-site, and
runtime-site-version columns/types/FKs needed by the candidate migration and
fixture. This focused fixture cannot establish compatibility with any deployed
schema.

## Commands and results

### MVP 13a exact-file revalidation

Focused TypeScript/static validation used the command below and passed 32/32
tests, including the targeted assertion that `pg_catalog.coalesce(` is absent:

```text
pnpm exec tsx --test \
  apps/platform/gnr8/output-adapters/astro-candidate-registry-migration.test.ts \
  apps/platform/gnr8/output-adapters/astro-production-candidate-record.test.ts \
  apps/platform/gnr8/output-adapters/astro-production-candidate-repository.test.ts
```

Result: 32/32 tests passed.

Disposable database validation:

```text
pnpm exec tsx apps/platform/supabase/tests/astro_candidate_registry/run-local-validation.ts
```

No diagnostic argument or runtime substitution was used. The runner read the
repository migration, printed its SHA-256 and `diagnosticCorrection=false`, then
applied those exact bytes with `ON_ERROR_STOP` in each fresh database.

Normal-run results:

- The corrected migration applied as checked in.
- Functional SQL passed atomicity, exact and multibyte limits, all three hashes,
  ownership preservation, metadata redaction, disable/re-enable, immutability,
  forced late-failure rollback, and actual `anon`, `authenticated`, and
  `service_role` execution cases.
- Catalog assertions passed for owners, role attributes, default privileges,
  seven RESTRICT FKs, three forced-RLS tables, four fixed-search-path SECURITY
  DEFINER RPCs, intended grants, and three enabled protection triggers.
- Both real `isolationtester` specs passed in separate fresh databases and
  observed the waiter block until winner commit.
- The TypeScript v2 record round-tripped through PostgreSQL and back through
  TypeScript byte-for-byte with the same 2,495-byte/hash evidence recorded below.
- The task-owned container and all databases, the loopback port, processes, and
  temporary credential were removed.

### Original MVP 13 diagnostic run

The original run used:

```text
pnpm exec tsx \
  apps/platform/supabase/tests/astro_candidate_registry/run-local-validation.ts \
  --diagnostic-correction
```

That earlier runner execution first applied the repository migration unchanged,
recorded the expected SQL error, and asserted complete rollback. Only then did
diagnostic mode create new databases and apply the one-line in-memory correction.

Supplemental database results after the diagnostic correction:

- Functional SQL passed atomic create, identical retry, candidate/key
  conflicts, authoritative ownership mismatch, and a forced late failure that
  left no record/access/event row.
- Registration preserved every pre-existing runtime site, runtime version,
  ownership site, organization, and agency row byte-for-byte as `jsonb`.
- Content, storage, and registration-intent SHA-256 values, generated payload
  bytes, exact 2,097,152-byte multibyte acceptance, and 2,097,153-byte denial
  passed.
- Metadata excluded candidate payloads; disable, disabled-read denial, stale
  version conflict, idempotent access retry, failed renewed hashes, successful
  re-enable, source-version binding, immutable candidate bytes, and append-only
  events passed.
- Actual `SET ROLE` execution proved `anon` and `authenticated` direct reads and
  RPC calls were denied. It proved `service_role` direct select/insert were
  denied while the granted scoped-read RPC returned `found`.
- Catalog assertions found three forced-RLS candidate tables, seven RESTRICT
  FKs, four SECURITY DEFINER RPCs with fixed `search_path=pg_catalog`, three
  enabled protection triggers, no request-role table grants, no internal helper
  exposure to `service_role`, and only the four intended RPC grants.
- Real `isolationtester` execution used separate fresh databases. Identical
  intent produced one `created` and one blocked-then-`idempotent` result with
  the original `storedAt`. Differing intent produced one `created` and one
  blocked-then-`conflicting_write` result with exactly one record.
- A v2 record built and validated by the real TypeScript contract, serialized
  with `stableStringify`, was registered as `service_role`, read back from the
  stored canonical text, deserialized by TypeScript, and matched byte-for-byte.
  Evidence: 2,495 UTF-8 bytes, original `storedAt`
  `2026-09-28T10:30:00.000Z`, content SHA-256
  `db6e82862d8fda530d0581aac29de94db3158a5ffef19af35529e51123f38df2`,
  storage SHA-256
  `4fb2af6ec7014717841b50d6831bff7302832cfd69369e315abd22f08c7fe80a`,
  and registration-intent SHA-256
  `82cf24b8be9e850a91817668186a831636f74bbf8d2adcb973ba154b1f09f18d`.

## Failure and exact correction

Root cause: line 238 used `pg_catalog.coalesce(`. PostgreSQL special-form syntax
cannot be qualified. MVP 13a explicitly authorized and applied the single-token
qualification removal:

```sql
select coalesce(...);
```

No other occurrence of this defect class was found in the candidate migration.
A focused static regression now rejects `pg_catalog.coalesce(`. Repository
evidence still identifies the draft as never applied, with no contrary local
evidence; the authorization exception applied only to this draft and no other
migration history was changed.

## Cleanup

The MVP 13 manual probe and diagnostic harness containers and the MVP 13a normal
harness container were stopped and removed. Docker reported removal of the
task-owned containers and all databases inside them. No task container,
database, volume, process, port, or credential was retained. Only repository
harness files and this sanitized evidence report remain.

## Blocked/skipped checks

- Full repository migration-history replay was not possible because original
  prerequisite history is incomplete; focused fixture execution is not
  equivalent.
- Hosted/deployed-schema compatibility and PostgREST exposure were not checked;
  deployed access was neither authorized nor contacted.
- No broad application build or full `make check` was run; the change is a
  focused offline database harness/report and the relevant contract tests
  passed.

## Remaining authorized hosted-schema verification requirements

A separately authorized read-only hosted-schema task must still record the
deployed PostgreSQL version/encoding, `pgcrypto` schema, exact prerequisite
column/FK/owner shapes, request-role inheritance and BYPASSRLS attributes,
default privileges, object-name collisions, non-null ownership linkage and
agency consistency for intended rows, trusted migration-runner identity, and
actual PostgREST RPC/table exposure. It must not apply the migration.

## Recommended next bounded task

The next bounded task should be the separately authorized read-only hosted-schema
compatibility verification listed above. It must not apply the migration or
treat this local result as deployment readiness.
