# GNR8 Single-Site Publish Activation Enforcement Operator Workflow

Phase: MVP-45
Scope: Documentation and architecture only.

This workflow describes how operators should understand future single-site publish activation enforcement. It does not implement UI, API routes, Command Center actions, Ops Inbox actions, client portal exposure, enforcement, publish execution, rollback, runtime mutation, provider calls, billing/domain execution, or gate reevaluation.

## Operator Meaning

Publish activation enforcement means the platform will refuse to switch the active runtime pointer unless the exact candidate has a matching, fresh, persisted MVP-44 gate result.

It is not a new approval screen, not a readiness collector, not a DDOM trigger, not a billing/Stripe action, not a domain/DNS action, and not a rollback workflow.

## Happy Path

1. Launch readiness is collected and persisted before publish activation.
2. MVP-40 builds `single_site_launch_readiness_evidence`.
3. MVP-41 creates the exact `publish_activation` request.
4. MVP-42 records the human decision.
5. MVP-43 reconstructs the decision/evidence handoff.
6. MVP-44 evaluates the gate and persists the gate attempt/result.
7. A future enforcement milestone consumes the MVP-44 result before active pointer switch.
8. If identity, watermarks, freshness, and current approval state match, publish activation continues through the existing publish flow.

## Blocked Path

If enforcement blocks, the future operator-facing response should show:

- publish activation did not occur;
- active pointer was not switched;
- stable blocker code;
- safe explanation such as missing gate, stale gate, wrong artifact, wrong target, revoked approval, or disabled target;
- recommended source-owned next step.

The broad response should not expose raw sensitive AAF source refs, billing refs, provider refs, credential-sensitive details, or full evidence payloads. Internal logs should retain diagnostic refs for technical operators.

## Recommended Remediation

| Blocker | Operator next step |
| --- | --- |
| Missing gate result | Prepare or rerun the future gate-evaluation milestone for the current MVP-43 handoff. |
| Stale handoff/gate watermark | Refresh the source-owned launch readiness/decision handoff chain before gate evaluation. |
| Wrong candidate or artifact | Rebuild the handoff and gate for the exact candidate artifact intended for publish. |
| Wrong publish target or stage | Correct publish target/source truth, then rebuild readiness/gate artifacts. |
| Approval revoked/superseded/expired | Return to publish activation decision workflow. |
| Publish target disabled/retired | Resolve PTT source truth through a reviewed admin/source workflow. |
| DDOM/domain stale in upstream evidence | Use the DDOM workflow outside publish enforcement, then rebuild readiness/gate artifacts. |
| Billing/hosting source truth missing | Resolve the site-scoped billing/hosting readiness source gap outside publish enforcement. |
| Repository/read failure | Treat as operational incident; do not publish until read path is healthy. |

## Shadow Rollout

Future shadow mode should:

- read and validate the MVP-44 result;
- log diagnostics;
- include internal-only observability;
- never block the publish action;
- never claim approval or readiness.

Shadow mode is for proving accuracy before blocking enforcement. Operators should treat shadow blockers as remediation signals, not as public-facing client status.

## Blocking Rollout

Blocking rollout should be staged:

1. internal single-site migrations only;
2. controlled disposable/runtime rehearsal;
3. all eligible single-site publishes;
4. later operator UI surfacing and 20-site validation.

During blocking rollout, any missing/stale/wrong result blocks before active pointer mutation.

## Emergency Bypass

Bypass should be rare, flag-gated, audited, and internal. It should require:

- privileged actor;
- explicit reason;
- incident or operational reference when available;
- correlation id;
- idempotency key;
- post-action review.

Bypass does not create approval, does not change the gate result, and does not prove readiness. It only records that a privileged operator intentionally proceeded despite enforcement.

## Domain And DDOM Boundary

Operators must refresh domain readiness through DDOM workflows before gate evaluation. Publish enforcement must not create DDOM snapshots, call live DNS, call Vercel/Openprovider/registrars/SSL providers, or treat PASR shadow output as DDOM source truth.

## Billing And Stripe Boundary

Operators must resolve billing/hosting/Stripe readiness through source-owned billing workflows before launch readiness and gate evaluation. Publish enforcement must not create subscriptions, charge customers, activate hosting, call Stripe, or fill site-scoped entitlement gaps.

## PASR Boundary

PASR shadow results may help operators see likely publish activation blockers. PASR does not approve publish activation and must not be used as the enforcement source of truth.

## Rollback Boundary

If enforcement blocks before publish, rollback should not be invoked because public activation did not happen. If publish fails after enforcement passes, existing publish failure and rollback strategy applies. Gate pass does not guarantee rollback success.

## Command Center, Ops Inbox, And Client Portal

Future UI surfacing is a later milestone. MVP-45 does not add buttons, actions, badges, routes, APIs, projections, or client portal exposure.

When future surfacing exists:

- Command Center and Ops Inbox remain derived projections;
- source-owned workflows resolve blockers;
- client-facing surfaces should not expose raw AAF/evidence refs;
- no UI surface may convert a blocked gate into approval.
