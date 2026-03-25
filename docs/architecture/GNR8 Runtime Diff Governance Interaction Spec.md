# GNR8 Runtime Diff Governance Interaction Spec

Status: DRAFT  
Owner: GNR8 Core Architecture  
Scope: Defines how Runtime, Diff Engine, and Governance Engine interact during migration serving, mutation execution, validation, and staged rollout  

Depends On:
- GNR8 Runtime Engine Spec
- GNR8 Migration Runtime Serving Spec
- GNR8 Migration Runtime Orchestration Spec
- GNR8 Diff Engine Spec
- GNR8 Migration Diff Engine Deep Spec
- GNR8 Governance Engine Spec
- GNR8 Migration Governance Spec
- GNR8 Mutation Engine Spec
- GNR8 Proposal Artifact Spec

---

## 1. Purpose

This document defines the interaction contract between:

- Runtime Engine
- Diff Engine
- Governance Engine

These three systems form the core operational triangle of GNR8:

- Runtime = executes reality
- Diff = evaluates change
- Governance = authorizes action

The goal of this spec is to ensure that:

- Runtime may trigger Diff when needed
- Diff results are deterministic and explainable
- Governance remains the final authority
- no layer silently overrides another
- runtime autonomy remains bounded and safe

---

## 2. Core Principle

Runtime may trigger Diff,
but Runtime may never interpret Diff autonomously beyond explicitly allowed boundaries.

Governance remains the authority layer.

This means:

- Runtime can request validation
- Diff can compute evidence
- Governance decides what is allowed next

Correct order:

Runtime Event
→ Diff Evaluation
→ Governance Decision
→ Runtime Action

Never:

Runtime Event
→ Diff Evaluation
→ Runtime decides policy

---

## 3. Why Controlled Runtime Diff Exists

Pre-runtime diff alone is not enough.

GNR8 must support situations where:

- approved mutation is materialized and needs post-materialization validation
- shadow runtime exposes structural degradation not visible pre-serve
- canary runtime detects real interaction drift
- asset resolution causes runtime-visible mismatch
- rollback needs evidence after live runtime behavior

Therefore:

Runtime-triggered Diff is allowed,
but only as a bounded validation mechanism.

---

## 4. System Roles

### 4.1 Runtime Engine
Responsible for:
- materialization
- serving
- mutation execution
- stage-aware runtime behavior
- telemetry emission

Runtime may:
- request diff
- surface diff results
- pause execution pending governance

Runtime may not:
- self-authorize rollout
- self-authorize production mutation
- downgrade governance decisions

### 4.2 Diff Engine
Responsible for:
- structural comparison
- semantic comparison
- interaction comparison
- runtime validation diff
- confidence delta analysis

Diff may:
- produce evidence
- produce risk score
- produce confidence score
- produce mismatch classes

Diff may not:
- approve rollout
- block rollout directly
- mutate runtime state

### 4.3 Governance Engine
Responsible for:
- evaluating diff evidence
- authorizing or denying next action
- deciding review-only / allow / deny
- triggering rollback eligibility
- deciding staged rollout permissions

Governance is the only layer allowed to:
- authorize continuation
- authorize rollback
- authorize canary/prod progression

---

## 5. Interaction Modes

Runtime ↔ Diff ↔ Governance interactions occur in 5 modes:

1. PRE-DEPLOY VALIDATION
2. POST-MATERIALIZATION VALIDATION
3. SHADOW VALIDATION
4. CANARY VALIDATION
5. MUTATION EXECUTION VALIDATION

Each mode has different strictness.

---

## 6. Mode 1 — Pre-Deploy Validation

Purpose:
Validate candidate artifact before shadow/canary/production exposure.

Flow:
1. Artifact candidate exists
2. Runtime requests pre-deploy diff validation
3. Diff compares baseline vs candidate
4. Governance evaluates result
5. Runtime receives decision

Allowed outcomes:
- ALLOW_SHADOW
- REVIEW_ONLY
- DENY

Runtime behavior:
- must not proceed if DENY
- may proceed only according to governance stage decision

---

## 7. Mode 2 — Post-Materialization Validation

Purpose:
Validate what runtime actually materialized, not just what canonical planned.

This is critical because:
- rendering/materialization bugs
- asset fallback behavior
- section loss after materialization
- unexpected runtime degradation

Flow:
1. Runtime materializes candidate
2. Runtime emits render trace
3. Runtime requests post-materialization diff
4. Diff compares intended artifact vs materialized runtime output
5. Governance evaluates discrepancy

Possible mismatch classes:
- MATERIALIZATION_DRIFT
- ASSET_RENDER_DEGRADATION
- STRUCTURAL_LOSS_AT_RUNTIME
- ROUTE_RESOLUTION_DRIFT

Runtime behavior:
- may pause rollout progression
- may remain in shadow
- may require operator review

---

## 8. Mode 3 — Shadow Validation

Purpose:
Use real shadow runtime as validation surface.

Flow:
1. Shadow runtime serves artifact
2. Runtime captures shadow validation telemetry
3. Runtime triggers diff against expected artifact/canonical
4. Diff emits mismatch + risk
5. Governance decides:
   - remain shadow
   - allow canary
   - require review
   - rollback shadow binding

This is one of the highest-value uses of runtime-triggered diff.

---

## 9. Mode 4 — Canary Validation

Purpose:
Validate limited real-world exposure safely.

Flow:
1. Canary receives traffic
2. Runtime emits behavioral + structural telemetry
3. Runtime triggers canary diff checks
4. Diff evaluates:
   - structural drift
   - asset integrity
   - interaction degradation
   - conversion path breakage (future)
5. Governance decides:
   - continue canary
   - stop canary
   - rollback to previous artifact
   - approve production candidate

Runtime must not self-promote from canary to production.

---

## 10. Mode 5 — Mutation Execution Validation

Purpose:
Validate AI-approved mutation after actual runtime execution.

Flow:
1. Proposal approved
2. Mutation Engine applies mutation
3. Runtime materializes mutated candidate
4. Runtime triggers diff against pre-mutation baseline
5. Governance determines:
   - safe preview only
   - shadow eligible
   - canary eligible
   - denied / rollback

This is the bridge to Semi Autonomous Optimizer.

---

## 11. Runtime Diff Trigger Rules

Runtime may trigger Diff only for these event classes:

- ARTIFACT_BUILT
- ARTIFACT_BOUND_TO_SHADOW
- SHADOW_VALIDATION_REQUESTED
- CANARY_TRAFFIC_VALIDATION_WINDOW
- MUTATION_MATERIALIZED
- ROLLBACK_EVALUATION_REQUESTED
- STRUCTURAL_ANOMALY_AT_RUNTIME
- ASSET_INTEGRITY_DRIFT_DETECTED

Runtime must not trigger Diff continuously without bounded policy.

---

## 12. Diff Trigger Policy

Every runtime-triggered diff must specify:

```txt
RuntimeDiffRequest {
  requestId
  traceId
  triggerType
  targetStage
  baselineRef
  candidateRef
  runtimeEvidenceRefs[]
  urgency
}

triggerType examples:
	•	PRE_DEPLOY
	•	POST_MATERIALIZATION
	•	SHADOW_VERIFY
	•	CANARY_VERIFY
	•	MUTATION_VERIFY
	•	ROLLBACK_VERIFY

This keeps runtime-triggered diff deterministic.

⸻

13. Diff Response Contract

Diff must return:

RuntimeDiffResult {
  diffId
  triggerType
  mismatchClasses[]
  riskScore
  confidenceScore
  affectedRegions[]
  recommendedGovernanceAction
  explainabilityBundle
}

Important:
recommendedGovernanceAction is advisory.

Runtime may not execute it directly without governance response.

⸻

14. Governance Response Contract

Governance consumes RuntimeDiffResult and returns:

GovernanceRuntimeDecision {
  decisionId
  basedOnDiffId
  action
  rolloutState
  operatorReviewRequired
  rollbackSuggested
  blockingReasons[]
  explainabilityBundle
}

action values:
	•	CONTINUE
	•	PAUSE_FOR_REVIEW
	•	REMAIN_SHADOW
	•	ALLOW_CANARY
	•	DENY_CANARY
	•	ALLOW_PRODUCTION_CANDIDATE
	•	DENY_PRODUCTION
	•	ROLLBACK
	•	REBUILD_REQUIRED

Runtime must obey this contract.

⸻

15. Hard Authority Rules

Runtime may:
	•	detect
	•	request validation
	•	pause local progression if safety threshold exceeded

Diff may:
	•	analyze
	•	score
	•	classify mismatches
	•	recommend action

Governance may:
	•	authorize
	•	deny
	•	pause
	•	require review
	•	trigger rollback

Only Governance has authority to change rollout eligibility.

⸻

16. Runtime Local Safety Pause

Controlled exception:

Runtime may enter TEMPORARY_LOCAL_PAUSE before governance returns
if a critical runtime safety signal is detected.

Examples:
	•	artifact path map corrupted
	•	severe structural render loss
	•	asset map serving HTML as image
	•	host binding inconsistency

TEMPORARY_LOCAL_PAUSE is not a policy decision.
It is a safety interlock.

After pause:
	•	Diff runs
	•	Governance decides

⸻

17. Stage-Specific Strictness

Shadow

Runtime-triggered diff is permissive and diagnostic-heavy.
Governance may keep system in shadow.

Canary

Runtime-triggered diff is stricter.
Governance may deny progression or roll back.

Production

Runtime-triggered diff is not used to auto-experiment.
It is used for:
	•	anomaly detection
	•	rollback qualification
	•	post-change verification

Production remains hard-governed.

⸻

18. Real-Time vs Windowed Diff

Runtime-triggered diff can operate in two modes:

Real-Time Critical Diff

Used only for:
	•	severe runtime anomalies
	•	integrity failures
	•	rollback triggers

Windowed Validation Diff

Used for:
	•	scheduled canary checks
	•	shadow validation windows
	•	post-mutation validation windows

Default should prefer windowed validation over constant real-time diff.

⸻

19. Observability Requirements

Every Runtime ↔ Diff ↔ Governance interaction must emit:
	•	RuntimeDiffRequest
	•	RuntimeDiffResult
	•	GovernanceRuntimeDecision
	•	rollout stage at decision time
	•	triggering anomaly if any
	•	operator override if any

This interaction must be fully traceable.

⸻

20. Operator UX Requirements

Operator must be able to see:
	•	why runtime requested diff
	•	what diff found
	•	why governance allowed/denied progression
	•	whether rollback was suggested
	•	which regions were affected

This is mandatory for trust.

⸻

21. Rollback Interaction

Rollback may be triggered when:
	•	runtime detects critical anomaly
	•	diff validates severe mismatch
	•	governance authorizes rollback

Rollback must never be:
	•	diff-only
	•	runtime-only

Rollback requires governance decision.

⸻

22. Relationship to Semi Autonomous Optimizer

This interaction model is what makes Semi Autonomous Optimizer safe.

Flow:
Proposal
→ Mutation
→ Runtime materialization
→ Runtime-triggered diff
→ Governance decision
→ staged rollout

Without this interaction layer,
optimizer would be unsafe.

⸻

23. Anti-Patterns (Forbidden)

Forbidden patterns:
	•	Runtime directly approving canary/prod after diff
	•	Diff directly blocking runtime without governance
	•	Runtime silently ignoring severe diff result
	•	Governance acting without evidence reference
	•	continuous uncontrolled live diff loops
	•	production mutation auto-promotion

These break trust.

⸻

24. Founder Directive

Runtime-triggered diff is powerful,
but only if bounded by governance.

Runtime may see reality.
Diff may explain reality.
Governance must decide reality.

That separation is what makes GNR8 safe enough to evolve from:
migration engine
into
trusted semi-autonomous web evolution system.