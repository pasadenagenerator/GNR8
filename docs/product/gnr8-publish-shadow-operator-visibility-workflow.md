# GNR8 Publish Shadow Operator Visibility Workflow

PASR-5 product workflow for future operator-visible publish shadow result access and redaction.

This document is documentation-only. It does not implement Command Center UI, Ops Inbox UI, APIs, server actions, migrations, read-model changes, runtime behavior, publish behavior, rollback behavior, enforcement, DDOM snapshot creation, AAF approval creation, provider calls, DNS/domain calls, billing, Stripe, AI, storage, or authentication/RBAC changes.

Publish shadow results are derived-only, non-enforcing, and do not block publish. Command Center and Ops Inbox are derived-only. DDOM readiness is not publish activation approval. Client visibility is restricted and deferred for MVP. Role-aware redaction must happen before broad UI surfacing.

## Product Position

Future publish shadow visibility should help internal operators understand what the publish activation shadow gate observed without confusing that observation with publish truth, approval truth, DDOM truth, or enforcement.

Operators should experience publish shadow results as:

- scoped to the tenant/client/site/version they are allowed to view;
- labeled as shadow-only and non-blocking;
- summarized first, detailed only by role;
- linked to source-owned drilldowns only when authorized;
- routed to DDOM, AAF, publish target, or engineering workflows for resolution;
- never exposed to clients in MVP.

## Future Entry Points

| Entry point | MVP or future | Purpose | Boundary |
| --- | --- | --- | --- |
| Command Center site publish/readiness detail | MVP after transformer | Show latest redacted shadow status and next action for scoped internal operators. | Derived-only, read-only. |
| Command Center portfolio/overview rollup | Future | Aggregate redacted counts by status/severity after item-level transformer exists. | No raw refs in aggregate. |
| Ops Inbox derived item | Future | Route stable shadow blockers to source-owned workflows. | Derived-only, no independent task truth. |
| Evidence/audit drilldown | Future | Inspect source-owned AAF/evidence/audit details. | Separate authorization required. |
| Client portal/client review | Deferred, not MVP | Potential client-safe summary after separate approval. | No PASR diagnostics in MVP. |
| Publish API metadata | Deferred | Potential internal metadata after separate versioned contract. | Must not be publish outcome. |

## Workflow Contract

| Workflow | MVP/future | Primary roles | User experience | Visible data | Hidden/redacted data | Resolution path |
| --- | --- | --- | --- | --- | --- | --- |
| Platform/admin investigation | MVP after transformer | Platform superadmin, support/debug | Open site/version shadow detail, inspect full reconstructed diagnostics, verify source refs and limitations. | Full scoped status, refs, evidence, source, audit, DDOM, approval, target, correlation, safe failures. | Secrets and credential/provider payloads still redacted if present. | Escalate to source-owned DDOM, AAF, PTT, runtime, or engineering workflow. |
| Agency operator review | MVP after transformer | Agency operator, agency admin | See status, severity, safe next action, missing/stale categories, and source-owned follow-up link. | Status, severity, safe next action, DDOM/publish target/approval/source category summary. | Raw evidence/source/audit/correlation/idempotency details. | Route work to technical operator, release approver, or account manager. |
| Account manager review | MVP after transformer | Account manager | Understand whether client/domain/approval follow-up is needed without technical internals. | Client/site summary, safe next action, owner role, non-enforcement label. | Evidence refs, source refs, audit refs, gate blockers, idempotency, target internals. | Coordinate client/domain owner or approver through source-owned workflow. |
| Technical operator debugging | MVP after transformer | Technical operator | Inspect DDOM, publish target, source freshness, gate dry-run, and failure categories. | Detailed technical diagnostics within site scope. | Actor-sensitive and provider-sensitive payloads unless separately authorized. | Run DDOM workflow outside PASR, verify PTT, escalate source/gate failure. |
| Client-facing review boundary | MVP | Client reviewer | No PASR shadow diagnostics are shown. | None. | All PASR shadow fields forbidden in MVP. | Use normal client review/content/domain workflows, not PASR diagnostics. |
| Read-only audit review | Future | Read-only auditor | Reconstruct append-only evidence/audit context without mutating anything. | Audit/evidence refs, status, scope, freshness, limitations according audit policy. | Provider payloads, secrets, unnecessary actor/idempotency detail. | Record findings or request source-owned correction. |
| Missing DDOM snapshot | MVP after transformer | Technical operator, agency admin summary | Show shadow status `shadow_missing_ddom_snapshot` and safe instruction that DDOM readiness snapshot is missing. | DDOM missing summary, severity high, next action to run manual DDOM trigger outside PASR. | Raw source refs hidden except technical roles. | Manual DDOM snapshot workflow outside PASR. |
| Stale DDOM snapshot | MVP after transformer | Technical operator, agency admin summary | Show stale DDOM status and freshness warning. | Stale summary, captured/freshUntil if role allows, next action to refresh outside PASR. | Watermarks/source refs hidden except technical roles. | Manual DDOM refresh workflow outside PASR. |
| Missing publish activation approval | MVP after transformer | Release approver, agency admin, account manager summary | Show that publish activation approval is missing and launch/client/domain readiness does not satisfy it. | Approval missing status and safe routing action. | Approval request/decision internals hidden by role. | AAF publish activation approval flow. |
| Missing publish target | MVP after transformer | Technical operator, agency admin summary | Show missing/invalid target summary and ask technical operator to verify source truth. | Publish target missing status, intended target label if allowed. | Target policy/source refs for non-technical roles. | Publish target configuration/source truth workflow. |
| Gate not ready | MVP after transformer | Technical operator | Show gate dry-run not-ready summary with safe blocker categories. | Status, blocker categories, evidence availability, non-enforcement label. | Raw policy internals and idempotency for most roles. | Technical review of source/evidence/gate path. |
| Shadow evaluation failed | MVP after transformer | Technical operator, support/debug | Show safe failure category and escalation path. | Safe error, failure category, available evidence refs for technical roles. | Raw exceptions, SQL/provider/auth errors, stack traces. | Engineering/debug review. |
| Evidence limitations | MVP after transformer | Technical operator, auditor, agency admin summary | Show evidence partial/stale/missing labels and limitations summary. | Limitation codes/categories and freshness. | Raw evidence item payloads and source metadata. | Rebuild evidence through normal PASR/shadow observation later; do not mutate in PASR-5. |
| Domain/DNS ambiguity | MVP after transformer | Technical operator, account manager summary | Show domain readiness ambiguity without claiming DNS/provider truth. | Ambiguity summary and owner role. | Internal host/provider details except technical roles. | Domain/DDOM workflow, client/domain owner follow-up if needed. |
| Escalation to manual DDOM trigger | MVP after transformer | Technical operator | Navigate from redacted summary to DDOM manual trigger workflow if authorized. | DDOM missing/stale reason and site scope. | PASR does not create snapshots. | DDOM source-owned manual trigger. |
| Escalation to AAF approval flow | MVP after transformer | Release approver, agency admin, account manager | Navigate to AAF approval request/decision flow if authorized. | Publish activation approval missing/stale summary. | Shadow result does not create approval. | AAF source-owned approval flow. |
| Escalation to publish target configuration | MVP after transformer | Technical operator | Navigate to publish target source-owned configuration/check if authorized. | Target missing/stale summary. | Internal policy details by role. | PTT/source truth correction workflow. |
| Escalation to engineering/debug review | MVP after transformer | Support/debug, engineering | Inspect redacted technical diagnostics and gather refs. | Full or redacted diagnostics by support authorization. | Secrets/raw provider payloads. | Engineering triage outside PASR surface. |

## User Experience Rules

Every future visible shadow result must show:

- "Shadow only" or equivalent;
- "Did not block publish" or equivalent;
- "Derived read model" or equivalent;
- "Not publish approval" when approval/readiness is discussed;
- "DDOM readiness is not publish activation approval" when DDOM readiness appears;
- freshness or partial-source labels where applicable.

Future surfaces must avoid:

- "publish blocked by shadow";
- "approved";
- "safe to publish";
- "domain approved";
- "client approved by shadow";
- "ready for enforcement";
- "Ops Inbox item completed the blocker";
- "Command Center state is source truth."

## MVP Workflows

The MVP-after-transformer workflow should be:

1. Actor opens a scoped internal Command Center site detail.
2. Command Center requests the future role-aware redacted publish shadow read model.
3. Scope is checked before field-level redaction.
4. Operator sees status, severity, safe next action, derived-only label, and non-blocking label.
5. Operator sees DDOM/publish target/approval/source summary according to role.
6. Operator opens source-owned drilldowns only when separately authorized.
7. Any action routes outside PASR to DDOM, AAF, PTT, runtime, or engineering workflows.
8. No publish action is blocked or enabled solely by the shadow result.

## Platform/Admin Investigation

Platform superadmins should be able to answer:

- Which PASR-4 source rows contributed to this result?
- Was the evidence package present, stale, invalid, or missing?
- Did the AAF dry-run gate evaluate?
- Which audit event and approval refs exist?
- Which DDOM snapshot was read, and was it fresh?
- Which publish target was read?
- Which correlation/idempotency values join the timeline?
- What limitation prevents reconstruction?

Even for superadmins, the result remains read-only and non-enforcing.

## Agency Operator Review

Agency operators should see:

- shadow status and severity;
- safe operator label;
- next action owner role;
- missing/stale category summary;
- whether DDOM, publish target, and approval are present/missing/stale;
- evidence availability or restricted indicator;
- no raw source/audit/idempotency details.

The goal is to route work, not debug internals.

## Account Manager Review

Account managers should see only what helps coordinate human follow-up:

- a client/site-safe internal summary;
- whether the owner is technical operator, release approver, account manager, or engineering;
- whether client/domain owner follow-up may be needed;
- whether a client-visible review should remain separate from publish approval.

They should not see raw evidence/source/audit refs, actor ids, correlation/idempotency ids, gate internals, publish target internals, or provider-sensitive diagnostics.

## Technical Operator Debugging

Technical operators need:

- DDOM snapshot status/ref/freshness where authorized;
- publish target status/policy/source refs where authorized;
- source truth keys, freshness, stale reasons, and watermarks where authorized;
- gate dry-run result, blocker categories, evidence availability;
- correlation id and selected idempotency details when needed for debug;
- safe failure codes.

They still must not treat shadow diagnostics as enforcement, approval, or source truth.

## Client-Facing Review Boundary

Client reviewers must not see PASR shadow diagnostics in MVP.

Normal client workflows may show client-safe preview/content/domain instruction information from source-owned client/domain/review surfaces. They must not show:

- publish shadow status;
- evidence/source/audit refs;
- gate dry-run blockers;
- approval actor/decision details;
- DDOM shadow diagnostics;
- publish target internals;
- correlation or idempotency ids;
- internal diagnostics or failure reasons.

## Condition Workflows

### Missing DDOM Snapshot

Visible internal summary:

- Status: `shadow_missing_ddom_snapshot`.
- Severity: high.
- Meaning: no usable DDOM readiness snapshot was found for shadow evaluation.
- Boundary: PASR does not create DDOM snapshots; DDOM readiness is not publish activation approval.
- Action: run DDOM manual trigger outside PASR if authorized.

### Stale DDOM Snapshot

Visible internal summary:

- Status: `shadow_stale_ddom_snapshot`.
- Severity: high.
- Meaning: the DDOM snapshot or source ref is stale.
- Boundary: stale DDOM does not mean publish was blocked by shadow.
- Action: refresh DDOM readiness outside PASR.

### Missing Publish Activation Approval

Visible internal summary:

- Status: `shadow_missing_publish_activation_approval`.
- Severity: high.
- Meaning: exact AAF `publish_activation` approval was absent, stale, or unavailable.
- Boundary: launch signoff, client review, domain readiness, content review, and AI output do not satisfy this approval.
- Action: request or route publish activation approval through AAF.

### Missing Publish Target

Visible internal summary:

- Status: `shadow_missing_publish_target`.
- Severity: high.
- Meaning: publish target source truth is missing or unavailable.
- Boundary: PASR does not configure targets.
- Action: technical operator verifies PTT source truth.

### Gate Not Ready

Visible internal summary:

- Status: `shadow_gate_not_ready`.
- Severity: high.
- Meaning: dry-run gate did not report ready/allowed semantics.
- Boundary: dry-run is not enforcement and did not block current publish.
- Action: technical operator reviews gate/source/evidence blockers.

### Shadow Evaluation Failed

Visible internal summary:

- Status: `shadow_evaluation_failed`.
- Severity: high.
- Meaning: source read, evidence build, gate dry-run, or reconstruction failed.
- Boundary: show safe error category; raw exceptions are internal-only.
- Action: engineering/support/debug review.

## Future Ops Inbox Behavior

Ops Inbox should only come after the role-aware redacted transformer and Command Center read-only surfacing are stable.

Future derived item examples:

| Item type | Trigger | Owner | Completion |
| --- | --- | --- | --- |
| `publish_shadow_missing_ddom_snapshot` | Redacted result status is missing DDOM. | Technical operator. | New DDOM snapshot/source state resolves status. |
| `publish_shadow_stale_ddom_snapshot` | Redacted result status is stale DDOM. | Technical operator. | Fresh DDOM snapshot/source state resolves status. |
| `publish_shadow_missing_publish_target` | Redacted result status is missing target. | Technical operator. | Publish target source truth exists and projection changes. |
| `publish_shadow_missing_activation_approval` | Redacted result status is missing approval. | Release approver/account route. | AAF approval truth changes. |
| `publish_shadow_gate_not_ready` | Redacted result status is gate not ready. | Technical operator. | Source/evidence/gate status changes. |
| `publish_shadow_evaluation_failed` | Redacted result status is evaluation failed. | Engineering/support/debug. | Reconstruction/evidence/source issue resolved. |

Ops Inbox items remain derived-only. They must not be manually closed as truth; completion requires canonical source transition or audited decision.

## Future Client-Safe Possibility

A later client-safe milestone may define a small summary such as:

- "Internal readiness review is pending."
- "A domain follow-up is needed."
- "Internal approval routing is in progress."

That milestone must separately define policy, redaction, product language, and source-owned client flows. It must not expose PASR-4 raw fields or imply that shadow results are source truth, approval, or enforcement.

## Implementation Readiness

Implementation may begin only with the role-aware redacted read model transformer.

Do not begin with:

- direct broad Command Center surfacing from PASR-4 raw model;
- Ops Inbox derived work items;
- publish API metadata;
- enforcement;
- first-class shadow result persistence;
- client-facing visibility.

The transformer must be completed and validated before broad UI surfacing.
