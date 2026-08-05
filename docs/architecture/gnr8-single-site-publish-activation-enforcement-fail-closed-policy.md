# GNR8 Single-Site Publish Activation Enforcement Fail-Closed Policy

Phase: MVP-45
Scope: Documentation and architecture only.

This policy defines fail-closed behavior for future consumption of MVP-44 gate results. It does not implement enforcement, route wiring, publish execution, runtime mutation, rollback, provider calls, billing/domain execution, UI/API changes, Command Center actions, Ops Inbox actions, or client portal exposure.

## Policy Statement

If the future publish activation enforcement guard cannot prove that the persisted MVP-44 gate result authorizes the exact candidate publish activation, it must block before active pointer mutation.

Absence of proof is a blocker. Operator confidence, Command Center state, Ops Inbox state, PASR shadow status, DDOM readiness alone, billing readiness alone, content approval, launch approval, client approval, AI output, provider output, route parameters, UI labels, and logs are not substitutes for a matching gate result.

## Allow Conditions

Publish activation may continue only when all of these are true:

- persisted gate result exists;
- gate result is `allowed`, or a separately approved canonical success equivalent;
- warnings/limitations are allowed by policy and carried forward;
- tenant/client/site/migration identity matches;
- candidate site version matches;
- runtime artifact matches;
- publish target matches;
- publish stage/environment matches;
- publish activation request and decision refs match;
- MVP-43 handoff watermark matches;
- MVP-44 gate input watermark matches;
- gate attempt freshness is within policy;
- no conflicting newer gate result exists;
- latest AAF approval state is not revoked, superseded, expired, cancelled, rejected, missing, or wrong-scope when rechecked;
- current publish target is not disabled or retired when reread is enabled.

## Blocker Matrix

| Condition | Required behavior | Operator-safe code |
| --- | --- | --- |
| Missing gate result | Block before pointer mutation. | `publish_activation_gate_missing` |
| Gate result blocked | Block before pointer mutation. | `publish_activation_gate_blocked` |
| Gate result error/fail-closed | Block before pointer mutation. | `publish_activation_gate_error` |
| Stale gate result | Block before pointer mutation. | `publish_activation_gate_stale` |
| Missing handoff watermark | Block. | `publish_activation_handoff_watermark_missing` |
| Handoff watermark mismatch | Block. | `publish_activation_handoff_watermark_mismatch` |
| Missing gate input watermark | Block. | `publish_activation_gate_input_watermark_missing` |
| Gate input watermark mismatch | Block. | `publish_activation_gate_input_watermark_mismatch` |
| Wrong tenant/client/site/migration | Block. | `publish_activation_identity_mismatch` |
| Wrong candidate site version | Block. | `publish_activation_candidate_mismatch` |
| Wrong runtime artifact | Block. | `publish_activation_artifact_mismatch` |
| Wrong publish target | Block. | `publish_activation_target_mismatch` |
| Wrong stage/environment | Block. | `publish_activation_stage_mismatch` |
| Policy version mismatch | Block unless explicit compatibility policy exists. | `publish_activation_policy_mismatch` |
| Unsupported evaluator version | Block. | `publish_activation_evaluator_version_unsupported` |
| Warning/limitations not accepted by policy | Block. | `publish_activation_limitations_not_accepted` |
| Approval revoked after gate | Block when rechecked. | `publish_activation_approval_revoked` |
| Approval superseded after gate | Block when rechecked. | `publish_activation_approval_superseded` |
| Approval expired after gate | Block when rechecked. | `publish_activation_approval_expired` |
| Conflicting newer gate result | Block. | `publish_activation_gate_conflict` |
| Publish target disabled/retired after gate | Block when rechecked. | `publish_activation_target_inactive` |
| Read repository failure | Block. | `publish_activation_gate_read_failed` |
| Idempotency semantic drift | Block or raise conflict before mutation. | `publish_activation_gate_idempotency_conflict` |

## Warning And Limited Success Policy

MVP-44 can map `allowed` with carried limitations to wrapper status `warning`. Future enforcement may allow warning/limited success only when:

- canonical gate result is still `allowed`;
- limitations are present, explicit, and safe to carry;
- policy states the limitation category is acceptable for the target/stage;
- the response and audit logs preserve limitation codes;
- no P0/open blocker or stale required source truth is hidden by the limitation.

`granted_with_limitations` must not become a silent full pass. Without carried limitations, it blocks.

## Not-Required-By-Policy

`not_required_by_policy` must fail closed by default for single-site MVP publish activation. A later policy may permit it only if:

- AAF policy evaluation explicitly says approval is not required for this exact scope/action/subject;
- the decision row is `not_required_by_policy`;
- scope, action, subject, evidence, handoff, and gate watermarks match;
- the policy version is current and documented.

## Emergency Bypass

Emergency bypass is off by default. If a later milestone allows it, bypass must:

- require `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_BYPASS=on`;
- require privileged actor role and explicit reason;
- require correlation id and idempotency key;
- emit a bypass audit/log event;
- return a response that says bypass occurred;
- never create an approval decision;
- never rewrite the gate result to `allowed`;
- never suppress diagnostic refs internally.

Bypass is for incident response or operational recovery only, not ordinary publish throughput.

## No Partial Publish

On enforcement failure, future code must not:

- call `switchActivePointer(...)`;
- activate domain bindings as part of the publish response;
- transition the candidate to published because of the blocked request;
- archive other published versions;
- call rollback;
- create DDOM/PASR/provider/billing side effects;
- expose raw evidence/source data to the client portal.

If current code has already performed candidate-preparation writes before the future guard runs, the blocked response must make clear that public activation did not occur. Later architecture may separately move candidate-preparation earlier or require prebuilt artifacts, but MVP-45 only selects the pre-pointer enforcement boundary.

## Repository Failure

Read failures fail closed. A database timeout, transaction error, missing table, malformed row, unsupported vocabulary, JSON parse error, or unavailable read model must be treated as `publish_activation_gate_read_failed`.

Shadow mode may log the same diagnostic without blocking, but must label the result as shadow-only and not a publish authorization.

## Explicit Non-Substitutions

These never satisfy the enforcement policy:

- launch readiness record alone;
- launch readiness evidence package alone;
- publish activation request alone;
- publish activation decision alone;
- PASR shadow ready result;
- DDOM readiness snapshot;
- publish target active status;
- content approval, client approval, launch approval, or implementation authorization;
- Command Center badge, Ops Inbox closure, or client portal status;
- billing/hosting entitlement alone;
- Stripe payment/subscription state alone;
- domain/DNS/operator evidence alone;
- provider, AI, screenshot, preview, or smoke output alone;
- operator chat, notes, or logs alone.

The required artifact is a matching persisted gate result and its current-source checks.
