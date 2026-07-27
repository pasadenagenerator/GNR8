# GNR8 AAF Publish Source Reader Architecture

AAF-8 source reader architecture review for production publish activation evidence after AAF-7.

This document is documentation-only. It does not implement a source reader, create migrations, modify publish routes, modify AAF code, call providers, or change runtime behavior.

## Purpose

AAF-7 created `PublishActivationEvidenceSourceReader` as an injected read boundary. This review defines how the production reader should safely read canonical source truth for `publish_activation_evidence` without importing mutation surfaces or treating projections as truth.

## Current State

Current implementation facts:

- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts` is server-only and accepts an injected `PublishActivationEvidenceSourceReader`.
- The builder normalizes source snapshots into source refs, watermarks, freshness, limitations, missing-source diagnostics, an AAF evidence package transaction, and an AAF-6 dry-run input.
- The builder does not read runtime/domain/content state directly.
- `apps/platform/gnr8/runtime/runtime-store.ts` is mixed read/write. It creates/updates schema, creates site versions, mutates host/domain bindings, creates and refreshes artifacts, switches active pointers, mutates content overrides, records audit rows, and also exposes read helpers.
- Publish routes and orchestrator code can call mutation helpers and provider helpers. They are not safe source-reader imports.
- No dedicated canonical publish target table was found.
- No dedicated canonical DDOM readiness snapshot table was found.
- Command Center, Ops Inbox, hosting read models, readiness drilldowns, thumbnails, previews, Generated Proposal Bundles, Workspace, Evolution, AI outputs, provider payloads, and UI labels are projections or evidence inputs, not production source truth.

## Current-State Source Truth Inventory

| Candidate | Current source | Current truth | Classification | Read-only safe | Mixed read/write | Deterministic watermark fields | Suitable for AAF evidence | Risks and gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Site version truth | `public.gnr8_runtime_site_versions`; `getSiteVersion`; `getRuntimeSiteVersionOwnershipSnapshot` | Site version id, site id, version number, lifecycle state, source, actor, renderer compatibility, provenance, artifact binding, timestamps. | Canonical runtime release unit. | Table read is safe; current module import is not. | `runtime-store.ts` is mixed. | Prefer `updated_at`; fallback hash of id, site_id, version_no, state, renderer_compatibility_version, artifact_id, import_provenance_summary. | Yes, after read-only wrapper. | `getSiteVersion` omits `updated_at`; production reader should query table directly or add read-only helper. |
| Runtime artifact truth | `public.gnr8_runtime_artifacts`; `getArtifactById` | Artifact id, site id, site version id, renderer compatibility, bundle hash, html paths, token styles, asset fingerprints, manifest, publish stage, shadow restriction, governance, created time. | Canonical serving candidate. | Table read is safe; current module import is not. | Creation/refresh live in same module. | Prefer `bundle_sha256` plus immutable id, or hash of artifact identity/governance/stage if mutable refresh remains possible. | Yes, after read-only wrapper. | `refreshArtifactForVersionPublishCandidate` mutates rows; if artifacts remain mutable, evidence must watermark all mutable fields or enforce immutability. |
| Active pointer truth | `public.gnr8_runtime_active_pointers`; `getActivePointerForSite`; `switchActivePointer` | Site's active site version and active artifact id. | Canonical production serving pointer. | Table read is safe; current module import is not. | Switch helper lives in same module. | Prefer `updated_at`; fallback hash of site_id, active_site_version_id, active_artifact_id. | Yes. | Pointer may change between evidence build and action; gate must recheck current subject watermark immediately before mutation. |
| Publish target truth | Currently request `stage` / `intendedPublishTarget` and artifact `publish_stage`; no dedicated source table found. | Intended environment/stage such as `production`, `canary`, or `shadow`. | Ambiguous/currently policy input, not canonical DB truth. | Only explicit input is safe but insufficient. | Publish route/orchestrator use it in mutation path. | None current; proposed source needed. | Not sufficient yet. | Cannot infer from UI labels or route body alone for AAF enforcement. |
| Domain readiness truth | `gnr8_runtime_domain_host_bindings`, `gnr8_runtime_host_bindings`, Vercel check snapshots stored on binding, readiness read models. | GNR8 operating association, latest Vercel-shaped snapshot, manual DNS instructions, binding status. | Mutable operating record and derived projection; not a canonical readiness snapshot. | Table reads are safe; read models are projections. | Domain binding update/check helpers are mixed with reads. | Current `updated_at` and `last_checked_at`; proposed snapshot watermark required. | Not sufficient for production publish evidence until DDOM snapshot persistence exists. | Vercel status is not DNS truth; readiness report is rebuildable projection without durable snapshot id. |
| Content override published state truth | `public.gnr8_content_overrides` status `published`; `public.gnr8_content_override_history`; public runtime reads published overrides. | Published per-slot overrides for a site version and append-ish history. | Canonical mutable current state plus history. | Table reads are safe; module import is not. | Content publish/rollback in same module. | Prefer max `updated_at`, count, and per-row hash; history max `created_at` as supporting ref. | Yes, with aggregate watermark. | Current table is mutable by status/slot. Reader must represent empty state explicitly and hash exact published rows. |
| Launch signoff truth | `gnr8_aaf_approval_requests`, `gnr8_aaf_approval_decisions`, revocation and supersession links. | Scoped human approval decision for `launch_signoff`. | Canonical AAF approval truth. | AAF read queries are safe if kept read-only. | AAF writer/facade are mixed write paths. | Decision `id`, `decided_at`, `expires_at`, request scope/subject/policy version, revocation/supersession existence. | Yes. | Must not imply publish activation approval; wrong scope must remain blocked. |
| Publish activation approval truth | Same AAF tables for scope `publish_activation`. | Scoped approval for exact publish activation subject/evidence/policy. | Canonical AAF approval truth. | AAF read queries are safe if kept read-only. | AAF writer/facade write policy/audit/gate rows. | Decision id plus request/policy/evidence ids, `decided_at`, expiry, revocation/supersession. | Yes. | Must be exact subject/evidence/policy and rechecked before action. |
| Rollback state references | `gnr8_runtime_site_versions`, `gnr8_runtime_artifacts`, active pointer, version audit, rollback route/switch. | Prior versions/artifacts and current pointer. | Canonical refs exist; rollback decision not canonical for publish activation. | Table reads safe. | Rollback switch mutates pointer. | Pointer and target artifact/site version watermarks. | Supporting evidence only. | Publish evidence should record rollback readiness limitations, but rollback approval is separate. |
| Audit/event references | `gnr8_aaf_audit_events`, `gnr8_aaf_audit_event_refs`, `gnr8_runtime_version_audit`, content history, migration events. | AAF audit is append-only; legacy/runtime audit is partial domain-specific evidence. | AAF canonical; legacy event stores are source refs. | AAF table reads safe. | AAF writer/facade create rows. | Event id/created_at and source watermark refs. | Yes as refs, not as primary runtime truth. | Partial timelines must be represented as `partial_timeline`/limitations. |

## Production Reader Module

Proposed location:

- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`

Recommended supporting read-only module:

- `apps/platform/gnr8/aaf/aaf-publish-activation-source-read-repository.ts`

The source reader should implement the AAF-7 interface exported by `aaf-publish-activation-evidence-builder.ts`. The repository should own direct lower-level Postgres reads and return plain source snapshots. The reader should map those rows to `PublishActivationSourceReaderResult`.

## Allowed Imports

Allowed:

- `server-only`
- Node deterministic/hash helpers if needed
- Types from `@gnr8/runtime-contracts`
- Types from `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- Types only from runtime/content modules when they do not import providers or mutation behavior
- `getSuperadminPool` or an injected `AafPgClient`/`PoolClient`
- Pure deterministic normalization helpers that have no DB/provider side effects

## Forbidden Imports

Forbidden:

- `apps/platform/gnr8/runtime/runtime-store.ts` while it remains mixed read/write
- `publish-activation-orchestrator.ts`
- `publish-activation-guard.ts` if used to drive runtime decisions instead of evidence reads
- `publish-safety-check.ts` if it pulls active runtime semantics into the reader
- `rollback-switch.ts`
- content publish/rollback route handlers or mutation helpers
- domain route handlers, hosting recheck workflows, Vercel clients, Openprovider clients, DNS providers, provider execution modules
- Command Center and Ops Inbox read models
- public runtime serving/rendering modules
- billing, Stripe, AI execution, worker, provider orchestration modules

## Read-Only Guarantees

The production reader must:

- expose only read methods;
- run only `select` statements and optional transaction/read-only session statements;
- never call `ensureRuntimeTables`;
- never execute DDL, `insert`, `update`, `delete`, `merge`, provider API calls, route handlers, or mutation facades;
- support dependency injection of a read client for tests;
- have static tests that reject forbidden imports and mutation SQL tokens;
- include integration tests against disposable Postgres fixtures, not production/staging Supabase.

## Transaction And Read Consistency

The reader should read all sources in one database transaction using:

- `begin read only`;
- `set transaction isolation level repeatable read`;
- a single captured `readerCapturedAt` timestamp from the database;
- all source refs captured under that same snapshot.

If the DB adapter cannot guarantee read-only transactions, the implementation should fail closed for production publish evidence and emit a limitation such as `read_only_transaction_unavailable`.

## Source Refs

Each source ref should use:

- `sourceSystem`: `gnr8`
- `sourceTable`: exact table name, or proposed table name only after migration exists
- `sourceRecordId`: primary key or deterministic aggregate subject id
- `sourceRef`: `gnr8:<table>:<id>` or `gnr8:<table>:<aggregate-key>`
- `sourceVersion`: canonical version/update value where available
- `queryRef`: stable reader query id such as `aaf_publish_source_reader:v1:<source-key>`
- `snapshotRef`: durable snapshot row id for DDOM and aggregate states when available

Missing required source truth must produce `null` for that source in the reader result. The builder already converts missing required truth into failed freshness and missing-source limitations.

## Watermarks

Use canonical update/version fields where possible:

- site version: `updated_at`
- runtime artifact: `bundle_sha256` plus artifact id, or hash if refresh remains mutable
- active pointer: `updated_at`
- publish target: proposed `version`/`updated_at` from publish target source truth
- DDOM readiness: proposed snapshot `source_watermark`
- content published state: aggregate hash and max `updated_at`
- launch signoff: approval decision/request/evidence/revocation/supersession aggregate
- publish activation approval: approval decision/request/evidence/revocation/supersession aggregate

When no canonical field is enough, use stable `sha256:` over a documented list of canonical fields, sorted by key and row identity.

## Missing, Stale, And Limited Truth

Missing source truth:

- required source: return `null`; builder records `missing_source_truth:<key>` and invalid evidence;
- optional source: return `null` and mark not applicable only when policy/input says optional.

Stale source truth:

- return the snapshot with `freshness: "stale"`, `staleReason`, `expiresAt` if applicable, and a source watermark;
- DDOM stale state maps to blocked domain readiness.

Limited source truth:

- use `limitations` for known architectural gaps, such as `ddom_snapshot_persistence_missing`, `publish_target_source_truth_missing`, or `partial_timeline`;
- never silently map ambiguous truth to `ready`.

## Idempotency Inputs

The caller should supply the evidence package idempotency key. For route-shadow integration later, derive it from:

- action key `publish.activation`;
- tenant/client/site/siteVersion/runtimeArtifact;
- intended publish target source ref and watermark;
- actor/request/correlation id;
- policy version;
- publish attempt id if a durable attempt exists.

The reader must not generate idempotency keys from volatile timestamps alone.

## Builder And Adapter Flow

Expected flow after implementation:

1. Publish route shadow code calls production reader.
2. AAF-7 builder calls `readPublishActivationSources(input)`.
3. Builder writes or assembles `publish_activation_evidence`.
4. Builder returns AAF-6-compatible dry-run input.
5. AAF-6 adapter evaluates dry-run through the facade.
6. Shadow integration records/observes result but does not enforce until a later approved phase.

The reader must not call the adapter directly.

## Test Strategy

Unit tests:

- fake the reader for builder tests, as AAF-7 already does;
- test the source reader with injected read-only repository rows;
- assert missing/stale/partial cases per source.

Static tests:

- forbid imports from runtime-store, routes, providers, DNS, Vercel, Openprovider, Stripe, AI, Command Center, Ops Inbox, public runtime, worker, and mutation helpers;
- forbid SQL mutation tokens in reader modules.

Integration tests:

- use disposable local Postgres only;
- apply required local migrations;
- seed runtime/domain/content/AAF source rows;
- verify no runtime/provider route is called;
- verify repeatable-read consistency and deterministic watermarks.

## Runtime-Store Decision

Recommended path: create a dedicated read-only repository wrapper that uses lower-level DB queries.

Justification:

- It avoids importing `runtime-store.ts` while it remains mixed read/write.
- It minimizes immediate refactor blast radius.
- It lets production evidence reads use exact fields omitted by convenience helpers, especially `updated_at`.
- It supports read-only transaction guarantees and disposable DB tests.
- It can later be replaced by extracted pure query helpers once runtime-store is split.

Do not defer the source reader until all runtime-store separation is complete. Do not create a projection table for general runtime truth before DDOM and publish target truth are resolved; projections are useful for snapshots but not a substitute for active pointer/site version/artifact canonical reads.

## Enforcement Readiness

| Prerequisite | Classification | Notes |
| --- | --- | --- |
| AAF persistence | Ready now | Append-only AAF tables exist in migration. |
| AAF writer | Ready now | Writer supports idempotency and evidence transactions. |
| AAF policy/gate facade | Ready now | Facade can evaluate evidence, approvals, audit, and fail-closed cases. |
| AAF publish dry-run adapter | Ready now | Dry-run adapter is non-executing. |
| AAF publish evidence builder | Ready now | Builder is read-boundary based and non-executing. |
| Production source reader | Ready after source reader implementation | This document defines it; no implementation exists yet. |
| DDOM readiness snapshot persistence | Ready after DDOM snapshot persistence | Current domain readiness is mutable/projection. |
| Publish target truth | Ready after publish target source truth implementation | Current target is request/policy input. |
| Approval persistence | Ready now for AAF core | Publish integration still needs exact source-reader queries and route wiring. |
| Audit event taxonomy | Ready now | AAF taxonomy includes publish/domain/rollback. |
| Evidence package persistence | Ready now | AAF evidence package tables exist. |
| Idempotency conflict behavior | Ready now | Writer detects semantic drift for same idempotency key. |
| Read-only tests | Ready after source reader implementation | Static and unit tests must be added then. |
| Disposable DB integration tests | Ready after source reader implementation | Must seed runtime/DDOM/publish-target sources locally. |
| Runtime non-mutation guardrails | Ready after source reader implementation | Guardrails must assert no mutation imports/SQL/provider calls. |

## Recommendation

Implement DDOM readiness snapshot persistence first, then publish target source truth, then the production read-only source reader. Live publish route shadow integration should not begin until the source reader can reference durable DDOM snapshots and canonical publish target truth.

