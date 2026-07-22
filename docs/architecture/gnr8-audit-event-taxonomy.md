# GNR8 Audit Event Taxonomy

AAF-1 conceptual audit event taxonomy for the GNR8 MVP.

This document is conceptual only. It does not create schemas, migrations, event stores, route handlers, UI, workers, queues, or runtime behavior.

## Purpose

The audit event taxonomy defines the append-only event families, payload envelope, correlation fields, replay classes, severity labels, and retention importance future implementation must use for approval-gated and privileged MVP actions.

## Minimum Required Event Payload Fields

Every audit event should carry the following envelope where applicable:

- `eventId`
- `eventType`
- `occurredAt`
- `actorType`
- `actorId` or system actor id
- `actorRole`
- `agencyId` if applicable
- `clientId` if applicable
- `siteId` if applicable
- `siteVersionId` if applicable
- `batchId` if applicable
- `jobId` if applicable
- `subjectType`
- `subjectId`
- `actionClass`
- `approvalRef` if applicable
- `evidencePackageRef` if applicable
- `sourceRefs`
- `beforeStateRef` if applicable
- `afterStateRef` if applicable
- `correlationId`
- `causationId` if applicable
- `requestId` if applicable
- `idempotencyKey` if applicable
- `severity` if applicable
- `freshnessLabels` if applicable
- `outcome`
- `failureCode` if applicable
- `redaction/privacy classification`

Events should prefer refs, hashes, compact diagnostics, and watermarks over large payloads.

## Replay Classes

| Replay class | Meaning |
| --- | --- |
| `fully_deterministic` | Same immutable inputs and rules should produce same result. |
| `deterministic_with_external_input_refs` | Deterministic after external input snapshot refs are fixed. |
| `environmental_variance` | Repeatable only with freshness/variance labels, such as capture or DNS checks. |
| `manual_retry_only` | May be retried by human action but not deterministic replay. |
| `not_replayable` | Side effect or human decision cannot be replayed. |
| `forbidden_replay` | Re-running is forbidden without new architecture/policy. |

## Audit Event Families

All rows inherit the minimum required payload fields. `Refs` means representative evidence/source refs required for that family.

| Family | Representative event names | Actor type | Subject type | Required payload focus | Refs | Correlation ids | Severity | Replay class | Retention/audit importance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Identity/auth/scope | `identity.login`, `auth.scope_resolved`, `auth.scope_denied`, `auth.privileged_action_authorized`, `auth.privileged_action_denied` | Human/system auth service. | User, membership, agency/client/site scope. | actor id/role, requested scope, resolved scope, action, outcome, failure code. | membership/RBAC refs, policy refs. | request id, session/auth correlation. | Medium/high for denial or privilege. | Not replayable. | High; proves permission boundary. |
| Intake | `intake.created`, `intake.row_validated`, `intake.row_rejected`, `intake.duplicate_detected`, `intake.corrected` | Human/system importer. | Intake/list/row. | source URL/domain/client mapping, validation rule version, result. | intake row refs, external workflow refs. | batch/wave/request correlation. | Low/high by blocker. | Fully deterministic for validation. | High; migration provenance. |
| Classification | `classification.assessed`, `classification.accepted`, `classification.exception_required`, `classification.superseded` | Human/system classifier. | Intake row/site. | site class, confidence, risk, operator decision. | source capture/classification refs. | intake/site correlation. | Medium/high for unsupported. | Deterministic with external input refs. | High; launch eligibility. |
| Dry-run | `dry_run.requested`, `dry_run.started`, `dry_run.completed`, `dry_run.failed`, `dry_run.waiver_requested`, `dry_run.waiver_granted` | Human/system. | Batch plan/site item. | dry-run inputs, policy, risk summary, waiver decision. | dry-run refs, batch plan refs, cost estimate refs. | batch/request/causation. | Medium/high. | Deterministic with external input refs or environmental variance. | High; dry-run is evidence not approval. |
| Batch lifecycle | `batch.created`, `batch.ready`, `batch.start_requested`, `batch.started`, `batch.paused`, `batch.resumed`, `batch.completed`, `batch.failed`, `batch.cancelled` | Human/system executor. | Batch. | prior/next state, policy, owner, counters, pause reason. | batch refs, approval refs, evidence package refs. | batch/job/request/idempotency. | Medium/high/critical. | Manual retry only for execution. | High; 200-site wave operations. |
| Job/stage lifecycle | `job.created`, `job.started`, `stage.started`, `stage.succeeded`, `stage.failed`, `job.completed`, `job.failed`, `job.resumed` | System executor/human requester. | Job/stage. | stage, attempts, diagnostics, output refs, failure. | job/stage refs, artifact/capture refs. | job/batch/correlation. | Low/high by failure. | Per stage class. | High; deterministic spine. |
| Retry/replay | `retry.requested`, `retry.approved`, `retry.started`, `retry.succeeded`, `retry.failed`, `replay.requested`, `replay.approved`, `replay.downstream_reset`, `replay.succeeded`, `replay.failed` | Human/system executor. | Job/stage/action. | failure ref, replay class, immutable input refs, reset scope, attempt count. | failure refs, input/output refs, approval refs. | causation from failure event, idempotency key. | Medium/high. | Per request, never human approval. | Critical; prevents blind reruns. |
| Import/capture/artifact | `capture.started`, `capture.completed`, `capture.degraded`, `import.started`, `artifact.persisted`, `artifact.integrity_failed`, `artifact.superseded` | System/human requester. | Source capture/artifact/site version. | source URL, capture mode, artifact ids, hashes, limitations. | source capture refs, raw artifact refs, runtime artifact refs. | job/site version. | Medium/high. | Deterministic with external input refs or environmental variance. | High; artifact provenance. |
| Preview/readiness | `preview.generated`, `preview.failed`, `readiness.checked`, `readiness.passed`, `readiness.failed`, `readiness.stale` | System/human requester. | Site version/readiness check. | check type, result, blocker, freshness label. | preview refs, readiness refs, artifact refs. | site/site version/request. | Low/high. | Rebuildable projection/environmental variance. | Medium/high; gating evidence. |
| Review/content | `review.requested`, `review.completed`, `content.draft_saved`, `content.publish_requested`, `content.published`, `content.rollback_requested`, `content.rollback_applied` | Human/content system. | Review/content slot/override/site version. | slot refs, diff refs, actor, review outcome. | content slot/override/history refs, preview refs. | site version/request. | Medium/high when public. | Not replayable for human review; content rollback is recovery. | High; client-visible change evidence. |
| Approval | `approval.requested`, `approval.granted`, `approval.rejected`, `approval.revoked`, `approval.expired`, `approval.superseded`, `approval.not_required_by_policy` | Human/system policy. | Approval request/decision. | scope, policy version, approver role, decision reason, expiration. | evidence package ref, source refs, prior approval refs. | request/causation. | Medium/critical by scope. | Not replayable. | Critical; human accountability. |
| Domain/DNS | `domain.binding_requested`, `domain.binding_created`, `dns.instructions_generated`, `dns.check_requested`, `dns.check_completed`, `domain.verified`, `domain.exception_approved`, `provider.live_blocked` | Human/system checker/provider adapter. | Domain binding/DNS plan/check. | domain, binding id, provider id, environment, check result, stale label. | domain binding refs, DNS instruction/check refs, Vercel/provider snapshot refs. | site/domain/request. | High/critical for failures. | Environmental variance/manual retry only. | Critical for launch safety. |
| Publish | `publish.readiness_requested`, `publish.readiness_passed`, `publish.requested`, `publish.approved`, `publish.attempted`, `publish.succeeded`, `publish.failed`, `publish.superseded` | Human/system runtime. | Site version/artifact/active pointer. | before/after active pointer, artifact id, content refs, approval ref, readiness refs. | publish activation evidence, runtime artifact refs, active pointer refs. | request/idempotency/causation. | Critical. | Not replayable. | Critical; production mutation. |
| Rollback | `rollback.requested`, `rollback.approved`, `rollback.emergency_started`, `rollback.attempted`, `rollback.succeeded`, `rollback.failed`, `rollback.verified` | Human/system runtime. | Incident/runtime/content target. | incident reason, target refs, before/after state, emergency flag. | rollback evidence, incident refs, pointer/content history refs. | incident/request/idempotency. | Critical. | Not replayable. | Critical; recovery accountability. |
| Incident/recovery | `incident.opened`, `incident.updated`, `recovery.plan_requested`, `recovery.plan_approved`, `recovery.action_started`, `recovery.action_completed`, `incident.resolved` | Human/system monitor. | Incident/recovery record. | severity, impact, owner, status, recovery decision. | incident refs, runtime/domain/cost/failure refs. | incident correlation. | High/critical. | Manual retry only or not replayable. | Critical; operational truth. |
| Cost | `cost.event_logged`, `cost.threshold_exceeded`, `cost.anomaly_detected`, `cost.exception_requested`, `cost.exception_granted`, `cost.pause_applied` | System/human finance/ops. | Cost event/anomaly/batch/site. | cost type, estimate/actual signal, threshold, exception decision. | AI/runtime/migration cost event refs, threshold refs. | batch/site/request. | Medium/high. | Not replayable. | High; spend governance. |
| Asset/storage evidence | `asset.ref_recorded`, `asset.hash_recorded`, `asset.missing_detected`, `asset.persistence_failed`, `asset.storage_evidence_stale` | System. | Asset/artifact/file map. | asset ref, hash, content type, size, source, persistence status. | artifact file refs, capture refs, storage refs. | site version/job. | Medium/high. | Deterministic with refs. | High for fidelity/recovery. |
| External workflow reference | `external_ref.linked`, `external_ref.snapshot_recorded`, `external_ref.acceptance_requested`, `external_ref.accepted_as_evidence`, `external_ref.stale`, `external_ref.unlinked` | Human/system connector. | External reference. | external system/id/url, snapshot watermark, linked GNR8 subject. | external workflow refs/snapshots, approval refs. | subject/request. | Low/high by gate. | Not replayable; new snapshot only. | Medium/high; never approval truth. |
| AI advisory | `ai.bundle_created`, `ai.advisory_generated`, `ai.advisory_review_requested`, `ai.advisory_accepted`, `ai.advisory_rejected`, `ai.advisory_stale` | System AI/human reviewer. | AI/provider bundle. | model/provider, input refs, output refs, limitations, cost refs, human review outcome. | AI/provider bundle refs, source refs, cost refs. | request/trace id. | Medium/high. | New bundle only; not replay of decision. | High if used as evidence; advisory only. |
| Admin/superadmin exception | `admin.exception_requested`, `admin.exception_granted`, `admin.exception_rejected`, `admin.emergency_override_started`, `admin.emergency_compensated` | Human superadmin/admin. | Exception subject. | policy, reason, risk, duration, compensating controls. | evidence package refs, policy refs. | request/incident. | High/critical. | Not replayable. | Critical; privileged boundary. |
| System failure/audit failure | `system.failure_detected`, `audit.write_failed`, `audit.compensating_event_recorded`, `timeline.partial`, `source.unavailable` | System/human emergency. | Audit/source/action. | failed writer/source, impact, affected actions, compensation. | audit writer refs, source family refs. | request/incident. | High/critical. | Manual recovery only. | Critical; fail-closed proof. |

## Audit Rules

- Privileged actions must not proceed if their required audit write path is unavailable, unless emergency policy explicitly records a compensating event.
- Audit events must not expose secrets.
- Audit events should prefer refs/hashes over large payloads.
- Audit must distinguish human action, system action, and external snapshot.
- Audit must distinguish requested, attempted, succeeded, failed, cancelled, and superseded actions.
- Audit event streams may be federated initially, but Command Center must label partial timelines.
- Approval events must cite evidence package refs and policy version.
- Action attempt events must cite approval refs when approval is required, or a `not_required_by_policy` decision ref when policy says no approval is required.
- External workflow events must label external state as external.
- AI advisory events must label outputs as advisory and non-executing.
- Redaction/privacy classification is required before any event is displayed to client-safe surfaces or exported.

## Explicit Deferrals

- Physical event-store strategy.
- Event schema migrations.
- Event publication/streaming infrastructure.
- Command Center timeline implementation.
- Event retention automation.
- Security review of field-level redaction implementation.
