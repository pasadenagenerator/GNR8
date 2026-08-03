# GNR8 Single-Site Content Approval Architecture Closeout

Phase: MVP-26
Scope: Documentation and architecture only.

## Files Reviewed

- `apps/platform/gnr8/single-site/improved-version-review-service.ts`
- `apps/platform/supabase/migrations/20260731143000_single_site_improved_version_review_core.sql`
- `docs/product/gnr8-single-site-improved-version-review-acceptance-closeout.md`
- `docs/product/gnr8-single-site-improved-candidate-creation-adapter-closeout.md`
- `docs/product/gnr8-single-site-improved-candidate-dry-run-adapter-closeout.md`
- `docs/product/gnr8-single-site-improvement-execution-persistence-boundary-closeout.md`
- `docs/product/gnr8-single-site-improvement-proposal-planning-core-closeout.md`
- `docs/architecture/gnr8-audit-approval-foundation-design.md`
- `docs/product/gnr8-audit-approval-persistence-core-closeout.md`
- `docs/product/gnr8-audit-approval-writer-core-closeout.md`
- `docs/product/gnr8-audit-approval-policy-gate-facade-closeout.md`
- `docs/product/gnr8-aaf-granted-with-limitations-vocabulary-closeout.md`
- `docs/architecture/gnr8-single-site-implementation-authorization-aaf-scope-design.md`
- `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/route.ts`
- `apps/platform/gnr8/site/content-route-handlers.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/batch/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/rollback/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/history/route.ts`
- `apps/platform/app/gnr8/agency/clients/[clientId]/sites/[siteId]/content/page.tsx`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/ready/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/approve/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/preview/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/rollback/route.ts`
- `apps/platform/src/public-site/public-runtime-render.tsx`
- `apps/platform/src/public-site/content-override-runtime.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `docs/product/gnr8-publish-activation-shadow-gate-integration-closeout.md`
- `docs/product/gnr8-command-center-publish-shadow-surfacing-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-content-approval-architecture.md`
- `docs/architecture/gnr8-single-site-content-approval-source-of-truth-design.md`
- `docs/architecture/gnr8-single-site-content-approval-transition-contract.md`
- `docs/architecture/gnr8-single-site-content-approval-aaf-scope-design.md`
- `docs/product/gnr8-single-site-content-approval-operator-workflow.md`
- `docs/product/gnr8-single-site-content-approval-architecture-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Content Approval Definition

Content approval is a scoped, evidence-backed decision that the latest accepted improved candidate's visible content is acceptable for later client/launch approval work. It covers visible page content, headings, body copy, calls to action, title/description metadata, SEO/AEO content, alt text, internal links, structured data where applicable, recommendation coverage, known limitations, unsupported/not-applied recommendations, and legal/compliance/manual caveats.

Content approval is not client approval, launch approval, domain readiness, DNS/SSL readiness, billing readiness, hosting activation, publish activation approval, active pointer mutation, public runtime publication, content publish, or rollback readiness.

## Source-Of-Truth Decision

Selected source-of-truth model: hybrid.

- AAF owns scoped approval, audit, policy, evidence, request, decision, revocation, expiration, and supersession truth.
- Future single-site content approval persistence owns workflow records, reviewed candidate refs, findings, limitation carry-forward, recommendation coverage, readiness, and AAF refs.
- Runtime remains source truth for candidate site version and runtime artifact identity/content.
- Existing content override/publish routes are not canonical single-site content approval truth.
- Command Center and Ops Inbox remain derived-only.

## AAF Scope Recommendation

Recommended scope: `single_site_content_approval`

Recommended evidence package type: `single_site_content_approval_evidence`

Recommended subject type: `single_site_improved_version_review`

Recommended allowed action: `approve_single_site_content`

Recommended replay class: `not_replayable`

This scope does not currently exist in the reviewed AAF vocabulary and should be implemented in MVP-27 before content approval persistence/service work.

## Required Subject Refs

- tenant id
- client id
- site id
- single-site migration id
- improved version review id/status/watermark
- improved candidate site version ref and watermark where available
- improved runtime artifact ref and hash/watermark where available
- proposal plan id
- proposal approval decision id
- implementation authorization decision id
- execution attempt id
- selected recommendation refs and watermarks
- source evidence review id
- clone review id
- clone site version ref
- clone runtime artifact ref
- limitations refs when present

## Required Evidence Refs

- improved candidate rendered snapshot
- improved candidate content snapshot
- improved candidate metadata snapshot
- recommendation coverage summary
- selected recommendation application status
- unsupported/not-applied recommendation list
- SEO/AEO metadata summary
- headings/body copy/CTA/internal link review summary
- alt text and accessibility/content caveats
- structured data summary where applicable
- legal/compliance notes
- brand voice/manual copy notes
- known limitations from prior single-site stages
- operator review notes
- audit timeline refs

## Status, Severity, And Category Vocabulary

Status:

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

Severity:

- `p0_blocker`
- `p1_major`
- `p2_minor`
- `p3_note`

Category:

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

## Transition Contract Summary

- Improved version review not accepted blocks content approval.
- Improved version review `accepted` makes content approval `required`.
- Improved version review `accepted_with_limitations` makes content approval `required` with limitations carried forward.
- Content approval `changes_requested` requires content revision.
- Content approval `approved` allows later client/launch approval work to begin.
- Content approval `approved_with_limitations` allows later client/launch approval work to begin with limitations.
- Content approval `rejected` requires content revision.
- `superseded` means latest content approval is required for the current candidate refs.

Content approval does not publish, switch active pointer, approve client launch, approve domain/DNS/billing/hosting, or remove rollback requirements.

## Operator Workflow Summary

The operator inspects the accepted improved version review, candidate rendering/content, recommendation coverage, metadata/SEO/AEO/accessibility/legal caveats, limitations, and not-applied recommendations. The operator records findings, prepares AAF evidence, requests exact-scope content approval, records approve/approve-with-limitations/reject/change-request decisions, carries limitations forward, and prepares for later client/launch approval work.

## Existing Content Route Classification

- Content GET route and content route handlers: future evidence input only.
- Content history route: future evidence input only.
- Content override draft routes: content override truth and future revision tooling only, not approval truth.
- Content publish route: unsafe direct mutation for MVP-26; future reuse only behind separate content publish/publish activation gates.
- Content rollback route: recovery mutation only, not approval truth.
- Agency content page: client/agency editing surface, not approval truth.
- Runtime ready/approve routes: runtime lifecycle transitions, not single-site content approval.
- Runtime preview route and preview assets: evidence only.
- Runtime publish route: publish activation and domain reconciliation, never content approval.
- Runtime rollback route: recovery domain, never content approval.
- Public runtime rendering: production runtime source truth, not approval workflow truth.

## MVP Scope

Future implementation scope:

- server-only content approval persistence/service;
- reviewed candidate refs;
- findings/items;
- limitations and caveats;
- AAF content approval request/evidence/decision/policy/audit refs;
- read-model projection;
- no runtime mutation.

## Explicit Deferrals

- content editing UI
- client portal approval
- publish activation
- launch checklist
- automated SEO/QA scoring
- multilingual approval
- legal signoff automation
- AI rewriting
- content publish
- rollback/recovery integration
- domain/DNS/billing/hosting activation
- Command Center/Ops Inbox action integration

## Architecture Warnings

- Do not confuse content approval with client approval.
- Do not confuse content approval with launch approval.
- Do not confuse content approval with publish activation approval.
- Do not approve stale candidate refs.
- Do not ignore limitations or not-applied recommendations.
- Do not use preview rendering as approval truth.
- Do not allow content routes to bypass the single-site state spine.
- Do not lose AAF evidence/audit refs.
- Do not let Command Center or Ops Inbox become source truth.

## Whether Implementation May Begin

Implementation of AAF scope/contracts may begin next as MVP-27.

Content approval persistence/service should wait until the AAF scope/contracts exist. If MVP-27 proves the scope already exists in a target environment, MVP-28 may proceed directly to persistence/service core.

## Recommended Next Milestone

Recommended next milestone: MVP-27 content approval AAF scope/contracts.

Recommended following milestone: MVP-28 content approval persistence/service core.

## Validation Performed

- Confirmed all MVP-26 docs exist and are readable.
- Confirmed canonical index references MVP-26 docs.
- Confirmed required sections are present.
- Confirmed content approval vs client/launch/publish boundary is explicit.
- Confirmed improved version review vs content approval boundary is explicit.
- Confirmed source-of-truth decision is explicit.
- Confirmed existing content route classification is present.
- Confirmed no TypeScript, JavaScript, SQL, migration, route, worker, runtime, provider, billing, domain, publish, rollback, UI, Command Center, Ops Inbox, client portal, or AI implementation files changed.
- Ran `git diff --check`.
- Ran trailing whitespace check.

## Git Status Summary

Expected changed files are the six MVP-26 documentation files plus `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`.

No commit or push was performed.

## Runtime Behavior Confirmation

No runtime behavior changed. MVP-26 added documentation only. It did not implement AAF scope, content approval persistence, content approval service, content editing, client approval, launch approval, publish activation, billing, domain/DNS, routes, UI, workers, Command Center, Ops Inbox, public runtime, providers, AI, active pointer mutation, site version mutation, runtime artifact mutation, content publish, or rollback behavior.
