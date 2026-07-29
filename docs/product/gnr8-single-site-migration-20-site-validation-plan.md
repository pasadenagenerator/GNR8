# GNR8 Single-Site Migration 20-Site Validation Plan

MVP-2 validation plan for proving the one-site-at-a-time end-to-end migration MVP on at least 20 real websites.

This is documentation only. It does not run migrations, call providers, modify runtime behavior, or change billing/domain/publish systems.

## Validation Goal

GNR8 MVP is proven only after at least 20 real websites have each completed the full single-site workflow:

capture -> source evidence review -> 1:1 clone -> clone review/revision -> improvement proposal -> approved improvements -> improved preview -> content approval -> domain/DNS readiness -> subscription/hosting activation -> launch approval -> publish-to-domain -> published verification -> rollback readiness -> closeout.

Batch migration is deferred. The 20 sites must be migrated one at a time. A site counts only if the full workflow completes or a failure is closed with evidence and categorized as a go/no-go signal.

## Site Selection Criteria

| Criterion | Requirement |
| --- | --- |
| Real public website | Must be an actual existing site reachable on the public internet at intake time. |
| Known owner/client | Must have a selected GNR8 client and an accountable launch/contact owner. |
| Static or mostly static | Bias toward public brochure, small service business, marketing, simple multi-page, WordPress static surface, Webflow/Wix/Squarespace static surface, and small blog/archive sites. |
| Business relevance | Include sites where clone and improvement quality can be judged by an operator/client, not synthetic fixtures. |
| Domain path | Include a mix of internal/staging host, customer custom-domain readiness, and manual DNS owner coordination. |
| Improvement opportunity | Each site should have at least one meaningful but bounded improvement proposal. |
| Risk variety | Include forms/widgets/booking/multilingual/SEO/manual-review cases, but do not overload the first 20 with unsupported classes. |

## Supported Site Classes

Use the current site-class boundary with MVP-2 interpretation:

- simple static brochure sites;
- mostly static multi-page business websites;
- small service business websites;
- public marketing sites with forms after manual review;
- embedded widget sites after manual review;
- WordPress public/static surfaces;
- Webflow/Wix/Squarespace public/static surfaces after prequalification;
- simple multilingual static sites;
- small/static blogs or news archives;
- third-party booking flows that remain external and pass testing;
- complex SEO migrations only with explicit redirect/canonical checklist.

## Excluded Site Classes

Do not include as normal validation successes:

- ecommerce checkout, cart, inventory, payments, or order systems;
- member/authenticated sites;
- custom backend applications;
- payment flows;
- compliance-heavy legal/healthcare/financial sites without separate review;
- heavy JavaScript app-like sites unless treated as import-only learning cases;
- unknown/damaged/malware/ownership-unclear source states;
- sites requiring live DNS/registrar/Openprovider mutation by GNR8.

## Required Metrics

| Metric | Definition | Target for MVP signal |
| --- | --- | --- |
| Capture success rate | Sites with complete enough text/image/font/layout/metadata/asset/source evidence. | 18 of 20 minimum, with all failures categorized. |
| Clone fidelity score | Human score from 1 to 5 comparing source and clone across key pages. | Average at least 4.0, no launched site below accepted threshold. |
| Manual correction time | Operator time to make clone acceptable. | Track per site; identify outliers above 4 hours. |
| Proposal usefulness score | Human score from 1 to 5 for clarity, relevance, feasibility. | Average at least 4.0. |
| Improvement implementation time | Time from proposal approval to improved preview ready. | Track per site and by improvement type. |
| Domain/DNS blocker count | Number and type of readiness blockers. | All blockers resolved, except explicit no-go/exception cases. |
| Subscription/billing success rate | Sites with subscription/hosting record and entitlement ready under selected client. | 20 of 20 successful or explicitly categorized blocker before launch. |
| Publish success rate | Sites published to intended domain/approved target after gates. | At least 18 of 20 if validation includes publishable sites; every failure categorized. |
| Rollback readiness confirmation | Known-good rollback target or recovery plan recorded before/after publish. | 20 of 20. |
| Total operator time per site | Sum of human time across all workflow steps. | Track median, p75, p90. |
| Cost per site | Internal migration/runtime/AI/provider/storage cost estimate or event total. | Track actual/estimated and margin. |
| Client/internal approval cycle time | Time waiting for proposal/content/launch/publish/commercial approval. | Track separately from operator work time. |
| Defects after publish | Defects found after public verification. | No critical unresolved defects; track p0/p1/p2. |

## Per-Site Checklist

| Area | Acceptance criteria |
| --- | --- |
| Client/site ownership | Site has selected client, owner, source URL, intended domain, and operator owner. |
| Source capture | Text, images, fonts, visual identity/CGP, layout, structure, metadata, assets, and source evidence captured or explicitly marked degraded. |
| Evidence review | Operator accepts evidence completeness or records scoped exception. |
| 1:1 clone | Clone preview exists, route coverage is reviewed, and fidelity score is recorded. |
| Clone revisions | Required revisions are completed or accepted with limitation. |
| Improvement proposal | Proposal is clear, evidence-linked, scoped, and approved/rejected with record. |
| Improvement implementation | Approved improvements are implemented without unapproved scope expansion. |
| Improved preview | Final preview passes visual/content/functional smoke checks. |
| Content/visual approval | Client/internal approval exists where required. |
| Domain/DNS readiness | Domain intent, DNS instructions, owner evidence, DDOM/readiness snapshot, Vercel/custom-domain/SSL status where applicable are ready or excepted. |
| Subscription/hosting | Subscription/hosting record exists under selected client; Stripe refs where applicable; entitlement active; cost/margin visible. |
| Launch approval | Launch signoff exists and is distinct from publish activation approval. |
| Publish | Publish activation approval exists; improved version is published to intended target/domain. |
| Published verification | Public routes, SSL, content, metadata, forms/widgets/external links, and runtime health checked. |
| Rollback readiness | Rollback target or recovery plan exists and is verified. |
| Audit/evidence | Required audit events and evidence refs are complete enough for replay/forensics. |
| Closeout | Metrics, defects, costs, timings, approvals, and lessons recorded. |

## Acceptance Thresholds

| Area | Acceptance rule |
| --- | --- |
| Clone fidelity | Must be good enough that a reasonable visitor recognizes the source site structure, content, identity, and layout. Any material drift must be approved or revised. |
| Improvement acceptance | Improvements must be approved, visibly implemented, and not damage source-critical information or brand identity. |
| Domain/DNS readiness | Must be current, evidence-backed, and labeled. Manual DNS instructions alone are not completion. |
| Subscription/hosting | Must have client-scoped subscription/hosting record, entitlement, operating status, and internal margin/cost visibility. |
| Publish acceptance | Public intended target serves the improved site after governed activation; no autonomous publish. |
| Rollback acceptance | Recovery target/plan exists before publish and remains available after verification. |
| Audit completeness | A third-party operator should be able to reconstruct what happened, why, who approved it, and which refs were used. |

## Issue Taxonomy

- `source_unreachable`
- `source_changed_during_capture`
- `capture_incomplete_text`
- `capture_incomplete_images`
- `capture_incomplete_fonts`
- `capture_incomplete_layout`
- `metadata_missing`
- `asset_missing_or_stale`
- `route_coverage_gap`
- `clone_visual_drift`
- `clone_content_drift`
- `clone_responsive_drift`
- `proposal_unclear`
- `proposal_rejected`
- `improvement_scope_creep`
- `content_approval_blocked`
- `domain_owner_unknown`
- `dns_instruction_stale`
- `vercel_or_custom_domain_blocked`
- `ssl_readiness_blocked`
- `subscription_creation_failed`
- `stripe_payment_or_customer_blocked`
- `hosting_entitlement_missing`
- `publish_approval_missing`
- `publish_failed`
- `post_publish_defect`
- `rollback_target_missing`
- `audit_evidence_gap`
- `operator_time_outlier`
- `cost_or_margin_outlier`

## Go/No-Go Criteria

Go for broader implementation sequencing only when:

- at least 20 real websites have been attempted one at a time;
- at least 18 complete the full workflow or all failures have clear no-go taxonomy and remediation;
- capture, clone, proposal, improvement, subscription/hosting, domain readiness, publish, rollback readiness, and audit evidence are measured on every site;
- no critical source-of-truth ambiguity remains unresolved;
- no publish occurred autonomously;
- Command Center and Ops Inbox were used only as derived support;
- batch migration remains deferred until single-site bottlenecks are understood.

No-go or hold if:

- clone fidelity cannot reach accepted threshold without excessive manual correction;
- source evidence is routinely incomplete;
- billing/subscription/hosting activation is unclear or manual in a way that blocks launch;
- domain/DNS readiness blocks most launches;
- publish/rollback approvals remain ambiguous;
- audit/evidence is insufficient to reconstruct decisions;
- operator time or cost is too high for commercial viability;
- defects after publish are critical or repeated.
