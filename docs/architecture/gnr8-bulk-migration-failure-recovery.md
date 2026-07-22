# GNR8 Bulk Migration Failure Recovery

BMF-1 canonical failure, retry, replay, and recovery architecture for the Bulk Migration Factory.

This is documentation-only. It does not modify runtime behavior, APIs, schemas, migrations, workers, import behavior, publish behavior, rollback behavior, DNS/domain behavior, billing, storage, providers, thumbnails, Generated Proposal Bundles, Workspace runtime, Evolution runtime, or AI execution.

## Recovery Principles

1. Failure recovery is evidence-driven. A failure is recovered only when canonical state and evidence prove recovery.
2. Ops Inbox is a derived queue. Dismissing an item is never recovery.
3. Retry repeats an approved action. Replay resets deterministic outputs from an immutable input boundary.
4. Rendered capture, live source fetch, multi-page discovery against a live source, and domain/provider checks may vary across runs and must be labeled accordingly.
5. Human approvals are not replayed.
6. Publish activation is not blindly replayed.
7. Rollback is a recovery action, not a deterministic replay.
8. External DNS/provider checks may be repeated but not replayed as proof of past truth.
9. AI/provider outputs may be re-run only as new advisory bundles and must not overwrite previous bundles.

## Replay Classes

| Class | Meaning | Examples | Default handling |
| --- | --- | --- | --- |
| Fully deterministic replay | Same immutable inputs and rules version should produce equivalent outputs. | Intake validation, URL normalization, static import from persisted input, runtime artifact build from immutable refs, preview generation from artifacts. | Allowed after operator approval; reset downstream derived outputs and audit. |
| Deterministic replay with external input refs | Deterministic once the external observation is captured and referenced. | Route assembly from persisted fetched pages, import from captured HTML, projection from stored capture refs. | Allowed with immutable input refs; do not fetch new external truth under same replay claim. |
| Replay with environmental variance | Re-run may differ because source/network/browser/provider state changed. | Live source reachability, rendered capture, raw fetch, live sitemap/robots discovery, domain verification. | Allowed only as a new attempt/check with variance label and new evidence refs. |
| Manual retry only | Human work can be repeated but is not deterministic. | Review, content correction, client follow-up, DNS-owner follow-up. | New human action and audit event required. |
| Not replayable | Historical decision or side effect cannot be safely reproduced. | Approval decision, publish activation, rollback, cost exception, external workflow truth. | New decision/action required; preserve old history. |
| Forbidden replay | Action must not be performed by BMF MVP. | Live DNS/registrar mutation, Openprovider live mutation, provider execution, billing mutation, autonomous AI execution, autonomous regeneration. | Block and escalate; future ADR required. |

## Failure Taxonomy

Severity values: low, medium, high, critical.

| Category | Canonical code | Severity | Site/batch impact | Batch action | Retry eligibility | Replay eligibility | Required evidence | Operator action | Approval required | Audit event | Ops Inbox item | Recovery path | Escalation owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Invalid intake | `BMF_INTAKE_INVALID` | Medium | Affected site item blocked before job creation. | Continue planning without row or return to validation. | After correction. | Fully deterministic validation replay. | Original row, normalized fields, validation error list. | Correct row, defer, or cancel. | Exception if bypass requested. | `bulk_intake_failed` | `intake_blocked` | Revalidate corrected row or defer/cancel. | Account/migration operator. |
| Duplicate site/client mapping | `BMF_DUPLICATE_SITE_CLIENT_MAPPING` | High; critical cross-client/domain | Affected rows blocked; possible batch start pause. | Pause affected rows; pause batch if cross-client domain conflict. | After ownership resolution. | Validation/check replay only. | Duplicate source/domain report, existing site/client/domain refs. | Merge, reassign, defer, or escalate. | Superadmin for cross-client conflict. | `duplicate_detected` | `duplicate_detected` | Record ownership decision and revalidate. | Superadmin/account owner. |
| Unsupported site class | `BMF_SITE_CLASS_UNSUPPORTED` | High/critical | Site cannot become launch-ready; may be import-only/deferred. | Continue other sites unless unsupported launch attempt pauses batch. | Classification can be revisited with new evidence. | Manual reassessment only. | Classification decision, MVP matrix mapping, risk flags. | Mark import-only, defer, cancel, or request exception. | Superadmin for any launch exception. | `site_classified` | `unsupported_site_class` | Defer/cancel or approved import-only review. | Superadmin/migration. |
| Source unreachable | `BMF_SOURCE_UNREACHABLE` | Medium/high | Site import blocked. | Continue other sites unless repeated/systemic. | Yes, limited. | Replay with environmental variance. | URL, request policy, HTTP/TLS/network diagnostics, timestamp. | Retry later, request alternate source, or defer. | None unless accepting degraded/no-source path. | `source_reachability_failed` | `import_failed` | Successful reachability/import or defer record. | Technical/account. |
| Source changed during migration | `BMF_SOURCE_CHANGED_DURING_MIGRATION` | High | Site evidence may be inconsistent; review blocked. | Pause affected site; pause batch if repeated. | New capture/import attempt allowed. | Environmental variance; past truth not replayed. | Source capture hashes/timestamps, changed DOM/content/asset refs. | Decide whether to restart from new source snapshot or freeze prior captured refs. | Operator approval for restart; client/account if visible. | `source_changed_detected` | `review_needed` | New consistent capture set or accepted prior snapshot. | Technical/account. |
| Rendered capture failure | `BMF_CAPTURE_RENDERED_FAILED` | Medium/high | Site can fall back only if policy allows; launch blocked until review. | Continue if isolated; pause if repeated/systemic. | Yes. | Replay with environmental variance. | Capture status, browser/network diagnostics, screenshots/DOM availability. | Replay capture, accept raw fallback for review, or defer. | Exception approval for launch-visible degraded evidence. | `site_capture_degraded` | `capture_degraded` | New capture evidence or accepted degraded limitation. | Technical/content. |
| Static import failure | `BMF_IMPORT_STATIC_FAILED` | High | Site item failed before usable artifact. | Continue isolated failures under policy. | Yes after cause. | Fully deterministic if using persisted input refs. | Import manifest, raw/captured HTML refs, diagnostics, failed stage. | Retry/replay, correct input, or defer. | Retry/replay approval. | `site_import_failed` | `import_failed` | Successful import result or defer/cancel. | Technical/migration. |
| Multi-page discovery failure | `BMF_DISCOVERY_MULTIPAGE_FAILED` | Medium/high | Route coverage blocked; single-page/import-only may remain possible. | Continue other sites; pause if systemic. | Yes with changed policy/limits. | Environmental variance unless using persisted fetched refs. | Seed URL, limits, sitemap/robots/canonical/alias diagnostics. | Re-run discovery, trim scope, or mark route review blocker. | Approval for changed limits or incomplete route coverage. | `route_discovery_failed` | `route_review_needed` | Approved route map/coverage or defer. | Migration/SEO. |
| Missing critical assets | `BMF_ASSET_CRITICAL_MISSING` | Medium/high | Preview/review may proceed only with visible blocker; launch blocked if critical. | Continue other sites. | Limited after source/fetch correction. | Deterministic from persisted acquisition; environmental variance from live source. | Asset refs, byte size, hash/content type when available, visual impact. | Re-fetch, replace via content workflow, accept limitation, or defer. | Content/client approval for accepted/replaced asset. | `asset_missing_detected` | `review_needed` | Asset restored/replaced or accepted limitation. | Content/technical. |
| Degraded visual fidelity | `BMF_VISUAL_FIDELITY_DEGRADED` | Medium/high | Review/approval blocked until accepted. | Continue other sites. | After correction. | Preview/projection replay if deterministic refs exist; manual review otherwise. | Source capture refs, screenshots, preview refs, reviewer notes. | Correct content/assets/styles or request exception. | Client/content approval if visible. | `visual_fidelity_degraded` | `review_needed` | Accepted review or corrected preview. | Content/client. |
| Broken routes/navigation | `BMF_ROUTE_NAV_BROKEN` | High | Site launch blocked. | Continue other sites. | After route correction. | Deterministic route assembly replay if persisted refs exist. | Route map, navigation tree, broken link diagnostics, preview smoke. | Fix route map/links or defer. | SEO/client approval for accepted omissions. | `route_review_requested` | `route_review_needed` | Passing route review/smoke or accepted route exception. | Migration/SEO. |
| Form behavior unresolved | `BMF_FORM_BEHAVIOR_UNRESOLVED` | High | Site launch blocked if form is business-critical. | Continue other sites. | Manual retest only. | Manual retry only. | Form inventory, endpoint/action behavior, test submission or replacement plan. | Verify external endpoint, replace, or accept disabled/static form. | Client/account/content approval. | `form_behavior_unresolved` | `review_needed` | End-to-end evidence or approved replacement/limitation. | Technical/client. |
| Widget/third-party script unresolved | `BMF_WIDGET_SCRIPT_UNRESOLVED` | Medium/high | Site review/launch blocked based on criticality. | Continue other sites. | Manual retest after change. | Manual retry only; capture may vary. | Widget inventory, provider URL, preview/source evidence, criticality. | Verify, replace, remove, or defer. | Client approval for visible/functional limitation. | `widget_unresolved` | `review_needed` | Working widget or accepted fallback. | Technical/content/client. |
| Heavy JavaScript unsupported | `BMF_HEAVY_JS_UNSUPPORTED` | High/critical | Site becomes import-only/deferred unless static fidelity proven. | Continue other sites; pause if launch attempted. | Limited. | Environmental variance; no launch replay. | Capture diagnostics, script/API dependency evidence, preview mismatch. | Mark import-only/defer or request exception. | Superadmin/client for exception. | `site_classified` | `unsupported_site_class` | Accepted static snapshot exception or defer. | Superadmin/technical. |
| Preview smoke failure | `BMF_PREVIEW_SMOKE_FAILED` | High | Review/approval blocked. | Continue other sites unless systemic. | Yes after artifact/content correction. | Fully deterministic from artifacts unless environment issue. | Preview URL/ref, smoke result, failed route/asset/error details. | Re-run preview check, replay artifact stage, or defer. | None unless waiver requested. | `preview_smoke_failed` | `preview_failed` | Passing preview smoke or approved defer. | Technical. |
| Runtime artifact integrity failure | `BMF_RUNTIME_ARTIFACT_INTEGRITY_FAILED` | High/critical | Site item failed; systemic failures pause batch. | Pause if repeated/systemic. | Yes after cause. | Fully deterministic from immutable inputs. | Artifact refs, hash, manifest, integrity diagnostics, builder version. | Replay artifact build or open incident. | Retry/replay approval; superadmin if critical. | `runtime_artifact_integrity_failed` | `preview_failed` | Artifact built, hash/integrity passes, bound to version. | Technical. |
| Content override conflict | `BMF_CONTENT_OVERRIDE_CONFLICT` | Medium/high | Content review/publish blocked. | Continue import batch; block site launch. | Manual correction. | Manual retry only; deterministic content preview can regenerate. | Slot refs, draft/published override history, conflicting edits. | Resolve draft, publish plan, or rollback content. | Content/client approval. | `content_override_conflict` | `review_needed` | Approved content state and clean preview. | Content/account. |
| Approval missing/rejected | `BMF_APPROVAL_MISSING_OR_REJECTED` | Medium/high | Site/batch/publish/rollback action blocked. | Continue unrelated work; pause action. | New request after changes. | Not replayable. | Approval request, evidence package, approver, decision/rejection reason. | Route approval, address rejection, or defer. | Required human approval. | `approval_requested`, `approval_rejected` | `approval_needed` | Approval granted or site/batch deferred/cancelled. | Account/approver. |
| Domain readiness failure | `BMF_DOMAIN_READINESS_FAILED` | High | Custom-domain publish blocked. | Continue other sites/imports. | Repeat after DNS/provider changes. | Manual repeat/external variance. | Domain intent, binding, DNS instruction snapshot, verification result, freshness. | Fix DNS/manual instruction, recheck, or approve exception. | Domain action/client approval if DNS owned externally. | `domain_readiness_failed` | `domain_action_needed` | Verified/acceptable domain or approved no/custom-domain exception. | Technical/client. |
| Publish readiness failure | `BMF_PUBLISH_READINESS_FAILED` | High | Publish action blocked. | Continue import/review work; no publish for site. | After correction. | Deterministic checks replayable; approval not replayed. | Readiness snapshot, blockers, version/artifact/domain/approval refs. | Resolve blockers and rerun readiness. | Publish readiness waiver only by superadmin. | `publish_readiness_failed` | `publish_readiness_failed` | Passing readiness snapshot. | Technical/superadmin. |
| Publish activation failure | `BMF_PUBLISH_ACTIVATION_FAILED` | Critical | Site launch failed; publish wave paused. | Pause publish wave and possibly batch. | No blind retry; only after root cause and approval. | Not replayable. | Publish event, active pointer before/after, artifact/version refs, failure code. | Open incident, decide retry or rollback. | Technical/superadmin approval. | `publish_failed`, `incident_opened` | `publish_failed`, `incident_open` | Successful approved publish, rollback, or incident resolution. | Technical/superadmin. |
| Rollback required | `BMF_ROLLBACK_REQUIRED` | Critical | Affected site launch/runtime actions stopped. | Pause affected launch wave. | Rollback action may be attempted with approval; not retry loop. | Not replayable; rollback is recovery action. | Incident, target known-good version/content history, impact, before pointer. | Approve and execute rollback or document alternative recovery. | Rollback approval; emergency still audited. | `rollback_requested`, `rollback_completed` | `rollback_needed` | Rollback verified or incident resolved by approved alternative. | Technical/superadmin/account. |
| Cost anomaly | `BMF_COST_ANOMALY` | High/critical | Batch/site/cohort paused by threshold. | Pause according to threshold. | Continue only after approval/policy change. | Not replayable. | Cost event refs, estimate vs actual, threshold, affected stage/site/batch. | Review spend, adjust limits, approve exception, or cancel/defer. | Superadmin or agency owner/admin. | `cost_anomaly_detected` | `cost_anomaly` | Approved exception or corrected cost pattern. | Superadmin/agency owner. |
| Storage/object persistence failure | `BMF_STORAGE_OBJECT_PERSISTENCE_FAILED` | High/critical | Site artifact/capture/preview evidence may be unusable. | Pause if artifact integrity/replayability at risk. | Yes after storage cause. | Depends on persisted input refs; may be not replayable if bytes lost. | Object/ref path, byte size, hash, content type, retention class, write/read error. | Retry persist, switch to safe fallback only after design, or defer. | Technical/superadmin if evidence loss. | `storage_persistence_failed` | `recovery_evidence_needed` | Durable asset refs verified with size/hash/content type. | Technical/platform. |
| Audit event persistence failure | `BMF_AUDIT_EVENT_PERSISTENCE_FAILED` | Critical | State-changing action cannot be trusted; pause privileged actions. | Pause batch/action until audit restored. | Retry audit write after system fix. | Not replayable as proof unless action evidence exists; append compensating event. | Failed audit payload, action attempted, transaction outcome, correlation id. | Stop action, restore audit, record compensating event. | Superadmin for continuation. | `audit_persistence_failed` | `incident_open` | Audit restored and compensating record written. | Technical/superadmin. |
| Worker/process interruption | `BMF_WORKER_PROCESS_INTERRUPTED` | High; critical if systemic | Current site attempt unknown; batch paused or partially failed. | Pause if current stage state cannot be proven safe. | Retry after classifying interruption. | Replay eligible deterministic stages from last safe refs. | Last heartbeat/stage event if available, attempt id, partial outputs, process diagnostics. | Mark interrupted, decide retry/replay/resume. | Resume approval for high/critical. | `worker_interrupted` | `incident_open` or `import_failed` | Resume from first safe non-succeeded stage or restart stage with audit. | Technical. |
| Unknown system error | `BMF_UNKNOWN_SYSTEM_ERROR` | Medium/high until classified; critical if repeated | Site/batch blocked by unknown risk. | Pause if repeated, systemic, or privileged action involved. | Case-by-case after classification. | Case-by-case; default not replayable until classified. | Error stack/message, subject refs, stage/action, correlation id, surrounding events. | Classify, assign owner, open incident if needed. | Required for high/critical continuation. | `unknown_system_error` | `recovery_evidence_needed` | Classified failure with recovery record. | Technical/migration. |

## Stage And Action Recovery Rules

| Stage/action | Replay class | Recovery rule |
| --- | --- | --- |
| Intake validation and URL normalization | Fully deterministic replay | Re-run from original row and rules version; update validation result only by new event. |
| Preflight/dry-run projections | Fully deterministic or external variance depending on checks | New result supersedes old result; old result remains evidence. |
| Source reachability/raw fetch/rendered capture/live discovery | Replay with environmental variance | Repeat as new attempt; compare timestamps, hashes, and diagnostics. |
| Static import from captured inputs | Fully deterministic replay | Reset import-derived downstream outputs and rebuild from immutable refs. |
| Route assembly from persisted acquisition | Deterministic replay with external input refs | Use persisted page acquisition refs; live rediscovery is a new attempt. |
| Runtime artifact build and integrity check | Fully deterministic replay | Rebuild artifact, verify hash/integrity, never overwrite prior artifact. |
| Preview generation/smoke from artifacts | Fully deterministic replay | Regenerate from version/artifact/content refs; stale previews are superseded. |
| Review/content/domain/client actions | Manual retry only | New human/external action and audit record. |
| Approval | Not replayable | New approval decision must be requested if expired/rejected/superseded. |
| Publish activation | Not replayable | New approved publish request after root cause; no blind retry. |
| Rollback | Not replayable | Recovery action with target refs and approval, followed by verification. |
| AI/provider advisory output | Future replay candidate | Re-run only as a new advisory bundle; never overwrite prior bundle or mutate runtime. |
| Provider execution/live DNS/billing/autonomous AI/regeneration | Forbidden replay | Block in BMF MVP and escalate. |

## Recovery Evidence Requirements

Every recovery record must include:

- Failure code, severity, and subject refs.
- Actor/system actor and owner role.
- Failed stage/action and previous state.
- Retry/replay/manual-action classification.
- Immutable input refs used for replay, when applicable.
- New output refs, hashes, byte sizes, content types, and diagnostics when applicable.
- Human approval/exception refs.
- Verification result and remaining limitations.
- Batch/site state transition produced by recovery.
- Timestamp and correlation id.

## Stop, Continue, Pause, And Escalation Defaults

- Low: continue batch, record warning, no launch blocker unless reviewer marks visible.
- Medium: continue unrelated items, block affected milestone, assign owner.
- High: block affected site; continue batch only if isolated and approved policy allows.
- Critical: pause batch, publish wave, or affected cohort by default.
- Unknown repeated failures are high until classified.
- Audit persistence failures are critical because source-of-truth reconstruction is at risk.

## Explicit Non-Replay Statements

- Human approvals are not replayed.
- Publish activation is not blindly replayed.
- Rollback is a recovery action, not a deterministic replay.
- External DNS/provider checks may be repeated but not replayed as proof of past truth.
- AI/provider outputs may be re-run only as new advisory bundles and must not overwrite previous bundles.
