# GNR8 Audit Event Write Path Contract (AAF-2)

## Purpose

This contract defines the implementation-ready append-only audit event model for AAF-2. It is documentation only and does not create migrations, APIs, services, or runtime behavior.

## Append-Only Requirement

Audit events are append-only. Historical events must not be updated to correct, hide, or reinterpret behavior. Corrections, reversals, stale discoveries, failed writes, and operator mistakes must be represented as compensating events linked by causation and correlation ids.

If existing repository event tables do not enforce this envelope, they must be treated as source refs or legacy activity, not canonical AAF audit truth.

## Audit Event Envelope

Canonical audit events should include:

- `id`
- `tenant_id`
- `client_id`
- `site_id`
- `batch_id`
- `job_id`
- `site_version_id`
- `domain_id`
- `cost_center_id`
- `event_name`
- `event_family`
- `severity`
- `replay_class`
- `actor_type`
- `actor_id`
- `actor_role`
- `subject_type`
- `subject_id`
- `subject_version`
- `correlation_id`
- `causation_id`
- `idempotency_key`
- `request_id`
- `source_system`
- `source_route`
- `source_ref_json`
- `approval_request_id`
- `approval_decision_id`
- `policy_evaluation_id`
- `evidence_package_id`
- `before_ref_json`
- `after_ref_json`
- `payload_json`
- `redaction_label`
- `privacy_label`
- `retention_class`
- `created_at`
- `schema_version`

Large payloads, screenshots, provider payloads, logs, rendered artifacts, and external documents should be stored as evidence items with immutable object refs and hashes, not embedded directly in audit payloads.

## Actor Model

Allowed actor types:

- `human`: authenticated GNR8 user.
- `system`: trusted GNR8 service performing policy, projection, or maintenance writes.
- `provider`: external provider callback or snapshot source, never approval authority.
- `external_reference`: external workflow source, never approval authority.
- `ai_advisory`: AI output source, never approval authority.

Actor role must reflect the role at action time and must be copied into the event. Role changes later must not rewrite audit history.

## Subject Model

Subjects must be typed and scoped. MVP subject types include `tenant`, `client`, `site`, `site_version`, `runtime_artifact`, `active_pointer`, `migration_batch`, `migration_job`, `migration_stage`, `domain_binding`, `domain_readiness`, `content_override_set`, `cost_event`, `cost_center`, `provider_operation`, `external_reference`, `ai_advisory_plan`, `incident`, and `recovery_plan`.

## Severity Model

Use `debug`, `info`, `notice`, `warning`, `error`, `critical`, and `security`. Privileged gate denial should be at least `warning`; audit write failure and unauthorized privileged attempts should be `error` or `security`; publish/rollback/domain mutation outcomes should be `notice` or higher.

## Replay Class Model

Use:

- `not_replayable`: human decisions, approval requests, external acceptance, AI acceptance, publish activation, rollback, admin exception.
- `deterministic_replay`: deterministic recomputation from immutable inputs.
- `manual_retry_only`: retries requiring operator action and new audit events.
- `forbidden_replay`: actions that must never be replayed or synthesized.
- `compensating_only`: correction events that exist only to explain or reverse prior state.

## Correlation, Causation, and Idempotency

`correlation_id` groups an operator workflow, batch run, publish attempt, incident, or external review. `causation_id` points to the event/request/evaluation that caused this event. `idempotency_key` deduplicates the exact audit write for the same action attempt and must not be used to replay human decisions or mutations.

## Before/After Refs

Mutable operations should store immutable `before_ref_json` and `after_ref_json` references such as active pointer ids and artifact hashes, not full mutable blobs. If source state cannot be snapshotted enough to verify the action later, the action should fail closed.

## Failure Handling

Privileged actions must write a pre-action event before mutation. If that write fails, the action fails closed except for explicitly documented emergency policy. Outcome writes must be attempted after execution. If the outcome write fails after a side effect, a `system failure/audit failure` compensating event must be recorded as soon as the writer recovers, and Ops Inbox must expose a partial timeline.

## Partial Timeline Handling

A partial timeline is valid evidence of an operational failure, not proof of approval. Command Center and Ops Inbox must display partial timelines as degraded/blocked until the missing canonical audit outcome is reconciled or a compensating event is written.

## Event Families

| Family | Representative event names | Payload focus | Required refs | Required correlation ids | Severity | Replay class | Retention importance | Fail closed if unavailable |
|---|---|---|---|---|---|---|---|---|
| `identity/auth` | `identity.login`, `identity.logout`, `identity.role_checked`, `identity.role_denied`, `identity.session_scope_loaded` | Authenticated user, role, tenant/agency scope, denial reason. | Actor, tenant, agency/client scope. | Request/workflow correlation. | info to security | not_replayable | mvp_operational/security | Yes for privileged role/scope checks. |
| `intake` | `intake.site_registered`, `intake.site_classified`, `intake.unsupported_detected`, `intake.source_snapshot_captured` | Source URL, class, supported/unsupported signals, source snapshot refs. | Site/client/source refs, evidence refs. | Site migration correlation. | info/warning | manual_retry_only | mvp_operational | Yes when intake gates later privileged action. |
| `dry-run` | `dry_run.started`, `dry_run.completed`, `dry_run.failed`, `dry_run.waiver_requested`, `dry_run.waiver_applied` | Dry-run result, limitations, failure codes, waiver scope. | Batch/job/stage/evidence/approval refs. | Batch/job correlation. | info/warning | deterministic_replay for dry-run, not_replayable for waiver | compliance_long for waivers | Yes for waiver-dependent actions. |
| `batch lifecycle` | `batch.created`, `batch.start.gate_requested`, `batch.start.gate_allowed`, `batch.start.gate_blocked`, `batch.started`, `batch.paused`, `batch.resumed`, `batch.completed`, `batch.failed` | Batch plan, membership watermarks, execution status, stop/continue policy. | Batch, evidence, approval, policy refs. | Batch correlation. | info to error | manual_retry_only | compliance_long | Yes for start/resume. |
| `site item lifecycle` | `site_item.queued`, `site_item.started`, `site_item.stage_completed`, `site_item.blocked`, `site_item.completed`, `site_item.failed` | Site-level migration state, stage status, blockers. | Site/job/stage/batch refs. | Batch/job correlation. | info/warning/error | manual_retry_only | mvp_operational | Yes for exception-gated continuation. |
| `retry/replay` | `retry.requested`, `retry.gate_allowed`, `retry.executed`, `replay.requested`, `replay.gate_allowed`, `replay.executed`, `replay.blocked` | Retry/replay reason, immutable input refs, stage reset boundary. | Job/stage/evidence/approval/policy refs. | Job/stage correlation. | notice/warning | manual_retry_only or deterministic_replay | compliance_long | Yes. |
| `preview/readiness` | `preview.generated`, `preview.failed`, `readiness.evaluated`, `readiness.stale`, `readiness.blocked` | Preview refs, readiness inputs, stale reasons. | Site version, artifact, evidence refs. | Site/version correlation. | info/warning | deterministic_replay for generated preview | mvp_operational | Yes when used for approval evidence. |
| `review/content` | `content.publish.requested`, `content.publish.gate_allowed`, `content.published`, `content.rollback.requested`, `content.rollback.applied`, `review.client_requested`, `review.client_decided`, `launch.signoff_decided` | Content diff refs, client review result, launch signoff scope, limitations. | Site version/content/evidence/approval refs. | Site/version correlation. | notice/warning | not_replayable for decisions, manual_retry_only for content mutation | compliance_long | Yes for publish/rollback/signoff decisions. |
| `approval` | `approval.requested`, `approval.granted`, `approval.rejected`, `approval.revoked`, `approval.expired`, `approval.superseded`, `approval.cancelled`, `approval.not_required_by_policy` | Scope, subject, policy version, evidence package, actor role, freshness, separation of duty. | Approval request/decision/policy/evidence/subject refs. | Approval workflow correlation. | notice/warning/security | not_replayable | compliance_long | Yes. |
| `domain/DNS` | `domain.instructions.generated`, `domain.instructions.shared`, `domain.vercel_attach_requested`, `domain.vercel_attach_completed`, `domain.verification_checked`, `domain.exception_decided`, `domain.readiness_stale` | Domain binding, DNS instruction hash, Vercel snapshot, no-live-DNS boundary, readiness state. | Domain/site/evidence/approval/policy refs. | Domain workflow correlation. | notice/warning/error | manual_retry_only, not_replayable for exception | compliance_long | Yes for gated domain actions. |
| `publish` | `publish.readiness_requested`, `publish.activation_requested`, `publish.activation.gate_allowed`, `publish.activation.gate_blocked`, `publish.activation.started`, `publish.activation.completed`, `publish.activation.failed` | Active pointer before/after refs, artifact hash, readiness, launch/domain/content/cost approvals. | Site version/artifact/active pointer/evidence/approval/policy refs. | Publish attempt correlation. | notice/error/critical | not_replayable/forbidden_replay | compliance_long | Yes. |
| `rollback` | `rollback.requested`, `rollback.gate_allowed`, `rollback.started`, `rollback.completed`, `rollback.failed`, `rollback.compensating_recorded` | Incident, current pointer, target artifact, reason, recovery plan. | Incident/site version/active pointer/evidence/approval refs. | Incident/rollback correlation. | warning/error/critical | not_replayable/compensating_only | compliance_long | Yes except documented emergency pre-audit fallback. |
| `provider/external execution` | `provider.operation_planned`, `provider.approval_artifact_recorded`, `provider.handoff_created`, `provider.execution_blocked`, `provider.snapshot_recorded` | Provider artifact refs, handoff refs, environment block, no-live-mutation status. | Provider operation/evidence/policy refs. | Provider workflow correlation. | notice/warning/error | manual_retry_only | compliance_long | Yes for provider actions. |
| `cost` | `cost.estimate_recorded`, `cost.usage_event_recorded`, `cost.threshold_exceeded`, `cost.exception_requested`, `cost.exception_decided` | Estimate/usage refs, threshold, cost center, exception reason. | Cost event/cost center/evidence/approval refs. | Batch/site/cost correlation. | info/warning | not_replayable for exception | compliance_long | Yes for exception-gated spend. |
| `asset/storage evidence` | `evidence.package_created`, `evidence.item_added`, `evidence.hash_verified`, `evidence.redacted`, `evidence.superseded`, `storage.ref_recorded` | Object refs, hashes, source watermarks, redaction labels, package version. | Evidence package/item/source refs. | Evidence workflow correlation. | info/warning/error | deterministic_replay for rebuild, not_replayable for acceptance | compliance_long | Yes when evidence is required by gate. |
| `external workflow reference` | `external_reference.linked`, `external_reference.snapshot_captured`, `external_reference.acceptance_requested`, `external_reference.accepted`, `external_reference.stale` | External system, external id, snapshot/hash, limitations, acceptance scope. | External reference/evidence/approval refs. | External review correlation. | notice/warning | not_replayable | compliance_long | Yes for acceptance. |
| `AI advisory` | `ai.advisory.generated`, `ai.advisory.review_requested`, `ai.advisory.accepted`, `ai.advisory.rejected`, `ai.advisory.stale`, `ai.execution_blocked_by_policy` | Model metadata, advisory plan hash, evidence gaps, advisory-only limitation. | AI plan/evidence/approval refs. | AI advisory correlation. | info/warning/security | not_replayable/forbidden_replay | mvp_operational/compliance_long if accepted | Yes for advisory acceptance; AI execution remains blocked. |
| `admin/superadmin exception` | `admin.exception_requested`, `admin.exception_granted`, `admin.exception_revoked`, `superadmin.override_blocked`, `superadmin.breakglass_used` | Scope, reason, incident link, separation of duty, expiration. | Approval/policy/evidence/incident refs. | Exception correlation. | warning/security/critical | not_replayable | compliance_long/legal_hold | Yes except documented breakglass pre-audit failure path. |
| `system failure/audit failure` | `audit.write_failed`, `audit.partial_timeline_detected`, `audit.compensating_event_recorded`, `policy.evaluation_failed`, `evidence.build_failed`, `gate.fail_closed` | Failure point, action blocked/executed, recovery state, missing refs. | Gate/action/request refs where available. | Original action correlation. | error/critical/security | compensating_only | compliance_long | This family is the fail-closed path. |

## Compensating Event Model

Compensating events must include:

- the original event id or best available correlation id,
- the correction reason,
- the actor/system that discovered the issue,
- before/after refs if a mutable subject changed,
- whether any side effect occurred before audit completion,
- required Ops Inbox follow-up state.

Compensating events do not erase the original event.

## Prohibited Claims

Audit events must not claim that:

- launch signoff equals publish activation,
- domain readiness equals publish approval,
- domain action approval equals DNS mutation approval,
- domain exception equals publish approval,
- client review equals technical publish approval,
- AI advisory acceptance equals execution approval,
- external workflow reference acceptance equals GNR8 approval,
- human approvals are replayable,
- rollback is ordinary replay,
- publish activation is deterministic replay.
