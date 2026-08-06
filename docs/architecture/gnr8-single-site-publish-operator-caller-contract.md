# GNR8 Single-Site Publish Operator Caller Contract

Phase: MVP-53
Scope: Documentation and architecture only.

This contract defines the future request and result shape for the first internal operator caller that may invoke the MVP-52 single-site publish wrapper. It does not implement a route, server action, UI, wrapper wiring, publish behavior, blocking enforcement, AAF writes, provider calls, billing/domain execution, Command Center actions, Ops Inbox actions, or client portal exposure.

## Contract Name And Version

Recommended future caller contract:

- contract name: `SingleSitePublishOperatorCallerRequest`
- contract version: `mvp-53-single-site-publish-operator-caller:v1`
- intended caller surface: internal Command Center operator action
- intended implementation form: internal admin-namespace route in MVP-54
- intended callee: MVP-52 `publishSingleSiteApprovedCandidateShadow(...)`
- first mode: dry-run only
- later mode: shadow-publish only behind explicit flag

## Required Input Contract

The future caller must require every field below. Missing values fail before the wrapper is called.

| Field | Rule |
| --- | --- |
| `tenantId` | Exact tenant/agency identity from single-site state/source truth. |
| `clientId` | Exact client identity. |
| `siteId` | Exact runtime/single-site site identity. |
| `migrationId` | Exact single-site migration id. |
| `candidateSiteVersionRef` | Exact candidate site version ref or id. |
| `runtimeArtifactRef` | Exact runtime artifact ref or id expected for activation. |
| `publishStage` | Explicit stage, expected `shadow`, `canary`, or `production`. |
| `publishEnvironment` | Explicit environment, expected `production` for public MVP validation. |
| `expectedLaunchReadinessEvidenceRef` | Exact MVP-40 evidence ref. |
| `expectedPublishActivationRequestRef` | Exact MVP-41 request ref. |
| `expectedPublishActivationDecisionRef` | Exact MVP-42 decision ref. |
| `expectedGateAttemptResultRef` | Exact MVP-44 gate attempt/result ref. |
| `expectedHandoffWatermark` | Exact MVP-43 handoff watermark. |
| `expectedGateInputWatermark` | Exact MVP-44 gate input watermark. |
| `actor` | Actor id, actor type, and actor role from trusted internal auth context. |
| `correlationId` | Explicit stable correlation id. |
| `idempotencyKey` | Explicit stable idempotency key. |
| `mode` | Explicit `dry-run` or `shadow-publish`; MVP-54 allows only `dry-run`. |
| `operatorConfirmation` | Explicit confirmation value proving the operator intended this exact mode and candidate. |

The future implementation may also require `publishTargetRef` even though the mission list did not repeat it; MVP-51/MVP-52 contracts already require publish target identity, so the caller should preserve it as a strict expected ref.

## Request Rules

- Do not infer tenant, client, migration, candidate, artifact, target, approval, gate, handoff, or watermark from UI labels, hostnames, domains, route text, page titles, or Command Center derived status.
- Do not accept a request that omits explicit mode.
- Do not accept `shadow-publish` unless the separate MVP-55 flag is enabled.
- Do not accept broad "publish latest" or "publish active candidate" commands.
- Do not call the wrapper when required refs are missing, stale, mismatched, or outside actor scope.
- Do not create missing refs as a repair step.

## Response/Result Contract

The future caller should return an internal operator-safe result with:

| Field | Purpose |
| --- | --- |
| `ok` | Boolean caller success. |
| `mode` | Echoed explicit mode. |
| `preflightStatus` | Caller-local input/scope/pre-wrapper status. |
| `resolverStatus` | MVP-49 resolver status from wrapper output when available. |
| `wrapperStatus` | MVP-52 wrapper status. |
| `publishOrchestratorStatus` | Present only if MVP-55 shadow-publish calls the existing publish orchestrator. |
| `shadowGuardDiagnostics` | Safe MVP-46/MVP-50 diagnostic summary when available. |
| `blockerCodes` | Stable missing/mismatch/stale/unauthorized/flag-disabled codes. |
| `limitations` | Operator-safe carried limitations and accepted-warning summary. |
| `safeRefs` | Role-safe refs only. |
| `redactions` | Summary of fields intentionally hidden. |
| `correlationId` | Echo for log joining. |
| `idempotencyKey` | Echo or safe digest, depending on role. |
| `runtimeMutation` | `false` for dry-run; wrapper-reported value for later shadow-publish. |
| `publishes` | `false` for dry-run; wrapper-reported value for later shadow-publish. |

The response must not expose raw sensitive AAF/source refs to broad users. It must not be client-facing. It must not include provider secrets, raw SQL errors, raw evidence payloads, raw billing/Stripe data, live DNS details, credential material, or broad actor/idempotency internals.

## Fail-Closed Result Codes

Recommended caller-level blockers:

- `single_site_publish_operator_flag_disabled`
- `single_site_publish_operator_mode_not_allowed`
- `single_site_publish_operator_confirmation_missing`
- `single_site_publish_operator_role_denied`
- `single_site_publish_operator_scope_missing`
- `single_site_publish_operator_scope_mismatch`
- `single_site_publish_operator_required_ref_missing`
- `single_site_publish_operator_candidate_mismatch`
- `single_site_publish_operator_artifact_mismatch`
- `single_site_publish_operator_readiness_evidence_mismatch`
- `single_site_publish_operator_activation_request_mismatch`
- `single_site_publish_operator_activation_decision_mismatch`
- `single_site_publish_operator_gate_result_mismatch`
- `single_site_publish_operator_handoff_watermark_mismatch`
- `single_site_publish_operator_gate_input_watermark_mismatch`
- `single_site_publish_operator_wrapper_preflight_blocked`

## Boundary Statements

This contract does not authorize generic publish route changes, client route changes, Ops Inbox actions, Command Center UI changes, wrapper wiring, blocking enforcement, provider calls, billing/Stripe calls, DDOM snapshots, live DNS calls, PASR calls, AAF writes, gate reevaluation, rollback changes, active pointer changes, or runtime-store changes.
