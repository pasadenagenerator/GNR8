# GNR8 Single-Site Improvement Proposal Planning Architecture

Date: 2026-07-30
Phase: MVP-14 documentation architecture
Scope: Single-site improvement proposal planning boundary after clone fidelity acceptance

This document is documentation and architecture only. It does not implement TypeScript, JavaScript, SQL migrations, proposal persistence, proposal services, proposal generation, AI/provider calls, content editing, runtime artifact generation, clone execution, billing, domain/DNS, publish, rollback, UI, API routes, Command Center, Ops Inbox, client portal, commit, or push behavior.

## Purpose

MVP-13 made clone review and fidelity acceptance canonical. MVP-14 defines the next boundary: how GNR8 should represent and govern improvement proposal planning for one migrated site after the clone has been accepted or accepted with limitations.

The core architectural rule is:

`accepted clone review -> proposal planning -> proposal review -> proposal approval -> implementation authorization -> improved version creation -> content approval -> launch approval -> publish approval`

No earlier decision collapses a later decision. Clone acceptance is not proposal approval. Proposal approval is not implementation authorization unless a future implementation deliberately creates one narrowly scoped combined approval and proves why that shortcut is safe. Client review is not technical publish approval.

## Current Baseline

The current end-to-end state after MVP-13 is:

- capture is recorded into the single-site state spine by MVP-8;
- source evidence review gates clone generation through MVP-9 and MVP-11;
- clone generation is real, server-only, deterministic, and runtime-store verified by MVP-12 and MVP-12-VERIFY;
- clone review and fidelity acceptance are canonical in `gnr8_single_site_clone_reviews` and related refs/items/events from MVP-13;
- accepted and accepted-with-limitations clone reviews set proposal planning readiness in the read model and transition service;
- no canonical improvement proposal planning model exists yet.

The existing single-site migration spine already contains coarse proposal states:

- `improvement_proposal_started`
- `improvement_proposal_ready`
- `improvement_proposal_approved`
- `improvement_proposal_rejected`

Those states are useful as top-level migration stage markers, but they are not enough to hold proposal plan header data, recommendations, decisions, approval refs, implementation authorization refs, revision lineage, or evidence refs.

## Architectural Boundary

Proposal planning is the governed planning layer between clone acceptance and improvement implementation. It describes what should be improved, why, from which evidence, at what risk/impact/effort, and under which approval status.

Proposal planning must not:

- generate an improved runtime version;
- mutate content slots or overrides;
- mutate runtime artifacts, runtime site versions, active pointers, domains, billing, subscriptions, hosting entitlements, or publish targets;
- call AI providers;
- execute transformation steps;
- treat generated prose or bundle previews as truth;
- treat Command Center or Ops Inbox projection as source truth.

Proposal planning may later cite:

- accepted clone review refs and limitations;
- source evidence review refs and source evidence items;
- runtime clone version/artifact refs;
- website understanding and visual continuity projection refs;
- generated proposal/advisory bundle refs;
- operator notes after they are promoted into a reviewed plan;
- AAF evidence package, approval request, approval decision, audit, and policy refs.

## Existing Proposal-Adjacent Capability Classification

| Capability | Files inspected | Classification | MVP-14 treatment |
| --- | --- | --- | --- |
| Generated Website Proposal contract/import/persistence | `apps/platform/gnr8/architecture/generated-website-proposal-contract.ts`, `generated-website-proposal-import.ts`, `generated-website-proposal-persistence.ts` | Generated artifact and AI/provider/manual-output evidence; not canonical truth | Useful future input only. It is explicitly quarantined, non-executable, not approval, and not canonical truth. |
| Generated Proposal Bundle persistence/preview | `apps/platform/gnr8/architecture/generated-proposal-bundle-persistence.ts`, `generated-proposal-bundle-odv.cli.ts`, `ODV_GENERATED_PROPOSAL_*` | Generated artifact and preview artifact | Useful future input only. It may be cited by ref, but the bundle and preview are never proposal approval or runtime truth. |
| Legacy Proposal Artifact Spec | `docs/architecture/GNR8 Proposal Artifact Spec.md` | Legacy/historical architecture | Useful vocabulary only. It predates the single-site spine and must not be treated as the MVP-14 source-of-truth contract. |
| AI transformation planning | `apps/platform/gnr8/ai/transformation-planner.ts`, `app/api/gnr8/ai/transformation-plan/route.ts` | AI/advisory planning output and projection | Unsafe for MVP proposal planning as source truth. May inform future recommendation drafts after refs and advisory evidence boundaries exist. |
| AI transformation execution | `apps/platform/gnr8/ai/transformation-executor.ts`, `app/api/gnr8/ai/transformation-execute/route.ts` | Mutation-capable legacy execution surface | Unsafe for MVP proposal planning. Must not be wired to proposal approval or implementation authorization without a later governed implementation milestone. |
| Website Understanding projection | `apps/platform/gnr8/architecture/source-website-understanding-projection-contract.ts` | Projection/read model and source evidence derivative | Useful future input only. It can support business/context refs but does not approve recommendations. |
| Source Content Visual Continuity projection | `apps/platform/gnr8/architecture/source-content-visual-continuity-projection-contract.ts` | Projection/read model and source evidence derivative | Useful future input only. It can support continuity and asset/content policy refs. |
| Content override routes/runtime | `app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/route.ts`, runtime content override files | Canonical content mutation primitives for drafts/overrides | Future implementation target only. Not proposal planning truth and not authorized by proposal planning alone. |
| Runtime artifact/version flows | `apps/platform/gnr8/runtime/runtime-store.ts`, `artifact-builder.ts`, single-site clone executor | Runtime/version/artifact source truth | Future implementation target only. Proposal planning may cite clone refs; it must not mutate runtime. |
| Twin proposal candidates/approvals | `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.ts`, `twin-proposal-approval.ts` | Projection/read model, preview-only advisory | Useful future input only. It is blocked, non-executable, and not a single-site approval source. |
| AAF approval/evidence/audit docs and implementation | AAF docs and persistence closeouts | Canonical approval/evidence/audit foundation | Required governing pattern. Proposal planning should use AAF refs rather than inventing a parallel approval model. |
| Command Center and Ops Inbox docs/projections | Command Center/Ops docs and read model contracts | Projection/read model | Useful display targets only. They must never become proposal source truth. |

## Proposal Planning Model

The future implementation should create a source-owned single-site proposal planning service and additive `gnr8_single_site_proposal_*` persistence family. The existing migration spine should remain the operational state header; proposal-specific detail should live in proposal tables.

Minimum canonical records:

- proposal plan header;
- proposal plan refs;
- proposal findings;
- recommended improvements;
- operator notes;
- AI/provider input-output refs, if used later;
- clone review refs;
- source evidence refs;
- business/context refs;
- visual continuity refs;
- proposal decision events;
- proposal approval refs;
- implementation authorization refs;
- supersession/revision refs.

## Vocabulary

Required proposal planning statuses:

- `not_started`
- `planning_required`
- `draft`
- `ready_for_review`
- `in_review`
- `changes_requested`
- `approved`
- `approved_with_limitations`
- `rejected`
- `superseded`
- `cancelled`

Required improvement categories:

- `content_clarity`
- `visual_design`
- `brand_consistency`
- `conversion`
- `seo`
- `aeo`
- `accessibility`
- `performance`
- `mobile_responsive`
- `information_architecture`
- `trust_credibility`
- `forms_and_leads`
- `analytics_measurement`
- `technical_cleanup`
- `legal_or_compliance`
- `unknown_or_manual`

Impact, risk, and effort vocabulary should be deliberately small for MVP:

- impact: `low`, `medium`, `high`, `critical`
- risk: `low`, `medium`, `high`, `critical`
- effort: `small`, `medium`, `large`, `unknown`
- confidence: `low`, `medium`, `high`
- priority: `p0`, `p1`, `p2`, `p3`

## Approval Boundaries

Use AAF principles. Each approval is scoped, evidence-backed, append-only, and non-executing.

Proposal plan approval:

- approves the plan as a reviewed recommendation set;
- may include limitations and excluded recommendations;
- does not mutate runtime;
- does not create an improved version;
- does not publish;
- does not approve billing, DNS, domain, launch, rollback, or content publication.

Implementation authorization:

- authorizes a later implementation attempt for approved recommendation ids and exact target scope;
- may be separate from proposal approval by default;
- should cite the approved proposal plan, evidence package, actor, role, policy, and expiration;
- does not approve final content or launch.

Content approval:

- reviews implemented content/output after an improved preview exists;
- is separate from proposal plan approval and implementation authorization.

Client approval:

- may record client-facing acceptance where policy allows;
- does not replace technical publish activation approval unless a later policy explicitly defines a combined scope.

Launch approval:

- approves business launch readiness context;
- does not switch active pointers.

Publish activation approval:

- approves one technical publish activation attempt;
- remains separate from proposal approval, implementation authorization, client review, and launch approval.

AI-generated proposal content is advisory until a human-approved proposal plan cites it. AI output cannot approve, authorize, mutate, publish, close work items, or become canonical truth by itself.

## MVP Scope

In MVP-14 proposal planning design, in scope:

- operator-authored proposal planning records;
- stable refs to clone review and source evidence;
- manual recommendation classification;
- future AI input-output refs as advisory evidence only;
- proposal approval boundary;
- readiness for a future implementation milestone.

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

- Do not treat AI output as canonical truth.
- Do not treat proposal approval as implementation approval by default.
- Do not treat clone acceptance as proposal approval.
- Do not mix generated proposal bundles with production runtime truth.
- Do not let Command Center or Ops Inbox become source truth.
- Do not overbuild DBT/advisory strategy before the single-site flow works.
- Do not implement improvements before proposal approval and implementation authorization are governed.

## Recommendation

MVP-15 may begin implementation of additive proposal planning persistence and a server-only proposal planning service. That implementation should not call AI providers, create improved versions, mutate runtime artifacts, edit content, publish, touch billing/domain systems, or wire UI/API routes unless those are explicitly scoped in later milestones.
