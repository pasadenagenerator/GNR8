# GNR8 Platform MVP 11 — Astro Production Candidate Contract And Repository Semantics

Date: 2026-09-28

Status: `implementation_complete`

## Result

MVP 11 implements the pure TypeScript v2 production candidate contract and gateway-neutral repository semantics defined by MVP 10. Verification uses an in-memory gateway only. No SQL, migration, Supabase adapter, database access, ownership resolver, registration service, producer execution, route, UI, configuration, environment change, or deployment was added.

The production contract is deliberately separate from MVP 08 schema `gnr8-astro-persisted-preview-candidate:v1`. V2 uses schema `gnr8-astro-persisted-preview-candidate:v2`, record kind `astro_internal_preview_candidate_record`, canonical `astro_candidate_<uuid-without-hyphens>` candidate IDs, canonical UUID site-version/first-class ownership identities, and lifecycle `supabase_postgres` / `retained_until_explicit_authorized_deletion` / `durableRegistration: true`. Production validation rejects v1 as `unsupported_version`; v1 proof readers, defaults, and MVP 09 readback remain unchanged.

## Contract and integrity rules

- Supported schema, record/candidate kind, adapter, conversion, export, renderer, asset mode, and lifecycle values are explicit allowlists. Unknown values fail closed.
- Candidate payload validation is root-route-only and self-contained: inline CSS, no scripts or executable attributes, no forms, no linked/HTML asset dependencies, no CSS `@import`, and no non-data/non-fragment CSS URL dependency.
- Canonical serialization is deterministic stable JSON encoded as UTF-8. The hard limit is exactly 2,097,152 bytes and is inclusive. The derived future database `payloadSizeBytes` value is gateway metadata rather than a field inside the hashed record, avoiding a self-referential size.
- The established converted-content SHA-256 semantics are reused. The v2 storage SHA-256 covers the complete immutable record envelope, including identity, first-class ownership, production lifecycle, candidate payload, actor/producer context, and `storedAt`, excluding only `storageSha256` itself.
- Hashes are integrity evidence, not signatures, authentication, authorization, governance, gate results, or publish readiness. Pure ownership consistency checks do not establish authority; a future authoritative resolver/database constraint must do that.

## Repository and access semantics

Create calls one `atomicCreate` gateway operation. It does not perform read-then-write. Immutable registration intent includes the candidate identity, runtime and first-class ownership, payload/hashes, actor, producer kind/version/ref, idempotency key, and correlation ID; the winning attempt's `storedAt` and its resulting storage hash are excluded from retry comparison. An identical retry with the same key returns the original row and original `storedAt`; any changed immutable value, candidate-ID reuse, or key reuse conflicts.

Read requires candidate ID plus trusted runtime site/version and first-class site/organization/agency scope. Metadata lists are bounded and cursor-based, ordered by `storedAt DESC, candidateId ASC`, and cannot contain candidate HTML/full payloads. The repository exposes no implicit-latest, update-payload, delete, bind, promote, publish, or default-preview operation.

Mutable access state and append-only access events are separate from the immutable record and both content/storage hashes. Disablement makes reads fail closed without changing payload bytes. Re-enable requires the declared existing-superadmin policy identity plus renewed matching content and storage hashes and appends an `enabled` event. This contract models prerequisites only; it does not implement authentication or an access-control service.

The in-memory gateway models single-operation created/idempotent/conflicting concurrent outcomes and atomic access changes. It is not evidence that a real database transaction, uniqueness constraints, locking, ownership lookup, RLS, RPC, or rollback behavior exists.

## Confirmed decisions

MVP 10 now records all four accepted decisions: private Postgres-only storage with the hard 2 MiB limit; a separately authorized explicit internal Astro build/export-to-bridge synthetic producer; audited superadmin re-enable after renewed integrity validation with immutable payloads; and no automatic deletion until retention/deletion authority is defined.

## Validation

- Focused v2 contract/repository tests: 24/24 passed.
- Combined v1 repository, bridge, authenticated-readback, unified-preview, and v2 regression command: 132/132 passed.
- Focused TypeScript no-emit validation passed with `next-env.d.ts` and the affected dependency graph.
- Exact-byte tests cover multibyte UTF-8, the inclusive 2 MiB boundary, and one byte over. Contract tests cover versions, lifecycle, identities, ownership, tampering, retry/conflict/concurrency outcomes, metadata redaction, access separation, and absence of governance/default-binding fields.

Product behavior changed: no. Existing routes, previews, proof storage, authenticated proof readback, default loaders/bindings, and deployed storage behavior are unchanged.

## Remaining work

Real database atomicity, authoritative ownership resolution, database immutability/size constraints, RLS/grants, event consistency, and production durability remain unverified. The next bounded task is a checked-in additive candidate-registry migration with migration-level tests, without applying it.
