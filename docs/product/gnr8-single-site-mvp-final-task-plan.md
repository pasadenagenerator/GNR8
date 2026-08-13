# GNR8 Single-Site MVP Final Task Plan

Date: 2026-08-13
Phase: MVP-CUTLINE-1
Scope: Product plan only.

## Planning Decision

The next work should be limited to 8 Codex tasks. The sequence must produce visible or user-testable single-site behavior as early as possible and avoid new diagnostic/governance expansion.

## Final Task Sequence

| # | Task | Objective | Allowed boundary | Must not do | Acceptance signal | Visible/user-testable |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | MVP-CUTLINE-2 - End-to-End Single-Site Orchestration Contract | Define or implement the thinnest sequencer that maps existing services, refs, states, inputs, outputs, and idempotency keys from import through shadow-publish. | Architecture doc or one narrow server-only orchestration facade if implementation is authorized in the next phase. | Do not add diagnostics, SQL, AI autonomy, provider calls, publish behavior changes, or broad refactors. | A single table/contract shows every step, required refs, source owner, next action, and failure state. | Partly, if exposed through a dry-run script or route later. |
| 2 | MVP-CUTLINE-3 - Minimal Operator Action Surface For Existing Workflow | Give an internal operator a minimal way to run or record source review, clone start/review, proposal approval, improved candidate creation/review, content/client/launch approval, launch readiness, dry-run, and shadow-publish for one site. | Existing Command Center/admin namespace or internal scripts/routes; reuse existing services. | Do not polish read-only panels, add client portal/Ops Inbox actions, or invent new approval scopes. | Operator can complete the flow for a seeded site without reading source code. | Yes. |
| 3 | MVP-CUTLINE-4 - Billing, Hosting, Domain, DDOM, And PTT MVP Truth Policy | Close readiness truth for billing/hosting/domain or define explicit one-site MVP bypass/attestation records and labels. | Launch readiness policy docs plus minimal source-truth wiring only if authorized later. | Do not automate Stripe checkout, live DNS, registrar, Openprovider, or provider mutation. | Launch readiness cannot silently mark billing/hosting/domain ready; it is ready, blocked, stale, not required, or exception-approved. | Yes, in operator readiness view/checklist. |
| 4 | MVP-CUTLINE-5 - One Real-Site Publish/Shadow-Publish Rehearsal | Run one real site through the existing path in a controlled environment with exact refs, dry-run, shadow-publish, audit, and post-publish verification. | One selected real site, internal operator route/admin route, existing publish wrapper/orchestrator. | Do not enable autonomous publish, batch migration, full enforcement, or provider mutation. | Rehearsal closeout records source URL, clone, improved candidate, approvals, readiness, dry-run, shadow-publish result, public URL, defects, rollback target, and screenshots/refs. | Yes. |
| 5 | MVP-CUTLINE-6 - Online Deploy And Supabase Migration Verification Checklist | Prove deployed GNR8 has the routes, flags, migrations, and seed data needed for the real-site rehearsal. | Documentation/checklist and environment verification commands or scripts in a later implementation task. | Do not apply migrations in this documentation phase; do not modify runtime behavior here. | Human can verify commit, deploy, applied migrations, feature flags, route availability, and seeded refs before online testing. | Yes, via online route checks. |
| 6 | MVP-CUTLINE-7 - 20-Site Validation Harness And Runbook | Create the per-site validation checklist/log and aggregate rollup for 20 one-site-at-a-time runs. | Product docs or a minimal structured file/form if implementation is authorized later. | Do not build batch migration or broad dashboards first. | Each site has required inputs, decisions, metrics, exceptions, defects, publish/verification state, rollback evidence, and closeout. | Yes. |
| 7 | MVP-CUTLINE-8 - 20-Site Validation Fix Pass | Fix only blockers found while running the 20-site set. | Narrow fixes proven by validation data. | Do not address general platform type debt, polish, or new governance layers unless blocking validation. | Validation blockers are categorized, resolved, deferred, or declared no-go with evidence. | Yes. |
| 8 | MVP-CUTLINE-9 - MVP Acceptance Closeout | Decide whether internal single-site MVP is accepted, conditionally accepted, or no-go. | Closeout docs, validation report, canonical index update. | Do not add implementation while closing out. | Closeout includes acceptance result, 20-site metrics, remaining risks, deferred work, and next post-MVP sequence. | Yes, as the final acceptance artifact. |

## Task Count Estimate

Minimum tasks to internal single-site MVP: 4 to 5 tasks.

Assumptions:

- existing server-side services work as documented;
- billing/domain gaps can use explicit MVP bypass/attestation for the first internal site;
- the operator can tolerate a minimal internal route/script workflow;
- no major deployed Supabase schema drift appears.

Realistic tasks to online validated MVP: 7 to 9 tasks.

Assumptions:

- at least one implementation task is needed for the operator action path;
- one task is needed for billing/domain/readiness policy or wiring;
- one task is needed for online deploy/migration verification;
- one task is needed for the 20-site harness;
- one or two fix-pass tasks are likely after real sites reveal capture, clone, readiness, or route gaps.

Stretch tasks to polished demo MVP: 10 to 14 tasks.

Assumptions:

- polish includes better Command Center flow, fewer raw refs, clearer status grouping, screenshot-backed validation, partial client-facing review, and demo data reset/replay tooling;
- this should happen only after the internal MVP path works.

## Explicit Replacement For MVP-65

MVP-65 diagnostic snapshot persistence should be paused. The replacement is:

1. MVP-CUTLINE-2 to define the single path.
2. MVP-CUTLINE-3 to make the path operator-runnable.
3. MVP-CUTLINE-5 to verify the path on one real online site.

Snapshot persistence can return when real operators have produced repeated cases where historical snapshots would have prevented confusion or reduced validation time.

## Online Verification Timing

Human online verification is required after the first implementation task that creates a runnable end-to-end operator path is committed, pushed, deployed, and backed by applied Supabase migrations. It is not required during MVP-CUTLINE-1 because this phase changes docs only.
