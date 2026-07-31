# GNR8 Single-Site Improvement Execution Readiness Closeout

Phase: MVP-19
Scope: Documentation and architecture only

MVP-19 designed the future single-site improvement execution architecture and mapped existing capability reuse. It did not implement execution, execution validators, TypeScript, SQL, routes, workers, UI, runtime mutation, site-version mutation, content overrides, AI generation, AI execution, provider calls, publish, rollback, billing, domain, DNS, Command Center, Ops Inbox, client portal, commit, or push behavior.

## Files Reviewed

Primary MVP and architecture/product docs:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- MVP-2 through MVP-18 docs and closeouts listed in the canonical index
- `docs/product/gnr8-current-capability-inventory.md`
- `docs/product/gnr8-operator-capability-map.md`
- `docs/architecture/gnr8-technical-capability-map.md`
- `docs/architecture/gnr8-single-site-migration-mvp-source-of-truth.md`
- `docs/architecture/gnr8-single-site-state-transition-contract.md`
- `docs/architecture/gnr8-single-site-improvement-proposal-source-of-truth-design.md`
- `docs/architecture/gnr8-single-site-implementation-authorization-boundary.md`
- `docs/architecture/gnr8-single-site-implementation-authorization-aaf-scope-design.md`
- AAF, DDOM, PTT, PASR, Command Center, and Ops Inbox docs surfaced through the canonical index and searches.

Primary code paths inspected read-only:

- import/capture: `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`, `apps/platform/gnr8/site/scoped-import-pipeline.ts`, `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`, `apps/platform/gnr8/import-rendered-capture/**`, `apps/platform/gnr8/multipage-import/**`, `apps/worker/gnr8/import/**`
- WU/VCU/CGP/proposal artifacts: `apps/platform/gnr8/architecture/**`
- clone/proposal/authorization: `apps/platform/gnr8/single-site/**`
- runtime: `apps/platform/gnr8/runtime/runtime-store.ts`, `apps/platform/gnr8/runtime/artifact-builder.ts`, preview/public runtime files
- content overrides: `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/**`
- Generated Proposal Bundle: `apps/platform/gnr8/architecture/generated-proposal-bundle-persistence.ts`
- AI transformation routes: `apps/platform/app/api/gnr8/ai/transformation-plan/route.ts`, `apps/platform/app/api/gnr8/ai/transformation-execute/route.ts`
- AAF/DDOM/PTT/PASR/Command Center/Ops Inbox code and docs located by repository search.

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-improvement-execution-architecture.md`
- `docs/architecture/gnr8-single-site-existing-capability-reuse-map.md`
- `docs/architecture/gnr8-single-site-improvement-execution-source-of-truth.md`
- `docs/architecture/gnr8-single-site-improvement-execution-transition-contract.md`
- `docs/architecture/gnr8-single-site-improvement-execution-aaf-revalidation-contract.md`
- `docs/product/gnr8-single-site-improvement-execution-operator-workflow.md`
- `docs/product/gnr8-single-site-improvement-execution-readiness-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Current State Summary

The single-site MVP path currently supports canonical capture integration, source evidence review, real clone generation, clone fidelity acceptance, proposal planning, and AAF-governed implementation authorization request/validation. It does not yet support governed improvement execution.

## Existing Capability Reuse Map Summary

The reuse map separates:

- direct reuse: AAF truth checks and failure diagnostics where source-owned;
- adapter reuse: runtime version/artifact creation, artifact binding, clone-executor discipline, single-site state spine;
- evidence-only reuse: capture artifacts, source evidence, Generated Proposal Bundles, DDOM/PTT/PASR where applicable;
- advisory/projection reuse: WU, VCU, CGP/brand, thumbnails, preview surfaces, Command Center/Ops Inbox;
- unsafe surfaces: AI transformation execute, content override mutation, publish/rollback/public runtime activation paths;
- missing pieces: execution-time AAF validator, execution persistence, improved candidate adapter, improved version review.

## Already Implemented And Reusable

- Client-scoped source import/capture.
- Source evidence review and gating.
- Runtime-store site version and artifact primitives.
- MVP-12 clone executor pattern for deterministic candidate creation.
- Clone review/fidelity acceptance.
- Proposal planning persistence/service.
- MVP-18 implementation authorization bridge for request/evidence/ref validation.
- AAF writer/policy/evidence/audit foundation.
- Preview/public runtime rendering primitives, with public runtime out of execution scope.
- Content override primitives, but not safe for MVP execution without a separate content boundary.

## Missing Orchestration/Gating/Ref Wiring

- Execution-time AAF validator core.
- Execution attempt/ref/event/item persistence.
- Improved candidate runtime adapter.
- Deterministic recommendation-to-candidate change mapping.
- Execution evidence/result builder.
- Improved version review records.
- Limitation carry-forward enforcement.
- Direct-route bypass guardrails for AI/content/publish surfaces.

## Unsafe Or Advisory Only

- AI transformation execute route is unsafe for MVP execution.
- Content override routes are unsafe for MVP execution.
- Publish/rollback/public runtime activation routes are out of scope.
- Generated Proposal Bundles are evidence/review artifacts, not runtime truth.
- WU/VCU/CGP are advisory/projection artifacts, not canonical execution truth.
- Command Center and Ops Inbox are projections only.

## Execution Scope Definition

MVP improvement execution should create one new improved candidate runtime version/artifact from the accepted clone version and approved proposal recommendations, record refs/evidence/watermarks/limitations, and require improved version review. It must not publish, switch active pointer, mutate production, edit domain/DNS/billing, or imply content/client/launch/publish approval.

## Existing Primitive Classification

The safest primitive class is runtime candidate version/artifact creation behind a new adapter. Generated Proposal Bundles, WU/VCU/CGP, proposal previews, and AI outputs are evidence/advisory. AI execution routes, content override writes, publish, rollback, and public runtime mutation are unsafe for MVP execution.

## Selected Future Primitive Recommendation

Use a new server-only improved candidate adapter modeled after MVP-12 clone executor discipline. It should create a non-published candidate runtime site version and review/shadow artifact, then write execution refs/evidence. It must not call AI execution routes or Generated Proposal Bundle output as production truth.

## Source-Of-Truth Decision

Future improvement execution attempts should have their own source-truth persistence. Proposal planning owns proposal truth; AAF owns authorization truth; runtime owns candidate version/artifact truth; improved version review owns candidate acceptance for later content approval; Command Center/Ops Inbox remain derived.

## AAF Revalidation Contract Summary

Execution-time AAF revalidation is mandatory. It must check exact scope, granted/granted-with-limitations decision, current subject refs, evidence package, semantic watermarks, freshness, limitations, actor permission, correlation, and idempotency. Attach-time validation is not enough.

## Future Persistence Recommendation

Create future tables:

- `gnr8_single_site_improvement_execution_attempts`
- `gnr8_single_site_improvement_execution_refs`
- `gnr8_single_site_improvement_execution_events`
- `gnr8_single_site_improvement_execution_items`

Do not overload proposal tables or runtime provenance JSON as the only execution source truth.

## Transition Contract Summary

Future transitions should move from proposal approval to implementation authorization required/granted, then execution started/in progress/completed or failed, then improved version review required, then accepted/rejected/retry-required. Completion does not imply content approval, client approval, launch approval, or publish approval.

## Operator Workflow Summary

Operators review the approved proposal, verify implementation authorization, run future execution only after execution-time AAF validation, review the improved candidate against recommendations and limitations, request revisions or accept for later content approval, and preserve evidence/audit refs.

## Explicit Deferrals

- Execution implementation.
- Execution-time validator implementation.
- Runtime mutation.
- AI generation/execution.
- Content approval/client approval/launch approval/publish approval.
- Publish/rollback.
- Billing/subscription/hosting activation.
- Domain/DNS changes.
- UI/API/Command Center/Ops Inbox/client portal integration.

## Architecture Warnings

- Do not rebuild existing capture/WU/VCU/CGP capabilities unnecessarily.
- Do not mistake projections/advisory artifacts for truth.
- Do not execute from stale refs.
- Do not call broad AI execution as a shortcut.
- Do not treat Generated Proposal Bundle as production truth.
- Do not mutate production or switch active pointer.
- Do not skip approval boundaries.
- Do not drop limitations.
- Do not let idempotency drift duplicate candidates.
- Do not let direct routes bypass AAF.

## Whether Implementation May Begin

Implementation of runtime mutation should not begin yet. The next safe implementation may begin only as the narrow MVP-20 execution-time AAF validator core. Candidate-version mutation should wait until that validator exists and is validated.

## Recommended Next Milestone

MVP-20 execution-time AAF validator core.

Reason: existing runtime primitives are reusable behind an adapter, but fail-closed execution-time authorization is the narrow prerequisite before any mutation-oriented executor boundary.

## Validation Performed

Passed:

- created docs exist and are readable;
- canonical index references MVP-19 docs;
- required sections are present across architecture, source-of-truth, transition, AAF revalidation, reuse map, operator workflow, and closeout docs;
- reuse map includes import/capture, WU, CGP/brand, VCU, runtime, proposal, and governance areas;
- execution-time AAF revalidation is explicit;
- implementation authorization vs content/client/launch/publish approval boundary is explicit;
- AI/provider output non-authority boundary is explicit;
- existing capability reuse vs missing orchestration/gating/ref wiring is explicit;
- changed-file status shows only allowed documentation/index paths;
- `git diff --check` passed;
- trailing whitespace check across MVP-19 docs and canonical index returned no matches.

## Git Status Summary

Modified:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Untracked:

- `docs/architecture/gnr8-single-site-existing-capability-reuse-map.md`
- `docs/architecture/gnr8-single-site-improvement-execution-aaf-revalidation-contract.md`
- `docs/architecture/gnr8-single-site-improvement-execution-architecture.md`
- `docs/architecture/gnr8-single-site-improvement-execution-source-of-truth.md`
- `docs/architecture/gnr8-single-site-improvement-execution-transition-contract.md`
- `docs/product/gnr8-single-site-improvement-execution-operator-workflow.md`
- `docs/product/gnr8-single-site-improvement-execution-readiness-closeout.md`

No TypeScript, JavaScript, SQL, migration, route, worker, runtime, provider, billing, domain, publish, rollback, UI, Command Center, Ops Inbox, client portal, or AI implementation files were changed.

## Commands Run

- `rg --files docs | rg 'MVP|mvp|single-site|capability|inventory|AAF|Command|Ops|publish|DDOM|PTT|CANONICAL'`
- `rg --files | rg 'import|capture|understanding|visual|continuity|cgp|brand|clone|runtime|proposal|transformation|override|publish|rollback|aaf|approval|evidence|audit|command|ops|ddom|ptt'`
- `git status --short`
- `sed -n ...` over canonical index, capability inventory/map docs, MVP closeouts, implementation authorization docs, proposal source-of-truth docs, runtime/public/content/AI paths, and generated proposal bundle persistence.
- `rg -n ...` searches over runtime, single-site, capture/import, architecture, AAF, DDOM, Command Center, Ops Inbox, and publish-shadow paths.
- readability check for all MVP-19 docs and the canonical index.
- canonical index reference search for MVP-19 docs.
- reuse-map required-area search.
- boundary/revalidation/non-authority search across MVP-19 docs.
- `git diff --check`
- trailing whitespace check with `rg -n "[ \t]$" ...`
- `git diff --name-only`

## Confirmation

No runtime behavior changed. No commit or push was performed.
