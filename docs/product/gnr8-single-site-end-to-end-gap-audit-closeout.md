# GNR8 Single-Site End-to-End Gap Audit Closeout

Date: 2026-07-29
Phase: MVP-3 documentation audit

## 1. Files Reviewed

MVP-2 docs:
- `docs/product/gnr8-single-site-migration-mvp-boundary.md`
- `docs/architecture/gnr8-single-site-migration-mvp-state-model.md`
- `docs/architecture/gnr8-single-site-migration-mvp-source-of-truth.md`
- `docs/product/gnr8-single-site-migration-operator-workflow.md`
- `docs/product/gnr8-single-site-migration-20-site-validation-plan.md`
- `docs/product/gnr8-single-site-migration-mvp-realignment-closeout.md`

Supporting docs:
- `docs/product/gnr8-current-capability-inventory.md`
- `docs/product/gnr8-capability-inventory-closeout.md`
- `docs/product/future-gnr8-strategy-closeout.md`
- `docs/product/gnr8-mvp-readiness-map.md`
- `docs/architecture/gnr8-technical-capability-map.md`
- `docs/product/gnr8-operator-capability-map.md`
- `docs/product/gnr8-domain-dns-operating-model-closeout.md`
- `docs/architecture/gnr8-domain-dns-mvp-boundary.md`
- `docs/product/gnr8-audit-approval-implementation-closeout.md`
- `docs/product/gnr8-bulk-migration-factory-closeout.md`
- `docs/product/gnr8-command-center-ops-inbox-closeout.md`
- `docs/product/gnr8-ops-inbox-minimal-shell-closeout.md`
- `docs/product/gnr8-publish-activation-shadow-gate-integration-closeout.md`
- `docs/product/gnr8-ddom-readiness-manual-snapshot-trigger-closeout.md`

Implementation evidence:
- `apps/platform/gnr8/site/scoped-import-pipeline.ts`
- `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`
- `apps/worker/gnr8/site/site-render-capture-service.ts`
- `apps/worker/gnr8/import/runtime/extract-assets.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.ts`
- `apps/platform/gnr8/runtime/rollback-switch.ts`
- `apps/platform/gnr8/runtime/version-lifecycle-rules.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/approve/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/rollback/route.ts`
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/domain/route.ts`
- `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`
- `apps/platform/src/lib/vercel/domain-dns-instructions.ts`
- `apps/platform/src/lib/vercel/vercel-domain-client.ts`
- `apps/platform/gnr8/ddom/*`
- `apps/platform/gnr8/aaf/*publish*`
- `apps/platform/gnr8/ptt/publish-target-source-truth-persistence.test.ts`
- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`
- `apps/platform/supabase/migrations/20260327090000_billing_account_cost_center_foundation.sql`
- `apps/platform/supabase/migrations/20260327100100_cost_event_logging_foundation.sql`
- `apps/platform/gnr8/billing/*`
- `packages/core/src/modules/billing/service.ts`
- `packages/core/src/modules/entitlement/service.ts`
- `packages/data/src/repositories/postgres-subscriptions-repository.ts`
- `packages/data/src/repositories/postgres-entitlement-repository.ts`
- `packages/data/src/repositories/postgres-stripe-events-repository.ts`
- `apps/platform/app/api/stripe/webhook/route.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-contract.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-persistence.ts`
- `apps/platform/gnr8/ai/transformation-planner.ts`
- `apps/platform/gnr8/ai/transformation-executor.ts`
- `apps/platform/app/api/gnr8/ai/transformation-plan/route.ts`
- `apps/platform/app/api/gnr8/ai/transformation-execute/route.ts`
- `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.ts`
- `apps/platform/gnr8/runtime/twin/twin-proposal-approval.ts`
- `apps/platform/app/gnr8/command-center/*`

## 2. Files Created/Updated

Created:
- `docs/product/gnr8-single-site-end-to-end-gap-audit.md`
- `docs/architecture/gnr8-single-site-end-to-end-implementation-map.md`
- `docs/product/gnr8-single-site-mvp-critical-blockers.md`
- `docs/product/gnr8-single-site-mvp-next-implementation-sequence.md`
- `docs/product/gnr8-single-site-end-to-end-gap-audit-closeout.md`

Updated:
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. Overall MVP Readiness Estimate

35-45 percent for the corrected single-site MVP workflow.

The strongest foundations are capture/import, runtime artifact serving, active pointer mechanics, domain/Vercel readiness observation, DDOM/PASR read-only evidence plumbing, cost/margin foundations, and Command Center/Ops derived surfacing.

The weakest foundations are canonical single-site state, approval separation/enforcement, source evidence review, clone acceptance, approved improvement implementation, MVP-lite billing/subscription/hosting activation, launch readiness composition, rollback readiness proof, and validation closeout.

## 4. Stage-By-Stage Readiness Summary

| Stage | Readiness |
| --- | --- |
| Capture | Partial, strong raw capability but missing operator evidence acceptance |
| Clone | Partial, runtime clone artifacts exist but clone review/fidelity truth missing |
| Proposal | Partial/documented, generated proposals are quarantined and not approval truth |
| Implementation | Partial/unsafe, transformation/content primitives exist but not approved-proposal workflow |
| Preview | Partial, preview exists but not content approval evidence |
| Domain/DNS | Partial, Vercel/manual DNS/DDOM exist but not launch-enforced |
| Billing/subscription/hosting | Partial/unsafe, cost and webhook foundations exist but site hosting activation missing |
| Publish | Implemented with unsafe gaps, active pointer switch exists but full gates missing |
| Rollback | Partial, mechanics exist but readiness evidence missing |
| Closeout | Missing as a canonical migration state |
| 20-site validation | Not ready for formal validation |

## 5. Current Strongest Areas

- Capture/import diagnostics and rendered evidence collection.
- Runtime artifact creation, preview serving, public serving, and active pointer switching.
- Domain binding, Vercel readiness checks, manual DNS instruction computation, and DDOM/PASR evidence plumbing.
- Cost-center, cost-event, pricing, and margin foundations.
- Command Center and Ops Inbox derived read-only surfacing.

## 6. Current Weakest Areas

- Canonical MVP-2 migration state machine.
- Evidence review and approval gates.
- Proposal approval to improved-version implementation flow.
- Billing/Stripe MVP-lite site hosting activation.
- Enforced launch/publish/rollback readiness.
- 20-site validation records and closeout.

## 7. P0 Blockers

- No canonical single-site migration state machine.
- Source evidence review is not first-class.
- Clone review and fidelity acceptance are missing.
- Improvement proposal approval is not canonical.
- Content, launch, and publish activation approvals are not separated and enforced.
- Billing/Stripe/hosting activation is unsafe to claim for MVP-lite.
- Publish-to-domain readiness is not enforced.

## 8. P1 Blockers

- Multi-page capture and clone proof is incomplete for 20 real websites.
- Domain owner evidence and exception handling are missing.
- Rollback readiness evidence is missing.
- Command Center does not project the full MVP-2 single-site state.
- Closeout and validation metrics are not state-owned.

## 9. Billing/Stripe MVP-Lite Conclusion

Billing/Stripe MVP-lite status: partial and unsafe to claim ready.

Cost accounting and margin visibility foundations are real. Stripe webhook subscription projection and entitlement sync are scaffolded. However, no complete client/site-scoped hosting subscription creation workflow, hosting entitlement source truth, launch-blocking billing status, or verified schema source for subscription/entitlement/Stripe event projection tables was found in the reviewed platform migrations.

## 10. Domain/DNS Conclusion

Domain/DNS launch readiness status: partial.

Manual DNS instructions, Vercel project-domain add/check behavior, runtime domain bindings, background verification, DDOM snapshots, and PASR consumption exist. Live DNS/registrar/Openprovider mutation is not MVP-required and should remain out of scope. Missing pieces are domain owner evidence, integrated DDOM trigger surface, stale/failed/exception handling as launch prerequisites, and enforced domain readiness gates.

## 11. Publish/Rollback Conclusion

Publish/rollback status: publish mechanics implemented with unsafe gate gaps; rollback mechanics partial.

The publish route and orchestrator can switch the active runtime pointer and PASR can observe readiness in shadow mode. This does not yet satisfy MVP-2 because content approval, launch approval, publish activation approval, subscription/hosting entitlement, domain freshness, post-publish verification, and rollback readiness are not enforced together. Rollback switching exists, but rollback readiness evidence does not.

## 12. Improvement Proposal/Implementation Conclusion

Improvement proposal/implementation status: partial and not MVP-ready.

Generated proposal artifacts are intentionally quarantined and non-executable. Transformation planning/execution can propose and execute selected steps in legacy page storage, but this is not the canonical approved-proposal-to-improved-runtime-version workflow. Proposal approval, content approval, rejection/revision handling, and evidence-linked implementation lineage are missing.

## 13. Command Center/Ops Inbox Conclusion

Command Center and Ops Inbox status: useful derived partials.

Command Center exposes sites, hosting, migrations/batches, cost/margin, and PASR panels. Ops Inbox surfaces PASR-derived publish shadow work items. They remain derived-only and are not source truth. They do not yet support the full MVP-2 single-site operator workflow.

## 14. Source-Of-Truth Conclusion

The repository has source truths for runtime artifacts, active pointer, publish target, DDOM snapshots, billing cost centers/events, and partial source capture provenance. It lacks canonical source truths for the single-site migration state, source evidence review, clone review, approved proposal, content approval, launch approval, site-scoped hosting entitlement, rollback readiness, and closeout.

## 15. Whether Implementation May Begin

Yes. Implementation may begin after MVP-3, starting with the single-site state and source evidence spine. The team should not begin batch migration or claim MVP-lite publish readiness until P0 blockers are resolved.

## 16. Recommended Next Milestone

Recommended next milestone: Milestone 1 from `docs/product/gnr8-single-site-mvp-next-implementation-sequence.md`, single-site state and source evidence spine.

## 17. Validation Performed

Documentation validation performed:
- Confirmed all MVP-3 docs exist and are readable.
- Confirmed canonical documentation index references the MVP-3 docs.
- Confirmed no TypeScript, JavaScript, SQL, migration, route, worker, provider, DNS/domain, billing, Stripe, AI, storage, auth, Command Center, Ops Inbox, public runtime, publish/rollback, or client portal implementation files were modified by MVP-3.
- Ran `git diff --check`.
- Checked new Markdown files for trailing whitespace.
- Confirmed docs explicitly classify billing/Stripe MVP-lite status.
- Confirmed docs explicitly classify domain/DNS launch readiness status.
- Confirmed docs explicitly classify publish/rollback status.
- Confirmed docs explicitly classify improvement proposal/implementation status.
- Confirmed docs explicitly list P0/P1 blockers.
- Confirmed docs explicitly state batch migration remains deferred.
- Confirmed docs explicitly recommend the next implementation sequence.
- Confirmed docs explicitly state no runtime behavior changed.

## 18. Git Status Summary

MVP-3 created five new Markdown docs and updated the canonical doc index.

Pre-existing working tree state before MVP-3 included an already-modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` and untracked MVP-2 docs. Those pre-existing files were preserved.

## 19. Commands Run

- `git status --short`
- `git diff --name-only`
- `git ls-files --others --exclude-standard ...`
- `git diff --check`
- `sed -n ...`
- `rg -n ...`
- `rg --files ...`
- `wc -l ...`
- `pwd`

No production or staging Supabase commands were run. No Vercel, DNS provider, Openprovider, Stripe, or AI provider calls were run. No destructive commands were run. No commit or push was run.

## 20. Runtime Behavior Confirmation

No runtime behavior changed. MVP-3 changed Markdown documentation only.
