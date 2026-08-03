# GNR8 Single-Site Content Approval Architecture

Phase: MVP-26
Scope: Documentation and architecture only.

This document defines the content approval boundary for a migrated and improved single-site candidate after MVP-25 improved version review acceptance. It does not implement TypeScript, SQL, services, routes, UI, Command Center actions, Ops Inbox actions, client portal flows, runtime mutation, active pointer changes, publish activation, rollback, billing, domain/DNS, provider calls, AI calls, commits, or pushes.

## Baseline Confirmed

The reviewed baseline supports this sequence:

- MVP-15 proposal planning records approved recommendations, findings, limitations, and implementation authorization refs.
- MVP-21 improvement execution records attempt truth, selected recommendation refs, output refs, limitations, and non-approval flags.
- MVP-23 improved candidate dry-run creates deterministic planned change evidence only.
- MVP-24 improved candidate creation creates or reuses a non-published improved candidate site version and runtime artifact, without publish or approval.
- MVP-25 improved version review records operator acceptance of that improved candidate and can make content review required, but explicitly keeps `content_approval_granted`, client approval, launch approval, publish activation approval, active pointer mutation, runtime artifact mutation, and site version mutation false.

Content approval does not yet exist as canonical single-site truth. Existing content routes can read and mutate content overrides, publish draft overrides, and roll back override history, but they are not aligned with the single-site content approval state spine and must not be treated as canonical content approval.

## Definition

Content approval is a scoped, evidence-backed decision that the latest accepted improved candidate's visible content is acceptable for later client/launch approval work.

It answers:

- whether visible page content is acceptable;
- whether headings, body copy, calls to action, metadata, alt text, internal links, and structured data are acceptable within MVP scope;
- whether approved proposal recommendations are reflected sufficiently;
- whether not-applied or unsupported recommendations are explained;
- whether known limitations from clone review, proposal planning, implementation authorization, execution, and improved version review are carried forward;
- whether SEO/AEO metadata and content changes are acceptable;
- whether legal, compliance, accessibility, brand, translation, or manual caveats are recorded;
- whether the candidate is content-ready for a later client/launch approval stage.

It does not answer:

- whether the client approved the site;
- whether launch is approved;
- whether domain, DNS, SSL, billing, subscription, hosting entitlement, or provider readiness is satisfied;
- whether publish activation is approved;
- whether a runtime active pointer may change;
- whether public runtime publication may occur;
- whether rollback readiness is complete.

## Content Surface

The content approval review surface covers:

- visible page content and section copy;
- headings and hierarchy;
- body copy and labels;
- calls to action;
- metadata title and description;
- SEO/AEO content and metadata changes;
- alt text and accessible content labels;
- internal links and navigation labels;
- structured data where applicable;
- proposal recommendation coverage;
- known limitations and caveats;
- unsupported, deferred, or not-applied recommendations;
- manual legal/compliance notes.

Content approval should not broaden into:

- final client approval;
- domain readiness or DNS/SSL;
- billing or hosting activation;
- launch checklist completion;
- publish activation or content publish;
- active pointer mutation;
- technical runtime readiness beyond content evidence freshness;
- rollback readiness.

## Prerequisites

Content approval is blocked until the latest improved version review for the migration is `accepted` or `accepted_with_limitations`.

Required baseline refs:

- tenant, client, site, and single-site migration;
- latest accepted improved version review;
- improved candidate site version ref;
- improved runtime artifact ref;
- proposal plan and proposal approval refs;
- implementation authorization refs;
- improvement execution attempt refs;
- selected recommendation refs;
- clone review and source evidence review refs;
- limitations and not-applied recommendation refs.

An accepted improved version review is a prerequisite only. It is not content approval.

## Approval Actor

MVP content approval should be grantable only by a GNR8 human content operator, agency admin, or platform superadmin role allowed by policy for the exact tenant/client/site/migration scope.

System actors may request content approval, create derived readiness, or build evidence packages, but may not grant approval. AI/provider output may be evidence only. Client reviewers should not grant MVP content approval unless a later client-review milestone explicitly bridges a client role into a separate policy.

## Evidence Requirement

Content approval must be based on evidence refs rather than previews alone. Required evidence includes rendered and content snapshots, recommendation coverage, SEO/AEO metadata summary, accessibility and content caveats, legal/compliance notes, known limitations, unresolved/not-applied recommendations, operator notes, and audit timeline refs.

Preview rendering may be evidence. It is not approval truth.

## Status Vocabulary

Content approval workflow status:

- `not_required_yet`
- `required`
- `draft`
- `ready_for_review`
- `in_review`
- `changes_requested`
- `approved`
- `approved_with_limitations`
- `rejected`
- `superseded`
- `cancelled`

Finding severity:

- `p0_blocker`
- `p1_major`
- `p2_minor`
- `p3_note`

Finding category:

- `content_accuracy`
- `copy_quality`
- `metadata`
- `seo`
- `aeo`
- `accessibility`
- `legal_compliance`
- `brand_voice`
- `cta`
- `internal_links`
- `structured_data`
- `translation_or_locale`
- `limitation`
- `manual_note`
- `unknown_or_manual`

## Status Meaning

`not_required_yet` means the improved version review prerequisite is not accepted. `required` means the prerequisite is accepted and a content approval workflow must be opened. `draft`, `ready_for_review`, and `in_review` describe operator preparation and decision review. `changes_requested` and `rejected` require content revision or a new candidate/review path. `approved` and `approved_with_limitations` allow later client/launch approval work to begin, subject to all carried limitations. `superseded` means the approval no longer applies to the latest candidate refs. `cancelled` closes the current workflow without approval.

## Boundary Flags

Any future content approval record or projection must carry explicit false or prohibited flags for:

- client approval;
- launch approval;
- domain readiness;
- DNS/SSL readiness;
- billing/subscription/hosting readiness;
- publish activation approval;
- active pointer mutation;
- public runtime publication;
- runtime artifact mutation;
- site version mutation;
- rollback readiness.

## Existing Route Classification

Existing content and runtime routes should be classified as follows:

| Surface | Classification | MVP-26 decision |
| --- | --- | --- |
| `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/route.ts` and `apps/platform/gnr8/site/content-route-handlers.ts` | Client/agency content review and editor data read model | Future input only. Can provide content snapshots, slot inventory, override state, and history counts after adapter validation. |
| `content/overrides/route.ts` | Content override draft mutation | Content override truth, not approval truth. Must not be invoked by content approval. |
| `content/overrides/batch/route.ts` | Batch content override draft mutation | Content override truth, not approval truth. Future revision tooling only behind explicit gates. |
| `content/publish/route.ts` | Published override mutation | Unsafe for MVP-26 approval. Reuse later only behind content publish or publish activation gates; never as content approval. |
| `content/rollback/route.ts` | Content override recovery mutation | Rollback/recovery tool, not approval truth. |
| `content/history/route.ts` | Content override history read | Evidence input only. |
| `app/gnr8/agency/.../content/page.tsx` | Agency workspace content tab | Client/agency editing surface, not approval truth. |
| `runtime/versions/[siteVersionId]/ready` | Runtime lifecycle transition | Runtime review readiness, not content approval. |
| `runtime/versions/[siteVersionId]/approve` | Runtime version approval transition | Historical/runtime approval candidate only; not single-site content approval. |
| `runtime/versions/[siteVersionId]/preview` and preview-assets routes | Preview rendering | Evidence only; preview does not approve. |
| `runtime/versions/[siteVersionId]/publish` | Publish activation and domain reconciliation | Separate publish activation domain; never content approval. |
| `runtime/versions/[siteVersionId]/rollback` | Runtime rollback | Recovery domain; never content approval. |
| public runtime rendering | Active artifact and published override serving | Runtime source truth for what is public, not approval workflow truth. |

## Architecture Warnings

- Do not treat improved version review acceptance as content approval.
- Do not treat content approval as client approval, launch approval, publish activation approval, or content publish.
- Do not approve stale candidate refs after a new improved candidate or review supersedes them.
- Do not drop limitations or not-applied recommendations during approval.
- Do not use preview rendering as approval truth.
- Do not let content routes bypass the single-site state spine.
- Do not let Command Center or Ops Inbox become source truth.
- Do not lose AAF evidence, audit, policy, request, or decision refs.

## Recommended Implementation Path

MVP-27 should add the AAF scope/contracts for `single_site_content_approval`, including scope/evidence vocabulary and prohibited actions.

MVP-28 should add server-only single-site content approval persistence/service core that records reviewed refs, findings, limitations, AAF approval refs, read-model projection, and state transitions without runtime mutation.
