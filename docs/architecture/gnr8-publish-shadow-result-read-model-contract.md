# GNR8 Publish Shadow Result Read Model Contract

PASR-3 contract for a future operator-visible read model over publish activation shadow gate results.

This document is documentation-only. It does not create tables, routes, schemas, server actions, UI components, migrations, workers, queues, provider calls, DDOM snapshots, approvals, enforcement, publish response changes, or runtime behavior.

## Contract Summary

The publish shadow result read model is a derived projection. It is not source truth. It must not block publish, create approvals, create DDOM snapshots, mutate source records, mutate runtime state, or alter publish behavior.

The read model exists to assemble operator diagnostics from canonical sources and PASR/AAF shadow observation artifacts.

## Canonical Inputs

The read model may derive from these canonical inputs:

| Input | Canonical owner | Notes |
| --- | --- | --- |
| Runtime site version | `gnr8_runtime_site_versions` | Source truth for candidate version identity and lifecycle. |
| Runtime artifact | `gnr8_runtime_artifacts` | Source truth for candidate artifact id, bundle hash, publish stage, and governance fields. |
| Active pointer | `gnr8_runtime_active_pointers` | Source truth for current public serving pointer. |
| Publish target | `gnr8_publish_targets` | Source truth for intended target policy/config. |
| DDOM readiness snapshot | `gnr8_ddom_readiness_snapshots` and refs | Append-only source truth for already-captured domain readiness. PASR must not create this. |
| Content override published state | `gnr8_content_overrides` aggregate for published rows | Source truth for published override state. |
| AAF evidence package | AAF evidence package/source-ref/freshness/item tables | Immutable evidence package and refs created by shadow observation when enabled. |
| AAF gate attempt and audit event | AAF action gate/policy/audit tables | Dry-run gate evidence and audit refs. |
| AAF approvals | AAF approval request/decision/revocation/supersession timeline | Source truth for launch signoff and publish activation approval, by exact scope. |
| Publish attempt context | Current or future durable publish attempt/audit refs | If no durable attempt id exists, use site/siteVersion/artifact/correlation/idempotency refs. |
| PASR-2 shadow result fields | Future persisted/result metadata or reconstructable AAF/PASR fields | Must remain shadow-only and derived. |

Command Center and Ops Inbox are not canonical inputs except as navigation context. Logs may support diagnostics but should not become the only source truth for operator decisions when AAF/source refs exist.

## Non-Canonical Projections

The following may consume the read model but must not become source truth:

- Command Center status rows;
- Command Center publish readiness sections;
- Ops Inbox work items;
- evidence drilldown summaries;
- audit timeline visualizations;
- internal dashboards;
- publish route internal metadata if later approved.

## Required Envelope Fields

| Field | Requirement |
| --- | --- |
| `readModelVersion` | Versioned contract id, for example `pasr-3-shadow-result-read-model:v1`. |
| `generatedAt` | Server timestamp for projection generation. |
| `projectionFreshness` | `fresh`, `stale`, `partial`, or `unavailable`. |
| `projectionLimitations` | Stable limitation codes for missing/partial reconstruction. |
| `roleVisibility` | Visibility classification for the requesting role. |
| `shadowStatus` | One PASR-3 status vocabulary value. |
| `severity` | `low`, `medium`, `high`, or `critical`. |
| `shadowOnly` | Required `true` when a result exists. |
| `enforcementApplied` | Required `false`. |
| `publishActionBlocked` | Required `false`. |
| `operatorLabel` | Short label that includes shadow-only/non-blocking language. |
| `recommendedNextAction` | Stable recommendation object or `none`. |

## Required Identity Fields

| Field | Requirement |
| --- | --- |
| `tenantId` | Required when known; unavailable must be explicit. |
| `clientId` | Nullable, with limitation when missing under client-scoped workflows. |
| `siteId` | Required. |
| `siteVersionId` | Required. |
| `runtimeArtifactId` | Required when publish reached artifact availability. |
| `publishAttemptRef` | Required when a durable attempt exists; otherwise null with correlation fallback. |
| `intendedPublishTarget` | Required when observer input/result exists. |
| `intendedPublishStage` | Required when observer input/result exists. |
| `trustedPublishEnvironment` | Required when available. |
| `actorType` | Optional display field by role. |
| `actorId` | Optional and role-redacted. |
| `actorRole` | Optional display field. |

## Required Status Fields

| Field | Requirement |
| --- | --- |
| `shadowEnabledState` | `enabled`, `disabled`, `unknown`, or `unavailable`. |
| `sourceReadStatus` | PASR-2 source read status plus warnings and limitations. |
| `evidenceBuildStatus` | PASR-2 evidence build status plus evidence package id. |
| `gateDryRunStatus` | PASR-2 gate dry-run status plus gate result, attempt id, audit id, blockers, stale reasons. |
| `readinessResult` | `ready`, `not_ready`, or `unavailable`. |
| `missingSourceTruth` | Stable source keys and limitation codes. |
| `staleSourceTruth` | Stable source keys and stale reasons. |
| `failureReason` | Stable failure reason, redacted by role. |

## Freshness Fields

| Field | Requirement |
| --- | --- |
| `sourceWatermarks` | Per source current/evidence watermark values. |
| `sourceFreshness` | Per source freshness label. |
| `generatedAt` | Projection generation time. |
| `sourceReaderCapturedAt` | PASR source transaction time when available. |
| `evidenceCreatedAt` | AAF evidence package creation time when available. |
| `gateEvaluatedAt` | Gate attempt/audit event time when available. |
| `ddomCapturedAt` | DDOM snapshot capture time when available. |
| `ddomFreshUntil` | DDOM freshness expiry when available. |
| `approvalExpiresAt` | Publish activation approval expiry when present. |
| `staleReasons` | Consolidated stale reasons. |

Stale display rule: if any required source family is stale or source/evidence watermarks mismatch, show a stale or not-ready shadow status even when older evidence looked ready.

## Severity Fields

Severity should be derived conservatively:

| Condition | Severity |
| --- | --- |
| Shadow disabled by config | low |
| No observation available because publish did not reach shadow boundary | low or medium |
| Missing scope/result reconstruction | medium |
| Source reader unavailable | high when repeated or publish-adjacent |
| Evidence builder unavailable | high |
| Gate dry-run unavailable or failed | high |
| Missing/stale DDOM snapshot | high for future enforcement readiness |
| Missing/stale publish target | high |
| Missing/stale/wrong-scope publish activation approval | high |
| Complete ready result | low |
| Ready with warnings | medium |

`critical` is reserved for future implementation when shadow surfacing detects source-of-truth confidence failures across many sites, repeated AAF persistence failure, or a live enforcement readiness rollout blocker. PASR-3 shadow results still do not block current publish.

## Evidence Refs

Required object:

```json
{
  "evidencePackageId": "uuid-or-null",
  "gateAttemptId": "uuid-or-null",
  "auditEventId": "uuid-or-null",
  "approvalRequestId": "uuid-or-null",
  "approvalDecisionId": "uuid-or-null",
  "ddomSnapshotRef": "string-or-null",
  "publishTargetRef": "string-or-null"
}
```

Missing evidence refs must be explicit. Do not fabricate refs from UI state.

## Source Refs

The read model must expose source ref summaries for:

- `siteVersion`
- `runtimeArtifact`
- `activePointer`
- `publishTarget`
- `domainReadiness`
- `contentOverridePublishedState`
- `launchSignoff`
- `publishActivationApproval`

Each source ref summary should include:

- `sourceSystem`
- `sourceTable`
- `sourceRecordId`
- `sourceRef`
- `sourceVersion`
- `currentWatermark`
- `evidenceWatermark`
- `freshness`
- `staleReason`
- `limitations`

## Correlation And Idempotency

Required fields:

- `correlationId`
- `causationId` when available
- `requestId` when available
- `idempotencyKey`
- `shadowEvaluationId`
- `evidenceIdempotencyKey`
- `gateDryRunIdempotencyKey`
- `publishAttemptRef` when available

If there is no durable publish attempt id, the read model must state that correlation/idempotency refs are the current linkage.

## Gate Dry-Run Result

Required fields:

- `dryRunOnly: true`
- `actionKey: publish.activation`
- `scope: publish_activation`
- `subjectType: site_version`
- `subjectId`
- `gateResult`
- `policyResult`
- `approvalDecisionId`
- `blockedReasons`
- `staleEvidenceReasons`
- `missingSourceWatermarks`
- `warnings`

Gate dry-run results are not enforcement and do not block current publish.

## Limitation List

The read model must carry a stable limitation list. Include all applicable:

- `shadow_only_publish_result_not_modified`
- `publish_action_not_blocked_by_shadow_gate`
- `derived_read_model_not_source_truth`
- `command_center_ops_inbox_derived_only`
- `ddom_readiness_not_publish_activation_approval`
- `pasr_must_not_create_ddom_snapshots`
- `missing_ddom_snapshot`
- `stale_ddom_snapshot`
- `missing_publish_target`
- `missing_publish_activation_approval`
- `approval_wrong_scope`
- `source_reader_unavailable`
- `evidence_builder_unavailable`
- `gate_dry_run_unavailable`
- `partial_aaf_approval_timeline`
- `source_watermark_mismatch`

## Recommended Next Operator Action

Use a structured action:

| Field | Requirement |
| --- | --- |
| `actionKey` | Stable action key such as `review_evidence`, `run_ddom_manual_trigger_outside_pasr`, `request_publish_activation_approval`, `repair_publish_target_source_truth`, `investigate_source_reader`, `investigate_aaf_gate`, or `none`. |
| `ownerRole` | Recommended primary owner role. |
| `reason` | Stable reason code. |
| `safeNow` | Whether action is safe in shadow-only phase. |
| `blocksCurrentPublish` | Always `false` for shadow-only result. |
| `blocksFutureEnforcementReadiness` | Boolean derived from condition. |
| `requiredRefs` | Evidence/source refs needed before action. |

## Role Visibility

| Field family | Superadmin | Technical operator | Agency admin | Migration/account roles | Client reviewer |
| --- | --- | --- | --- | --- | --- |
| Status/severity/next action | Full | Full | Full site-scoped | Limited | Hidden in MVP |
| Evidence refs | Full | Full | Site-scoped | Limited | Hidden |
| Source refs/watermarks | Full | Full | Summary | Summary or hidden | Hidden |
| Correlation/idempotency ids | Full | Full | Limited | Hidden unless needed | Hidden |
| Raw failure reason | Full | Redacted as needed | Redacted | Hidden/summary | Hidden |

## Empty State Behavior

| Empty state | Display |
| --- | --- |
| Shadow feature disabled | `shadow_not_enabled`; no observation expected. |
| Publish never reached shadow boundary | `shadow_not_available`; explain no publish activation shadow observation exists for this candidate. |
| No AAF evidence/gate refs found | `shadow_not_available`; recommend waiting for read-model implementation or checking logs if flag was expected to run. |
| No durable publish attempt id exists | Show correlation/idempotency linkage and note durable attempt id is unavailable. |

## Error State Behavior

| Error | Display |
| --- | --- |
| Source read unavailable | `shadow_not_available` or `shadow_evaluation_failed`; recommend source-reader investigation. |
| Evidence build failed | `shadow_evaluation_failed`; evidence package unavailable; gate not attempted. |
| Gate dry-run failed | `shadow_evaluation_failed`; evidence may exist; gate unavailable/fail-closed dry-run result. |
| Read model reconstruction partial | Show `projectionFreshness: partial`; disable side-effect recommendations. |
| Source ref conflict | Show `shadow_evaluation_failed`; require manual review of conflicting refs. |

## Status Vocabulary

| Status | Meaning | Severity | Publish blocked by shadow | Future enforcement likely blocks | Recommended operator action | Required evidence links |
| --- | --- | --- | --- | --- | --- | --- |
| `shadow_not_enabled` | Feature flag disabled or not configured for this publish. | low | no | no | None unless shadow rollout expected. | None. |
| `shadow_not_available` | No usable shadow result exists or scope/result reconstruction is unavailable. | medium | no | unknown | Check feature flag, scope resolution, logs, or read-model reconstruction. | Correlation/publish attempt refs when available. |
| `shadow_ready` | Source read, evidence build, and gate dry-run completed with ready/allowed semantics and no material warnings. | low | no | no, assuming refs remain fresh and approval is valid | Review evidence for trend and enforcement preparation. | Evidence package, gate attempt, audit event, source refs. |
| `shadow_ready_with_warnings` | Dry-run is otherwise ready but warnings/limitations remain. | medium | no | maybe | Review limitations and decide whether they must be resolved before enforcement. | Evidence package, gate attempt, source refs, warning refs. |
| `shadow_missing_source_truth` | Required PASR source truth other than specific DDOM/target/approval categories is missing. | high | no | yes | Repair canonical source state or source-reader coverage. | Missing source key refs, evidence package if built. |
| `shadow_stale_source_truth` | Required PASR source truth or watermarks are stale/mismatched. | high | no | yes | Refresh source-owned state or rebuild evidence after canonical state settles. | Source refs, watermarks, stale reasons. |
| `shadow_missing_ddom_snapshot` | No existing DDOM readiness snapshot was available for domain readiness. | high | no | yes | Run the DDOM manual trigger outside PASR when operator policy allows. | Site/version/domain refs, missing `domainReadiness`, correlation id. |
| `shadow_stale_ddom_snapshot` | Existing DDOM readiness snapshot is stale. | high | no | yes | Refresh DDOM snapshot outside PASR and re-observe later. | DDOM snapshot ref, freshUntil/stale reason, source refs. |
| `shadow_missing_publish_target` | Intended publish target source truth is missing. | high | no | yes | Repair or seed canonical publish target source truth through approved admin workflow. | Intended target, publish target source ref placeholder. |
| `shadow_missing_publish_activation_approval` | No valid scoped AAF publish activation approval was found. | high | no | yes | Request/review publish activation approval with current evidence. | Evidence package, approval request/decision refs if any, gate attempt. |
| `shadow_gate_not_ready` | Gate dry-run completed but returned not-ready/blocked/approval-required/stale semantics. | high | no | yes | Review blocked reasons and resolve source/approval/readiness gaps. | Gate attempt, audit event, evidence package, blocked reason refs. |
| `shadow_evaluation_failed` | Source read, evidence build, gate dry-run, or read-model reconstruction failed. | high | no | yes until understood | Investigate failing subsystem; do not use result for enforcement readiness. | Failure reason, correlation id, evidence refs if available. |

## Explicit Prohibitions

The read model must not:

- be used as source truth;
- block publish;
- create approvals;
- create DDOM snapshots;
- mutate source records;
- call providers;
- change active pointers;
- change rollback behavior;
- change publish response contracts;
- close Ops Inbox items by itself;
- mark Command Center status as canonical;
- infer publish activation approval from DDOM readiness, launch signoff, client review, AI output, external workflow text, or UI state.

## Implementation Readiness

Implementation may begin after PASR-3 acceptance, but only for the read-only read model/repository milestone. Enforcement, broad UI, Ops Inbox work items, DDOM trigger wiring, and publish API metadata should remain deferred.
