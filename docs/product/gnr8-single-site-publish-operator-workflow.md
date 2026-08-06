# GNR8 Single-Site Publish Operator Workflow

Phase: MVP-53
Scope: Product workflow documentation only.

This workflow describes how a future internal operator should use the first eligible single-site publish caller surface. It does not implement UI, API routes, server actions, Command Center actions, Ops Inbox actions, client portal exposure, wrapper wiring, blocking enforcement, provider calls, billing/domain execution, publish behavior changes, rollback changes, or runtime mutations.

## Operator Goal

Allow an internal operator to prove that a single-site migration candidate has the exact readiness, approval, gate, and runtime refs required for the MVP-52 wrapper, first in dry-run mode and later in shadow-publish mode. This is still not blocking enforcement.

## Workflow

1. Operator opens the single-site migration/candidate in an internal Command Center context.
2. Operator verifies the tenant, client, site, migration, candidate site version, and runtime artifact identity.
3. Operator verifies content approval, client approval where required, and launch approval are complete for the same candidate.
4. Operator verifies launch readiness evidence exists, is fresh, and matches the candidate/artifact/target chain.
5. Operator verifies publish activation request, publish activation decision, persisted gate attempt/result, handoff watermark, and gate input watermark.
6. Operator confirms publish stage/environment and publish target source truth.
7. Operator runs the future MVP-54 dry-run caller with explicit mode, correlation id, idempotency key, and operator confirmation.
8. Operator reviews dry-run wrapper preflight, resolver status, safe refs, blocker codes, limitations, and shadow diagnostics.
9. If dry-run is blocked, operator resolves the missing or stale source-owned record outside publish and reruns dry-run.
10. In MVP-55 only, if the additional shadow-publish flag is enabled, operator may run shadow-publish with explicit confirmation for the same migration/candidate/mode.
11. Operator manually verifies the published result after the existing publish orchestrator returns in MVP-55.
12. Operator records publish verification and closeout in a later milestone.

## Dry-Run Expectations

Dry-run must:

- call the MVP-52 wrapper in dry-run mode only;
- validate strict caller input before wrapper invocation;
- resolve or report resolver status without publishing;
- return safe diagnostics and blocker codes;
- report `publishes: false` and `runtimeMutation: false`;
- leave generic publish, active pointer, runtime, domain, billing, provider, AAF, PASR, DDOM, Ops Inbox, Command Center implementation, and client portal behavior unchanged.

## Shadow-Publish Expectations

Shadow-publish is not part of MVP-54. MVP-55 may add it only when:

- dry-run has passed for the exact refs;
- `shadow-publish` mode is explicit;
- a separate shadow-publish feature flag is enabled;
- operator confirmation binds tenant/client/site/migration/candidate/artifact/mode;
- authorization passes again;
- the wrapper is the only code path invoking the existing publish orchestrator.

Shadow-publish remains non-enforcing. Guard results are diagnostics only until a separate blocking enforcement milestone.

## Source-Owned Remediation

| Problem | Operator action |
| --- | --- |
| Missing launch readiness evidence | Return to launch readiness evidence workflow. |
| Missing publish activation request | Use the AAF publish activation request bridge workflow. |
| Missing publish activation decision | Use the human publish activation decision workflow. |
| Missing gate attempt/result | Run the source-owned gate evaluation workflow before publish; the caller must not reevaluate. |
| Handoff or gate input watermark mismatch | Rebuild the handoff/gate chain for the exact candidate. |
| Candidate/artifact mismatch | Reconcile candidate/runtime artifact source truth before publish. |
| Publish target missing/disabled/stale | Correct PTT source truth outside publish. |
| DDOM/domain readiness stale | Refresh DDOM/domain readiness outside publish and rebuild readiness/gate evidence. |
| Billing/hosting entitlement missing | Resolve billing/hosting source truth outside publish and rebuild readiness/gate evidence. |
| Limitations not accepted | Record explicit source-owned limitation acceptance before caller use. |

## Operator Warnings

Operators must not:

- treat dry-run ready as publish approval;
- treat shadow diagnostics as blocking enforcement;
- treat launch readiness as publish activation approval;
- treat DDOM readiness as publish activation approval;
- treat PASR shadow as gate truth;
- treat Command Center or Ops Inbox display state as source truth;
- use the generic runtime publish route for single-site publish activation validation;
- expose the action or result in client portal;
- create AAF records, gate attempts, DDOM snapshots, provider jobs, billing records, or DNS changes from this caller.

## Completion

MVP-54 workflow completion means a dry-run result exists for the exact candidate and either:

- dry-run is ready with safe diagnostics; or
- dry-run is blocked with stable source-owned blocker codes.

MVP-55 workflow completion means the operator additionally ran shadow-publish behind the explicit flag, manually verified the result, and prepared later closeout evidence. Closeout persistence is a later milestone.
