# GNR8 Single-Site Publish Caller Operator Workflow

Phase: MVP-51
Scope: Product workflow documentation only.

This workflow describes how future internal operators should understand a strict single-site publish caller. It does not implement UI, API routes, Command Center actions, Ops Inbox actions, client portal exposure, caller wiring, publish behavior changes, blocking enforcement, provider calls, billing/domain execution, SQL, services, or workers.

## Operator Goal

For eligible single-site MVP migrations, operators need a publish path that proves the exact site, migration, candidate version, artifact, target, readiness evidence, approval decision, and gate result before publish activation metadata reaches the runtime publish flow.

The first implementation should be shadow-only. Operators may see diagnostics later, but publish behavior must remain unchanged until a separate enforcement milestone.

## Future Happy Path

1. Operator completes the single-site migration workflow through launch readiness.
2. MVP-40 launch readiness evidence exists and is fresh.
3. MVP-41 publish activation request exists for the exact candidate.
4. MVP-42 human decision grants or grants with limitations.
5. MVP-43 handoff reconstructs the decision/evidence chain.
6. MVP-44 gate evaluation has already persisted an allowed gate attempt/result.
7. Operator or internal workflow requests publish through the future server-only single-site publish wrapper.
8. Wrapper validates strict context and resolves MVP-48 metadata through MVP-49.
9. Wrapper calls `publishApprovedSiteVersion(...)` with complete metadata in shadow-only mode.
10. Existing publish behavior runs unchanged.
11. Future state/read-model surfaces may show that shadow metadata was evaluated.

## Operator-Facing Statuses

| Status | Meaning | Operator response |
| --- | --- | --- |
| Context complete | Wrapper found strict single-site identity and complete metadata. | Continue through shadow-only publish path when enabled. |
| Context incomplete | One or more required refs, identities, or watermarks are missing. | Return to the source-owned workflow that creates the missing record. |
| Context mismatched | Candidate, artifact, target, decision, gate, or identity does not match. | Rebuild the handoff/gate for the exact candidate or correct the source-owned state. |
| Context stale | Gate, evidence, decision, or target freshness failed policy. | Refresh source-owned readiness/approval/gate artifacts outside publish. |
| Shadow evaluated | Metadata reached the shadow guard path. | Review diagnostics; no publish behavior changed. |
| Shadow unavailable | The wrapper or generic caller could not provide enough context for shadow guard evaluation. | Do not infer approval; fix source context before relying on single-site enforcement. |
| Future blocked | Later enforcement-only status where strict guard blocks publish. | Resolve the source blocker; bypass only if a future audited bypass design permits it. |

## Source-Owned Remediation

Operators must resolve blockers at their source:

| Blocker | Source-owned remediation |
| --- | --- |
| Missing migration identity | Correct or create the single-site state spine record. |
| Missing launch readiness evidence | Run the launch readiness writer/evidence builder flow outside publish. |
| Missing publish activation request | Use the MVP-41 request bridge flow. |
| Missing publish activation decision | Use the MVP-42 human decision workflow. |
| Missing gate attempt | Use the MVP-44 gate evaluation workflow before publish; the publish wrapper must not call it. |
| Stale DDOM/domain readiness | Refresh DDOM readiness outside publish, then rebuild readiness/gate artifacts. |
| Missing or disabled publish target | Correct PTT source truth through a future audited admin workflow. |
| Wrong candidate or artifact | Rebuild the candidate/handoff/gate chain for the exact runtime version and artifact. |
| Limitations not accepted | Record explicit limitation acceptance policy in the source-owned approval/readiness flow. |

## What Operators Must Not Do

Operators and future UI surfaces must not:

- use the generic runtime publish route as proof of single-site publish activation approval;
- use launch readiness alone as approval;
- use PASR shadow readiness as gate result;
- use DDOM readiness as approval;
- use Command Center or Ops Inbox labels as source truth;
- use UI labels or button text as publish target truth;
- guess migration identity from a domain, hostname, site label, or page title;
- request publish context creation that calls providers, live DNS, Stripe, AI providers, production Supabase, or staging Supabase;
- ask the publish wrapper to create AAF records, DDOM snapshots, gate attempts, or provider jobs.

## Command Center Future Role

Command Center may later show:

- whether a site is eligible for the single-site publish wrapper;
- wrapper shadow status;
- missing/mismatched/stale context categories;
- safe refs when role-redaction permits them;
- links to source-owned workflows.

It must not enable publish from display state alone. Any action must route through the future server-only wrapper and source-owned checks.

## Ops Inbox Future Role

Ops Inbox may later derive work items from missing, mismatched, stale, or blocked publish context. Items must be derived-only and close only when source truth changes or an audited source-owned decision exists.

MVP-51 adds no Ops Inbox items, no persistence, no actions, and no UI.

## Shadow-Only Operator Expectations

During first rollout:

- publish may still succeed even when shadow diagnostics would block in future enforcement;
- diagnostics are advisory/internal only;
- active pointer behavior is unchanged;
- publish response contracts are unchanged;
- generic publish callers continue to behave as before;
- missing metadata means the source chain is not yet wired, not that approval is granted.

## Enforcement Later

Blocking publish activation should begin only after:

- wrapper shadow results are observed on controlled internal migrations;
- operators can identify and repair missing source context;
- structured preflight behavior is accepted;
- audited bypass is designed;
- state transitions and closeout are implemented;
- Command Center/Ops Inbox redaction and action boundaries are reviewed.
