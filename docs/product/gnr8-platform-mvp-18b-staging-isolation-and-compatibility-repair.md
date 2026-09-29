# GNR8 Platform MVP 18b — Staging Isolation and Compatibility Repair

Date: 2026-09-29

Status: `package_ready_hosted_application_not_approved`

Decision: **BLOCKED**

## Decision summary

The exact staging target is isolated, the exposed staging database password was
rotated a second time after the first replacement was inadvertently exposed,
and the `gnr8-platform` Preview database entry is now a Preview-only Secret.
The worker's all-environments database entry was privately classified as
production and was left unchanged. Provider metadata supports successful
invalidation of the original and first replacement staging passwords. Direct
password authentication with the non-revealable replacement remains
unverified: Vercel correctly returned placeholders when a task-owned temporary
environment pull was attempted, and the temporary files were removed.

The smallest coherent, data-empty compatibility package is ready. It creates
the missing canonical ownership foundation, adds the nullable runtime ownership
link, and changes the never-applied candidate draft from `public.digest` to the
observed `extensions.digest`. The exact ordered package passes the complete
PostgreSQL 17 disposable-database harness, focused contract tests, a focused
TypeScript check, role/RLS/catalog checks, both registration concurrency
specifications, and TypeScript/PostgreSQL canonical-byte round trips.

A clean archive of committed revision
`5d22f4bb18e70ae3144fd0a749544d522dbacffa` was deployed successfully to one
staging-only Vercel Preview. Vercel reports the deployment as `target: preview`
and `READY`; deployment protection remains enabled. The Astro gate is absent
and therefore disabled. A protected read-only request reached the new route and
returned the expected unauthenticated `401` with security headers. A real
application superadmin session was not available on the new deployment, so the
post-login disabled-gate response remains unverified.

MVP 19 activation remains **blocked** until the exact hosted SQL package receives
separate approval and is applied successfully to staging, direct database
authentication is verified, post-migration checks pass, and an authorized
staging superadmin session is available. No hosted SQL, registration, synthetic
record, producer build, feature enablement, production deployment, or publish
operation occurred. This is an internal synthetic-pilot package, not production
publishing readiness.

## Exact target and isolation result

| Item | Sanitized evidence | Result |
| --- | --- | --- |
| Supabase | `GNR8-STAGING`, ref `dpkdxllcxnlytgjbnmvp`, database `postgres` | pass |
| Project URL | `https://dpkdxllcxnlytgjbnmvp.supabase.co` | pass |
| `gnr8-platform` Preview `DATABASE_URL` | Preview-only, now stored as Secret, updated after the second staging reset | pass for isolation/configuration |
| `gnr8-platform` Production+Development `DATABASE_URL` | Separate entry; unchanged | pass |
| `gnr8-worker` all-environments `DATABASE_URL` | Privately classified as production; unchanged | pass; production preserved |
| Local staging entry | Tracked `apps/platform/.env.staging` value cleared; no replacement persisted | pass |
| Original exposed password | Two subsequent staging reset operations provide control-plane invalidation evidence | pass at control plane |
| Current password authentication | Secret cannot be exported; no safe direct connection path was available | unverified |
| Production | No production credential, configuration, database, deployment, or alias changed | scope preserved |

The first replacement password was exposed in tool output while checking the
Vercel editor and was immediately treated as compromised. It is not repeated in
this report. A second reset was completed in the exact staging project and only
the isolated Preview consumer was updated. No password, token, connection
string, or secret-bearing screenshot is retained here.

## Hosted prerequisite evidence

The bounded Supabase catalog recheck used read-only SQL only. It reconfirmed:

- PostgreSQL 17.6 with UTF-8 and `pgcrypto` 1.3 in schema `extensions`;
- `extensions.digest(bytea,text)` exists and `public.digest(bytea,text)` does
  not;
- `public.gnr8_runtime_sites` and
  `public.gnr8_runtime_site_versions` have the required existing identities;
- `public.agencies`, `public.organizations`, `public.sites`, the three required
  ownership enum types, and `ownership_site_id` are absent;
- candidate relations and exact RPC signatures remain absent; and
- no hosted migration-history relation was found.

The candidate migration therefore remains classified **absent**. Candidate RPC,
grant, forced-RLS, SECURITY DEFINER/search-path, and PostgREST checks are pending
application, not failed. No write RPC was invoked.

## Exact approval package

Apply these files in this order only to Supabase project
`dpkdxllcxnlytgjbnmvp`:

1. `apps/platform/supabase/migrations/20260928110000_astro_candidate_hosted_prerequisites.sql`
   - SHA-256:
     `7e265905dfcb8df3ef7a15a606ea50e3bc89f64e36cd3b16d9cb478acd810c0a`
2. `apps/platform/supabase/migrations/20260928120000_astro_candidate_registry.sql`
   - SHA-256:
     `d6e28edaea03fa6c248065b1100c860b65d0361cc1a0ac43a953e90c522070c3`

The earlier, never-applied candidate draft SHA-256 was
`c3aaafe800b9a4d2b1f73b1eba2e5d3002a6b3b7f25e0c7ca1b4f7b0cc6e2154`.
Hosted catalog evidence shows no candidate objects and no migration ledger row,
so changing that draft does not rewrite applied staging history. Its only
compatibility change is the confirmed digest schema qualification.

### Prerequisite migration effects

- Fails closed unless both runtime tables exist, all ownership objects and the
  runtime ownership column are absent, and
  `extensions.digest(bytea,text)` exists.
- Creates `organization_type_enum`, `site_status_enum`, and
  `billing_scope_enum` with the checked-in canonical values.
- Creates full current `agencies`, `organizations`, and `sites` relations,
  including canonical UUID identities, ownership FKs, status/domain/template
  checks, slug/home-agency uniqueness, and supporting indexes.
- Adds two trigger functions and two triggers that enforce agency equality and
  client/agency rules for live, template, and shadow sites, including
  revalidation when organization ownership changes.
- Adds nullable
  `gnr8_runtime_site_versions.ownership_site_id uuid`, its `ON DELETE SET NULL`
  FK to `sites(id)`, and an index.
- Enables RLS on the three ownership tables, revokes request-role table access,
  grants only `SELECT` to `service_role`, and revokes request-role execution on
  the trigger functions.
- Inserts, updates, deletes, seeds, and backfills no rows. Existing runtime
  versions remain linked to `NULL` until a separately approved synthetic setup.

### Candidate migration effects

- Creates the immutable candidate record, access-state, and access-event
  relations and their exact ownership FKs, checks, indexes, generated fields,
  and mutation guards.
- Creates four gateway RPCs for registration, scoped read, metadata list, and
  access mutation, plus private validation/JSON helpers and triggers.
- Enables and forces RLS on all three candidate relations; removes direct table
  access from request roles; grants only the four exact RPC signatures to
  `service_role`; and fixes SECURITY DEFINER search paths.
- Uses `extensions.digest(bytea,text)` without moving `pgcrypto` or creating a
  permissive wrapper.
- Creates no candidate, access-state, or access-event rows.

## Local validation evidence

The normal harness was run against a fresh official `postgres:17` container
modeling the observed staging state: runtime tables only, `pgcrypto` in
`extensions`, Supabase-like roles and broad default ACLs, and
`service_role BYPASSRLS`.

| Check | Result |
| --- | --- |
| Exact prerequisite/candidate bytes and hashes | pass |
| PostgreSQL version used | 17.11 |
| Ordered migration application | pass |
| Functional SQL suite | pass |
| Catalog, default-ACL, ownership, grants, forced RLS, search path | pass |
| Expected catalog shape | 3 forced-RLS candidate tables, 7 restrictive FKs, 4 SECURITY DEFINER gateway RPCs, 3 candidate triggers | pass |
| Registration idempotency isolation spec | pass |
| Registration conflict isolation spec | pass |
| TypeScript/PostgreSQL canonical-byte round trip | pass |
| Focused adapter/repository contract tests | 33/33 pass |
| Focused TypeScript check for changed TS files | pass |
| Task-owned database resources | removed |

The first harness run failed because the staging prerequisite fixture still
pre-created `ownership_site_id`; the fixture was corrected to the observed
hosted state and the complete harness was rerun from a fresh database. No
diagnostic substitution mode was used.

## Current staging Preview

| Field | Evidence | Result |
| --- | --- | --- |
| Source revision | Clean `git archive` of `5d22f4bb18e70ae3144fd0a749544d522dbacffa` | pass |
| Preview URL | `https://gnr8-platform-ono8i9miv-pasadena-generators-projects.vercel.app` | pass |
| Deployment ID | `dpl_Fw3tvpoay2i3GNqQRy1WpRNgnrq6` | pass |
| Vercel target/state | `preview` / `READY` | pass |
| Build | Next.js production build completed in 4m03s; existing lint warnings only | pass |
| Production alias | `productionUrl: null`; no promotion or production alias | pass |
| Deployment protection | Vercel Authentication retained | pass |
| Staging linkage | Preview Supabase URL privately matched the exact staging ref; Preview DB entry is the isolated Secret | pass for configuration metadata |
| Astro gate | Variable absent, therefore disabled | pass |
| Route reachability | Protected GET reached the deployed MVP 14–17 route and returned `401 Authentication required` | pass |
| Security headers on denied response | no-store, restrictive CSP, nosniff, no-referrer, restrictive permissions policy, same-origin CORP | pass |
| Superadmin login / disabled-gate response | No authorized application session on this Preview | unverified |

Because the deployment was uploaded from a clean archive, Vercel has no native
Git revision field for this deployment. Revision provenance is the locally
verified archive input plus the successful build and route evidence; it is not
misrepresented as provider Git metadata.

The lightweight tag `codex-mvp18b-staging-preview-20260929`, pointing to the
same commit, was pushed with authorization but not used: Vercel's dashboard
classified both the SHA and tag flow as Production, so execution stopped before
deployment. The retained Preview was created through the explicit CLI Preview
target instead. The tag remains local and on `origin` for auditability.

`SUPERADMIN_EMAILS` is present at All Environments scope. This corrects the MVP
18a report's earlier absence statement. Presence does not prove an allowlisted
user session.

## Proposed hosted execution and stop conditions

The approved operator must first verify the two hashes above from the working
tree and establish a successful direct read-only connection using the isolated
staging secret. The value must come from an approved secret store and must not
be copied into chat, logs, shell history, or tracked files.

For an approved CLI path, the shape is:

```sh
shasum -a 256 \
  apps/platform/supabase/migrations/20260928110000_astro_candidate_hosted_prerequisites.sql \
  apps/platform/supabase/migrations/20260928120000_astro_candidate_registry.sql

psql -X -v ON_ERROR_STOP=1 "$GNR8_STAGING_DATABASE_URL" \
  --file=apps/platform/supabase/migrations/20260928110000_astro_candidate_hosted_prerequisites.sql

psql -X -v ON_ERROR_STOP=1 "$GNR8_STAGING_DATABASE_URL" \
  --file=apps/platform/supabase/migrations/20260928120000_astro_candidate_registry.sql
```

The variable is a secret-store reference, not a value for the command line.
Using the exact Supabase staging SQL Editor is an acceptable secure alternative.
Apply one complete file at a time; each file owns its transaction.

Before the first file, repeat the exact bounded collision, runtime-type,
extension-signature, role, ownership, and migration-history prechecks. Stop
without applying anything if the target ref, hashes, prerequisite types,
extension placement, or absence classification differs.

After the prerequisite file, use a read-only transaction to verify the three
tables and enum types, exact columns/FKs/checks/indexes/triggers, object owners,
RLS flags and grants, zero ownership rows, and all existing runtime ownership
links still `NULL`. Stop before the candidate file on any mismatch.

After the candidate file, use read-only catalog queries to verify all three
relations, seven restrictive ownership FKs, three forced-RLS flags, immutable
triggers, exact four RPC signatures, SECURITY DEFINER owners/search paths,
request-role revokes, service-role EXECUTE-only grants, default-ACL effects,
and PostgREST visibility. Do not invoke any RPC as a probe and do not reload the
schema cache under this approval.

Any uncertain DDL outcome stops further writes. Reconcile through catalog and
migration evidence before retrying; never replay blindly. Data deletion and
schema rollback are outside this package.

## Remaining MVP 19 activation scope

After this package is approved and its postchecks pass, MVP 19 still requires
separate authorization to:

1. create only the minimum synthetic agency, organization, site, and runtime
   ownership linkage for one existing test-prefixed runtime version;
2. install/build only the allowlisted synthetic producer;
3. retain the operation identity in a durable journal before registration and
   reuse it to reconcile an ambiguous write rather than generating a new
   candidate or idempotency key;
4. register exactly one synthetic candidate and prove persistence/readback from
   a fresh process or request context;
5. verify real staging superadmin login, Workspace/list, exact preview,
   denied-access behavior, and all security headers; and
6. enable the global gate only after every prerequisite succeeds, disabling it
   again if any pilot verification fails.

Stop further writes on any mismatch. Preserve immutable registration and access
records and the operation journal. Production, customer content, publishing,
live pointers, DNS, provider execution, billing, Airship, source capture,
customer domains, dry-run, shadow publish, deletion, and rollback remain out of
scope.

## Changes and checks not claimed

- Hosted configuration changed only for the exact staging password and the
  `gnr8-platform` Preview-only database Secret. Production/shared entries were
  not changed.
- Local configuration changed only by clearing the exposed tracked staging
  database value. No replacement was stored locally.
- Local product changes are the two-migration package and its focused validation
  fixture/harness/test updates. Documentation records MVP 18, 18a, and 18b.
- One retained Preview deployment and one audit tag were created. No production
  deployment, alias, or promotion occurred.
- No hosted SQL, grant, schema-cache reload, ownership row, synthetic record,
  registration, producer build, access mutation, gate enablement, or publish
  operation occurred.
- Direct password authentication and real authenticated superadmin behavior are
  explicitly unverified. The unauthenticated `401` does not prove storage
  integration or the disabled-gate branch.
- The task-owned Preview archive, environment-pull directory, disposable
  databases/containers, and temporary TypeScript configuration were removed.

## Approval request

Approve only the ordered application of the two exact SQL files and hashes in
this report to Supabase staging project `dpkdxllcxnlytgjbnmvp`, with the stated
prechecks, intermediate postcheck, final read-only postchecks, and stop
conditions. This approval must not be interpreted as authorization for
synthetic data creation, registration, build/export, gate enablement,
deployment, production, publishing, deletion, or rollback.
