# GNR8 Platform MVP 10 — Astro Candidate Storage And Admin Integration Plan

Date: 2026-09-27

Status: `plan_with_confirmed_product_decisions`

## Scope and outcome

This plan defines the smallest production-capable integration for immutable, self-contained Astro internal preview candidates. It covers durable registration, authoritative site/version ownership resolution, authenticated superadmin readback, explicit admin selection, access disabling, and deployment ordering.

This document does not implement or authorize application code, schema, migration application, provisioning, environment changes, provider execution, Astro generation, publishing, promotion, live-pointer changes, current-preview rebinding, Airship generation, DNS, billing, source capture, customer-domain work, rollback, dry-run, or shadow publish.

The target completion milestone for the later implementation sequence is:

> An authorized superadmin opens an explicitly selected persisted Astro candidate after the producing process has exited and the platform process has restarted; an unauthenticated or non-superadmin request fails before candidate storage is read; existing transformed previews, Airship previews, live pointers, and the `html-static-artifact` fallback remain unchanged.

## Recommended design

Use a dedicated, private Supabase/Postgres candidate registry with the complete bounded candidate record stored as JSONB plus indexed identity, compatibility, provenance, hash, ownership, and operational columns. Use stateless server-side Supabase PostgREST/RPC access through the existing service-role helper. Do not use object storage for the current contract.

The production record is a dedicated Astro preview candidate, not a `RuntimeArtifact`. It cannot be selected by default runtime bindings and carries no publish stage, gate result, rollout policy, or artifact-governance assertion.

The recommendation has four boundaries:

1. A versioned production record contract adapts the MVP 08 immutable repository semantics without treating the local proof lifecycle as production registration.
2. One database transaction validates authoritative ownership and atomically creates the immutable candidate, its enabled access state, and its first access event.
3. An authenticated route resolves ownership from `gnr8_runtime_site_versions` and first-class `sites` before loading candidate payload; duplicated candidate metadata is integrity evidence only.
4. A superadmin-only candidate list under the existing Workspace makes selection explicit. It does not create a default preview binding or change any existing preview URL.

Main tradeoff: Postgres-only storage gives a single atomic commit and the simplest recovery model for today's one-route, inline-CSS payload, but it deliberately retains the 2 MiB record ceiling and is not the future storage answer for binary assets, many routes, or large bundles.

## Confirmed product decisions

The following MVP 10 decisions were accepted on 2026-09-28 and govern subsequent implementation tasks:

1. The current single-route HTML/CSS production candidate uses private Postgres-only storage with a hard 2 MiB canonical-record limit.
2. The first producer is a separately authorized, explicitly triggered internal Astro build/export-to-bridge workflow for synthetic candidates. It is not automatically connected to existing generation.
3. A superadmin may re-enable a disabled candidate only through an audited access event after renewed content/storage integrity validation. The immutable candidate payload is never rewritten.
4. No automatic deletion, TTL, or cleanup is authorized. Retention duration/class, legal-hold behavior, deletion authority, and audit requirements must be decided before deletion is introduced.

These decisions authorize contract and repository design implementation only. They do not authorize a migration, deployed configuration, producer execution, candidate registration write, route mounting, storage access, or deployment.

## Repository evidence and current flow

The following files are the checked-in evidence for this plan. They are not evidence that matching tables, constraints, credentials, buckets, or deployed code exist in any environment.

| Concern | Checked-in evidence | Current fact | Missing connection |
| --- | --- | --- | --- |
| Adapter choice | `docs/product/gnr8-astro-output-adapter-decision.md`; `apps/platform/gnr8/output-adapters/astro-static-site-adapter.ts` | Astro is the preferred first source-backed adapter; `html-static-artifact` remains the production fallback. | Astro remains a proof/skeleton, not a production candidate producer. |
| Candidate creation | `convertAstroExportToInternalPreviewCandidate` in `apps/platform/gnr8/output-adapters/astro-static-site-internal-preview-bridge.ts` | Revalidates an export and creates a deterministic, self-contained candidate with repeated ownership and provenance hashes. | Its supported lifecycle is proof-only and always has `durableRegistration: false`. |
| Supported payload | `apps/platform/gnr8/output-adapters/astro-static-site-internal-preview-bridge.ts`; `docs/product/gnr8-platform-mvp-06-astro-internal-preview-bridge-proof.md` | Exactly `/`, inline referenced CSS, no external asset storage, and no scripts or additional HTML routes. | No production record schema or asset evolution contract. |
| Local registration | `AstroInternalPreviewCandidateRepository` and `LocalFilesystemAstroInternalPreviewCandidateRepository` in `apps/platform/gnr8/output-adapters/astro-internal-preview-candidate-repository.ts` | Immutable create/read, 2 MiB bound, storage hash, idempotent retry, conflict detection, ownership-checked read, atomic filesystem visibility. | Local filesystem is not a production durability boundary and the record kind/lifecycle are explicitly proof-only. |
| Persistence proof | `docs/product/gnr8-platform-mvp-08-astro-candidate-persistence-readback-proof.md` | A second process read and rendered a complete persisted record after the writer and source workspace exited. | No database/object adapter, durable registration, retention, or operator surface. |
| Authenticated service | `createAuthenticatedAstroCandidateReadbackService` in `apps/platform/gnr8/output-adapters/authenticated-astro-candidate-readback-service.ts` | Authenticates first, then resolves trusted scope, then performs exact candidate/site/version readback. Candidate metadata does not authorize access. | Trusted scope resolver and production repository are injected but unconfigured. |
| Handler and isolation | `createAuthenticatedAstroCandidateReadbackRouteHandlers` in `apps/platform/gnr8/output-adapters/authenticated-astro-candidate-readback-route-handlers.ts` | Maps auth failures, returns `no-store`, `nosniff`, restrictive sandbox CSP, and renders through the unified renderer. | Factory is unmounted and still accepts all identities through query selectors. |
| Auth proof | `docs/product/gnr8-platform-mvp-09-authenticated-astro-candidate-readback-proof.md` | Controlled auth/scope stubs plus real local storage proved ordering and non-enumerating readback behavior. | Stubs do not prove a real session, deployed ownership lookup, or production storage. |
| Unified selection | `renderAstroInternalPreviewCandidate` and `renderSiteVersionPreview` in `apps/platform/gnr8/runtime/unified-render-preview.ts` | Astro is selected only when `mode === "transformed"` and an explicit `astroCandidateSelection` plus loader are supplied; the default loader returns `null`. | No route supplies a production loader. Current root fallback would also accept a non-root requested path and should be tightened at the Astro route boundary for v1. |
| Existing runtime payload storage | `ensureRuntimeTables` in `apps/platform/gnr8/runtime/runtime-store.ts` | Checked-in DDL stores `gnr8_runtime_artifacts.html_by_path`, asset fingerprints, and manifest in Postgres JSONB/text. | Core runtime DDL is created dynamically rather than fully represented by a checked-in migration; deployed shape is unverified. |
| Ownership | `apps/platform/supabase/schema/ownership-foundation.schema.sql`; `apps/platform/supabase/migrations/20260326090000_ownership_foundation.sql` | `gnr8_runtime_site_versions.site_id` is the runtime site identity and nullable `ownership_site_id` links to first-class `sites`, which carry `org_id` and `agency_id`. | Deployment presence, non-null coverage, FK validity, and authoritative linkage for target versions are unverified. |
| Platform data access | `apps/platform/gnr8-supabase-architecture.md`; `apps/platform/src/supabase/service-role-server.ts` | Server render reads must be stateless; request paths must not use raw `pg`; the existing service-role client disables persisted sessions and token refresh. | Candidate repository and resolver do not yet use this path. |
| Superadmin policy | `requireSuperadminUserId` and `requireSuperadminUserIdForPage` in `apps/platform/src/auth/require-superadmin-user-id.ts` | Supabase user authentication plus the existing `SUPERADMIN_EMAILS` allowlist is the current internal policy. | No Astro route/page invokes the real guard yet. |
| Admin placement | `apps/platform/app/gnr8/admin/workspace/[siteVersionId]/page.tsx`; `transformationStory` in `apps/platform/gnr8/architecture/knowledge-workspace-projection.ts` | Workspace and its supporting surfaces are already superadmin-only and site-version scoped. | No Astro candidate list/link exists. |
| Existing object storage | `apps/platform/gnr8/template-intake/storage/template-source-zip-storage.ts`; migration `20260420110000_template_source_zip_storage.sql` | A private Supabase Storage pattern exists for source ZIPs and stores bucket/key metadata. | It uses a separate mutable upload/delete lifecycle and does not provide an atomic candidate registration contract or prove a candidate bucket exists. |
| Deployment boundary | `docs/gnr8-vercel-runtime-backbone.md`; `apps/platform/next.config.mjs` | Platform owns UI/auth/preview surfaces; worker owns heavy background execution. Both are described as Vercel projects. | Actual deployed project, runtime variables, database schema, and rollout state are unverified. |
| Architecture guardrails | `docs/ai/decisions/ADR-001-deterministic-pipeline.md`, `ADR-002-preview-assets-architecture.md`, and `ADR-003-runtime-artifact-model.md` | Deterministic contracts, explicit asset lineage, immutable artifacts, persisted evidence, and no hidden fallback are accepted decisions. | Production Astro candidate registration and diagnostics must implement those rules without pretending the proof record is a governed runtime artifact. |

### Current and proposed flow

```text
CURRENT PROOF FLOW
authorized proof code
  -> Astro workspace/build/export
  -> revalidate export
  -> convert proof candidate (durableRegistration=false)
  -> local immutable filesystem repository
  -> injected authenticated service/handler factory
  -> explicit unified-preview Astro selection

PROPOSED PRODUCTION FLOW
separately authorized producer
  -> revalidate supported Astro export
  -> allocate opaque candidate ID
  -> convert + validate candidate
  -> registration service
       -> authoritative runtime version -> runtime site -> first-class site/org/agency lookup
       -> one transaction: immutable candidate + enabled access state + audit event
  -> producer receives candidate ID
  -> Workspace candidate list discovers ID by authoritative site-version scope
  -> superadmin explicitly opens candidate
       -> authenticate -> resolve authoritative scope -> check access -> verify record/hashes
       -> request-scoped unified-preview selection -> isolated no-store HTML response

UNCHANGED
default preview bindings -> current transformed artifact / html-static-artifact fallback
publish and live pointers -> existing governed systems only
```

## Storage alternatives

| Approach | Benefits | Costs and failure modes | Decision |
| --- | --- | --- | --- |
| Database only | One atomic row/transaction; natural FKs and indexed discovery; no metadata/object split; checked-in runtime artifacts already store bounded HTML JSONB/text; simplest process-restart readback. | Larger Postgres rows affect backups, query payload, and bloat; unsuitable for future binary/multi-file bundles; must enforce a hard byte limit. | **Recommended for the current self-contained, single-route candidate payload.** |
| Private object storage only | Cheap large-byte storage; natural future fit for files. | Weak authoritative querying/ownership without a registry; no relational FK; object key/metadata cannot independently authorize; difficult candidate discovery; object operations are outside a Postgres transaction. | Reject. |
| Postgres metadata plus private object | Good long-term split for large bundles/assets; registry remains authoritative. | Upload and metadata commit are not atomic; requires content-addressed keys, orphan reconciliation, two availability dependencies, bucket/policy provisioning, and more retry states. Current payload does not need it. | Defer until a version supports binary assets, multiple routes, or records over 2 MiB. |

The deferred combined design must be introduced as a new record/storage schema version. It must not move existing payloads or add a bucket as an incidental implementation detail.

## Candidate and storage contract

### Identity and ownership

- `candidateId` is an opaque, server-generated text identity in the canonical form `astro_candidate_<uuid-without-hyphens>`. It is allocated before conversion so the converter and persisted record agree on identity. Caller-chosen free-form IDs remain supported only by local proof fixtures.
- `siteId` in the candidate continues to mean `gnr8_runtime_sites.id` (`text`), because that is the identity consumed by the unified renderer and current candidate contract.
- `siteVersionId` is the canonical string form of `gnr8_runtime_site_versions.id` (`uuid`).
- `ownershipSiteId` is the first-class `sites.id` (`uuid`) resolved from `gnr8_runtime_site_versions.ownership_site_id`.
- `organizationId` and `agencyId` are copied from the authoritative `sites` row for indexing and diagnostics. They are never accepted from candidate HTML, manifest metadata, URL query values, or client headers.
- A version with missing `ownership_site_id`, a runtime-site mismatch, a missing first-class site, or an inconsistent org/agency relationship is ineligible for registration and readback. There is no "first agency" or inferred-owner fallback.

Candidate payload may repeat site/version ownership for integrity and renderer selection. Authorization always comes from a fresh server-side lookup of the runtime version and first-class site chain.

### Production record version

MVP 08 schema `gnr8-astro-persisted-preview-candidate:v1` and record kind `astro_internal_preview_candidate_proof_record` remain local proof contracts. Production uses a new version, proposed as:

- schema: `gnr8-astro-persisted-preview-candidate:v2`;
- record kind: `astro_internal_preview_candidate_record`;
- lifecycle storage: `supabase_postgres`;
- lifecycle lifetime: `retained_until_explicit_authorized_deletion`;
- lifecycle `durableRegistration: true`.

The reader uses explicit allowlists for record schema, candidate kind, conversion version, export manifest version, adapter ID, renderer compatibility version, and lifecycle. Unknown versions fail closed as `unsupported_version`; they never fall back to another candidate or the default transformed preview.

### Proposed tables

The exact names are routine implementation choices, but the recommended shape is:

#### `public.gnr8_astro_preview_candidates`

Immutable payload and registration row:

- `candidate_id text primary key`;
- `record_schema_version text not null`;
- `record_kind text not null`;
- `runtime_site_id text not null references gnr8_runtime_sites(id) on delete restrict`;
- `site_version_id uuid not null references gnr8_runtime_site_versions(id) on delete restrict`;
- `ownership_site_id uuid not null references sites(id) on delete restrict`;
- `organization_id uuid not null references organizations(id) on delete restrict`;
- `agency_id uuid not null references agencies(id) on delete restrict`;
- `renderer_compatibility_version text not null`;
- `conversion_version text not null`;
- `export_manifest_version text not null`;
- `source_snapshot_sha256 text not null`;
- `export_sha256 text not null`;
- `content_sha256 text not null`;
- `storage_sha256 text not null`;
- `payload_size_bytes integer not null`;
- `candidate_payload jsonb not null`;
- `candidate_created_at timestamptz not null`;
- `stored_at timestamptz not null`;
- `registered_by_actor_id text not null`;
- `producer_kind text not null`;
- `producer_ref text not null`;
- `idempotency_key text not null unique`;
- `correlation_id text not null`.

Required constraints include exact identity/version vocabularies, lowercase 64-character SHA-256 values, JSON object shape, positive size no greater than 2 MiB, and non-empty operational fields. Index `(site_version_id, stored_at desc, candidate_id)` supports the admin list. No `RuntimeArtifact` ID, publish stage, gate state, active-pointer ref, preview-host binding, or promotion flag belongs in this table.

A database trigger re-resolves `site_version_id -> site_id/ownership_site_id -> sites.org_id/agency_id` on insert and rejects any duplicated ownership mismatch. Another trigger rejects direct update and delete. Forced RLS and revoked `anon`/`authenticated` privileges leave access to server-owned service credentials only.

#### `public.gnr8_astro_preview_candidate_access`

A separate control row preserves payload immutability while allowing access to be disabled:

- `candidate_id text primary key references gnr8_astro_preview_candidates(candidate_id) on delete restrict`;
- `access_state text not null` constrained to `enabled|disabled`;
- `reason_code text not null`;
- `changed_by_actor_id text not null`;
- `changed_at timestamptz not null`;
- `version integer not null` for optimistic concurrency.

Only a narrow server-side RPC/service may change this row. Direct client access remains revoked.

#### `public.gnr8_astro_preview_candidate_access_events`

Append-only events record `registered`, `enabled`, and `disabled` actions with candidate ID, monotonically increasing event index, actor, reason code, correlation/idempotency keys, and timestamp. Events contain no HTML, cookie, token, secret, raw stack, or service credential value.

### Hash responsibilities

| Hash | Producer | Bound data | Responsibility |
| --- | --- | --- | --- |
| `sourceSnapshotSha256` | source/workspace preparation boundary | deterministic source snapshot used for the build | Proves which source snapshot was built; not storage or authorization. |
| `exportSha256` | export inspection | sorted, validated exported files and bytes | Detects export changes before conversion. |
| `contentSha256` / converted artifact hash | candidate converter | renderable HTML/CSS, fingerprints, runtime site/version identity, compatibility versions, and source/export hashes | Stable content and ownership binding used by candidate validation. It is not a signature. |
| `storageSha256` | production record builder | the complete stable-stringified v2 record envelope except `storageSha256` itself, including candidate identity, record metadata, lifecycle, provenance, actor/producer refs, timestamps, and candidate payload | Detects persisted-envelope corruption or accidental mutation. It is not authentication or access control. |

The adapter must recompute both content and storage hashes after deserialization. Database constraints validate hash shape; application validation establishes the deterministic hash semantics. Structured logs may include candidate ID and hashes but never payload HTML.

### Repository operations

| Operation | Input authority | Result contract |
| --- | --- | --- |
| `create(record, registrationContext)` | Candidate record plus server-owned actor/producer/idempotency context; ownership is re-resolved in the RPC. | `created` with the immutable record, `idempotent` with the original record, or a typed sanitized failure. |
| `read(candidateId, trustedScope)` | Candidate ID plus the resolver's runtime site/version/ownership scope, never scope copied from candidate metadata. | One fully validated enabled record, or typed `missing`, `disabled`, `ownership_mismatch`, `unsupported_version`, `corrupt`, or `unavailable`. Payload is returned only on success. |
| `list(trustedScope, cursor, limit)` | Resolver-owned scope and a bounded cursor/limit. | Metadata-only rows ordered by `(storedAt desc, candidateId)`; never payload HTML. |
| `setAccess(candidateId, expectedVersion, actionContext)` | Real authenticated actor, reason, correlation/idempotency keys, and optimistic version. | Updated control metadata plus one append-only event; never a candidate payload mutation. |

The production read adapter exposes no read-by-content-hash, read-by-owner-metadata, update-payload, implicit-latest, bind, promote, publish, or delete method.

## Registration contract

### Entry point

Expose a server-only `registerAstroInternalPreviewCandidate` service to an explicitly approved producer. Do not mount a general-purpose browser POST endpoint that accepts arbitrary HTML. The initial production caller must be named and authorized in its own implementation task; likely placement is worker-side after a supported Astro build/export because `docs/gnr8-vercel-runtime-backbone.md` assigns heavy execution to `apps/worker`.

The service input is:

- the already revalidated candidate;
- expected `siteVersionId` and runtime `siteId` from the authorized workflow context;
- authenticated/authorized actor or service identity;
- producer kind/version/ref;
- idempotency and correlation keys.

The service does not accept organization, agency, publish, binding, live-pointer, gate, or governance assertions from the producer.

### Transaction and ordering

Use one stateless Supabase RPC call, not raw `pg` in the request path. The database function performs one transaction:

1. validate bounded selectors and supported v2 record shape;
2. select and lock the exact `gnr8_runtime_site_versions` row;
3. resolve its runtime `site_id`, non-null `ownership_site_id`, and the first-class site's org/agency;
4. compare authoritative identities with the candidate content envelope;
5. attempt immutable candidate insertion;
6. create the `enabled` access row;
7. append the `registered` access event;
8. return `created` or the existing identical record as `idempotent`.

Candidate, access state, and initial event commit together or all roll back. No separately committed "pending" row is needed for database-only storage.

### Retry, conflict, and concurrency

- The same `idempotencyKey`, candidate ID, ownership, payload, and hashes returns the original row and original `storedAt` as `idempotent`.
- Reuse of an idempotency key or candidate ID with any differing immutable value returns `conflicting_write`; it never overwrites or creates a second access event.
- Concurrent identical registrations elect one winner and all successful callers observe the same row.
- Concurrent conflicting registrations elect one winner; every loser receives a sanitized conflict without the winner's payload or owner metadata.
- Transient PostgREST/network failure is retryable with the same idempotency key. The caller must query/read by candidate ID after an ambiguous response before trying a new identity.
- Ownership missing/mismatch, unsupported schema, corrupt hashes, and oversize payload are permanent input failures, not retryable availability failures.

### Partial-failure recovery

Database-only registration has no external object orphan. Transaction rollback removes partial candidate/access/event writes. After an ambiguous client timeout, idempotent replay establishes whether the transaction committed.

An integrity diagnostic must detect impossible states such as a candidate without an access row, an access row without a registration event, or duplicated identity columns that no longer match authoritative ownership. Readback fails closed on those states. Repair is a separately authorized data-integrity task, never an automatic payload rewrite.

## Authoritative ownership and tenancy resolution

Implement one stateless server-only resolver using the existing service-role Supabase client. It performs a bounded lookup for the requested `gnr8_runtime_site_versions.id` and joins or follows to:

```text
gnr8_runtime_site_versions.id
  -> gnr8_runtime_site_versions.site_id              (runtime site identity)
  -> gnr8_runtime_site_versions.ownership_site_id    (first-class site identity)
  -> sites.id / sites.org_id / sites.agency_id       (tenant ownership)
```

For readback, the URL supplies `siteVersionId` and `candidateId`; it does not supply `siteId`, org, agency, role, or actor. The resolver returns the trusted runtime site and tenant scope only after real superadmin authentication. Repository read then requires exact trusted candidate/runtime-site/version ownership and enabled access.

The candidate row and payload are checked against this scope but never establish it. The resolver fails closed when:

- the runtime version does not exist;
- `ownership_site_id` is null;
- the runtime site or first-class site is absent;
- org/agency linkage is absent or inconsistent;
- more than one row is returned;
- the service-role client is unavailable; or
- the checked-in and deployed schema are incompatible.

For the initial superadmin-only surface, organization membership is not an additional grant because the existing allowlist policy is global internal access. The org/agency resolution is still mandatory for correctness, diagnostics, and a future tenant policy. No tenant-facing policy is proposed or implied.

## Authentication, credentials, and permissions

- Reuse `requireSuperadminUserId` for the route and `requireSuperadminUserIdForPage` for the candidate list page. Do not introduce identity headers, unsigned tokens, query-provided actor IDs, or a second role vocabulary.
- Authenticate before selector normalization, ownership lookup, candidate list/read, or diagnostic detail that could reveal existence.
- Use `getSupabaseServiceRoleClient()` server-side for stateless PostgREST/RPC. Service credential values must never enter props, client bundles, URLs, logs, error payloads, or stored candidate records.
- Force RLS and revoke all candidate-table privileges from `anon` and `authenticated`. The browser never reads candidate tables or Storage directly.
- Do not create signed object URLs because the recommended design uses no object bucket.
- Missing auth configuration follows the existing auth helper behavior; missing service-role configuration fails candidate list/readback closed and does not fall through to current preview storage.

This plan assumes the existing `SUPERADMIN_EMAILS`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` mechanisms. Their values and deployed presence were not inspected.

## Authenticated route and admin placement

### Route

Mount a Node.js, force-dynamic route at:

```text
GET /api/gnr8/admin/astro-candidates/[siteVersionId]/[candidateId]/preview?path=/
```

Only `/` is eligible in the initial record version. Missing `path` means `/`; any other normalized path returns a non-enumerating 404. This is intentionally stricter than the unified renderer's general root fallback.

Request order is fixed:

1. real superadmin authentication;
2. global preview feature-state check;
3. route-parameter normalization;
4. authoritative site/version/org/agency resolution and per-candidate access-state check;
5. exact immutable repository read and hash/version validation;
6. request-scoped unified-preview rendering with the single validated candidate closure;
7. isolated response.

The route must preserve MVP 09 response behavior:

| Condition | Response |
| --- | --- |
| No valid session | 401, generic authentication error |
| Authenticated but outside existing superadmin allowlist | 403, generic superadmin error |
| Invalid selector, missing scope/candidate, ownership mismatch, disabled candidate, or unsupported path | 404, identical non-enumerating body |
| Feature globally disabled or required server dependency unconfigured | 503, generic unavailable body |
| Corrupt/unsupported record, storage failure, resolver failure, or renderer invariant failure | 500, sanitized body |
| Valid selection | 200 HTML from source `astro_internal_preview_candidate`, `fallbackUsed: false` |

Success and errors use `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a restrictive permissions policy. HTML success also uses the existing sandbox CSP from MVP 09 (`sandbox`, `default-src 'none'`, `script-src 'none'`, inline styles only, data-only image/font/media, no connect/frame/object/base/form, and `frame-ancestors 'none'`) plus `Cross-Origin-Resource-Policy: same-origin`. No permissive sandbox token is added.

Explicit Astro selection remains no-fallback: invalid or unavailable candidates do not resolve through the ordinary transformed artifact or `html-static-artifact` path. Existing preview routes do not acquire an Astro loader.

### Admin placement and discovery

Add a superadmin-only page:

```text
/gnr8/admin/astro-candidates/[siteVersionId]
```

Add one supporting-surface link from the existing Workspace `transformationStory` for that site version. The page uses a read-only server read model and shows bounded metadata only:

- candidate ID;
- stored and candidate creation time;
- producer kind/ref;
- schema/conversion/renderer versions;
- content and storage hash prefixes;
- payload byte size;
- access state and safe reason code;
- an explicit `Open Astro candidate` link for each enabled candidate.

There is no automatic "latest candidate" redirect, no implicit selection, no iframe, no candidate create button, and no write action in the first admin surface. A missing list shows an empty state. Unsupported/corrupt rows show an unavailable diagnostic without an open link. Each open link contains the exact site-version and candidate identities and opens the isolated route, preferably in a new top-level tab.

The registration result returns the candidate ID to the authorized producer. The admin page independently discovers registered IDs by authoritative `siteVersionId`; it does not depend on a transient producer response, default preview binding, active pointer, `gnr8_runtime_preview_host_bindings`, or `gnr8_runtime_site_versions.artifact_id`.

## Authorized candidate creation

The future producer integration must be a separately scoped, explicitly authorized task. The safe workflow is:

1. an authorized platform/worker operation establishes the target runtime site version from server-owned workflow state;
2. it allocates the production candidate ID;
3. it prepares/builds the Astro workspace under the existing adapter restrictions;
4. the current export inspector reopens and verifies canonical export bytes;
5. the bridge converts those bytes using only the authoritative runtime site/version;
6. the production registration service re-resolves ownership and commits the record;
7. the operation records/returns the candidate ID and correlation ref;
8. the Workspace list discovers the candidate through the database registry.

Registration authorizes only retention and internal preview access. It does not authorize generation beyond the producer's own task, review approval, promotion, `RuntimeArtifact` creation, publish readiness, preview-host binding, publish, active-pointer mutation, live serving, or fallback replacement.

For a first integration test, a synthetic supported candidate may be registered in an isolated local/test database. Registering one in staging or production requires separate migration, environment, data-write, and workflow execution authorization.

## Preview eligibility versus publish governance

Preview eligibility means only that all of the following are true:

- the user passes the existing superadmin policy;
- global and per-candidate preview access are enabled;
- authoritative ownership resolves;
- record, identity, schema, compatibility, content hash, and storage hash validate;
- the requested path and payload features are supported; and
- the unified renderer returns the exact explicit Astro selection with no fallback.

Preview eligibility does not mean that page/site gates ran, a candidate was reviewed, a rollout policy passed, a `RuntimeArtifact` exists, publish readiness was granted, or any live mutation is permitted. Proof and production candidate records must not be inserted into `gnr8_runtime_artifacts` or referenced by `gnr8_runtime_preview_host_bindings` as part of MVP 10.

Current v1 feature restrictions remain:

- only the `/` HTML route;
- only referenced local stylesheets that are parsed and inlined;
- no second HTML route;
- no script files or executable inline/authored scripts;
- no CSS `@import`;
- no non-data CSS `url(...)` dependency;
- no binary images, fonts, video, or other asset files;
- no HTML asset elements or external network resource dependency;
- no application routes, server rendering, forms, CMS, commerce, accounts, or client-side state;
- no hidden recovery through the normal transformed preview or fallback renderer.

A future multi-route/asset/script contract requires a new explicit design and storage schema version. It is not a routine relaxation of the v2 validator.

## Limits, retention, deletion, orphans, and diagnostics

### Size

Keep the MVP 08 maximum of 2 MiB for the stable serialized complete record. Validate the byte count before the RPC, store it, and enforce an equivalent database upper bound. Admin listing must never select the full payload. Route readback may fetch only one candidate.

The implementation should collect safe size percentiles before proposing a different limit. Exceeding 2 MiB is `record_too_large`; it is not a signal to truncate HTML, drop provenance, or silently use object storage.

### Retention

No business retention duration is established by the repository. Therefore:

- no automatic TTL or garbage collector is introduced in the first implementation;
- records remain retained until a separately authorized deletion policy/action exists;
- a later product decision must name retention duration/class, legal-hold behavior, deletion actor, and audit requirements before scheduled deletion is enabled.

This is an explicit policy gap, not a claim of permanent retention.

### Deletion authority and orphan handling

The preview route, admin list, producer, and ordinary service-role repository expose no delete operation. Hard deletion, if later approved, must be a dedicated server-side maintenance function restricted to an explicitly named platform data-administrator authority. It must require disabled access, an operator reason/correlation ID, reference checks, and one transaction that preserves a minimal deletion audit record. Re-enabling is permitted only for a superadmin, with a new append-only audit event and renewed matching content/storage integrity validation; it never mutates the candidate payload.

`ON DELETE RESTRICT` ownership FKs prevent candidate orphans and require explicit candidate disposition before parent deletion. This may require a future update to site deprovisioning, but MVP 10 must not silently modify that flow.

Database-only storage has no object orphan. The deferred combined approach would require content-addressed object keys, upload-first idempotency, a metadata registration state, and an authorized orphan sweeper; none is introduced now.

### Operational diagnostics

Emit bounded structured events with correlation ID, candidate ID, site-version ID, safe result code, latency, payload byte count, and hash prefixes where useful:

- registration `created`, `idempotent`, `conflicting_write`, `ownership_rejected`, `unsupported_version`, `record_too_large`, `unavailable`;
- scope `resolved`, `not_found`, `ownership_incomplete`, `schema_incompatible`, `unavailable`;
- read `selected`, `missing`, `disabled`, `ownership_mismatch`, `corrupt`, `unsupported_version`, `unavailable`;
- renderer `selected`, `unsupported_path`, `selection_invariant_failed`;
- access `enabled`, `disabled`, `global_feature_disabled`.

Logs and errors must exclude HTML, full payload JSON, auth cookies, tokens, service credentials, raw SQL, stack traces in responses, and other-owner metadata. Alerts should distinguish availability/corruption from ordinary 404 access outcomes. No diagnostic automatically repairs or mutates a record.

## Revocation and global disabling

Two controls disable access without changing publish or rollback systems:

1. A default-off deployment feature flag, proposed as `GNR8_ASTRO_CANDIDATE_PREVIEW_ENABLED`, gates the mounted route and admin open links. Disabled returns 503 and performs no candidate read.
2. Per-candidate `access_state=disabled` produces a non-enumerating 404 after authoritative scope resolution and before payload rendering. State changes append an access event and never edit/delete candidate payload.

Neither control changes runtime site-version state, active pointers, `RuntimeArtifact` bindings, preview hosts, default previews, publish eligibility, rollback records, or live traffic. Removing a superadmin from the existing allowlist also revokes access through the existing auth policy.

## Migration, configuration, and deployment prerequisites

### Proposed checked-in changes

Later implementation requires, but this plan does not create or apply:

- one additive Supabase migration for the three candidate/access/event tables, constraints, indexes, RLS, triggers, and narrow registration/access RPCs;
- a v2 record validator/repository adapter and authoritative scope resolver;
- a server-only registration service;
- the mounted GET route and isolated headers;
- a candidate list read model/page and Workspace supporting-surface link;
- a default-off feature flag declaration/documentation;
- focused contract, adapter, resolver, route, page, concurrency, and regression tests.

No object bucket, dependency, runtime-table auto-DDL addition, public RLS policy, signed URL, new service credential, or `DATABASE_URL` request-path dependency is recommended.

### Required deployed-state verification

Before approving or applying the migration, an authorized operator must verify in the target environment without assuming repository parity:

- actual existence and types of `gnr8_runtime_sites.id`, `gnr8_runtime_site_versions.id/site_id/ownership_site_id`, `sites.id/org_id/agency_id`, `organizations.id`, and `agencies.id`;
- target version coverage for non-null, valid `ownership_site_id`;
- current FKs, uniqueness, RLS, grants, and whether table owners/service roles behave as expected;
- availability of `pgcrypto` if database hash/UUID helpers are used;
- platform availability of the existing Supabase URL/anon/service-role and superadmin allowlist variables, checking presence only and never exposing values;
- whether service-role PostgREST can call the proposed RPC and select the required ownership fields;
- deployment runtime support for the Node.js route and whether any proxy/CDN overrides `no-store` or security headers;
- backup/restore and monitoring coverage for the new tables.

Any mismatch changes the migration plan; it must not be fixed by ad hoc production DDL or weakening ownership checks.

### Deployment order

1. Complete Task 1 contract hardening locally. This authorizes no migration or production operation.
2. Review and approve the exact additive migration; verify target deployed schema.
3. Apply the migration in an explicitly authorized non-production environment and verify constraints/RLS/RPC behavior.
4. Deploy the unmounted/unexposed adapter, resolver, and registration service; keep the feature flag off.
5. Integrate one explicitly authorized candidate producer and register a synthetic/non-customer candidate in the approved environment.
6. Deploy the mounted route and admin list/link with the flag still off; verify unauthorized failures and unchanged existing previews.
7. Enable only in the approved environment, restart the producer/platform processes, and complete the end-to-end readback milestone.
8. Production migration, producer execution, data creation, flag enablement, and deployment each require their own authorization and evidence. Non-production success is not a production-readiness claim.

Rollback for application deployment is to disable the feature flag or deploy the previous app. That leaves immutable rows retained and does not invoke existing content rollback or publish rollback. Schema rollback/data deletion is not automatic and requires a separately reviewed data-preservation decision.

## Ordered implementation tasks

Each task is independently reviewable and should be its own Codex session.

### Task 1 — Production record contract and pure repository semantics

**Scope**

- Define the v2 production record/lifecycle, candidate ID format, version allowlists, deterministic hash helpers, error vocabulary, and a database-gateway-neutral repository interface.
- Add pure tests for validation, byte bounds, identical retries, conflicts, compatibility rejection, ownership comparison, and serialization stability using an in-memory/fake gateway.

**Allowed mutations**

- Output-adapter TypeScript contracts/helpers and focused unit tests.
- A focused documentation update if names change.

**Explicitly not allowed**

- SQL/migrations, live database/storage, env/config, route mounting, admin UI, producer execution, publish/runtime binding changes, installations, builds, or deployment.

**Dependencies**

- MVP 08 repository and MVP 09 readback contracts only.

**Acceptance**

- V1 proof records remain readable only by proof code.
- V2 production records deterministically validate and reject all unsupported lifecycle/version/size/hash cases.
- Tests prove no `RuntimeArtifact` governance fields or default binding behavior are introduced.

**Authorization**

- Routine scoped code-task authorization only. Completing this task does **not** authorize Task 2, any migration, production data access, or deployment.

### Task 2 — Additive candidate registry migration, checked in only

**Scope**

- Add the candidate/access/event tables, ownership-validation and immutability triggers, registration/access RPCs, indexes, forced RLS, and revoked browser roles.
- Add migration-level static/ephemeral tests for atomic create, idempotency, conflict, concurrent winner, incomplete ownership, access changes, and prohibited direct mutation.

**Allowed mutations**

- One new migration file, schema documentation, and local/ephemeral database tests.

**Dependencies**

- Task 1 and a reviewed deployed-schema verification report for the intended target shape.

**Acceptance**

- Fresh local migration produces the documented schema.
- Candidate/access/event creation is one transaction.
- Direct update/delete and `anon`/`authenticated` access fail.
- No existing runtime, artifact, preview-binding, or publish table is mutated by registration tests.

**Authorization**

- Explicit authorization to design/check in schema is required. Applying it anywhere is a separate authorization and is not part of this task.

### Task 3 — Supabase repository and authoritative scope resolver

**Scope**

- Implement the stateless PostgREST/RPC repository adapter and the exact runtime-version/first-class-site ownership resolver.
- Keep both unmounted and dependency-injected.

**Allowed mutations**

- Server-only platform data-access modules and focused mocked/local integration tests.

**Dependencies**

- Tasks 1–2 schema contract; no deployed migration required for mocked tests.

**Acceptance**

- Auth-independent resolver tests prove null/mismatch/multirow/service-unavailable cases fail closed.
- Repository tests prove exact identity read, access-state enforcement, hash validation, sanitized conflicts, and no HTML logging.
- No raw `pg` is imported in a request/render module.

**Authorization**

- Routine code authorization. No live Supabase call, migration application, credential inspection, or production registration.

### Task 4 — Server-only registration service and one named producer seam

**Scope**

- Implement registration ordering and result contract.
- Connect only a named, separately approved producer seam; if no producer is approved, stop at an uncalled server-only service.

**Allowed mutations**

- Platform/worker server-only service code, shared pure contracts if necessary, and focused tests.

**Dependencies**

- Tasks 1–3 and a product-owner choice of the first producer.

**Acceptance**

- Producer-supplied tenant/ownership fields cannot authorize registration.
- Ambiguous retry resolves through the same idempotency key/candidate ID.
- Successful result returns candidate identity but creates no binding, `RuntimeArtifact`, pointer, or publish record.

**Authorization**

- Explicit authorization for the named producer integration. Executing Astro builds or writing any deployed environment is separate and remains unauthorized by code completion.

### Task 5 — Mounted authenticated preview route

**Scope**

- Compose the real superadmin guard, authoritative resolver, repository, and unified renderer at the proposed GET route.
- Add the default-off global feature gate and final security headers.

**Allowed mutations**

- One app route/composition module, configuration declaration, and focused route tests.

**Dependencies**

- Tasks 1 and 3; Task 2 schema contract. A deployed migration is not needed for dependency-injected route tests.

**Acceptance**

- Auth is first and denied requests perform zero resolver/repository reads.
- 401/403/404/500/503 behavior is sanitized and `no-store`.
- Only `/` succeeds; explicit invalid selection never falls back.
- Existing runtime/admin preview route tests remain unchanged/passing.

**Authorization**

- Explicit authorization to mount a new internal route and add a default-off flag. Enabling or deploying it is separate.

### Task 6 — Superadmin candidate list and Workspace link

**Scope**

- Add the bounded read model/page and one Workspace supporting-surface link.
- Show explicit candidate rows and disabled/unavailable states with no mutation controls.

**Allowed mutations**

- Admin read model, page/components, Workspace projection/link, and focused UI/read-model tests.

**Dependencies**

- Tasks 3 and 5.

**Acceptance**

- Real page auth is read-only and fail-closed.
- The list never loads payload HTML and has no implicit latest selection.
- Each enabled link identifies exactly one site version and candidate.
- Empty, disabled, unsupported, and unavailable states are clear.

**Authorization**

- Routine internal admin UI authorization. No candidate generation, write control, publish action, or tenant access expansion.

### Task 7 — Access disable/re-enable control service

**Scope**

- Implement audited per-candidate access state changes and preserve the default-off global kill switch.
- Mount an admin control only if the product owner explicitly wants UI; otherwise expose a server-only maintenance operation.

**Allowed mutations**

- Narrow access-control service/RPC composition, optional explicitly authorized superadmin control, and focused tests.

**Dependencies**

- Task 2 access schema and product decision on whether disablement is reversible.

**Acceptance**

- Disabled candidates return the same 404 as missing candidates.
- State transitions require current version/actor/reason and append exactly one event.
- Payload, default previews, publish, active pointers, and rollback systems are unchanged.

**Authorization**

- Explicit choice on reversible re-enable and explicit authorization before any admin write control is mounted.

### Task 8 — Authorized migration/deployment and end-to-end verification

**Scope**

- Verify deployed prerequisites, apply the approved migration, deploy with the feature off, register an approved synthetic candidate, enable in the approved environment, restart processes, and run the completion milestone checks.

**Allowed mutations**

- Only the exact environment/migration/deployment/data writes separately approved for this task.

**Dependencies**

- Tasks 1–7 as selected; successful non-production evidence; approved runbook and rollback/disable step.

**Acceptance**

- Authorized superadmin gets 200 and exact Astro source after process restart.
- Unauthenticated gets 401 and non-superadmin gets 403 before storage read.
- Wrong version/candidate and disabled candidate get non-enumerating 404.
- Stored hashes/bytes remain unchanged across readback.
- Existing preview URLs still resolve to their prior sources; no runtime binding, live pointer, publish, or fallback changes are observed.

**Authorization**

- Separate explicit approvals are required for target-schema inspection, migration application, environment configuration, deployment, candidate registration data write, feature enablement, and any producer execution. None is granted by this plan.

## Decisions and open questions

### Decisions recommended by this plan

- Postgres-only storage for the current bounded self-contained payload.
- Dedicated candidate records, never proof `RuntimeArtifact` promotion by implication.
- Exact authoritative ownership resolution through runtime version and first-class site.
- Existing superadmin allowlist only; no tenant/client access expansion.
- Explicit list selection; no default/latest binding.
- Hard 2 MiB and root-route-only limits.
- Default-off global flag plus separate per-candidate access state.
- No automatic retention deletion until product policy exists.

### Product-owner input required before affected tasks

1. Accept or reject the Postgres-only recommendation and its 2 MiB/multi-asset tradeoff before Task 2.
2. Name the first authorized producer/workflow before Task 4 connects a caller.
3. Decide whether per-candidate disablement is reversible before Task 7 mounts or exposes re-enable behavior.
4. Define retention duration/class, legal-hold expectations, and hard-deletion authority before any automatic cleanup or delete function is enabled.
5. Approve target environment, migration application, new feature variable, deployment, registration write, and enablement separately for Task 8.

### Routine implementation choices

- Exact module filenames and internal type names.
- Query batching and index names that preserve the stated contract.
- Safe diagnostic code names and hash-prefix length.
- Page copy, table layout, and opening the isolated preview in a new tab.
- Whether the ownership resolver uses one embedded PostgREST select or two bounded reads, provided it remains stateless, exact, and fail-closed.

## Assumptions and verification gaps

- The current payload remains self-contained and normally far below the existing 2 MiB proof limit. No production distribution has been measured.
- Runtime site IDs are text and runtime site-version IDs are UUIDs as checked-in `runtime-store.ts` indicates. Deployed types are unknown.
- Target runtime versions intended for registration have valid first-class ownership links. Coverage is unknown.
- The existing service-role helper and superadmin policy are appropriate for an internal-only route. Deployed variables and policies were not inspected.
- Supabase/PostgREST request and row-size behavior is adequate for a 2 MiB maximum record. This must be verified in an authorized non-production environment.
- Database backups and restore procedures cover the proposed tables. This was not verified.
- No business retention or legal-hold requirement was supplied.
- No current producer is authorized to create production Astro candidates.
- Checked-in migration history, dynamic runtime DDL, and production schema may differ; this plan makes no parity claim.

## Completion claim boundary

Completing the implementation milestone proves authenticated, immutable candidate registration and readback for the supported internal preview contract. It does not prove production readiness for Astro publishing, object storage, assets, multiple routes, scripts, tenant access, promotion, governed `RuntimeArtifact` creation, deployment targets, preview-host binding, live serving, rollback, or any provider operation.

`html-static-artifact` remains the production fallback throughout this plan.
