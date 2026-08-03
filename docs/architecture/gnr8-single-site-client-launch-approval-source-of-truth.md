# GNR8 Single-Site Client And Launch Approval Source Of Truth

Phase: MVP-30
Scope: Documentation and architecture only.

This document chooses the source-of-truth model for future single-site client approval and launch approval. It does not create persistence, AAF scopes, services, routes, UI, evidence builders, or runtime behavior.

## Options Considered

Option A: AAF owns both client approval and launch approval truth.

- Strength: strict audit/evidence boundary and exact human decision source.
- Weakness: AAF alone should not own workflow drafting, findings, limitation carry-forward, reviewer representation, readiness placeholders, checklist snapshots, or read-model ergonomics.

Option B: single-site tables own workflow truth and AAF owns scoped approval/evidence truth.

- Strength: mirrors MVP-28/MVP-29 content approval architecture while preserving AAF as the approval/audit authority.
- Weakness: requires careful validation so future workflow rows cannot accept forged or stale AAF refs.

Option C: existing client portal/content routes own client approval truth.

- Rejected. Current client/content surfaces are route/UI/workflow candidates or content mutation surfaces. They are not exact AAF approval truth and must not bypass single-site state.

Option D: publish/PASR owns launch approval truth.

- Rejected. PASR owns publish activation source reading, evidence, shadow readiness, and publish activation gate behavior. Launch approval is an upstream operational decision and must not be collapsed into publish activation.

## Decision

Recommended model: hybrid Option B.

- AAF owns approval, audit, evidence, policy, request, decision, revocation, expiration, supersession, and exact-scope validation truth.
- Future single-site client approval persistence owns workflow records, candidate refs, content approval refs, findings, limitation acceptance, reviewer representation, AAF refs, idempotency, and read-model projection.
- Future single-site launch approval persistence owns workflow records, content/client approval refs, blockers, limitations, checklist snapshots, readiness placeholders/refs, AAF refs, idempotency, and read-model projection.
- Runtime owns improved candidate site version and runtime artifact truth.
- DDOM owns domain readiness snapshots and domain readiness source-state evidence.
- Billing/entitlement owns subscription, billing account, cost center, hosting entitlement, pricing/cost/margin readiness, and Stripe-adjacent operating truth.
- PASR/PTT owns publish activation readiness, publish target source truth, publish activation evidence/shadow truth, and future publish gate enforcement design.
- Command Center and Ops Inbox remain derived only.

## Canonical Truth Matrix

| Domain | Canonical Truth | Role In Client/Launch Approval | Not Truth |
| --- | --- | --- | --- |
| Content approval | AAF `single_site_content_approval` plus single-site content approval workflow | Required prerequisite and evidence ref | Client approval, launch approval, publish approval |
| Client approval | Future AAF `single_site_client_approval` plus future workflow rows | Client/account acceptance truth | Content approval, launch approval, publish activation |
| Launch approval | Future AAF `single_site_launch_approval` plus future workflow rows | Internal operational approval truth | Domain readiness, billing readiness, publish activation |
| Runtime candidate | Runtime site version and artifact records | Subject/evidence identity | Approval truth |
| Domain readiness | DDOM snapshots and domain source-state refs | Prerequisite/evidence input, later gate | Launch approval or publish approval |
| Billing readiness | Billing account, cost center, subscription/hosting entitlement services and refs | Prerequisite/evidence input, later gate | Launch approval or publish approval |
| Publish target | PTT `gnr8_publish_targets` and future source reader refs | Prerequisite/evidence input for publish activation | Launch approval |
| Publish activation | AAF `publish_activation`, PASR source reader/evidence/shadow | Separate publish approval/readiness truth | Client or launch approval |
| Command Center | Read models and redacted projections | Operator visibility | Canonical approval or readiness truth |
| Ops Inbox | Derived work item views | Exception visibility | Source truth or resolution truth |
| Client portal/UI | Future interaction surface | Request/review UI candidate | Canonical approval truth without AAF/workflow validation |
| Preview/public rendering | Rendered candidate/evidence snapshots | Evidence input only | Approval truth |

## Existing Surface Classification

| Surface | Classification | Reason |
| --- | --- | --- |
| `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/route.ts` | evidence input | Content API can expose content state, but MVP-26 says it is not content approval truth and cannot become client approval truth. |
| Content override routes under `content/overrides` | unsafe mutation surface for approval purposes | They mutate content override drafts and must stay outside approval truth. |
| Content publish route under `content/publish` | unsafe mutation surface | Content publish is not client, launch, or publish activation approval. |
| Content rollback route under `content/rollback` | unsafe mutation/recovery surface | Recovery mutation is not approval truth. |
| `apps/platform/app/gnr8/agency/clients/[clientId]/sites/[siteId]/content/page.tsx` | future UI candidate/evidence input | Agency/client editing surface, not canonical approval truth. |
| Client dashboard routes under `app/gnr8/client` and `_components/client-dashboard` | future UI candidate | Client-facing surfaces exist but no single-site client approval workflow is implemented. |
| Agency client/site workspace, preview, overview, settings pages | future UI candidate/evidence input | Useful for operator context; not AAF/workflow truth. |
| Runtime preview and preview-assets routes | evidence input | Rendered snapshots may be evidence, never approval truth. |
| Public runtime rendering | evidence input/runtime truth only | Public rendering proves what is served, not approval. |
| Candidate review/admin routes | future UI candidate/historical review surface | Existing candidate review is not single-site client or launch approval. |
| `single-site/content-approval-service.ts` and AAF bridge | canonical content approval truth | Exact-scope content approval prerequisite only. |
| `single-site/single-site-state-transition-service.ts` launch approval ref placeholder | future integration candidate | It references launch approval for `publish_ready`, but no single-site approval workflow exists yet. |
| DDOM docs/services/snapshots | canonical domain readiness snapshot truth | Domain readiness is separate prerequisite evidence. |
| Runtime hosting operations read models and Command Center hosting views | derived projection/future UI candidate | Good operator visibility, not approval truth. |
| PASR source reader/evidence/shadow modules | canonical publish shadow/source reader concern | Publish activation readiness, not client/launch approval. |
| Command Center publish shadow panel | derived projection | Redacted, shadow-only, non-enforcing, non-blocking. |
| Ops Inbox publish shadow helper/shell | derived projection | Work items cannot approve or resolve source truth. |
| Billing account, cost center, cost, pricing, margin services | canonical billing/cost operating inputs | Billing/entitlement readiness is separate from launch approval. |
| Stripe webhook/API routes | external/billing mutation surface | Stripe state is not launch approval truth and must not be called by approval workflow design. |
| Provider handoff readiness/review surfaces | unrelated/historical or future evidence input | Provider operation approvals are different domains. |
| Archived founder specs and validation-shell pages | unrelated/historical | Useful background only; not current canonical single-site approval truth. |

## Validation Rules For Future Implementation

- A workflow row may store AAF refs only after exact-scope validation.
- AAF decisions for `single_site_client_approval` cannot satisfy `single_site_launch_approval`, `single_site_content_approval`, or `publish_activation`.
- AAF decisions for `single_site_launch_approval` cannot satisfy `publish_activation`, `domain_action`, `domain_exception`, billing readiness, or rollback approval.
- Domain and billing refs may appear in launch evidence as readiness placeholders or evidence refs, but they are not approval truth.
- Read models must label derived state and cannot enable mutation without canonical source checks.
