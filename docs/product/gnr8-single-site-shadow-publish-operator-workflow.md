# GNR8 Single-Site Shadow-Publish Operator Workflow

Phase: MVP-55
Scope: Product workflow documentation only.

This workflow describes a future internal operator-only shadow-publish action for single-site MVP publish. It does not implement UI, API routes, server actions, Command Center actions, Ops Inbox actions, client portal exposure, wrapper execute wiring, blocking enforcement, provider calls, billing/domain execution, publish behavior changes, rollback changes, runtime mutations, commit, or push.

## Operator Goal

Allow a platform superadmin to rehearse the first single-site MVP publish action with complete source refs and metadata handoff, then intentionally invoke the MVP-52 wrapper execute path behind a separate flag. This may call the existing publish orchestrator and may move the active pointer through existing publish behavior.

## Workflow

1. Operator opens the single-site migration/candidate in internal Command Center/admin context.
2. Operator verifies tenant, client, site, migration, candidate site version, runtime artifact, publish target, stage, and environment.
3. Operator verifies content, client, launch, and publish activation approval source refs.
4. Operator verifies launch readiness evidence, AAF request, AAF decision, gate attempt/result, handoff watermark, and gate input watermark.
5. Operator runs MVP-54 dry-run for the exact refs and reviews resolver/wrapper diagnostics.
6. If dry-run is blocked, operator resolves missing or stale source-owned state outside publish and reruns dry-run.
7. If dry-run is ready, operator confirms `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` is enabled in the intended internal environment.
8. Operator submits `mode: "shadow_publish"` with explicit confirmation, idempotency key, and correlation id.
9. The future action reauthorizes, rereads/validates source refs, requires resolver completeness, and only then calls the MVP-52 wrapper execute path.
10. The wrapper calls existing `publishApprovedSiteVersion(...)` with complete metadata handoff.
11. Operator reviews the returned wrapper/publish status, active pointer result if present, shadow guard diagnostics, warnings, and redaction summary.
12. Operator manually verifies the published result and records closeout in a later milestone.

## Dry-Run Vs Shadow-Publish

Dry-run validates context only. It cannot mutate runtime and cannot switch active pointers.

Shadow-publish can perform the existing publish. It can mutate active pointer, artifact, site-version lifecycle, archive state, and publish audit state through the existing publish orchestrator. It does not apply blocking enforcement and does not treat guard block diagnostics as a stop.

Operators must not treat dry-run ready as publish approval, and must not treat shadow guard diagnostics as blocking enforcement.

## Operator Confirmation

Future confirmation must bind:

- mode: `shadow_publish`;
- tenant/client/site/migration;
- candidate site version ref;
- runtime artifact ref;
- publish target ref;
- stage/environment;
- acknowledgement that publish may execute;
- acknowledgement that active pointer may change through the existing orchestrator;
- acknowledgement that blocking enforcement is not applied;
- acknowledgement that no automatic rollback is invoked.

The confirmation may be a phrase or boolean in implementation, but it must be explicit and testable.

## Source-Owned Remediation

| Problem | Operator action |
| --- | --- |
| Missing launch readiness evidence | Return to launch readiness evidence workflow. |
| Missing AAF request | Use the publish activation request bridge workflow. |
| Missing AAF decision | Use the human decision workflow. |
| Missing gate attempt/result | Run source-owned gate evaluation before publish. |
| Handoff or gate input watermark mismatch | Rebuild the exact source handoff/gate chain. |
| Candidate/artifact mismatch | Reconcile candidate/runtime source truth before publish. |
| Publish target missing/disabled/stale | Correct PTT source truth outside publish. |
| DDOM/domain readiness stale | Refresh DDOM/domain readiness outside publish and rebuild evidence/gate state. |
| Billing/hosting readiness missing | Resolve billing/hosting source truth outside publish and rebuild evidence/gate state. |
| Publish orchestrator failure | Treat as shadow-publish failure; do not auto-rollback or auto-retry. |

## Surface Boundaries

Command Center boundary: Command Center may provide the internal operator context later, but MVP-55 adds no UI button. Display state is not source truth.

Ops Inbox boundary: Ops Inbox remains derived-only and no-action. It must not invoke wrapper execute mode.

Client portal boundary: no client portal action, client reviewer action, client API, or public runtime diagnostic exposure.

Generic publish route boundary: operators must not use or modify the generic runtime publish route for single-site shadow-publish.

Provider/domain/billing boundary: the future action must not call providers, live DNS, Vercel, Openprovider, registrars, SSL providers, Stripe, billing, AI, production Supabase, or staging Supabase.

## Completion

MVP-55 workflow completion is architectural: the future operator path, confirmation, failure, audit, redaction, and test expectations are defined. Actual shadow-publish implementation waits for MVP-56.
