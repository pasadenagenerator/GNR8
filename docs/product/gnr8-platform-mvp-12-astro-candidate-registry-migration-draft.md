# GNR8 Platform MVP 12 — Astro Candidate Registry Migration Draft

Date: 2026-09-28

Status: `checked_in_not_applied_database_validation_required`

## Result and boundary

MVP 12 adds one additive Postgres migration implementing the MVP 11 gateway contract, focused offline/static checks, and executable database fixtures for a later authorized run. The migration has not been applied to any database. No database was started or inspected, and real constraints, locking, rollback, RLS, function ownership, and grants remain unverified.

The migration creates:

- `gnr8_astro_candidate_records`: immutable candidate records plus indexed metadata, verified hashes, and the authoritative canonical byte representation;
- `gnr8_astro_candidate_access_states`: mutable enabled/disabled state with optimistic versioning;
- `gnr8_astro_candidate_access_events`: append-only registration and access events;
- `gnr8_register_astro_candidate`: atomic registration RPC;
- `gnr8_read_astro_candidate_for_scope`: exact-scope, enabled-only read RPC;
- `gnr8_list_astro_candidate_metadata`: bounded, cursor-compatible metadata RPC with no candidate payload;
- `gnr8_set_astro_candidate_access`: idempotent optimistic disable/re-enable RPC.

This changes no product behavior. It adds no adapter, route, producer, registration caller, UI, configuration, deployment, publish binding, preview binding, or deletion path.

## Checked-in ownership evidence

The migration uses the following chain. “Checked in” means only that the definition is present in repository files; it does not prove the deployed shape or data.

| Candidate field | Authoritative lookup / FK | Checked-in evidence | Required relationship |
| --- | --- | --- | --- |
| `runtimeSiteId` | `gnr8_runtime_site_versions.site_id` → `gnr8_runtime_sites.id` | `ensureRuntimeTables` in `apps/platform/gnr8/runtime/runtime-store.ts` | The selected version's runtime site must equal every duplicated runtime site field in the record/candidate/manifest. |
| `siteVersionId` | `gnr8_runtime_site_versions.id` | `ensureRuntimeTables` | UUID version row must exist. |
| `ownershipSiteId` | `gnr8_runtime_site_versions.ownership_site_id` → `sites.id` | `20260326090000_ownership_foundation.sql`; `ownership-foundation.schema.sql` | Nullable checked-in linkage must be populated for registration. Missing linkage fails closed. |
| `organizationId` | `sites.org_id` → `organizations.id` | ownership foundation migration/schema | First-class site organization must equal the record identity. |
| `agencyId` | `sites.agency_id` → `agencies.id`; also `organizations.agency_id` → `agencies.id` | ownership foundation migration/schema | Site and organization agency values must match each other and the record identity. |

The checked-in repository does not contain the original `organizations` table creation. Its UUID `id`, `name`, and later `agency_id` shape are inferred from the ownership migration, its FKs, and current inserts. This is an explicit application prerequisite, not a deployed fact.

Registration performs the complete join inside the SECURITY DEFINER function and rejects a missing row, nullable ownership linkage, or any duplicated ownership mismatch as `ownership_mismatch`. Direct FKs use `on delete restrict`; the migration introduces no cascading or automatic deletion.

## Canonical serialization and size

TypeScript remains the canonical serializer and semantic validator:

1. `stableStringify` recursively sorts object keys and `Buffer.from(text, "utf8")` defines the bytes.
2. The future adapter must supply four TypeScript-canonical strings: the content envelope, registration intent, unsigned record, and complete record.
3. Postgres parses those strings only for structural equality and field/vocabulary checks. It never treats `jsonb::text` as equivalent to `stableStringify`.
4. Postgres computes SHA-256 over each supplied UTF-8 text representation and verifies content, registration-intent, and storage hashes against the record.
5. `canonical_record_text` is the authoritative stored representation. `payload_size_bytes` is a generated `octet_length(canonical_record_text)` value. Registration also compares the gateway's proposed byte count to `octet_length`; the caller's count is not trusted.
6. The database check is inclusive: 1 through 2,097,152 bytes. The prepared fixtures cover multibyte content, exactly 2,097,152 bytes, and one byte over.

Postgres structural checks do not replace TypeScript HTML/CSS safety validation, exact ISO normalization, stable key ordering, canonical number formatting, or schema-level semantic validation. The future service must validate with `validateAstroProductionCandidateRecord` before RPC invocation and revalidate returned records.

The RPC status vocabulary matches the MVP 11 gateway boundary: registration returns `created`, `idempotent`, `conflicting_write`, or `ownership_mismatch`; reads return `found`, `missing`, `disabled`, or `ownership_mismatch`; access changes return `updated`, `idempotent`, `missing`, `version_conflict`, `conflicting_write`, or `integrity_validation_failed`; metadata listing returns `items` plus `hasMore`. Database/transport exceptions remain the future adapter's `unavailable` boundary. SQLSTATE `22023` denotes an input that escaped TypeScript validation and must not be treated as a successful typed outcome.

## Atomicity, collision, and access semantics

`gnr8_register_astro_candidate` is one database statement/transaction boundary. It takes transaction-scoped advisory locks for both candidate ID and registration idempotency key in sorted order, resolves authoritative ownership, checks candidate-ID and idempotency-key rows under row locks, then inserts the immutable record, version-1 enabled access state, and registration event. A failure aborts the statement; an identical intent returns the original canonical record and original `storedAt`; changed candidate-ID/key intent returns `conflicting_write`.

The advisory locks intentionally over-serialize the vanishingly unlikely case of a 64-bit lock-key hash collision. Unique constraints remain the durable collision backstop. Only later database execution can verify the actual blocking, deadlock, and rollback behavior.

Access changes use the same sorted-lock pattern for candidate ID and access idempotency key, then lock the access row. `expectedVersion` must match. Each successful change increments the version and uses that version as the append-only event index. An identical action retry returns `idempotent`; reuse of a key for a different canonical action returns `conflicting_write`.

Re-enable additionally requires:

- current state `disabled` at the exact `expectedVersion`;
- declared policy `existing_superadmin` and matching action/authorization actor IDs;
- renewed content and storage hashes equal to the immutable candidate row;
- validation time at or after the current disabled state's `changedAt` and at or before the re-enable event time;
- event evidence storing the exact source disabled version and renewed hashes.

The database verifies only the declared identity/evidence and stored hashes. Server authentication, the real superadmin allowlist, semantic content revalidation, and authorization to invoke re-enable remain service responsibilities.

## Privilege model

All three tables have RLS enabled and forced, with no browser/service policies. All table privileges are revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`. Function execution defaults are revoked from browser roles and `PUBLIC`; only the four gateway RPCs are granted to `service_role`. Internal helpers are also revoked from `service_role`.

Every gateway RPC is SECURITY DEFINER with fixed `search_path = pg_catalog`, qualified relation/function names, and no dynamic SQL. This is intended to prevent an ordinary service-role request from directly inserting, updating, deleting, or selecting table rows while permitting the narrow RPC surface.

Database owners, superusers, BYPASSRLS roles, and roles able to replace functions/triggers retain maintenance authority. They can deliberately alter or disable these controls. Before application, verify that function/table ownership is a dedicated trusted migration owner and is not `service_role`, `anon`, or `authenticated`; verify the owner can execute the forced-RLS functions as designed. This migration does not pretend to constrain the database owner.

## Required deployed-schema preflight

Do not apply the migration until an authorized, read-only deployed-schema task verifies and records:

1. PostgreSQL version supports stored generated columns and `hashtextextended` with the expected signatures.
2. `public.digest(bytea, text)` exists and belongs to the expected `pgcrypto` extension schema. Checked-in migrations create `pgcrypto` without a schema qualification; deployed placement is unknown.
3. Roles `anon`, `authenticated`, and `service_role` exist; their inheritance, BYPASSRLS, and current default table/function privileges are recorded.
4. Exact table/column types, owners, constraints, and FKs for `gnr8_runtime_sites.id`, `gnr8_runtime_site_versions.id/site_id/ownership_site_id`, `sites.id/org_id/agency_id`, `organizations.id/agency_id`, and `agencies.id` match the checked-in assumptions.
5. Every target runtime version intended for candidate registration has non-null, valid `ownership_site_id`, and `sites.agency_id = organizations.agency_id`.
6. No existing object/function names collide with the migration's tables, indexes, triggers, or functions.
7. Migration runner identity will own or validly create the objects; resulting SECURITY DEFINER owners are trusted and not request-facing roles.
8. PostgREST exposes only the intended RPCs and does not regain table privileges through inherited roles or altered default privileges.
9. Database encoding is UTF-8, so `octet_length(text)` measures the same encoded representation supplied by TypeScript.

Any mismatch is a stop condition. Amend a new migration or obtain a separate architectural decision; do not edit checked-in migration history and do not partially apply by hand.

## Later authorized execution and failure handling

The bounded follow-up should use a disposable Supabase/Postgres environment matching the deployed major version and roles:

1. Capture the read-only preflight evidence above.
2. Apply all repository migrations to a fresh disposable database, including `20260928120000_astro_candidate_registry.sql`.
3. Run `supabase/tests/astro_candidate_registry/functional.sql` with `ON_ERROR_STOP`.
4. In separate fresh disposable databases, load `fixture.sql` and run each isolationtester spec. Confirm `created`/`idempotent` with the original `storedAt`, and exactly one row plus `conflicting_write` for the changed-intent collision.
5. Inspect RLS flags, ACLs, function owners, `prosecdef`, `proconfig`, dependencies, FK targets, indexes, and trigger enablement from catalogs.
6. Exercise actual `SET ROLE anon`, `authenticated`, and `service_role` denial/RPC cases and record the results.
7. Run `EXPLAIN` for the bounded metadata list query at representative cardinality without introducing data deletion or production writes.

If migration application fails, stop. Preserve the complete error and transaction state, verify that the migration transaction rolled back, and discard/recreate only the disposable database through the environment's normal tooling. Do not hand-edit migration history, mark a failed migration complete, mutate production rows, disable triggers/RLS, or introduce a rollback/delete migration in the same validation task.

## Prepared database tests not run

- successful atomic registration and scoped read;
- direct-role denial and narrow RPC privilege shape;
- identical retry preserving original `storedAt`;
- candidate-ID and idempotency-key conflicts;
- authoritative ownership mismatch;
- atomic rollback after late validation failure;
- exact 2,097,152-byte multibyte fixture and one-byte-over denial;
- payload-free bounded metadata list;
- disable, disabled read denial, optimistic version conflict, and idempotent access retry;
- re-enable denial for mismatched hashes and success bound to the current disabled version;
- append-only events and immutable candidate payload under owner-level update attempts;
- concurrent identical and conflicting registrations through PostgreSQL isolationtester specs.

These tests are prepared only. Until an authorized database run succeeds, real transaction, advisory-lock, uniqueness, FK, trigger, RLS, SECURITY DEFINER, and permission behavior is unverified. A bounded database-validation task is required before this migration can be described as deployment-ready.
