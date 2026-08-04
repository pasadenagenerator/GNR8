# GNR8 Single-Site Launch Readiness Architecture Closeout

Phase: MVP-36
Date: 2026-08-03
Scope: Documentation and architecture only.

MVP-36 defines the source-of-truth, evidence, readiness, transition, source-reader, and operator workflow architecture for single-site launch readiness after validated launch approval and before publish activation review.

No SQL, TypeScript, JavaScript, routes, services, UI, API, workers, providers, billing activation, domain/DNS mutation, DDOM snapshot creation, AAF approval/evidence/gate creation, runtime mutation, publish activation, publish execution, rollback execution, Command Center actions, Ops Inbox actions, client portal work, commit, or push was performed.

## Files Reviewed

- MVP-2 single-site boundary/state/source-of-truth docs.
- MVP-3 gap audit, blockers, and next sequence docs.
- MVP-30 client/launch approval architecture and AAF scope design.
- MVP-31 client/launch approval AAF contracts closeout.
- MVP-34 launch approval persistence/service closeout.
- MVP-35 launch approval AAF bridge closeout.
- DDOM source-state, persistence, writer, caller, trigger, workflow, and closeout docs.
- PTT publish target source truth design and persistence closeout.
- PASR source reader, shadow observer, read model, redaction, Command Center surfacing, and Ops Inbox surfacing closeouts.
- AAF publish activation dry-run/evidence/source-reader docs and closeouts.
- Billing/cost/Stripe/entitlement audit and service evidence.
- Runtime-store, publish orchestrator, publish guard/enforcement/safety, rollback switch, public runtime/preview/smoke surfaces.
- Command Center and Ops Inbox derived-only docs.

Representative implementation evidence reviewed read-only:

- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.ts`
- `apps/platform/gnr8/runtime/publish-safety-check.ts`
- `apps/platform/gnr8/runtime/rollback-switch.ts`
- `apps/platform/gnr8/runtime/preview-smoke/preview-smoke-validator.ts`
- `apps/platform/gnr8/ddom/*`
- `apps/platform/gnr8/aaf/*publish*`
- `apps/platform/gnr8/ptt/*`
- `apps/platform/gnr8/billing/*`
- `packages/core/src/modules/billing/service.ts`

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-launch-readiness-source-of-truth.md`
- `docs/architecture/gnr8-single-site-launch-readiness-evidence-architecture.md`
- `docs/architecture/gnr8-single-site-launch-readiness-transition-contract.md`
- `docs/architecture/gnr8-single-site-launch-readiness-source-reader-design.md`
- `docs/product/gnr8-single-site-launch-readiness-operator-workflow.md`
- `docs/product/gnr8-single-site-launch-readiness-architecture-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Final Definition

Launch readiness means that after validated `single_site_launch_approval`, GNR8 has enough current evidence that the improved candidate is operationally ready to proceed toward publish activation review.

It is not publish activation approval, active pointer mutation, public publish execution, DNS/provider ownership truth, billing payment truth, client/content/launch approval, rollback execution, Command Center truth, or Ops Inbox truth.

## Source-Of-Truth Summary

Canonical owners remain separate:

- AAF/single-site workflows own launch, content, client, and publish activation approval truth by exact scope.
- Runtime owns candidate site version, artifact, active pointer, and runtime artifact truth.
- PTT owns publish target truth.
- DDOM owns stored domain readiness snapshots and refs.
- External providers own their own live/provider/payment/DNS/registrar truth.
- Stripe owns customer/payment/subscription truth where applicable.
- GNR8 billing/hosting owns local entitlement and operating readiness once site-scoped source truth exists.
- Command Center and Ops Inbox remain derived-only.
- PASR remains shadow/non-enforcing diagnostic evidence only.

## Evidence Architecture Summary

The future package should include launch/content/client approval refs, improved candidate refs, publish target refs, DDOM/domain refs, DNS/operator evidence, Vercel/custom-domain/SSL stored-state refs, billing/hosting/Stripe refs, rollback readiness refs, preview/smoke QA refs, limitations, blockers, audit refs, and optional PASR shadow refs.

Every category must carry source refs, preferred/fallback watermarks, freshness, missing/stale/blocker behavior, owner workflow, and whether it blocks launch readiness or publish activation later.

## Existing Implementation Classification

| Area | Classification | Notes |
| --- | --- | --- |
| DDOM snapshot persistence/writer/caller/trigger | Directly reusable for domain readiness evidence, with source-owned refresh outside PASR. | Append-only snapshots/refs, deterministic watermarks, no provider calls. |
| PTT publish target truth | Directly reusable as publish target source truth. | MVP production target exists; admin/audit workflow still future. |
| PASR source reader/shadow/read model | Adapter reusable/evidence-only. | Useful principles and optional diagnostics; not broad launch readiness source truth or enforcement. |
| PASR redaction/Command Center/Ops surfacing | Derived-only. | Operator projections only; cannot satisfy readiness. |
| AAF publish activation evidence/gate | Evidence-only for downstream publish activation. | Separate scope; does not grant launch readiness or execution. |
| Billing/cost/entitlement services | Needs verification and missing site-scoped readiness source. | Cost centers, Stripe webhooks, org entitlement exist; launch readiness needs site hosting entitlement truth. |
| Runtime-store/read paths | Adapter reusable with caution. | Canonical tables are useful; `runtime-store.ts` is mixed read/write. Future reader should use read-only repository. |
| Publish orchestrator/guard/enforcement/safety | Unsafe for MVP launch readiness source. | It can mutate artifacts and active pointers; PASR shadow remains non-blocking. |
| Rollback switch | Evidence-only/unsafe for readiness execution. | Mechanics exist but readiness proof is missing; do not execute during readiness. |
| Domain/Vercel/Openprovider helper code | Evidence-only or unsafe depending path. | Stored state/instructions useful; live provider/DNS/registrar calls forbidden for readiness review. |
| Preview/smoke validator | Adapter reusable for smoke evidence. | Needs persisted/current run refs for readiness package. |
| Command Center/Ops Inbox surfaces | Derived-only. | Useful for operator routing, not source truth or resolution. |
| External provider state | Needs verification. | Providers remain authoritative; GNR8 can store refs/snapshots only. |
| Launch readiness persistence/service/source reader | Missing. | This is the recommended next implementation layer. |

## Boundaries Confirmed

Domain/DDOM:

- DDOM readiness is a publish prerequisite, not launch approval or publish activation approval.
- DDOM snapshots must be created by source-owned DDOM workflows outside PASR.
- External DNS/registrar truth remains external.

Billing/subscription/hosting:

- Stripe is payment/customer/subscription truth where applicable.
- GNR8 must own site-scoped hosting entitlement and operating readiness before claiming launch readiness.
- Current billing foundations are not enough to claim site launch readiness.

Publish activation:

- Publish activation remains exact-scope AAF `publish_activation`.
- Launch readiness can hand off to publish activation approval required; it cannot approve or execute publish.

Command Center/Ops Inbox:

- Both are derived-only and cannot become source truth, approvals, blocker resolution, or mutation authority.

Runtime mutation:

- Launch readiness must not mutate runtime artifacts, site versions, active pointers, content overrides, publish targets, rollback state, or public runtime behavior.

## Risks Found

- Billing/hosting readiness is the largest missing source-truth gap for launch readiness.
- Rollback readiness evidence is not first-class even though rollback mechanics exist.
- Preview/smoke QA can run, but persisted candidate-scoped smoke evidence is not yet a launch readiness source.
- Runtime-store has canonical read data but mixed read/write helpers; future readers must avoid mutation imports.
- PASR shadow output may be mistaken for enforcement unless every readiness surface labels it diagnostic only.
- Current publish orchestration can mutate active pointers before full MVP launch readiness enforcement exists.

## Implementation Recommendation

Implementation may begin after MVP-36, but only in a narrow, conservative sequence.

Recommended next milestone: launch readiness persistence core.

Reason:

- The readiness package needs a canonical header/status/ref container before a source reader or evidence builder has a durable subject.
- Billing/hosting and rollback source truth are still incomplete, so persistence must allow explicit missing/stale/blocked diagnostics without pretending ready.
- The future source reader can then populate this package read-only.

Recommended sequence:

1. Launch readiness persistence core: header, dimensions, refs, blockers, limitations, events, no services that call providers or mutate source truth.
2. Launch readiness source reader: read-only, deterministic refs/watermarks, missing/stale/blocked diagnostics.
3. Billing/hosting MVP-lite architecture if site-scoped entitlement truth remains ambiguous.
4. Billing/hosting persistence/service for site-scoped hosting entitlement.
5. Rollback readiness evidence architecture/persistence.
6. Smoke QA evidence persistence.
7. DDOM readiness integration into launch readiness using existing snapshots only.
8. Launch readiness evidence builder.
9. Publish activation approval handoff.

Do not begin publish enforcement, publish execution changes, provider/DNS mutation, Command Center actions, Ops Inbox actions, or client portal exposure from MVP-36.

## Acceptance

MVP-36 is safe to accept as a documentation/architecture phase if validation confirms only the six Markdown docs and canonical index changed, all docs are indexed, required boundary statements are present, and no runtime behavior changed.
