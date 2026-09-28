# GNR8 Platform MVP 14 — Supabase Candidate Repository And Ownership Resolver

Date: 2026-09-28

Status: `implementation_complete_mocked_transport_only`

## Result

MVP 14 implements an unmounted, server-only Supabase RPC gateway for the v2
Astro production candidate repository and an auth-independent authoritative
ownership resolver. Both acquire stateless service-role clients only when an
explicit method is invoked, accept injected client factories, and make no
request or client on import.

No route, page, admin UI, preview binding/default, producer, registration
service, deployment, migration application, schema, environment, dependency,
provider, DNS, billing, publish, rollback, customer-domain, source-capture, or
Airship behavior changed.

## RPC mapping

| Gateway operation | Checked-in RPC | Arguments and response handling |
| --- | --- | --- |
| `atomicCreate` | `gnr8_register_astro_candidate` | Sends the validated canonical record, unsigned record, registration intent, content envelope, intent SHA-256, and exact UTF-8 size. Accepts only `created`, `idempotent`, `conflicting_write`, or `ownership_mismatch`; successful records, hashes, access state, and registration event are revalidated. |
| `readForScope` | `gnr8_read_astro_candidate_for_scope` | Sends candidate ID plus all five resolver-owned scope fields. Accepts only `found`, `missing`, `disabled`, or `ownership_mismatch`; `found` must contain an enabled, fully validated, same-scope record with a registration event. |
| `listMetadata` | `gnr8_list_astro_candidate_metadata` | Sends all five scope fields, paired nullable cursor values, and the bounded limit. Accepts only exact payload-free metadata rows ordered by `storedAt DESC, candidateId ASC`; cursor boundaries and `hasMore` are checked. |
| `atomicSetAccess` | `gnr8_set_astro_candidate_access` | Sends one validated canonical action. Accepts only the migration statuses and validates access/event identity, action evidence, and updated version. This is persistence plumbing, not an authorization service; callers must preserve repository authentication and preconditions. |

The canonical serializers live with the established MVP 11 record/repository
contract. The gateway does not duplicate content-hash, storage-hash,
registration-intent, access-action, or idempotency rules. Registration remains
one RPC transaction; no read/write sequence attempts to simulate atomicity.
Identical retries accept the database winner's original `storedAt` and storage
hash after immutable-intent validation.

## Authoritative ownership mapping

The resolver performs bounded `limit(2)` stateless reads through this chain:

```text
gnr8_runtime_site_versions.id
  -> gnr8_runtime_site_versions.site_id
  -> gnr8_runtime_sites.id
  -> gnr8_runtime_site_versions.ownership_site_id
  -> sites.id / sites.org_id / sites.agency_id
  -> organizations.id / organizations.agency_id
  -> agencies.id
```

It rejects invalid or non-unique rows, missing links/related records,
runtime-site/version mismatch, malformed schema shapes, and inconsistent
site/organization agency relationships. It does not read memberships or infer
ownership from candidate metadata, URL organization/agency values, home agency,
or a first available row. Caller authentication remains separate; future
composition must authenticate through the existing MVP 09 superadmin policy
before invoking this resolver.

Ownership freshness has two enforcement points. Readback must resolve the
current authoritative chain for every request and pass that exact scope to the
scoped-read RPC. Registration additionally rechecks and locks authoritative
ownership transactionally inside `gnr8_register_astro_candidate`; a previously
resolved application scope cannot replace that database check.

## Error and response boundary

- RPC and query responses enter as `unknown` and fail closed on unknown status,
  extra/missing fields, invalid identity/version/hash/size/timestamp/access
  state, payload-bearing metadata, unstable pagination, or cross-request scope.
- Transport, client-factory, and database errors map to sanitized
  `unavailable` outcomes/errors. SQL text, HTML, credentials, and raw stacks are
  not copied into outward messages.
- Unsupported record versions, corrupt records, oversized records, disabled or
  missing candidates, ownership mismatch, conflicts, access-version conflicts,
  and re-enable prerequisite failures preserve the existing repository outcome
  vocabulary.
- The resolver performs reads only. The gateway calls only the four checked-in
  RPCs and exposes no direct table insert/update/delete operation.

## Changed files

- `apps/platform/gnr8/output-adapters/astro-production-candidate-supabase-gateway.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-supabase-gateway.test.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-ownership-resolver.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-ownership-resolver.test.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-record.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-repository.ts`
- `apps/platform/gnr8/output-adapters/astro-static-site-internal-preview-bridge.ts`
- this report

## Validation boundary

Mocked transport coverage uses injected fake Supabase clients only. It covers
exact RPC names/arguments/canonical bytes, created/idempotent/conflict mapping,
original `storedAt`, scoped read, disabled/missing candidates, corrupt and
unsupported records, oversized responses, transport failures,
metadata redaction and pagination, access evidence, concurrent request
isolation, bounded authoritative queries, null/missing/mismatched ownership,
organization/agency inconsistency, duplicate rows, malformed schema responses,
and unavailable clients. Static checks prohibit client fallback, direct table
mutation in the gateway, and writes/auth/membership fallback in the resolver.

Validation results:

- Migration alignment, v2 contract/repository, gateway, and resolver: 58/58
  tests passed, including the established inclusive 2 MiB/one-byte-over checks.
- V1 repository, bridge, readback, and authenticated-readback regressions:
  53/53 tests passed.
- Focused TypeScript no-emit validation passed with `next-env.d.ts`, both new
  tests, and the affected dependency graph.
- `git diff --check` and a changed-file trailing-whitespace scan passed.

This is separate from MVP 13a's already completed local PostgreSQL validation
of the exact migration against its focused prerequisite fixture. MVP 14 did not
reapply a migration or contact a database.

No TypeScript-to-migration contract mismatch was found. The validated migration
was not edited.

## Unverified hosted boundary

Hosted PostgREST exposure, deployed schema compatibility, service-role RPC
execution, row-size behavior, ownership-link coverage, credentials/configuration,
RLS/grants in a hosted project, and any deployed registration/readback remain
untested. No hosted database, auth, storage, customer data, or credential value
was contacted or inspected.

## Future composition and next bounded task

The gateway is ready to sit behind a future server-only registration service;
the resolver is ready to precede scoped list/readback after existing superadmin
authentication. Neither is mounted or configured by this task.

The next bounded task is the server-only registration service and the approved
synthetic producer integration, with injected composition and tests only—no
deployed execution, candidate write, route mounting, or preview-default change.
