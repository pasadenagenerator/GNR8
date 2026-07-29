# GNR8 Single-Site Migration MVP Realignment Closeout

MVP-2 realigns the canonical GNR8 MVP around a one-site-at-a-time end-to-end migration, improvement, hosting/subscription, and launch workflow.

This phase is documentation and architecture only. No runtime behavior, TypeScript, JavaScript, SQL migrations, API routes, workers, providers, DNS/domain implementation, billing/Stripe implementation, publish/rollback behavior, Command Center implementation, Ops Inbox implementation, public runtime behavior, AI execution, storage behavior, auth implementation, client portal code, commit, or push was performed.

## 1. Files Reviewed

Current MVP docs:

- `docs/product/gnr8-mvp-boundary.md`
- `docs/product/gnr8-mvp-supported-site-classes.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/product/gnr8-mvp-boundary-closeout.md`

Strategy/CAP/BMF/CCO/OPS/docs:

- `docs/product/future-gnr8-strategy-closeout.md`
- `docs/product/gnr8-capability-inventory-closeout.md`
- `docs/product/gnr8-bulk-migration-factory-closeout.md`
- `docs/product/gnr8-command-center-ops-inbox-closeout.md`
- `docs/product/gnr8-ops-inbox-first-class-shell-closeout.md`
- `docs/product/gnr8-ops-inbox-minimal-shell-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

AAF/DDOM/PASR/PTT/domain closeouts and architecture were reviewed through targeted reads/searches:

- `docs/product/gnr8-audit-approval-foundation-closeout.md`
- `docs/product/gnr8-audit-approval-implementation-closeout.md`
- `docs/product/gnr8-audit-approval-publish-gate-dry-run-closeout.md`
- `docs/product/gnr8-audit-approval-publish-evidence-builder-closeout.md`
- `docs/product/gnr8-aaf-publish-source-reader-review-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-writer-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-production-caller-architecture-closeout.md`
- `docs/product/gnr8-ddom-readiness-manual-snapshot-caller-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-manual-snapshot-trigger-closeout.md`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`
- `docs/product/gnr8-publish-activation-shadow-gate-integration-closeout.md`
- `docs/product/gnr8-publish-shadow-result-read-model-core-closeout.md`
- `docs/product/gnr8-command-center-publish-shadow-surfacing-closeout.md`
- `docs/product/gnr8-ops-inbox-publish-shadow-surfacing-closeout.md`
- `docs/architecture/gnr8-domain-dns-mvp-boundary.md`
- `docs/product/gnr8-domain-dns-operating-model-closeout.md`
- `docs/product/gnr8-domain-dns-operator-workflow.md`

Implementation evidence was inspected read-only across:

- capture/import: `apps/platform/gnr8/site/scoped-import-pipeline.ts`, `apps/platform/gnr8/import/**`, `apps/platform/gnr8/multipage-import/**`, `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`, `apps/worker/gnr8/site/site-render-capture-service.ts`, `apps/worker/gnr8/import/runtime/**`;
- source evidence/assets/fonts/visuals: `apps/platform/gnr8/architecture/evidence-capture-*`, `apps/platform/gnr8/site/evidence-capture-baseline-read-model.ts`, `apps/platform/gnr8/site/site-workspace-read-model*`, preview asset routes, worker asset extraction;
- clone/runtime/preview: `apps/platform/gnr8/runtime/runtime-store.ts`, raw-template/public runtime files, preview routes, preview smoke/readiness modules;
- proposals/improvements: generated proposal bundle, generation/evolution, visual-analysis, AI advisory/proposal surfaces, content override routes;
- content editing: `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/**`, content slots/overrides/history helpers;
- hosting/domain/publish/rollback: domain route, Vercel helpers, domain verification worker, DDOM/PASR/PTT modules, publish activation orchestrator/guard/safety, rollback switch;
- billing/subscription/entitlement/cost: `apps/platform/gnr8/billing/**`, `packages/core/src/modules/billing/**`, `packages/core/src/modules/entitlement/**`, Stripe webhook route, billing/cost migrations;
- client ownership: client/site/agency routes and auth/RBAC helpers;
- Command Center/Ops Inbox: `apps/platform/app/gnr8/command-center/**`, `apps/platform/gnr8/command-center/**`, PASR/AAF view models, Ops Inbox shell;
- audit/approval/evidence: AAF modules, audit-log modules, AAF contracts, migrations.

## 2. Files Created Or Updated

Created:

- `docs/product/gnr8-single-site-migration-mvp-boundary.md`
- `docs/architecture/gnr8-single-site-migration-mvp-state-model.md`
- `docs/architecture/gnr8-single-site-migration-mvp-source-of-truth.md`
- `docs/product/gnr8-single-site-migration-operator-workflow.md`
- `docs/product/gnr8-single-site-migration-20-site-validation-plan.md`
- `docs/product/gnr8-single-site-migration-mvp-realignment-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. Corrected MVP Definition

GNR8 MVP is a single-site, operator-assisted, end-to-end migration, improvement, hosting/subscription, and launch workflow for one existing public website under one selected client.

The MVP is proven only after at least 20 real websites are migrated one by one through the complete workflow.

## 4. What Changed From Previous MVP Framing

The immediate MVP is no longer an operator-assisted batch migration factory or approximately 200-site portfolio wave. The previous factory/batch/portfolio docs remain useful future scale architecture, but MVP-2 makes the proof unit one website, end to end.

## 5. Batch Migration Deferral

Batch migration, 10+ site execution, multi-site autonomous migration, and 200-site portfolio migration are explicitly deferred until the single-site workflow is proven across at least 20 real websites.

## 6. Required Single-Site Workflow

The required workflow is:

capture source -> review evidence -> generate 1:1 clone -> review/revise clone -> generate proposal -> approve/reject proposal -> implement approved improvements -> preview improved site -> approve content/visual result -> prepare domain/DNS readiness -> create subscription/hosting record -> confirm hosting entitlement -> confirm launch approval -> publish to intended domain -> verify public site -> confirm rollback readiness -> close out.

## 7. Billing/Stripe MVP-Lite Conclusion

Billing/subscription/hosting activation is in MVP scope. MVP-lite requires a hosting/subscription record under the selected client, Stripe/customer-payment truth where applicable, GNR8 hosting entitlement, internal cost/margin visibility, and audit trail.

MVP-lite does not claim full billing platform behavior such as complete checkout, invoicing, taxes, customer portal, plan management, or broad self-service billing.

## 8. Domain/DNS MVP Conclusion

Domain/DNS readiness is in MVP scope. The MVP includes domain intent, manual DNS instructions, owner evidence, Vercel/custom-domain readiness where applicable, SSL/readiness visibility, blockers, DDOM readiness snapshots/refs, and publish prerequisite visibility.

Live DNS mutation, registrar mutation, Openprovider live mutation, automatic DNS repair, and AI-driven DNS changes remain out of scope.

## 9. Publish/Rollback Conclusion

Publish-to-domain is in MVP scope but remains governed and not autonomous. Publish activation approval is separate from launch approval, content approval, domain readiness, and subscription creation.

Rollback readiness is required before launch. Rollback execution remains a governed incident/recovery action, not deterministic replay.

## 10. Improvement Proposal/Implementation Conclusion

The MVP must first create the best possible 1:1 clone, then generate a clear improvement proposal, then implement only approved improvements. Proposal approval does not equal content approval, launch approval, or publish activation approval.

## 11. Command Center/Ops Inbox Conclusion

Command Center and Ops Inbox are supporting operator surfaces. They may summarize state, route blockers, and expose evidence links, but they are derived only. They are not source truth for capture, clone, proposal, approval, domain readiness, subscription, entitlement, publish, rollback, audit, or closeout.

## 12. 20-Site Validation Conclusion

Validation requires at least 20 real websites migrated one by one. Each site must be measured for capture success, clone fidelity, manual correction time, proposal usefulness, improvement time, domain/DNS blockers, subscription/billing success, publish success, rollback readiness, operator time, cost, approval cycle time, and post-publish defects.

## 13. Source-Of-Truth Conclusions

Runtime truth remains active pointer, site version, runtime artifact, and published override state. Approval truth remains scoped human approval records. DDOM readiness is prerequisite evidence, not approval. Stripe is billing/customer-payment truth where applicable. GNR8 owns internal subscription/hosting entitlement, operating status, cost/margin, audit, source refs, and runtime state.

Command Center, Ops Inbox, proposals, AI outputs, previews, thumbnails, billing dashboards, and external workflow snapshots are non-authoritative unless explicitly promoted through source-owned workflows.

## 14. Architecture Risks Found

- Prior docs can cause teams to implement batch/factory behavior before proving the single-site workflow.
- Billing/Stripe foundations can be overread as a full billing platform.
- Vercel/domain readiness can be overread as DNS/registrar truth.
- Subscription creation, launch signoff, content approval, and DDOM readiness can be confused with publish activation approval.
- Proposal artifacts and AI outputs can be mistaken for source truth or implementation approval.
- Command Center/Ops Inbox derived surfaces can be mistaken for canonical state.
- Existing publish/rollback/domain routes have real behavior and need governed workflow review before broader exposure.
- Source capture, font/asset/layout fidelity, and 1:1 clone scoring need hardening before scale.

## 15. Documentation Drift Found

Drift appears in the current MVP-1/STRAT/CAP/BMF language that frames immediate MVP around "operator-assisted migration factory", "approximately 200 sites", "portfolio wave", "bulk migration intake", "migration batch operations", "10 to 25 sites", and BMF batch lifecycles.

Those statements should now be interpreted as future scaling goals. MVP-2 docs are the immediate MVP boundary for implementation sequencing.

## 16. Whether Implementation May Begin

Implementation may begin only for single-site end-to-end workflow gap auditing and follow-on implementation that preserves MVP-2 boundaries.

Implementation should not begin for batch migration, autonomous multi-site migration, full billing platform, full DNS automation, Openprovider live mutation, autonomous publish, broad Command Center actions, broad Ops Inbox actions, marketplace, visual builder, or full Digital Business Twin productization.

## 17. Recommended Next Milestone

Recommended next implementation sequence:

1. Single-site end-to-end flow gap audit.
2. Capture/source evidence hardening.
3. 1:1 clone fidelity hardening.
4. Improvement proposal and implementation workflow.
5. MVP-lite billing/subscription/hosting activation architecture.
6. Domain/DNS launch workflow integration.
7. Publish-to-domain end-to-end rehearsal.
8. 20-site validation run.

Do not recommend or implement batch migration before the single-site workflow is proven.

## 18. Validation Performed

Documentation validation was performed after the MVP-2 docs and index update:

- confirmed all MVP-2 docs exist and are readable;
- confirmed canonical documentation index references the MVP-2 docs;
- confirmed no TypeScript, JavaScript, SQL, migrations, API routes, runtime, publish, rollback, Command Center implementation, Ops Inbox implementation, worker, public runtime, provider, DNS/domain implementation, billing implementation, Stripe implementation, AI, storage, auth implementation, or client portal files were modified;
- ran `git diff --check`;
- checked new Markdown files for trailing whitespace;
- confirmed docs explicitly state batch migration is deferred from MVP;
- confirmed docs explicitly state MVP is one-site-at-a-time;
- confirmed docs explicitly state validation requires at least 20 real websites;
- confirmed docs explicitly include billing/subscription/hosting activation in MVP scope;
- confirmed docs explicitly include domain/DNS readiness in MVP scope;
- confirmed docs explicitly include publish-to-domain in MVP scope;
- confirmed docs explicitly state Command Center and Ops Inbox are derived only;
- confirmed docs explicitly state publish enforcement remains governed and not autonomous.

## 19. Git Status Summary

MVP-2 changed Markdown documentation only:

- `docs/product/gnr8-single-site-migration-mvp-boundary.md`
- `docs/architecture/gnr8-single-site-migration-mvp-state-model.md`
- `docs/architecture/gnr8-single-site-migration-mvp-source-of-truth.md`
- `docs/product/gnr8-single-site-migration-operator-workflow.md`
- `docs/product/gnr8-single-site-migration-20-site-validation-plan.md`
- `docs/product/gnr8-single-site-migration-mvp-realignment-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No commit or push was performed.

## 20. Commands Run

- `rg --files docs | sort`
- `git status --short`
- `rg -n "batch|bulk|factory|10\\+|200-site|200 site|portfolio|MVP|Command Center|Ops Inbox|AAF|DDOM|PASR|PTT|CAP-1|STRAT-1|BMF-1|CCO|OPS-1|OPS-2" docs`
- `sed -n ...` over MVP-1, strategy, CAP, BMF, CCO, OPS, and canonical index docs
- `rg -n ...` over AAF, DDOM, PASR, PTT, and domain closeouts/docs
- `rg --files apps/platform apps/worker packages | rg "..."`
- `rg -n ...` over implementation evidence paths
- `find apps/platform/app/gnr8/command-center -maxdepth 4 -type f | sort`
- `find apps/platform/app/api/gnr8 -maxdepth 7 -type f | rg "..." | sort`
- `git diff --check`
- Markdown trailing whitespace checks over MVP-2 docs
- validation `rg` checks over MVP-2 docs and canonical index
- changed-file guardrail checks

## 21. Runtime Behavior Confirmation

No runtime behavior changed. MVP-2 created Markdown documentation and updated the canonical documentation index only.
