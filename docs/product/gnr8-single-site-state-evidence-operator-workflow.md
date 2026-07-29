# GNR8 Single-Site State Evidence Operator Workflow

Date: 2026-07-29
Phase: MVP-4 documentation architecture
Scope: Operator workflow for the future single-site state and source evidence spine

This document is documentation only. It does not implement UI, API routes, repositories, SQL migrations, workers, capture/import behavior, clone behavior, proposal behavior, billing/Stripe behavior, domain/DNS behavior, publish behavior, rollback behavior, Command Center behavior, Ops Inbox behavior, provider calls, AI calls, or runtime changes.

## Operator Goal

The operator should be able to run one migration at a time from a canonical migration record. Every stage should show:

- the current canonical state;
- the next allowed action;
- the evidence required to continue;
- approvals or readiness refs required to continue;
- blockers and owners;
- the source-owned record that will resolve each blocker.

Command Center and Ops Inbox should help the operator navigate the work, but they must remain derived. Operators must not infer canonical truth from badges, cards, thumbnails, previews, external notes, AI text, or dismissed work items.

## Workflow

| Step | Operator experience | Canonical write/read | What must not be inferred |
| --- | --- | --- | --- |
| 1. Create migration record | Select the client, enter source URL, intended launch domain if known, owner, risk notes, and validation-site intent. | Creates `site_candidate_created` in the single-site spine. | A client/site card alone is not a migration record. |
| 2. Start capture | Start or queue capture from the migration record. | Writes `source_capture_started` with capture refs and audit refs. | A worker log alone is not canonical state. |
| 3. Capture completes | See capture status, route map, screenshots, DOM/source refs, text/images/assets/fonts/style/metadata diagnostics. | Writes `source_capture_completed` then opens `source_evidence_review_required`. | Capture completion is not evidence acceptance. |
| 4. Review source evidence | Inspect evidence checklist by category and decide whether evidence is accepted, accepted with limitations, retry required, or rejected. | Writes source evidence review decision and state event. | Preview appearance or AI summary is not evidence review truth. |
| 5. Accept degraded evidence | If evidence is missing/degraded but usable, record exact limitations and attach required AAF exception/evidence refs. | Review status becomes `accepted_with_limitations`; clone gate allowed only if policy requirements are satisfied. | "Looks good enough" in notes is not sufficient. |
| 6. Retry capture | If evidence is incomplete, choose retry. | Review status becomes `retry_required`; state returns to `source_capture_started` with a new capture attempt. | Retrying does not preserve old acceptance unless a later review explicitly accepts the new package. |
| 7. Trigger clone generation | Start clone only when source evidence is accepted or accepted with limitations. | Writes `clone_generation_started` citing accepted source evidence review and source watermark. | Capture-complete, Command Center green status, or Ops Inbox dismissal cannot start clone by itself. |
| 8. Review clone fidelity | Compare source and clone by route, text, images, fonts, layout, identity/CGP, metadata, and responsive behavior. | Future clone review record and state transition to proposal or revision. | Runtime `APPROVED` is too coarse to mean clone accepted for MVP. |
| 9. Request clone revision | Record exact defects and owner. | Writes `clone_revision_required`; later clone retry references revision request. | Revision chat/comments alone do not change canonical state. |
| 10. Progress to proposal | Once clone review is accepted, generate or draft an improvement proposal tied to source and clone refs. | Writes `improvement_proposal_started` and `improvement_proposal_ready`. | Proposal text is advisory and not approval. |
| 11. Approve or reject proposal | Client/operator approves, rejects, or requests changes to proposal scope. | AAF proposal approval/rejection refs drive state to approved/rejected. | Proposal approval is not content approval, launch approval, or publish activation approval. |
| 12. Implement approved improvements | Apply only approved changes and create improved candidate/preview. | Writes implementation start/completion and improved preview refs. | Implementation cannot expand scope without new approval. |
| 13. Review improved result | Inspect final content, visuals, forms/widgets, SEO-critical metadata, limitations, and preview smoke checks. | Writes `content_review_required` then `content_approved` with scoped approval refs. | Content approval is not domain readiness or publish approval. |
| 14. Prepare domain readiness | Record domain intent, owner, manual DNS instructions, DDOM snapshot, freshness, Vercel/custom-domain/SSL status where applicable, blockers, and exceptions. | Writes `domain_readiness_required` or `domain_readiness_ready` based on DDOM/source refs. | DDOM readiness is not DNS truth, launch approval, or publish activation. |
| 15. Prepare subscription/hosting | Create or attest MVP-lite subscription, Stripe refs where applicable, cost center, site hosting entitlement, and operating status. | Writes `subscription_required`, `subscription_created`, and `hosting_entitlement_ready` as refs become valid. | Stripe/payment status alone is not GNR8 hosting entitlement. Subscription is not publish approval. |
| 16. Request launch approval | Present content approval, domain readiness, subscription/entitlement, rollback plan, limitations, and final preview. | Writes `launch_approval_required`; AAF launch signoff moves toward publish readiness. | Launch approval is not active pointer mutation. |
| 17. Prepare publish | Assemble publish target, improved artifact/version, launch approval, publish activation approval request, DDOM readiness, entitlement, rollback target, and PASR shadow evidence where available. | Writes `publish_ready` only when prerequisites are satisfied or explicitly excepted. | PASR is shadow/read-only until enforcement phase. PTT target is target truth, not approval. |
| 18. Publish | Execute governed publish activation for the specific target/version/domain after publish activation approval. | Runtime active pointer changes; spine records `published` with active pointer/publish refs. | Command Center button click is not approval. Publish does not imply rollback executed. |
| 19. Confirm rollback readiness | Record known-good rollback target or recovery plan and post-publish availability. | Writes `rollback_available`. | Rollback readiness is not rollback execution approval. |
| 20. Close out migration | Record final URL, metrics, approvals, evidence completeness, blockers, defects, costs, operator time, issue taxonomy, and lessons. | Writes `migration_closed_out` and closeout record. | A published site does not count for 20-site validation until closeout is complete. |

## Source Evidence Review Details

Operators must review these evidence categories before clone generation:

- source URL/canonical URL;
- captured pages and route map;
- screenshots for required viewport set;
- rendered DOM/source/raw HTML refs;
- captured text;
- captured images/assets;
- fonts and style signals;
- layout, navigation, section boundaries, visual identity, and CGP signals;
- metadata and SEO-critical fields;
- diagnostics, failures, gaps, and freshness.

Allowed decisions:

- `accepted`: required evidence is complete enough for clone generation.
- `accepted_with_limitations`: evidence is degraded but acceptable with documented limitations and required AAF exception refs.
- `retry_required`: capture must be retried before clone generation.
- `rejected`: source/capture is unusable for this migration.
- `superseded`: a newer capture/review replaced this package.

## Accepting Degraded Evidence

When accepting degraded evidence, the operator must record:

- affected evidence categories;
- affected routes/pages/assets/fonts/layout areas;
- clone risks;
- proposal/publish limitations;
- whether the limitation is client-visible;
- reviewer identity and role;
- AAF evidence package/audit refs;
- AAF approval/exception refs where policy requires.

Accepted degraded capture can permit clone generation only for the scoped limitations. It cannot silently excuse clone fidelity defects, proposal scope changes, content issues, domain readiness, subscription readiness, launch approval, or publish activation.

## Ops Inbox Use

Ops Inbox should tell the operator what needs attention:

- source capture failed;
- source evidence review required;
- retry capture required;
- clone review required;
- clone revision required;
- proposal approval needed;
- content review required;
- DDOM snapshot missing/stale;
- domain owner action needed;
- subscription required;
- hosting entitlement missing;
- launch approval needed;
- publish activation approval needed;
- rollback evidence missing;
- closeout required.

Operators may use Ops Inbox to navigate to the source-owned workflow. They must not treat item dismissal as canonical resolution.

## Command Center Use

Command Center should show the migration as one stateful object with stage summaries and source refs. It may display:

- current state and owner;
- allowed/prohibited next action;
- blocker count;
- source evidence status;
- clone/proposal/content/domain/subscription/publish/rollback summaries;
- DDOM freshness;
- PTT target;
- PASR shadow status;
- AAF approval/evidence status;
- runtime active pointer after publish;
- validation closeout metrics.

If Command Center display disagrees with source records, source records win.

## AAF, DDOM, PASR, PTT, Billing Boundary

AAF:

- approvals, audit, evidence packages, policy evaluations, and approval scopes are AAF truth;
- the spine links to AAF and should not create a parallel approval system;
- future enforcement should fail closed on missing/stale/scope-mismatched approval refs.

DDOM:

- domain readiness snapshots and freshness are DDOM truth;
- stale/missing readiness blocks domain readiness unless an approved exception exists;
- no DNS, registrar, Openprovider, or provider mutation is introduced by the spine.

PASR:

- publish shadow results are read-only readiness evidence until an enforcement milestone;
- PASR does not mutate state, create approvals, or block publish in MVP-4/MVP-5.

PTT:

- publish targets are PTT truth;
- publish readiness must cite the intended target and source watermark.

Billing/Stripe:

- Stripe is billing/customer-payment truth where used;
- GNR8 owns local subscription projection, hosting entitlement, operating status, cost center, and margin truth;
- subscription creation and hosting entitlement are prerequisites, not approval.

## Operator Must Not Do

- Do not start clone generation from capture completion alone.
- Do not treat a degraded capture as accepted without a scoped review decision.
- Do not treat clone preview existence as clone acceptance.
- Do not treat proposal approval as content approval.
- Do not treat content approval as launch or publish activation approval.
- Do not treat DDOM readiness as DNS truth or approval.
- Do not treat subscription creation as publish approval.
- Do not treat launch approval as active pointer permission unless publish activation approval is separately granted.
- Do not resolve Ops Inbox work without source-owned transition.
- Do not use Command Center as source truth.
- Do not count a site toward 20-site validation without closeout.

## Recommended Next Operator-Facing Milestones

1. MVP-5: persistence core for migration state and source evidence review.
2. MVP-6: server-only writer/repository and transition service.
3. MVP-7: read model for Command Center/Ops Inbox projections.
4. MVP-8: capture completion integration into the state spine.
5. MVP-9: clone generation gate behind accepted source evidence.
6. Later milestones: clone review, proposal approval, content approval, domain readiness, subscription/hosting, publish readiness, rollback, closeout, and 20-site validation.
