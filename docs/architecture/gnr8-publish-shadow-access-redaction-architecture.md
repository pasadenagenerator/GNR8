# GNR8 Publish Shadow Access And Redaction Architecture

PASR-5 defines the access-control, role-visibility, scope, and redaction architecture for future operator-visible publish shadow results.

This document is documentation-only. It does not implement UI, APIs, server actions, migrations, read-model changes, Command Center changes, Ops Inbox changes, workers, runtime behavior, publish behavior, rollback behavior, enforcement, DDOM snapshot creation, AAF approval creation, provider calls, DNS/domain calls, billing, Stripe, AI, storage, or authentication/RBAC changes.

## Purpose

PASR-4 created a server-only, read-only publish shadow result read model and repository. That read model can reconstruct operator-facing publish shadow status from existing AAF, DDOM, PTT, and runtime records.

PASR-5 exists because the PASR-4 model carries sensitive evidence, source, audit, approval, actor, domain, diagnostic, correlation, and idempotency fields. Before Command Center, Ops Inbox, API metadata, or any operator UI consumes it, the platform must define who may see which fields and how sensitive fields are redacted.

Redacted read models are still derived projections. They are never source truth. They do not approve publish, do not block publish, do not enforce policy, do not create DDOM snapshots, do not create AAF approvals, and do not mutate source truth.

## Required Boundary Assertions

- Publish shadow results are derived-only.
- Publish shadow results are non-enforcing.
- Publish shadow results do not block publish.
- Command Center and Ops Inbox are derived-only.
- Command Center and Ops Inbox do not become source truth for publish, approval, DDOM, runtime, provider, billing, AI, storage, or audit state.
- DDOM readiness is not publish activation approval.
- Domain readiness is not publish activation approval.
- Launch signoff, client review, content review, domain readiness, AI output, and external workflow text are not publish activation approval.
- PASR must not create DDOM snapshots.
- PASR must not create AAF approvals.
- Client visibility is restricted and deferred for MVP.
- Role-aware redaction must happen before broad UI surfacing.

## PASR-4 Read Model Sensitivity Surface

PASR-4 exposes the following field families.

| Field family | Examples | Sensitivity |
| --- | --- | --- |
| Boundary flags | `derivedOnly`, `shadowOnly`, `enforcementApplied`, `publishActionBlocked`, `createsDdomSnapshot`, `createsApproval`, `mutatesSourceTruth` | Safe and required. Must remain visible wherever a shadow result is shown. |
| Projection envelope | `readModelVersion`, `generatedAt`, `projectionFreshness`, `projectionLimitations`, `roleVisibility` | Mostly safe, but limitations may disclose internal reconstruction details. |
| Operator status | `shadowStatus`, `severity`, `operatorLabel`, `readinessResult`, `recommendedNextAction` | Safe in summarized form for scoped internal roles. Client visibility deferred. |
| Identity and scope | `tenantId`, `clientId`, `siteId`, `siteVersionId`, `runtimeArtifactId`, `publishAttemptRef`, target/stage/environment fields | Site/version refs are scoped internal data. Tenant/client ids and artifact refs must be hidden or summarized for client-safe views unless explicitly approved later. |
| Actor fields | `actorType`, `actorId`, `actorRole` | Actor ids are sensitive. Actor roles may be summarized. |
| Source read/build/gate status | `sourceReadStatus`, `evidenceBuildStatus`, `gateDryRunStatus` | Operator-visible by role. Gate blockers, audit ids, and idempotency keys require redaction. |
| Source truth | `missingSourceTruth`, `staleSourceTruth`, `sourceTruth`, `sourceWatermarks`, `sourceTruthSummary` | Source keys/counts may be summarized. Source tables, record ids, refs, and watermarks are internal diagnostics. |
| DDOM readiness | status, snapshot id/ref, readiness state, blockers, warnings, captured/freshUntil/stale reason | Status and safe summary are operator-visible. Snapshot refs, blockers, host/domain internals, and stale reasons require role redaction. |
| Publish target | target id, environment, stage, policy version, source ref, watermark, limitations | Internal operators may need details. Client-safe views must not expose internal target ids/policy versions in MVP. |
| Approval | launch signoff status, publish activation status, request/decision ids, decision status, scope, expiry, limitations | Status may be summarized. Actor/decision ids and partial timeline details are sensitive. |
| Evidence | package id/status/type/created/freshness/watermark/idempotency/source refs | Evidence ids and source refs are internal. Client visibility forbidden in MVP. |
| Evidence refs | evidence package id, gate attempt id, audit event id, approval ids, DDOM snapshot ref, publish target ref | Internal-only except scoped summary for agency roles. |
| Correlation | correlation id, causation id, request id, idempotency keys, shadow evaluation id, linkage strategy | Technical diagnostics. Hidden from client, account, and most agency roles unless needed for escalation. |
| Failure and diagnostics | `failureReason`, warnings, limitations, blockers, stale evidence reasons, missing watermarks | Must be sanitized. Raw exceptions, table/module names, provider details, and policy internals are internal-only. |
| Empty/error states | empty reason, safe error code/message | Safe message may be visible. Error code granularity depends on role. |

## Data Sensitivity Categories

| Category | Meaning | Default handling |
| --- | --- | --- |
| Public-safe shadow boundary | Non-enforcement and derived-only labels. | Visible wherever shadow status is visible. |
| Client-safe summary candidate | Human summary that avoids internal refs, actors, watermarks, policy internals, provider details, and diagnostics. | Deferred for clients in MVP; may be used internally by account managers. |
| Scoped operator summary | Status, severity, next action, missing/stale category, freshness, and safe limitation labels for a site in actor scope. | Visible to authorized internal roles. |
| Internal evidence refs | AAF evidence package ids, gate attempts, audit ids, approval refs, source refs. | Internal-only; role-gated. |
| Technical diagnostics | source tables, record ids, watermarks, blockers, failure reason, idempotency, correlation, dry-run internals. | Technical/operator/superadmin only. |
| Provider/domain-sensitive evidence | host, domain, provider-shaped snapshots, DNS instruction refs, external state limitations. | Technical/operator/superadmin only; summarize for account managers. |
| Security/audit-sensitive data | actor ids, request ids, idempotency keys, partial audit timelines, policy/evaluator diagnostics. | Superadmin/support/debug/technical only with scope. |
| Forbidden MVP client data | raw evidence refs, source refs, audit refs, approval actor details, provider details, internal diagnostics. | Never shown to clients in MVP. |

## Default Visibility Posture

Default deny. A field is hidden unless all are true:

1. The actor is authenticated.
2. The actor role maps to an allowed publish-shadow visibility role.
3. The actor scope covers the tenant/client/site/version being requested.
4. The field family is allowed for that role and scope.
5. The field is redacted to the least detail needed for the role's workflow.
6. The resulting view preserves derived-only, non-enforcement, and source-of-truth boundaries.

The default redacted result for any non-superadmin role should prefer summarized or hidden data over detailed refs. The default result for client roles in MVP is no publish shadow diagnostic visibility.

## Role-Based Access Principles

- Platform superadmins may see full cross-tenant diagnostics for operational governance and incident/debug work.
- Agency admins may see agency-scoped summaries and selected refs needed for accountability, but not raw technical diagnostics by default.
- Agency operators may see site-scoped operational status and next action, with limited evidence links only when required for assigned work.
- Technical operators may see site-scoped technical diagnostics needed for DDOM, publish target, source-reader, and gate triage.
- Account managers may see client/site-safe internal summaries for follow-up and approval routing, but not raw AAF/source/audit/correlation details.
- Client reviewers have no PASR shadow diagnostic visibility in MVP. Later client-safe summaries require separate product/security approval.
- Read-only auditors may see append-only evidence/audit refs for scoped audit review, but not provider payloads, actor identifiers beyond policy, or idempotency secrets unless separately authorized.
- Support/debug operators may see technical diagnostics only under scoped support authorization and should be audited in future implementation.
- Future AI operators may consume only redacted summaries and structured limitation/action categories; they must not receive raw refs or secrets unless a later AI evidence policy approves it.

## Tenant, Client, And Site Scoping

Read access must resolve the strongest available scope before redaction:

| Scope dimension | Rule |
| --- | --- |
| Tenant | Required for cross-client/operator views when known. Mismatch denies. |
| Agency | Required for agency-admin/operator/account-manager views when ownership exists. Mismatch denies. |
| Client | Required for account/client-scoped views. Mismatch denies. Null client is platform/internal only. |
| Site | Required for all publish shadow reads. Actor must be authorized for the site. |
| Site version | Required for PASR-4 read model identity. Actor must have access to the owning site. |
| Runtime artifact | Internal diagnostic ref. Do not use artifact id alone for authorization. |
| Publish attempt/correlation | Diagnostic linkage only. Do not use it to bypass site/client scope. |

Failure to resolve scope must fail closed. A future transformer may return a safe authorization failure envelope, but it must not reveal whether an out-of-scope evidence package, approval, or DDOM snapshot exists.

## Safe Summary Versus Detailed Diagnostics

Safe summaries answer:

- Is a shadow result available for this scoped site/version?
- What is the overall shadow status and severity?
- What safe next action category is suggested?
- Is DDOM missing/stale/present without treating it as approval?
- Is publish activation approval missing/present without exposing approver details?
- Is source truth missing/stale/unavailable at a high level?
- Was publish blocked by shadow? Always no.

Detailed diagnostics answer:

- Which source rows, watermarks, and evidence refs were used?
- Which AAF gate/policy/audit rows are linked?
- Which DDOM snapshot ref and blockers were used?
- Which publish target policy and source ref were evaluated?
- Which correlation/idempotency values join the timeline?
- Which technical failure reason or partial timeline marker explains reconstruction?

Detailed diagnostics are internal-only and role-gated.

## Field-Level Visibility Rules

| Field family | Operator-visible baseline | Higher detail allowed | Internal-only |
| --- | --- | --- | --- |
| Overall status/severity | Scoped internal roles may see full status and severity. | Superadmin/technical/support see full status vocabulary. | None, but clients hidden in MVP. |
| Recommended next action | Show safe action category and owner role. | Technical roles may see required refs. | Raw diagnostic reasons if they reveal internals. |
| Site/version/artifact refs | Show site and version where actor has scope. | Technical/superadmin may see runtime artifact id. | Artifact internals and active pointer ids for non-technical roles. |
| Source truth | Show missing/stale source family names and counts. | Technical/superadmin may see source table, record id, ref, watermarks. | Source reader internals and raw metadata. |
| DDOM | Show readiness status, stale/missing summary, captured/freshUntil when role needs it. | Technical/superadmin may see snapshot ref, blockers, warnings, stale reason. | Host/provider payload detail. |
| Publish target | Show missing/present target summary. | Technical/superadmin may see target id, environment, stage, policy version, source ref. | Policy internals beyond version/ref. |
| Approval | Show publish activation approval status and scope summary. | Superadmin/auditor/technical may see request/decision refs and expiry. | Actor ids, revocation/supersession payloads for most roles. |
| Evidence refs | Hide by default. | Superadmin/technical/auditor may see refs. Agency admin may see limited links if source-owned drilldown is separately authorized. | Raw payloads and item-level evidence not redacted. |
| Audit refs | Hide by default. | Superadmin/auditor/support/technical may see event ids and partial timeline status. | Raw audit payloads, actor ids, request/idempotency outside allowed roles. |
| Correlation/idempotency | Hidden by default. | Superadmin/technical/support may see correlation ids; idempotency keys only when needed. | Client/account/agency-operator views. |
| Failures/diagnostics | Show safe message and broad category. | Technical/support/superadmin may see stable failure codes and limited detail. | Raw exceptions, stack traces, SQL/provider errors, secrets. |

## Evidence Ref Redaction Rules

- Evidence package ids are full only for superadmin, technical operator, read-only auditor, and support/debug operator with scope.
- Agency admin sees evidence availability and freshness; direct ids are redacted unless the evidence drilldown has separate authorization.
- Agency operator sees evidence availability only unless assigned to evidence review.
- Account manager sees "evidence available/stale/missing" only.
- Client reviewer sees nothing in MVP.
- Future AI operator receives only redacted evidence labels and limitation categories.

## Source Ref Redaction Rules

- Source keys may be shown to scoped internal roles.
- Source table names, record ids, source refs, versions, current watermarks, evidence watermarks, query refs, snapshot refs, and metadata are technical diagnostics.
- Account manager summaries should use plain labels such as "runtime artifact", "domain readiness", or "publish approval" without row ids.
- Client-safe MVP view is forbidden.

## Audit Ref Redaction Rules

- Audit event ids and timeline partiality are internal-only.
- Read-only auditor may see event ids, family, subject, scope, status, and redaction labels.
- Actor ids, request ids, idempotency keys, and raw payloads require superadmin/support/debug/technical authorization.
- Any future client export must use a separate redacted audit summary, not PASR-4 raw audit refs.

## Approval Detail Redaction Rules

- Publish activation approval status may be summarized to internal scoped roles.
- Approval request/decision ids may be shown to superadmin, read-only auditor, technical operator, and support/debug operator.
- Agency admin may see request/decision links only if the approval surface separately confirms agency/site authorization.
- Approval actor ids and separation-of-duty details are internal-only.
- Launch signoff/client review/domain readiness must be labeled as separate from publish activation approval.

## DDOM And Domain Detail Redaction Rules

- DDOM status may be shown as present, missing, stale, blocked, not applicable, manually excepted, or unavailable.
- Snapshot id/ref, source watermark, blockers, warnings, stale reason, and captured/freshUntil are technical/operator details.
- Internal host, custom domain ambiguity, DNS instruction details, provider-shaped refs, external snapshots, and domain exception evidence require technical/superadmin/account-manager-by-need visibility.
- Client reviewers must not see publish shadow DDOM diagnostics in MVP. Client DNS instruction flows, if any, must come from source-owned domain workflows, not PASR.

## Publish Target Detail Redaction Rules

- Show safe target summary: "publish target present", "missing publish target", or "target stale/unavailable".
- Technical/superadmin may see target id, environment, publish stage, target kind, policy version, source ref, and source watermark.
- Account managers and clients must not see internal target ids, target kind, policy version, or source watermark in MVP.

## Correlation And Idempotency Redaction Rules

- Correlation id may be visible to superadmin, technical operator, support/debug operator, and read-only auditor with scope.
- Causation id, request id, idempotency key, evidence idempotency key, gate dry-run idempotency key, and shadow evaluation id are technical diagnostics.
- Idempotency keys are never client-visible in MVP.
- When hidden, preserve linkage as a summary such as "linked by internal diagnostic ids" without exposing values.

## Error And Failure Redaction Rules

- Future surfaces must expose `errorState.safeMessage` or a safe category, not raw exception messages.
- Stable failure codes may be shown to technical roles.
- Raw SQL errors, stack traces, provider errors, auth errors, policy engine internals, and repository exception names are internal-only.
- Access-denied responses must not reveal whether a hidden shadow result exists.

## Recommended Next Action Redaction Rules

The action key may need rewriting after redaction:

| PASR-4 action | Safe role-aware summary |
| --- | --- |
| `none` | No shadow follow-up. |
| `review_warnings` | Review shadow warnings. |
| `run_ddom_manual_trigger_outside_pasr` | Refresh domain readiness through the DDOM workflow. |
| `refresh_stale_ddom_snapshot_outside_pasr` | Refresh stale domain readiness through the DDOM workflow. |
| `request_publish_activation_approval` | Route publish activation approval in AAF. |
| `configure_verify_publish_target_source_truth` | Ask technical operator to verify publish target configuration. |
| `review_source_reader_failure` | Escalate source reconstruction issue. |
| `review_evidence_builder_failure` | Escalate evidence reconstruction issue. |
| `review_gate_dry_run_failure` | Escalate gate dry-run issue. |
| `escalate_domain_dns_ambiguity` | Escalate domain readiness ambiguity. |
| `wait_for_shadow_observer_to_run` | Wait for or verify shadow observation availability. |

For roles that cannot see required refs, `requiredRefs` must be redacted or replaced with counts/categories.

## Freshness, Empty State, And Partial Redaction

- Freshness labels may be shown as fresh, stale, partial, or unavailable.
- Detailed watermarks are technical-only.
- Empty states must distinguish "shadow disabled" from "no shadow records" only for roles allowed to know rollout state.
- Client/account-safe summaries should avoid rollout internals; use "No client-visible shadow result is available."
- Partial redaction must preserve stable `shadowStatus`, `severity`, `derivedOnly`, and `publishActionBlocked: false`.
- If redaction hides the reason for an action, the action should become a safe escalation summary rather than disappear.

## Access Failure Behavior

| Failure | Required behavior |
| --- | --- |
| Unauthenticated actor | Deny. Return auth-required envelope or route-level denial. |
| Scope unresolved | Deny closed. Do not reveal source existence. |
| Tenant/client/site mismatch | Deny closed. Do not reveal source existence. |
| Role lacks shadow visibility | Return hidden/forbidden envelope with no shadow refs. |
| Role can see summary but not refs | Return partial redacted model with stable status and safe summary. |
| Read model reconstruction failed | Return safe error status for authorized roles, with technical detail redacted by role. |

Future implementation should avoid returning HTTP 404 for out-of-scope data in a way that distinguishes missing from forbidden when the caller is not authorized.

## Future Redacted Read Model Requirements

The future role-aware transformer should have this contract:

| Contract part | Requirement |
| --- | --- |
| Input | PASR-4 derived read model plus actor id, actor role, agency/client/site scope, requested surface, and redaction policy version. |
| Output | Redacted derived read model with `redactionVersion`, `visibility`, `hiddenFields`, safe status, safe next action, and boundary flags. |
| Authorization failure | Return a minimal denied envelope; no source/evidence existence leakage. |
| Scope mismatch | Return a minimal denied or not-in-scope envelope; no ids from hidden result. |
| Partial visibility | Preserve high-level status/severity/derived-only/non-blocking labels; replace disallowed fields with `redacted`, `hidden`, null, or counts. |
| Field-level behavior | Redact recursively for evidence/source/audit/approval/DDOM/publish target/correlation/error/diagnostic families. |
| Stable status behavior | Do not downgrade a high-risk status to ready because details are hidden. |
| Recommended action behavior | Keep safe action category or escalation. Hide refs the actor cannot access. |
| Link behavior | Only emit links whose target surface has separate authorization. Otherwise show "available but restricted" or omit. |
| No mutation | The transformer must not write, create, update, delete, trigger, enqueue, or call providers. |
| No enforcement | The transformer must never block publish or make a publish decision. |

## Logging And Audit Expectations For Future Access

PASR-5 does not implement logging. A future implementation should consider:

- logging privileged shadow result reads for superadmin/support/debug and audit export contexts;
- recording actor, role, scope, surface, redaction policy version, and field family access;
- avoiding raw evidence/source/audit payloads in access logs;
- rate-limiting support/debug access if sensitive diagnostic fields are shown;
- labeling exported summaries with derived-only and non-enforcing boundaries.

## Command Center Support

This architecture supports future Command Center surfacing by letting Command Center consume a role-aware redacted projection instead of reading PASR-4 raw diagnostics directly.

Future Command Center should show internal operators:

- shadow status and severity;
- derived-only and non-blocking labels;
- site/version context within scope;
- safe next action;
- DDOM, publish target, approval, source freshness, and evidence availability summaries;
- technical drilldown links only when separately authorized.

Command Center must remain derived-only. It must not own the shadow result, approve publish, create DDOM snapshots, create approvals, mutate source truth, or block publish.

## Ops Inbox Support

Future Ops Inbox items may derive from redacted shadow status after the transformer exists. Ops Inbox must remain derived-only and must resolve by canonical source transitions or audited decisions, not by manually changing the shadow item.

Safe future item families may include:

- missing DDOM snapshot;
- stale DDOM snapshot;
- missing publish target;
- missing publish activation approval;
- gate not ready;
- shadow evaluation failed;
- evidence/source limitations.

Ops Inbox must not expose raw PASR-4 evidence/source/audit/correlation fields to roles that cannot see them.

## Client Visibility Boundary

Clients must not see PASR shadow diagnostics in MVP.

Forbidden for MVP client visibility:

- evidence package ids;
- evidence item payload summaries;
- source refs, source tables, source record ids, watermarks, query refs, and snapshot refs;
- audit event ids and payload summaries;
- approval actor/decision details;
- DDOM snapshot refs, host internals, provider-shaped details, DNS ambiguity diagnostics;
- publish target ids, target kind, policy version, source refs, and watermarks;
- correlation ids, request ids, idempotency keys, and shadow evaluation ids;
- internal warnings, limitations, failure reasons, stack traces, SQL/provider/auth diagnostics;
- gate dry-run blockers and policy internals.

A later client-safe milestone may propose a summary such as "Internal readiness review found a domain readiness follow-up." That milestone must be separately approved and must not reuse raw PASR-4 fields directly.

## Next Implementation Path

Conservative order:

1. Implement role-aware redacted read model transformer.
2. Add Command Center read-only surfacing that consumes the transformer.
3. Add Ops Inbox derived work items only if stable keys and source-owned resolution flows are clear.
4. Defer publish API metadata.
5. Defer enforcement.
6. Evaluate a first-class shadow result table separately only if reconstruction from AAF/DDOM/PTT/runtime proves insufficient.

Starting with broad UI, Ops Inbox items, API metadata, enforcement, or persistence before redaction would increase the risk that sensitive diagnostics leak or derived shadow status is mistaken for source truth.
