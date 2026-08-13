# GNR8 Single-Site Publish Diagnostic Snapshot History Architecture

Phase: MVP-64
Scope: Documentation and architecture only.

This document defines the future persisted diagnostic snapshot history architecture for the internal single-site publish operator panel. It does not implement SQL, snapshot tables, services, routes, UI, APIs, workers, providers, runtime behavior, persistence, downloads, action buttons, Command Center actions, Ops Inbox actions, client portal behavior, external provider calls, commits, or pushes.

## Existing Context

MVP-57 introduced durable non-AAF operator action audit persistence for internal dry-run and shadow-publish attempts. MVP-58 through MVP-61 built the internal superadmin-only read-only Command Center panel, source enrichment, drilldown, and runbook interpretation over source-owned records and sanitized audit summaries. MVP-62 added deterministic export-safe diagnostic snapshots over that read-only projection. MVP-63 added read-only snapshot diffing, but production comparison currently falls back to audit-derived summaries when no previous full snapshot is supplied.

MVP-64 designs how a later phase may persist sanitized full diagnostic snapshots so MVP-63 can compare against real historical observations instead of reconstructing partial baselines from audit summaries.

## Purpose

Persisted diagnostic snapshot history exists for:

- internal operator comparison across dry-run, shadow-publish, and explicit read-only capture moments;
- support and debug trace when an operator needs to understand what the panel showed at a prior point;
- post-run review after a dry-run or shadow-publish completed, failed, or produced stale/missing source signals;
- safe handoff between operators without relying on screenshots, chat summaries, or raw source access;
- audit-adjacent diagnostics that complement MVP-57 action audit without becoming audit truth.

Persisted diagnostic snapshot history is not:

- source truth;
- approval truth;
- AAF truth;
- publish authority;
- enforcement authority;
- a replacement for launch readiness, AAF, gate, DDOM, PTT, runtime, migration, audit, billing, provider, or domain source tables;
- customer-facing or client-facing export;
- an action queue;
- a reason to add publish, retry, approval, refresh, rollback, provider, billing, domain, DDOM, PASR, or Ops Inbox controls.

## Source-Of-Truth Decision

Source systems remain the source of truth. Diagnostic snapshot history is derived-only.

Canonical ownership stays with:

- launch readiness records, dimensions, evidence, freshness, and blockers for launch readiness truth;
- AAF requests, decisions, evidence packages, policy evaluations, gate attempts, and audit events for approval, evidence, gate, and AAF audit truth;
- MVP-57 operator action audit rows, refs, and events for internal dry-run and shadow-publish action history;
- DDOM readiness snapshots and source-owned domain workflows for domain readiness observations;
- publish target truth for target/environment/stage source refs;
- runtime active pointer, site version, runtime artifact, and published overrides for production runtime truth;
- migration state/evidence spine records for single-site migration state;
- provider, DNS, billing, Stripe, and external workflow systems for their own external records.

The current operator panel projection remains a read-only derived surface. Persisted snapshots are redacted historical observations of that projection at a capture moment. Command Center remains a derived surface even when it reads persisted snapshots.

## Staleness Labeling

Every persisted snapshot must be labeled as historical. Future read models should expose:

- `snapshotCapturedAt`;
- `snapshotWatermark`;
- `sourceWatermarks`;
- `sourceWatermarkCapturedAt` or per-source observed timestamps when available;
- `freshnessLabel`: `fresh_at_capture`, `stale_at_capture`, `partial_at_capture`, `unavailable_at_capture`, or `unknown_at_capture`;
- `currentComparisonState`: `current`, `older_than_current_projection`, `superseded_by_source_change`, `source_unavailable_for_recheck`, or `unknown`;
- `historicalObservation: true`;
- `currentTruth: false`;
- `derivedOnly: true`;
- `readOnly: true`;
- `mutatesSourceTruth: false`.

The UI must never label a historical snapshot as live state. A stale snapshot may be used as a baseline for comparison, but it must not satisfy a gate, approval, enforcement check, source freshness requirement, or publish precondition.

## Future Persistence Shape

MVP-64 recommends a future additive table family, but does not implement it:

1. `gnr8_single_site_publish_diagnostic_snapshots`
2. `gnr8_single_site_publish_diagnostic_snapshot_refs`
3. `gnr8_single_site_publish_diagnostic_snapshot_events`

The family should mirror the project pattern used by MVP-57 and AAF persistence: bounded header row, append-only refs, append-only events, RLS enabled, no broad grants, service-owned writes, idempotency, correlation, privacy label, retention class, redaction version, and safe JSON only.

## `gnr8_single_site_publish_diagnostic_snapshots`

Intended fields:

| Field | Purpose |
| --- | --- |
| `id` | Durable snapshot id. |
| `tenant_id` | Tenant scope. |
| `client_id` | Client scope. |
| `site_id` | Site scope. |
| `migration_id` | Single-site migration scope. |
| `candidate_site_version_ref` | Safe candidate/version ref. |
| `runtime_artifact_ref` | Safe runtime artifact ref. |
| `publish_target_ref` | Safe target/environment/stage ref. |
| `snapshot_version` | Diagnostic snapshot schema version, starting from MVP-62 version vocabulary. |
| `snapshot_watermark` | Deterministic semantic watermark over redacted semantic content. |
| `source_watermarks_json` | Per-source safe watermarks already emitted by sanitized projection. |
| `capture_mode` | `dry_run_completed`, `shadow_publish_completed`, `shadow_publish_failed`, `explicit_read_only_capture`, or `source_read_enrichment`. |
| `baseline_snapshot_id` | Optional baseline used when the snapshot was captured for comparison. |
| `baseline_snapshot_watermark` | Optional role-safe baseline watermark. |
| `top_blocker_code` | Primary runbook/snapshot blocker code at capture time. |
| `next_action_code` | Derived read-only next action code at capture time. |
| `severity_counts_json` | Counts by diagnostic severity. |
| `source_counts_json` | Counts by source owner/status/freshness family. |
| `blocker_counts_json` | Counts by blocker, warning, limitation, stale, missing, and conflict families. |
| `redacted_snapshot_json` | Bounded sanitized snapshot JSON and export-safe preview payload. |
| `redaction_version` | Version of recursive snapshot sanitizer/redaction contract. |
| `privacy_label` | Recommended `internal_confidential`. |
| `retention_class` | Recommended `short_operational` by default, upgradeable to `mvp_operational` for incident/debug/legal needs. |
| `retention_expires_at` | Default retention expiry when not on legal/admin hold. |
| `legal_hold` | Boolean or hold ref for explicit retention suspension. |
| `created_by_actor_type` | `human`, `system`, or future scoped support/debug actor category. |
| `created_by_actor_id` | Internal actor id or service actor id. |
| `created_by_actor_role` | Role at capture time, copied for auditability. |
| `correlation_id` | Operator workflow correlation id. |
| `causation_id` | Source action/audit/snapshot id that caused capture, when present. |
| `idempotency_key` | Deduplication key for same semantic capture. |
| `created_at` | DB insertion timestamp. |

Future implementation should bound JSON size. If full redacted snapshots become too large, the row should store a compact redacted preview and cite an internal object ref whose object also obeys this redaction and retention contract. MVP-65 should avoid object storage unless explicitly approved.

## `gnr8_single_site_publish_diagnostic_snapshot_refs`

Intended fields:

| Field | Purpose |
| --- | --- |
| `id` | Durable ref row id. |
| `snapshot_id` | Parent snapshot. |
| `tenant_id`, `client_id`, `site_id`, `migration_id` | Scope duplication for safer scoped reads and purge. |
| `ref_role` | `candidate_site_version`, `runtime_artifact`, `publish_target`, `launch_readiness_record`, `launch_readiness_evidence`, `publish_activation_request`, `publish_activation_decision`, `gate_attempt`, `operator_action_audit`, `dry_run_action`, `shadow_publish_action`, `ddom_snapshot`, `source_watermark`, `baseline_snapshot`, `limitation`, `blocker`, `warning`, or `correlation`. |
| `ref_type` | Source-owned type label. |
| `source_system` | `gnr8`, `aaf`, `ddom`, `ptt`, `runtime`, `operator_audit`, or external-system label when safely summarized. |
| `source_table` | Optional GNR8 table name when safe for internal diagnostics. |
| `source_record_ref` | Safe id/ref, not a raw payload. |
| `source_watermark` | Safe source watermark captured with the snapshot. |
| `source_version` | Optional source version or schema label. |
| `visibility_label` | `internal_full`, `internal_summary`, `redacted`, or `hidden`. |
| `metadata_json` | Bounded safe metadata such as status, freshness, limitation code, or source-owned/derived label. |
| `redaction_version` | Redaction policy that shaped the ref. |
| `created_at` | DB insertion timestamp. |

Refs should be append-only. A source change creates a new snapshot/ref set, not an update that rewrites what the old snapshot observed.

## `gnr8_single_site_publish_diagnostic_snapshot_events`

Intended fields:

| Field | Purpose |
| --- | --- |
| `id` | Durable event row id. |
| `snapshot_id` | Parent snapshot. |
| `tenant_id`, `client_id`, `site_id`, `migration_id` | Scope duplication. |
| `event_name` | `snapshot_capture_requested`, `snapshot_captured`, `snapshot_reused_by_idempotency`, `snapshot_conflict_detected`, `snapshot_redaction_applied`, `snapshot_retention_marked`, `snapshot_purged`, or `snapshot_read`. |
| `event_family` | `diagnostic_snapshot_history`. |
| `severity` | `info`, `warning`, `error`, or `security`. |
| `actor_type`, `actor_id`, `actor_role` | Actor envelope. |
| `correlation_id`, `causation_id`, `idempotency_key` | Workflow linkage. |
| `event_payload_json` | Bounded safe event payload, never raw source payload. |
| `redaction_version`, `privacy_label`, `retention_class` | Policy labels. |
| `created_at` | Append-only event timestamp. |

Events should record lifecycle and auditability of the diagnostic history itself. They do not replace MVP-57 operator action audit or AAF audit.

## Snapshot Timing

Future snapshots may be captured only at reviewed read-only boundaries:

- after dry-run completion;
- after shadow-publish completion;
- after shadow-publish failure;
- on explicit internal read-only capture by an authorized operator;
- after source-read enrichment when the projection has newly gathered source-owned read state.

Captures must not occur before authorization/scope checks. Captures must not call providers, mutate runtime, create AAF records, evaluate gates, trigger PASR, create DDOM snapshots, or publish.

## Idempotency

Same semantic snapshot content plus same idempotency key should reuse the existing snapshot row.

Semantic content is the canonical redacted snapshot payload excluding volatile timestamps such as display `generatedAt`, database `created_at`, request duration, and UI-only render timestamp. The MVP-62 `snapshotWatermark` principle should remain: the watermark is computed from sorted canonical JSON over semantic content and excludes volatile capture/display timestamps.

If the same idempotency key is replayed with semantic drift:

- strict capture modes should return an idempotency conflict and create no row;
- operator-requested comparison modes may create a new version only when the request explicitly says versioning is intended;
- service retry after write timeout should read by idempotency key and compare semantic watermark before returning.

## Diff Baseline Strategy

Future MVP-63 diffing should select baselines in this order:

1. previous persisted snapshot for the same tenant/client/site/migration/candidate/target scope;
2. latest persisted dry-run snapshot for the same scope;
3. latest persisted shadow-publish snapshot for the same scope;
4. explicit operator-selected snapshot in a later UI phase;
5. audit-derived baseline summary only when no persisted snapshot exists.

Baseline selection must preserve capture mode labels and staleness labels. A baseline is comparison evidence only. It must not be treated as current source truth or current approval state.

## Access And UI Boundary

Initial read access should remain platform-superadmin only through internal Command Center. Future role expansion requires separate role, scope, field-redaction, and audit review.

Snapshot history must not be exposed to:

- client portal;
- public runtime;
- preview runtime;
- client-facing APIs;
- Ops Inbox actions;
- external exports;
- downloadable files.

Persistence must not add action buttons. It must not create mutation authority. Command Center may read persisted snapshots only after persistence exists, and it must continue labeling the surface as derived-only, historical, read-only, internal-only, and non-enforcing.

## Risks

- snapshots become accidental source truth;
- stale snapshots are used as current state;
- unsafe raw payloads enter persisted JSON;
- provider, billing, customer, or secret data leaks through diagnostic storage;
- full snapshots become an export path before a client-safe export policy exists;
- operators confuse diagnostic history with approval/audit truth;
- broad RLS grants expose cross-tenant diagnostics;
- idempotency drift hides a meaningful source change;
- retention keeps operational diagnostics longer than needed.

## Guardrails For Future Implementation

- Keep source ownership explicit in every persisted row and every UI label.
- Persist only redacted snapshot JSON and safe refs.
- Bound JSON size and reject or summarize oversize payloads.
- Enable RLS and add no broad public, anon, authenticated, or client grants by default.
- Use server-only writers and trusted service access.
- Record redaction version, privacy label, retention class, actor, correlation, causation, and idempotency.
- Reuse the MVP-62 deterministic semantic watermark behavior.
- Treat idempotency drift as a conflict unless explicit versioning is requested.
- Use append-only refs/events and avoid rewriting historical observations.
- Add focused tests for forbidden fields, idempotency, scope, RLS posture, retention metadata, stale labels, and diff baseline selection before UI consumption.
- Do not add UI actions, route POSTs, downloads, provider calls, AAF writes, gate evaluation, DDOM trigger, PASR invocation, publish, rollback, runtime mutation, billing, Stripe, domain, DNS, or client portal exposure as part of persistence.

## Recommended Next Milestone

MVP-65 should implement diagnostic snapshot persistence core only:

- SQL migration for the table family;
- server-only writer/repository/service tests;
- redaction and retention tests;
- idempotency tests;
- no UI action;
- no route POST unless separately approved;
- no Command Center panel read until the persistence core is stable or explicitly included as read-only scope;
- no client exposure;
- no downloadable exports;
- no provider, Supabase production/staging, billing, Stripe, domain, DNS, PASR, DDOM, AAF mutation, gate evaluation, publish, rollback, or runtime behavior changes.
