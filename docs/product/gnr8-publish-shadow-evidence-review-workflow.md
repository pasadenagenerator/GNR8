# GNR8 Publish Shadow Evidence Review Workflow

PASR-3 product workflow for operator review of publish activation shadow gate results.

This document is documentation-only. It does not implement UI, APIs, server actions, SQL migrations, Command Center, Ops Inbox, PASR-2 runtime behavior, publish enforcement, DDOM snapshot creation, approvals, provider calls, billing, Stripe, AI, workers, or public runtime behavior.

## Workflow Purpose

Operators need a repeatable way to review publish activation shadow results before GNR8 implements UI, read APIs, Ops Inbox integration, or enforcement.

The workflow keeps shadow review separate from current publish behavior:

- shadow results do not block publish;
- shadow results are not publish approval;
- PASR must not create DDOM snapshots;
- Command Center and Ops Inbox are derived only;
- DDOM readiness is not publish activation approval.

## Where The Operator Starts

Recommended future starting points:

- Command Center site detail publish/readiness drilldown;
- Command Center publish readiness section;
- Ops Inbox item detail when a derived shadow blocker exists;
- internal evidence package/gate attempt drilldown;
- internal logs only as a fallback until the read model exists.

Until the read model is implemented, the operator should treat PASR-2 output as internal/logged and test-observable, not as a product surface.

## Identifying Publish Attempts With Shadow Observations

An operator should identify a shadow observation by:

- site id;
- site version id;
- runtime artifact id;
- intended publish target;
- intended publish stage;
- publish attempt ref when one exists;
- correlation id;
- idempotency key;
- shadow evaluation id;
- evidence package id;
- gate attempt id;
- audit event id.

If there is no durable publish attempt id, correlation and idempotency refs are the linkage. The absence of a durable attempt id should be displayed as a limitation, not hidden.

## Review Complete Shadow Readiness

For `shadow_ready`:

1. Confirm the result says `shadowOnly: true`, `enforcementApplied: false`, and `publishActionBlocked: false`.
2. Confirm source read completed, evidence package was built, and gate dry-run was evaluated.
3. Confirm gate result is compatible with ready/allowed semantics.
4. Confirm required source refs and watermarks are present for site version, artifact, active pointer, publish target, DDOM readiness, content state, and approval.
5. Confirm DDOM readiness is present, not stale, and not being treated as publish activation approval.
6. Confirm publish activation approval is present only if AAF approval truth says the exact `publish_activation` scope is valid.
7. Record no required current-publish action. Any follow-up is enforcement-readiness review only.

## Handling Missing DDOM Snapshot

For `shadow_missing_ddom_snapshot`:

- Show the result as shadow-only and non-blocking.
- Show `domainReadiness` as missing source truth.
- Show that PASR did not and must not create the snapshot.
- Recommend the source-owned DDOM manual trigger outside PASR if operator policy allows.
- Assign the follow-up to a technical operator.
- Do not infer domain readiness from Command Center labels, Ops Inbox items, DNS instructions, Vercel UI, registrar UI, or client statements.
- Do not block the current shadow-only publish because of the shadow result.
- Treat the condition as blocking future enforcement readiness until a current DDOM snapshot exists or a policy-scoped not-applicable/manual exception snapshot exists.

## Handling Stale DDOM Snapshot

For `shadow_stale_ddom_snapshot`:

- Show the stale snapshot ref, captured time, fresh-until time, stale reason, blockers, and warnings.
- Explain that the stale snapshot is evidence, not current readiness and not publish approval.
- Recommend running the DDOM manual trigger outside PASR after confirming stored source state is ready.
- If source state is ambiguous, escalate to a technical operator before refreshing.
- Keep current publish non-blocking in shadow-only mode.
- Treat stale DDOM as blocking future enforcement readiness.

## Handling Missing Publish Activation Approval

For `shadow_missing_publish_activation_approval`:

- Show the exact missing scope: `publish_activation`.
- Show any launch signoff, client review, domain readiness, or domain exception only as separate evidence, never as replacement approval.
- Link the evidence package and gate attempt when available.
- Recommend requesting or reviewing a scoped AAF publish activation approval with current evidence.
- Assign to the policy-designated approver, usually superadmin or release approver depending on future policy.
- Do not block current shadow-only publish.
- Treat as blocking future enforcement readiness.

## Handling Missing Publish Target

For `shadow_missing_publish_target`:

- Show intended publish target and stage.
- Show `publishTarget` missing source truth.
- Recommend repair through a future audited publish target admin/source-truth workflow.
- Do not infer target truth from route input, button labels, artifact stage alone, or Command Center labels.
- Do not block current shadow-only publish.
- Treat as blocking future enforcement readiness.

## Handling Evidence Limitations

Operators should review:

- missing source truth;
- stale source truth;
- source watermark mismatches;
- partial AAF approval timelines;
- DDOM warnings;
- publish target failed/stale state;
- approval wrong-scope, expired, revoked, superseded, or missing decision;
- source reader unavailable;
- evidence builder unavailable;
- gate dry-run unavailable;
- dry-run blocked reasons and stale evidence reasons.

Safe to ignore for current publish:

- any shadow-only blocker when publish remains non-enforcing;
- missing approval reported only by shadow mode, as long as current policy has not enabled enforcement;
- missing/stale DDOM snapshot for current shadow-only publish outcome.

Requires manual review:

- source reader failure;
- evidence builder failure;
- gate dry-run failure;
- missing/stale DDOM snapshot;
- missing/stale publish target;
- missing/wrong-scope/stale publish activation approval;
- any source watermark mismatch;
- repeated shadow unavailability across multiple publish attempts.

Must block future enforcement readiness:

- missing DDOM snapshot;
- stale DDOM snapshot;
- missing publish target;
- missing publish activation approval;
- source reader unavailable;
- evidence builder unavailable;
- gate dry-run unavailable;
- partial approval timeline;
- stale or missing required source truth;
- inability to link evidence/gate/audit/source refs.

Must not block current shadow-only publish:

- every PASR-3 status while `enforcementApplied` remains false.

## Deciding Whether To Run The DDOM Manual Trigger

An operator may decide to run the DDOM manual trigger outside PASR when:

- a custom-domain or internal-host readiness snapshot is needed;
- source-owned stored state is ready enough to snapshot;
- actor scope and role are clear;
- the request is not coming from PASR or publish gate evaluation;
- no live provider call is required by the trigger;
- idempotency and correlation can be supplied;
- the operator understands the snapshot is not publish approval.

An operator should not run the DDOM trigger when:

- the request would need live DNS, Vercel, Openprovider, registrar, Stripe, or AI calls;
- the subject identity is ambiguous;
- stored domain/DNS evidence is missing and no not-applicable/manual exception path is justified;
- the intent is to create publish approval;
- the only supporting signal is Command Center or Ops Inbox display state.

## Escalating Domain Or DNS Ambiguity

Escalate to a technical operator or superadmin when:

- domain ownership is unclear;
- custom-domain intent conflicts with stored binding state;
- DNS instructions are stale or conflict with provider evidence;
- Vercel-shaped stored state is stale or failed;
- external DNS/registrar truth is disputed;
- a domain exception is proposed for launch;
- a cross-client domain conflict appears.

Do not ask PASR to resolve domain ambiguity. PASR reads existing DDOM source truth only.

## Recording Follow-Up

Until Ops Inbox integration exists, follow-up should be recorded in the source-owned workflow or audited notes available to the relevant domain. Future Ops Inbox items should be derived from source truth and shadow read model status, not manually invented as independent truth.

Recommended follow-up records:

- DDOM manual snapshot request/outcome in the DDOM workflow;
- AAF publish activation approval request/decision in AAF;
- publish target source-truth repair in the future publish target admin workflow;
- source-reader/evidence/gate investigation in engineering or operator incident tracking;
- external DNS/client follow-up as external reference evidence only, not approval.

## Status Vocabulary Summary

| Status | Operator meaning | Action |
| --- | --- | --- |
| `shadow_not_enabled` | Shadow was disabled. | No action unless rollout expected. |
| `shadow_not_available` | No usable shadow result exists. | Check scope, flag, logs, or read-model reconstruction. |
| `shadow_ready` | Shadow evidence and dry-run look ready. | Review evidence for enforcement preparation only. |
| `shadow_ready_with_warnings` | Shadow is ready but limitations remain. | Review warnings before enforcement. |
| `shadow_missing_source_truth` | Required source truth is missing. | Repair canonical source coverage. |
| `shadow_stale_source_truth` | Source truth or evidence is stale. | Refresh source-owned state/evidence. |
| `shadow_missing_ddom_snapshot` | DDOM snapshot is missing. | Run DDOM manual trigger outside PASR when safe. |
| `shadow_stale_ddom_snapshot` | DDOM snapshot is stale. | Refresh DDOM snapshot outside PASR. |
| `shadow_missing_publish_target` | Publish target truth is missing. | Repair publish target source truth. |
| `shadow_missing_publish_activation_approval` | Scoped publish approval is missing. | Request/review AAF publish activation approval. |
| `shadow_gate_not_ready` | Gate dry-run found blockers. | Review blocked reasons. |
| `shadow_evaluation_failed` | Shadow evaluation failed or is partial. | Investigate before enforcement planning. |

## Workflow Boundary

The workflow is review-only. It helps operators prepare for later surfacing and enforcement design. It does not approve publish, block publish, trigger DDOM from PASR, mutate source truth, close Ops Inbox items, or change runtime behavior.
