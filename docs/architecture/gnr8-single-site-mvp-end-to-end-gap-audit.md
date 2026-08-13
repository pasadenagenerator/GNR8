# GNR8 Single-Site MVP End-to-End Gap Audit

Date: 2026-08-13
Phase: MVP-CUTLINE-1
Scope: Documentation and audit only.

## Audit Summary

MVP-2 through MVP-64 created a large set of source-truth, approval, readiness, publish, audit, and read-only operator primitives. The strongest implementation areas are the single-site state/evidence spine, clone and improved candidate server-side primitives, approval services and AAF bridges, launch readiness persistence/evidence packaging, publish activation request/decision/gate handoff, shadow publish route, operator action audit, and read-only Command Center diagnostics.

The actual remaining MVP gap is not another diagnostic layer. It is a thin end-to-end operator path that uses the existing primitives in order, makes missing billing/domain/rollback truth explicit, performs one real online shadow-publish rehearsal, and records the 20-site validation evidence.

## Reviewed Chain

| Area | Reviewed evidence | Current conclusion |
| --- | --- | --- |
| Capture/import | MVP-8 closeout, `single-site-capture-spine-adapter.ts`, import/capture routes, URL snapshot import | Capture can write migration/source evidence state at the route boundary. Evidence review exists as a server-side concept, but the operator path is not yet one guided workflow. |
| Source evidence review | MVP-4 to MVP-8 docs, `source-evidence-review-service.ts`, state read/write model | Source evidence review truth exists. The missing piece is easy operator access from a real imported site. |
| Clone | MVP-9 to MVP-13 docs, `single-site-clone-generation-gate.ts`, `single-site-clone-start-orchestrator.ts`, `single-site-real-clone-executor.ts`, `clone-review-service.ts` | Gate, orchestrator, real executor, and review truth exist as server-side modules. They still need a minimal operator action surface or thin orchestrator for a real site. |
| Improvement | MVP-14 to MVP-25 docs, `improvement-proposal-planning-service.ts`, `improvement-execution-service.ts`, `improved-candidate-dry-run-adapter.ts`, `improved-candidate-creation-adapter.ts`, `improved-version-review-service.ts` | Proposal planning, authorization validation, dry-run, real improved candidate creation, and review truth exist. Autonomous proposal generation is not required for MVP. |
| Approvals | MVP-26 to MVP-35 docs and content/client/launch services plus AAF bridges | Approval scopes are well-separated and mostly server-only. The risk is too many subdivisions without a single workflow surface. |
| Launch readiness | MVP-36 to MVP-40 docs, `launch-readiness-source-reader.ts`, `launch-readiness-service.ts`, `launch-readiness-evidence-builder.ts` | Launch readiness is modeled and persisted. Billing, hosting, domain, rollback, and smoke QA may be blocked/missing/stale and need MVP policy or real source truth. |
| Publish activation | MVP-41 to MVP-50 docs and request, decision, gate, enforcement guard, metadata resolver modules | Publish activation can be requested, decided, handed off, gate-evaluated, and observed in shadow. Full blocking enforcement is not required for MVP. |
| Publish wrapper/actions | MVP-51 to MVP-57 docs, wrapper, dry-run caller, shadow-publish caller/route, operator action audit | A safe internal dry-run/shadow-publish path exists, but it expects exact refs and does not create the upstream workflow. |
| Command Center | MVP-58 to MVP-64 docs, read-only projection/panel/runbook/snapshot/diff/history design | Operator visibility exists late in the publish path. It is read-only and diagnostic-heavy, not a start-to-finish action surface. |
| Existing runtime systems | Runtime store, publish orchestrator, active pointer, rollback switch, PTT, DDOM, billing/cost, public runtime, Command Center, Ops Inbox | Foundational systems exist. They are not all composed into a single-site MVP path and some source truth is partial or ambiguous. |

## Remaining Gap Table

| Area | Current state | Missing capability | Must-have for MVP: yes/no | Risk if deferred | Recommended milestone | Estimated Codex task count |
| --- | --- | --- | --- | --- | --- | --- |
| End-to-end orchestration across existing modules | Many server-side services exist, but calls are stage-local and ref-heavy. | A thin orchestration design/service boundary or runbook that sequences import, evidence review, clone, proposal, improvement, approvals, readiness, dry-run, shadow-publish, verification. | yes | Operators cannot prove a real end-to-end MVP without manually discovering hidden module order and refs. | MVP-CUTLINE-2 | 1 |
| Real operator workflow from import to publish | Publish diagnostics panel exists; import/clone/improvement/approval actions are not one guided path. | Minimal internal operator action surface or documented API-run sequence with exact inputs/outputs and next-action state. | yes | MVP remains a collection of primitives instead of a usable product path. | MVP-CUTLINE-3 | 1-2 |
| UI/action surfaces | Command Center single-site publish panel is read-only and late-stage. Admin dry-run/shadow routes exist. | Minimal controls or scripts for source review, clone start/review, proposal approval, improved candidate creation/review, approvals, launch readiness, dry-run/shadow-publish. | yes | Human validation becomes slow, error-prone, and not repeatable across 20 sites. | MVP-CUTLINE-3 | 1-2 |
| Billing/hosting entitlement truth | Billing/cost foundations exist; launch readiness dimensions include billing/hosting; site-scoped subscription/hosting entitlement truth remains uncertain from the cutline audit. | Either real site-scoped hosting entitlement source truth or explicit MVP bypass/manual attestation policy visible in launch readiness. | yes | Cannot honestly claim launch readiness; false positives could publish without commercial/hosting authorization. | MVP-CUTLINE-4 | 1 |
| Domain/DDOM/PTT readiness truth | PTT exists; DDOM snapshots/callers exist; domain binding/readiness foundations exist. | Current per-site domain intent/readiness evidence or explicit exception policy connected to launch readiness and operator view. | yes | Publish to wrong/stale/unready target or manual DNS blocker hidden until late. | MVP-CUTLINE-4 | 1 |
| Rollback/smoke QA evidence | Runtime rollback mechanics and preview smoke validator exist; launch readiness dimensions include rollback and preview smoke QA. | Minimal evidence record/checklist proving rollback target and preview/public smoke result for the candidate. | yes | Online defects and rollback uncertainty after first publish. | MVP-CUTLINE-5 or MVP-CUTLINE-6 | 1 |
| Publish blocking enforcement vs shadow-publish | Gate evaluation and shadow guard exist. Wrapper/admin route can shadow-publish through existing orchestrator. | Decide MVP policy: use explicit shadow-publish with human confirmation and audit, not full blocking enforcement. | yes | If full enforcement is attempted now, incomplete source truth can block MVP. If nothing is governed, publish is unsafe. | MVP-CUTLINE-5 | 0-1 |
| Production deployment/migrations | Many SQL migrations exist; docs/tests mention local disposable validation. | Environment checklist proving required migrations applied and deployed build includes the operator path. | yes | Local tests pass while online GNR8 lacks tables/routes/flags needed for validation. | MVP-CUTLINE-6 | 1 |
| 20-site validation harness/checklist | MVP-2 validation plan exists. | Per-site validation log/harness/checklist tied to the final MVP cutline and current route sequence. | yes | The team cannot measure whether the MVP works beyond the first demo site. | MVP-CUTLINE-7 | 1 |
| Full platform type debt vs focused validation | Type debt and platform breadth exist across many runtime/provider/UI areas. | A focused policy to fix only issues blocking one-site path and 20-site validation. | no | If ignored entirely, validation may be noisy; if tackled broadly, MVP expands indefinitely. | Freeze except blockers | 0 |
| Supabase migration application/deployment | Migrations are present in repo; application status is environment-dependent. | Exact deployment verification checklist and applied-migration evidence before online verification. | yes | Online route failures, missing-table errors, misleading readiness. | MVP-CUTLINE-6 | 1 |
| Real GNR8 online verification | Runtime publish/public serving exists; no cutline evidence that current full flow has been verified online after latest milestones. | Human online verification trigger and checklist after deploy/migrations/seeded real flow. | yes | MVP claim remains local/test-only and may fail in the hosted environment. | MVP-CUTLINE-5 and MVP-CUTLINE-6 | 1 |
| Source evidence review actionability | Source evidence truth exists. | Operator-visible accept/reject/retry action or scripted action path for seeded real site. | yes | Clone gate remains blocked or manually manipulated. | MVP-CUTLINE-3 | included |
| Clone review actionability | Clone review service exists. | Operator-visible fidelity score/issues/accept action or scripted action path. | yes | Improvement proposal starts without reliable clone acceptance. | MVP-CUTLINE-3 | included |
| Improvement proposal input | Proposal planning service exists; autonomous proposal generation is not required. | Minimal operator-authored recommendation creation/approval path. | yes | Improved candidate cannot be created from approved scope. | MVP-CUTLINE-3 | included |
| Client approval | Server-side client approval exists; client portal action deferred. | MVP policy deciding when client approval is required and how internal operator records representative approval or not-required. | yes when required | Launch approval could be conflated with client approval. | MVP-CUTLINE-3/4 | included |
| Ops Inbox | Shell/read-only/derived patterns exist. | Nothing for MVP. Keep derived-only. | no | Low if deferred; high distraction if expanded. | Deferred | 0 |
| Diagnostic snapshot persistence | MVP-64 design exists; no SQL by design. | Nothing for first MVP. Return after real validation signal. | no | Low if deferred; high scope risk if continued now. | Deferred after first online rehearsal or after 20-site signal | 0 |

## Must-Have Remaining Gaps

- Thin end-to-end sequencing across the existing modules.
- Minimal operator action surface or exact internal route sequence from import to shadow-publish.
- Honest billing/hosting readiness truth or explicit MVP bypass policy.
- Honest domain/DDOM/PTT readiness truth or explicit exception policy.
- Rollback and smoke QA evidence before publish.
- One real-site publish/shadow-publish rehearsal in the deployed environment.
- Production deployment and Supabase migration verification.
- 20-site validation harness/checklist.

## Should-Have Or Deferred Gaps

- Polished Command Center UX beyond the minimal action path.
- Client portal approval controls.
- Ops Inbox mutation/actions.
- Autonomous AI proposal generation.
- Autonomous AI implementation.
- Advanced billing/Stripe automation.
- Full publish blocking enforcement.
- Batch migration.
- Diagnostic snapshot persistence and history.

## Freeze Recommendation

Freeze until after internal single-site MVP:

- more diagnostic snapshot work;
- more read-only panel polish;
- MVP-65 diagnostic snapshot persistence;
- more AAF scope expansion;
- more approval subdivisions;
- Ops Inbox actions;
- client portal actions;
- autonomous AI proposal generation;
- autonomous AI implementation;
- advanced billing automation;
- full publish blocking enforcement, unless shadow-publish reveals an unacceptable safety issue;
- batch migration.

## MVP-65 Recommendation

Do not continue MVP-65 diagnostic snapshot persistence now. It should return only after the first real online single-site shadow-publish rehearsal identifies which diagnostic history is necessary, or after the 20-site validation set exposes repeated readiness regression patterns. Replace it with a direct end-to-end orchestration and minimal operator action path.

## Online Verification Trigger

Online verification becomes necessary after:

- the minimal end-to-end operator path is implemented;
- changes are committed, pushed, and deployed;
- Supabase migrations required by that path are applied in the target environment;
- one real site flow is seeded with source, clone, improved candidate, approval, readiness, publish activation, and gate refs;
- the internal operator route/panel can load the run as a superadmin.

Verification should check internal readiness refs, dry-run, shadow-publish, public render, domain/SSL behavior where applicable, content/layout, forms/widgets/external links, metadata, active pointer, and rollback target evidence.
