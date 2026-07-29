# GNR8 Single-Site Migration MVP Boundary

MVP-2 realigns the canonical GNR8 MVP boundary around the immediate product requirement: one existing website at a time, end to end.

This is documentation and architecture only. It does not authorize runtime behavior, TypeScript, JavaScript, SQL migrations, API routes, workers, providers, DNS/domain implementation, billing/Stripe implementation, publish/rollback behavior, Command Center implementation, Ops Inbox implementation, public runtime behavior, AI execution, storage behavior, auth behavior, or client portal changes.

## Corrected MVP Definition

GNR8 MVP is a single-site, operator-assisted, end-to-end migration, improvement, hosting/subscription, and launch workflow for one existing public website under one selected client.

The MVP is proven only when GNR8 can reliably migrate, improve, commercialize, host, publish, verify, and close out at least 20 real websites one by one. Each website must pass the complete workflow before the MVP is considered proven.

## Boundary Change From MVP-1

MVP-1 framed the immediate MVP as an operator-assisted migration factory for an approximately 200-site wave. BMF-1 then designed bulk intake, batch lifecycle, failure recovery, and 10-to-25-site batch cohorts.

MVP-2 changes the immediate requirement:

- batch migration is not required for MVP;
- 10+ site batch execution is deferred from MVP;
- 200-site portfolio migration remains a later scaling goal;
- Command Center and Ops Inbox remain supporting operator surfaces, not MVP source truth;
- the immediate validation target is at least 20 real websites migrated one at a time;
- one site must pass the full capture, clone, proposal, improvement, billing/hosting, domain, publish, rollback-readiness, audit, and closeout workflow before another site counts as validated.

Previous batch/factory statements should be interpreted as future scale architecture unless they also apply to a single-site flow.

## Required Single-Site Workflow

The required MVP workflow is:

1. Capture the existing website's text, images, fonts, visual identity/CGP, layout, page structure, metadata, assets, and source evidence.
2. Produce the best possible 1:1 clone of the existing website.
3. Produce a clear improvement proposal.
4. Implement approved improvements.
5. Prepare launch prerequisites, including domain intent, manual DNS instructions, Vercel/custom-domain readiness where applicable, SSL/readiness visibility, and publish prerequisites.
6. Create the hosting/subscription record under the selected client, including billing/Stripe MVP-lite flow, hosting entitlement, internal cost/margin visibility, and audit trail.
7. Publish the improved website on the intended domain.
8. Validate the full workflow on at least 20 real websites before broader platform scaling continues.

## MVP In Scope

| Capability | MVP treatment | Source-of-truth boundary |
| --- | --- | --- |
| Client and site ownership | Required. Every migration is under one selected client and one site candidate. | GNR8 ownership/site records. |
| Source website capture | Required. Capture must include text, images, fonts, layout, structure, metadata, assets, visual identity/CGP, diagnostics, and source refs. | Capture run/evidence records and immutable artifact refs; external source site remains external truth until cutover. |
| Source evidence | Required. Evidence must be reviewable, freshness-labeled, and linked to clone/proposal decisions. | GNR8 evidence/audit records and capture artifacts. |
| Best-effort 1:1 clone | Required. The first migration output must prioritize faithful continuity before improvement. | Runtime site version, raw/runtime artifacts, asset refs, and clone review records. |
| Improvement proposal | Required. Proposal is advisory and must clearly separate suggested improvements from source fidelity. | Proposal artifact and evidence refs; not publish approval. |
| Approved improvement implementation | Required after approval. Improvements must produce a new improved preview or version candidate. | Improved site version/artifact/content override records. |
| Preview/staging | Required. Operator and client-visible preview evidence must exist before launch decisions. | Derived preview from canonical version/artifact/override state. |
| Content/visual approval | Required where client-visible. Content approval is separate from launch approval and publish activation approval. | AAF approval records or approved future equivalent. |
| Domain/DNS readiness | Required. MVP includes domain intent, manual DNS instructions, Vercel/custom-domain readiness where applicable, SSL/readiness visibility, and blockers. | Domain binding, DDOM readiness snapshots/refs, provider snapshots, external DNS truth remains external. |
| Billing/subscription/hosting activation | Required as MVP-lite. Create a website hosting/subscription record under the selected client, expose Stripe/customer-payment truth where applicable, maintain GNR8 hosting entitlement and internal cost/margin visibility. | Stripe for billing/customer-payment truth where applicable; GNR8 for entitlement, hosting status, cost/margin, audit. |
| Publish activation | Required. Publish-to-domain is in MVP scope but must remain governed and not autonomous. | Active pointer, site version, runtime artifact, published overrides, publish target, AAF approval/evidence, audit. |
| Rollback readiness | Required before launch. A known-good rollback target or recovery plan must be recorded. | Runtime active pointer history, site version/artifact refs, content history, incident/recovery audit. |
| Audit and evidence | Required. Every approval, side effect, exception, and source-derived decision needs evidence refs and audit. | AAF/audit/evidence records or approved future equivalent. |
| Operator review | Required. Human review remains mandatory at risk boundaries. | Source-owned review/approval records. |
| Command Center support | Required as a derived operator view where available. It is not source truth. | Derived read model only. |
| Ops Inbox support | Required for derived blockers/exceptions where available. It is not source truth and cannot close work by itself. | Derived work-item model only. |

## MVP Out Of Scope

| Capability | MVP treatment |
| --- | --- |
| Bulk/batch execution | Deferred. A site may be validated only as a single-site workflow. |
| 10+ site batch cohorts | Deferred until the single-site workflow is proven across 20 real websites. |
| 200-site portfolio migration factory | Future scaling goal. Preserve BMF-1 design as scale architecture, not immediate MVP requirement. |
| Autonomous multi-site migration | Deferred. |
| Autonomous AI publish, rollback, DNS, billing, or provider mutation | Forbidden. AI remains advisory unless later governed implementation explicitly allows a safe action class. |
| Full billing platform | Deferred. MVP-lite includes subscription/hosting activation, entitlement, Stripe truth where applicable, cost/margin visibility, and audit, not full plan management, invoicing, portal, tax, or self-serve billing. |
| Full registrar/DNS automation | Deferred and forbidden without later ADR. |
| Openprovider live mutation | Forbidden without later ADR, approval, audit, and provider execution governance. |
| Visual builder product | Deferred. MVP uses migration clone, controlled improvements, and content overrides, not a broad design canvas. |
| Marketplace | Deferred. |
| Full Digital Business Twin | Deferred. DBT artifacts may inform later strategy but are not MVP runtime truth. |
| Social/paid media | Out of MVP scope. |
| Broad agency operating system features | Deferred until single-site workflow proof. |
| Ecommerce, auth/member, payment, custom backend migration | Out of normal MVP launch scope except separable public static pages as explicitly reviewed import-only or static migration. |

## Documentation Drift To Reinterpret

These current docs contain immediate-MVP language that should now be interpreted as future scaling direction:

- `docs/product/gnr8-mvp-boundary.md`: "operator-assisted migration factory", "approximately 200 existing static or mostly static public websites", "portfolio wave", "migration jobs/batches", and "200-site objective".
- `docs/product/gnr8-mvp-supported-site-classes.md`: "Include in 200-site MVP wave" should mean future validation-wave eligibility, not immediate MVP batch requirement.
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`: migration batch/job rows remain useful evidence, but batch source truth is not required to prove the immediate MVP.
- `docs/architecture/gnr8-mvp-operational-state-model.md`: batch-level states remain future scale states; single-site states supersede them for MVP proof.
- `docs/product/gnr8-mvp-boundary-closeout.md`: "Final MVP Definition" and "Recommended Next Milestone" should be superseded by this MVP-2 boundary.
- `docs/product/future-gnr8-strategy-closeout.md` and `docs/product/future-gnr8-mvp-bridge.md`: "bulk migration intake", "migration batch operations", and factory sequencing remain strategic bridge items after single-site proof.
- `docs/architecture/gnr8-bulk-migration-factory-design.md`, `docs/architecture/gnr8-bulk-migration-batch-lifecycle.md`, `docs/architecture/gnr8-bulk-migration-failure-recovery.md`, `docs/product/gnr8-bulk-migration-operator-workflow.md`, and `docs/product/gnr8-bulk-migration-factory-closeout.md`: all BMF-1 batch/factory behavior is future scale architecture, not immediate MVP acceptance.
- CCO/OPS docs that mention batch, wave, or portfolio views remain valid as operator projections, but MVP-2 requires them to support single-site end-to-end status first.

## Non-Negotiable MVP Rules

1. MVP is one-site-at-a-time.
2. Batch migration is deferred from MVP.
3. At least 20 real websites must be validated one by one.
4. The clone comes before improvements.
5. Proposal is not approval.
6. Content approval, launch approval, publish activation approval, domain readiness, and subscription/hosting readiness are separate.
7. DDOM readiness is a prerequisite, not publish approval.
8. Subscription creation is not publish approval.
9. Command Center and Ops Inbox are derived only.
10. Publish-to-domain remains governed and not autonomous.
11. Publish enforcement remains governed and not autonomous.
12. Stripe is billing/customer-payment truth where applicable; GNR8 owns internal hosting entitlement and operating status.
13. No runtime behavior changes are authorized by this document.
