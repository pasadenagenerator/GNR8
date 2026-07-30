# GNR8 Single-Site Improvement Proposal Planning Closeout

Date: 2026-07-30
Phase: MVP-14 documentation and architecture
Scope: Single-site improvement proposal planning source-of-truth, approval, transition, and operator workflow design

MVP-14 is documentation-only. It did not implement TypeScript, JavaScript, SQL migrations, proposal tables, proposal services, AI/provider calls, proposal generation, improvement generation, content editing, runtime artifact generation, clone executor behavior, billing/subscription, domain/DNS, publish, rollback, UI/API routes, Command Center, Ops Inbox, client portal, commit, or push behavior.

## Files Reviewed

Single-site MVP baseline:

- `docs/product/gnr8-single-site-migration-mvp-boundary.md`
- `docs/product/gnr8-single-site-end-to-end-gap-audit.md`
- `docs/product/gnr8-single-site-end-to-end-gap-audit-closeout.md`
- `docs/architecture/gnr8-single-site-state-spine-implementation-design.md`
- `docs/product/gnr8-single-site-state-evidence-sql-persistence-closeout.md`
- `docs/product/gnr8-single-site-state-evidence-writer-core-closeout.md`
- `docs/product/gnr8-single-site-state-read-model-core-closeout.md`
- `docs/product/gnr8-single-site-capture-spine-integration-closeout.md`
- `docs/product/gnr8-single-site-clone-generation-gate-closeout.md`
- `docs/product/gnr8-single-site-clone-start-orchestrator-closeout.md`
- `docs/product/gnr8-single-site-real-clone-executor-closeout.md`
- `docs/product/gnr8-single-site-real-clone-executor-runtime-verification-closeout.md`
- `docs/product/gnr8-single-site-clone-review-fidelity-acceptance-closeout.md`

Single-site implementation read-only:

- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/clone-review-service.ts`
- `apps/platform/supabase/migrations/20260730120000_single_site_clone_review_core.sql`

Proposal-adjacent code/docs:

- `apps/platform/gnr8/architecture/generated-website-proposal-contract.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-import.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-persistence.ts`
- `apps/platform/gnr8/architecture/generated-proposal-bundle-persistence.ts`
- `apps/platform/gnr8/architecture/generated-proposal-bundle-odv.cli.ts`
- `docs/architecture/GNR8 Proposal Artifact Spec.md`
- `ODV_GENERATED_PROPOSAL_001/proposal-manifest.json`
- `ODV_GENERATED_PROPOSAL_002/proposal-manifest.json`
- `apps/platform/gnr8/ai/transformation-planner.ts`
- `apps/platform/gnr8/ai/transformation-executor.ts`
- `apps/platform/app/api/gnr8/ai/transformation-plan/route.ts`
- `apps/platform/app/api/gnr8/ai/transformation-execute/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/route.ts`
- `apps/platform/gnr8/architecture/source-website-understanding-projection-contract.ts`
- `apps/platform/gnr8/architecture/source-content-visual-continuity-projection-contract.ts`
- `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.ts`
- `apps/platform/gnr8/runtime/twin/twin-proposal-approval.ts`

AAF and projection docs:

- `docs/architecture/gnr8-audit-approval-foundation-design.md`
- `docs/architecture/gnr8-approval-schema-and-policy-contract.md`
- `docs/product/gnr8-audit-approval-operator-workflow.md`
- `docs/architecture/gnr8-evidence-package-contract.md`
- `docs/architecture/gnr8-command-center-read-model-contract.md`
- `docs/architecture/gnr8-ops-inbox-work-item-model.md`
- `docs/architecture/gnr8-ops-inbox-derived-work-item-contract.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-improvement-proposal-planning-architecture.md`
- `docs/architecture/gnr8-single-site-improvement-proposal-source-of-truth-design.md`
- `docs/architecture/gnr8-single-site-improvement-proposal-transition-contract.md`
- `docs/product/gnr8-single-site-improvement-proposal-operator-workflow.md`
- `docs/product/gnr8-single-site-improvement-proposal-planning-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Existing Proposal Capabilities Found

- Generated Website Proposal contract/import/persistence exists and is explicitly quarantined, non-executable, not trusted, not approval, and not canonical truth.
- Generated Proposal Bundle persistence/preview exists for read-only bundle reconstruction from persisted assets.
- Legacy Proposal Artifact Spec exists as historical architecture.
- AI transformation plan and execute routes exist for older page-storage flows; execution is mutation-capable and unsafe for MVP proposal planning.
- Website Understanding and Source Content Visual Continuity projections exist as source-evidence derivatives and planning inputs.
- Content override routes and runtime content primitives exist as future implementation targets, not proposal truth.
- Runtime artifact/version primitives exist and are clone-output/runtime truth, not proposal truth.
- Twin proposal candidate/approval previews exist as blocked, preview-only advisory projections.
- AAF docs define scoped approval/evidence/audit principles that MVP proposal planning should reuse.
- Command Center and Ops Inbox docs define derived-only surfaces that can display proposal state later but cannot own it.

## Current Proposal Capability Classification

| Capability | Classification |
| --- | --- |
| Generated Website Proposal artifacts | Generated artifact and AI/provider/manual output evidence; useful future input only |
| Generated Proposal Bundles | Generated artifact and preview artifact; useful future input only |
| Legacy Proposal Artifact Spec | Legacy/historical |
| AI transformation planning | AI/advisory output and projection; unsafe as source truth |
| AI transformation execution | Mutation-capable legacy implementation surface; unsafe for MVP proposal planning |
| Website Understanding | Projection/read model; useful future input only |
| Source Content Visual Continuity | Projection/read model; useful future input only |
| Content overrides | Canonical content mutation primitive; future implementation target only |
| Runtime versions/artifacts | Runtime source truth; cited by ref only |
| Twin proposal candidates/approval | Projection/read model, preview-only |
| AAF approval/evidence/audit | Canonical governing model for approval refs |
| Command Center/Ops Inbox | Derived projections only |

## Source-Of-Truth Recommendation

Create additive future `gnr8_single_site_proposal_*` tables and a server-only proposal planning service. Keep the existing single-site migration spine as coarse operational state. Keep AAF as approval/evidence/audit truth. Store durable refs to clone review, source evidence, runtime clone outputs, WU/VCU, advisory artifacts, proposal approvals, implementation authorizations, and supersession links.

Do not use AI raw output, generated proposal bundles, thumbnails, preview rendering, chat transcripts, Command Center projections, Ops Inbox items, external messages, or unapproved operator notes as source truth.

## Proposed Future Persistence Model

Recommended table family:

- `gnr8_single_site_proposal_plans`
- `gnr8_single_site_proposal_plan_refs`
- `gnr8_single_site_proposal_findings`
- `gnr8_single_site_proposal_recommendations`
- `gnr8_single_site_proposal_operator_notes`
- `gnr8_single_site_proposal_decision_events`
- `gnr8_single_site_proposal_revision_links`

Yes, new proposal persistence tables are recommended for implementation.

## Status Vocabulary

Proposal planning statuses:

`not_started`, `planning_required`, `draft`, `ready_for_review`, `in_review`, `changes_requested`, `approved`, `approved_with_limitations`, `rejected`, `superseded`, `cancelled`.

Impact/risk/effort vocabulary:

- impact: `low`, `medium`, `high`, `critical`
- risk: `low`, `medium`, `high`, `critical`
- effort: `small`, `medium`, `large`, `unknown`
- confidence: `low`, `medium`, `high`
- priority: `p0`, `p1`, `p2`, `p3`

## Improvement Category Vocabulary

`content_clarity`, `visual_design`, `brand_consistency`, `conversion`, `seo`, `aeo`, `accessibility`, `performance`, `mobile_responsive`, `information_architecture`, `trust_credibility`, `forms_and_leads`, `analytics_measurement`, `technical_cleanup`, `legal_or_compliance`, `unknown_or_manual`.

## Approval Boundary

- Proposal plan approval approves the recommendation plan only.
- Proposal approval does not publish.
- Proposal approval does not mutate runtime.
- Proposal approval does not approve billing.
- Proposal approval does not approve DNS/domain actions.
- Proposal approval does not replace client approval unless later designed.
- Proposal approval does not authorize implementation by default.
- Implementation authorization is separate by default and must cite approved recommendation ids and target scope.
- Content approval, client approval, launch approval, and publish activation approval remain separate.
- AI-generated proposal is advisory until a scoped human decision approves the proposal plan or accepts AI output as evidence.

## Transition Boundary

- `accepted` clone review allows proposal planning required/started.
- `accepted_with_limitations` clone review allows proposal planning required/started with limitations carried forward.
- `retry_required` clone review blocks proposal planning.
- `rejected` clone review blocks proposal planning.
- `superseded` clone review blocks proposal planning unless the latest replacement review is accepted or accepted with limitations.
- Future proposal states map to existing migration states, but proposal-specific truth needs its own persistence.
- Future implementation transitions must require implementation authorization before `improvement_implementation_started`.

## Operator Workflow Summary

The operator reviews the accepted clone, starts proposal planning, inspects source evidence and clone fidelity findings, records findings, defines recommendations, classifies recommendations, assigns risk/effort/impact, preserves limitations, requests proposal review, handles changes requested, approves or rejects the plan through AAF-scoped evidence, and later seeks separate implementation authorization before any improvement work begins.

## MVP Scope

In scope:

- operator-authored proposal planning records;
- stable refs to clone/source evidence;
- manual recommendation classification;
- future AI input-output refs as evidence only;
- proposal approval boundary;
- readiness for implementation phase.

Out of scope:

- autonomous AI proposal generation;
- autonomous implementation;
- full Digital Business Twin advisory;
- client portal review;
- billing/domain/publish coupling;
- A/B variants;
- campaign page generation;
- full redesign marketplace/playbooks.

## Architecture Warnings

- Treating AI output as canonical truth would bypass governance.
- Treating proposal approval as implementation approval would collapse two different risk decisions.
- Treating clone acceptance as proposal approval would skip improvement review.
- Mixing proposal bundles with production runtime truth would corrupt serving boundaries.
- Letting Command Center or Ops Inbox become source truth would make projections authoritative.
- Overbuilding advisory/DBT before the MVP flow works would add ambiguity before governance.
- Implementing improvements before proposal approval and implementation authorization are governed would recreate the unsafe AI-to-mutation path.

## Whether Implementation May Begin

Yes. Implementation may begin in the next milestone, but only for additive proposal planning persistence and a server-only proposal planning service. It should not implement AI generation, improvement generation, content editing, runtime mutation, billing, domain/DNS, publish, rollback, UI/API routes, Command Center, Ops Inbox, or client portal integration.

## Recommended Next Milestone

MVP-15: Single-site improvement proposal planning persistence and service core.

Recommended MVP-15 boundaries:

- create additive `gnr8_single_site_proposal_*` SQL tables;
- implement server-only proposal planning repository/service;
- consume accepted clone review refs and limitations;
- write proposal plan refs/findings/recommendations/events;
- expose no UI/API routes;
- call no AI providers;
- mutate no runtime/content/billing/domain/publish systems.

## Validation Performed

Final validation performed for MVP-14:

- confirmed all created docs exist and are readable;
- confirmed canonical index references MVP-14 docs;
- confirmed proposal approval boundary is explicit;
- confirmed AI output non-authority boundary is explicit;
- confirmed clone acceptance vs proposal approval boundary is explicit;
- confirmed proposal approval vs implementation authorization boundary is explicit;
- confirmed no TypeScript, JavaScript, SQL, migration, route, worker, runtime, provider, billing, domain, publish, rollback, UI, Command Center, Ops Inbox, client portal, or AI implementation files changed;
- ran `git diff --check`;
- ran trailing whitespace check across the MVP-14 docs and canonical index.

## Git Status Summary

Final `git status --short` showed only:

- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`;
- untracked `docs/architecture/gnr8-single-site-improvement-proposal-planning-architecture.md`;
- untracked `docs/architecture/gnr8-single-site-improvement-proposal-source-of-truth-design.md`;
- untracked `docs/architecture/gnr8-single-site-improvement-proposal-transition-contract.md`;
- untracked `docs/product/gnr8-single-site-improvement-proposal-operator-workflow.md`;
- untracked `docs/product/gnr8-single-site-improvement-proposal-planning-closeout.md`.

No implementation files changed.

## Commands Run

- `pwd`
- `rg --files docs`
- `rg --files`
- `rg -n ...`
- `sed -n ...`
- `test -e ...`
- `ls -l ...`
- `git status --short`
- `git diff --name-only`
- `git ls-files --others --exclude-standard ...`
- `git diff --check`
- `rg -n "[ \t]$" ...`

## Runtime Behavior Confirmation

No runtime behavior changed.

## Commit And Push Confirmation

No commit or push was performed.
