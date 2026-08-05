# GNR8 Single-Site Publish Activation Enforcement Runtime Contract

Phase: MVP-45
Scope: Documentation and architecture only.

This contract defines the future shape of a read-only guard that consumes the MVP-44 publish activation gate result before a single-site active pointer switch. It does not implement a guard, route wiring, publish execution, runtime mutation, rollback, provider calls, billing/domain execution, UI/API changes, Command Center actions, Ops Inbox actions, or client portal exposure.

## Contract Owner

The future runtime contract should live outside generic runtime primitives. A future MVP-46 guard core may be implemented as a server-only single-site publish activation enforcement module that is called by the publish orchestrator in later milestones.

The contract must not be placed in:

- `switchActivePointer(...)`;
- public runtime rendering;
- rollback switch;
- content publish or content rollback routes;
- generic runtime-store artifact/version helpers;
- Command Center or Ops Inbox view models.

## Required Input

Future enforcement must require:

| Field | Requirement |
| --- | --- |
| `tenantId` | Required tenant/agency scope for the gate result. |
| `clientId` | Required client scope for single-site MVP. |
| `siteId` | Required runtime/ownership site identity. |
| `migrationId` | Required single-site migration identity. |
| `candidateSiteVersionRef` | Required candidate site version id/ref and source watermark. |
| `runtimeArtifactRef` | Required runtime artifact id/ref, bundle/hash watermark, and version linkage. |
| `publishTargetRef` | Required publish target id/ref, environment, stage, policy version, and source watermark. |
| `publishStage` | Required intended publish stage/environment resolved by the orchestrator. |
| `publishActivationDecisionRef` | Required MVP-42 decision ref linked through MVP-43. |
| `gateAttemptResultRef` | Required MVP-44 gate attempt/result ref. |
| `handoffWatermark` | Required MVP-43 semantic handoff watermark. |
| `gateInputWatermark` | Required MVP-44 semantic gate input watermark. |
| `actor` | Required actor id/type/role for audit and bypass policy. |
| `correlationId` | Required correlation id linking publish request and gate consumption. |
| `idempotencyKey` | Required idempotency key for consumption/audit behavior. |
| `requestId` | Optional request id for route/API tracing. |
| `bypass` | Optional emergency bypass request, disabled by default. |

The future route/orchestrator must not infer missing tenant/client/migration/publish-target identity from UI labels or request body text alone. If the exact identity cannot be resolved, the guard blocks.

## Persisted Gate Result Shape

The future guard must consume the persisted MVP-44 output or its canonical AAF rows, including:

- evaluator version;
- gate result;
- policy result;
- gate attempt id;
- policy evaluation id;
- pre-action audit event id;
- approval request id;
- approval decision id;
- evidence package id;
- blocker codes;
- stale evidence reasons;
- limitations;
- source watermarks;
- semantic handoff watermark;
- semantic gate input watermark;
- correlation and idempotency metadata.

The persisted result may be read from the AAF action gate attempt and related AAF rows, from a future read repository over those rows, or from an explicitly designed single-site gate-result read model. MVP-45 does not choose a concrete table beyond requiring that the source be persisted and canonical.

## Allowed Success Conditions

Publish continuation is allowed only when:

- gate result is `allowed`, or an explicitly accepted canonical success equivalent;
- `warning` or `allowed_with_limitations` wrapper status is accepted only when policy explicitly permits it and limitations are carried forward;
- gate result identity matches tenant, client, site, migration, candidate version, artifact, publish target, environment, and stage;
- gate attempt is fresh under the configured TTL/policy;
- gate attempt was created from the current handoff watermark;
- gate attempt was created from the current gate input watermark;
- no newer conflicting gate result exists for the same candidate/target/stage;
- no revoked, superseded, expired, or cancelled approval state is detected when AAF decision state is rechecked;
- optional publish target reread shows the target still active and compatible.

`not_required_by_policy` is not a default success for MVP single-site publish activation. It may be accepted only if a later policy explicitly defines when publish activation approval is not required and persists the policy evaluation chain required by AAF.

## Required Blocked Conditions

The guard must fail closed for:

- missing gate result;
- blocked gate result;
- stale gate result;
- wrong candidate site version;
- wrong runtime artifact;
- wrong publish target;
- wrong publish stage or environment;
- wrong tenant, client, site, or migration;
- missing handoff watermark;
- missing gate input watermark;
- handoff watermark mismatch;
- gate input watermark mismatch;
- policy version mismatch;
- unsupported evaluator version;
- approval revoked, superseded, expired, cancelled, rejected, missing, or wrong-scope after gate evaluation;
- conflicting newer gate result;
- publish target disabled, retired, or stage-incompatible when reread is enabled;
- repository/read failure;
- idempotency semantic drift.

## Output Contract

Future guard output should be one of:

```ts
type PublishActivationGateEnforcementResult =
  | {
      ok: true;
      mode: "disabled" | "shadow" | "enforced";
      decision: "allow";
      blockerCodes: [];
      limitations: unknown[];
      gateAttemptId: string | null;
      correlationId: string;
      idempotencyKey: string;
    }
  | {
      ok: false;
      mode: "shadow" | "enforced";
      decision: "block" | "bypass";
      blockerCodes: string[];
      staleReasons: string[];
      safeMessage: string;
      diagnosticRef: string | null;
      gateAttemptId: string | null;
      correlationId: string;
      idempotencyKey: string;
    };
```

Shadow mode must return diagnostics without blocking the orchestrator. Enforced mode must block before active pointer mutation when `ok: false`.

## Feature Flags

Recommended names:

- `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_ENFORCEMENT`
- `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW`
- `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_BYPASS`

Flag values should support:

- default off;
- shadow/log-only;
- internal single-site migrations only;
- all eligible single-site publishes;
- emergency bypass.

Flags must be read at the guard/orchestrator boundary, not inside `runtime-store.ts` or public runtime rendering.

## Source Reread Policy

The guard consumes persisted MVP-44 gate result and verifies identity, freshness, and watermarks.

Allowed read-only rereads:

- latest AAF request, decision, revocation, supersession, expiry, policy, and gate rows in a read-only transaction;
- current publish target row for active/disabled/retired/stage compatibility;
- current artifact/version metadata already loaded by the orchestrator.

Forbidden rereads or side effects:

- no launch readiness source reader invocation;
- no launch readiness evidence builder invocation;
- no DDOM snapshot creation;
- no DDOM manual trigger/caller invocation;
- no PASR observer/source reader invocation for enforcement;
- no provider, DNS, Vercel, Openprovider, registrar, SSL, Stripe, billing, hosting, or AI calls;
- no AAF request/decision creation;
- no new gate attempt creation unless separately designed as reevaluation.

## Idempotency

The future guard should treat the publish request idempotency key and gate consumption payload as semantic input. Same idempotency key plus same gate/candidate payload may reuse a prior consumption log. Same idempotency key with a different candidate, artifact, target, handoff watermark, gate input watermark, actor, or bypass reason must fail closed or raise an idempotency conflict.

## Observability

Future implementation should emit internal events for:

- `publish_activation_gate_consumed`;
- `publish_activation_gate_shadow_observed`;
- `publish_activation_gate_blocked`;
- `publish_activation_gate_bypassed`.

Events must include safe blocker codes and diagnostic refs. Broad route callers must not receive raw sensitive AAF source refs, provider-sensitive refs, billing-sensitive refs, or credential-sensitive refs.

## No Runtime Behavior In MVP-45

This document defines a future contract only. No TypeScript, JavaScript, SQL, API route, worker, provider, runtime, billing, domain, publish, rollback, Command Center, Ops Inbox, public runtime, or client portal file is changed by MVP-45.
