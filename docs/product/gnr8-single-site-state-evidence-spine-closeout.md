# GNR8 Single-Site State Evidence Spine Closeout

Date: 2026-07-29
Phase: MVP-4 documentation architecture
Scope: Single-site state and source evidence spine implementation design

MVP-4 was documentation and architecture only. No SQL migrations, TypeScript, JavaScript, API routes, workers, providers, capture/import behavior, clone behavior, proposal behavior, billing/Stripe behavior, domain/DNS behavior, publish behavior, rollback behavior, Command Center implementation, Ops Inbox implementation, public runtime behavior, AI execution, storage behavior, auth behavior, client portal behavior, commit, or push was performed.

## 1. Files Reviewed

MVP-2 baseline:

- `docs/product/gnr8-single-site-migration-mvp-boundary.md`
- `docs/architecture/gnr8-single-site-migration-mvp-state-model.md`
- `docs/architecture/gnr8-single-site-migration-mvp-source-of-truth.md`
- `docs/product/gnr8-single-site-migration-operator-workflow.md`
- `docs/product/gnr8-single-site-migration-20-site-validation-plan.md`
- `docs/product/gnr8-single-site-migration-mvp-realignment-closeout.md`

MVP-3 baseline:

- `docs/product/gnr8-single-site-end-to-end-gap-audit.md`
- `docs/architecture/gnr8-single-site-end-to-end-implementation-map.md`
- `docs/product/gnr8-single-site-mvp-critical-blockers.md`
- `docs/product/gnr8-single-site-mvp-next-implementation-sequence.md`
- `docs/product/gnr8-single-site-end-to-end-gap-audit-closeout.md`

AAF/DDOM/PASR/PTT/product closeouts and architecture:

- `docs/product/gnr8-audit-approval-implementation-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/product/gnr8-publish-shadow-result-read-model-core-closeout.md`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Representative implementation evidence inspected read-only:

- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`
- `apps/platform/supabase/migrations/20260603120000_migration_job_store.sql`
- `apps/platform/supabase/migrations/20260603130000_migration_batch_store.sql`
- `apps/platform/supabase/migrations/20260603140000_migration_batch_events.sql`
- `apps/platform/supabase/migrations/20260424150000_runtime_raw_template_artifacts.sql`
- `apps/platform/supabase/migrations/20260422143000_site_render_capture_worker_tracking.sql`
- `apps/platform/supabase/migrations/20260327090000_billing_account_cost_center_foundation.sql`
- `apps/platform/supabase/migrations/20260327100100_cost_event_logging_foundation.sql`
- `apps/platform/supabase/migrations/20260424170000_runtime_domain_host_bindings.sql`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/version-lifecycle-rules.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-persistence.ts`

Repository searches also inspected patterns around Supabase migrations, runtime sites/versions/artifacts, active pointer storage, migration/import job tables, source capture/evidence refs, proposal artifact storage, AAF tables, DDOM tables, PTT table, billing/cost/subscription/entitlement references, Command Center read models, Ops Inbox derived helpers, append-only patterns, RLS posture, idempotency patterns, audit/event patterns, and server-only repository patterns.

## 2. Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-state-spine-implementation-design.md`
- `docs/architecture/gnr8-single-site-state-schema-design.md`
- `docs/architecture/gnr8-source-evidence-review-schema-design.md`
- `docs/architecture/gnr8-single-site-state-transition-contract.md`
- `docs/product/gnr8-single-site-state-evidence-operator-workflow.md`
- `docs/product/gnr8-single-site-state-evidence-spine-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. Final Architecture Recommendation

Create an additive, closed-by-default, server-written single-site state spine. Use one mutable current-state row per migration plus append-only state events, append-only refs, stage summaries, blockers, source evidence review records, and closeout records.

The spine is canonical for single-site migration operational state only. Runtime active pointer remains canonical for production serving. AAF remains canonical for approvals, audit, evidence packages, policy evaluations, and approval/evidence links. DDOM remains canonical for domain readiness snapshots. PTT remains canonical for publish target truth. Stripe remains billing/customer-payment truth where used, and GNR8 remains internal hosting entitlement/cost/margin truth. Command Center and Ops Inbox remain derived.

## 4. Proposed Canonical Tables

Recommended state spine tables:

- `gnr8_single_site_migrations`
- `gnr8_single_site_migration_state_events`
- `gnr8_single_site_migration_refs`
- `gnr8_single_site_migration_stage_summaries`
- `gnr8_single_site_migration_blockers`
- `gnr8_single_site_migration_closeouts`

Recommended source evidence review tables:

- `gnr8_source_evidence_reviews`
- `gnr8_source_evidence_review_refs`
- `gnr8_source_evidence_review_items`
- `gnr8_source_evidence_review_events`

The design recommends new `gnr8_single_site_*` names rather than reusing current `gnr8_migration_jobs`/batch tables because existing migration job stages reflect earlier batch/factory architecture and would blur the corrected MVP state model.

## 5. Source Evidence Review Design Summary

Source evidence review is the canonical gate between capture completion and clone generation. Capture completion only proves evidence refs exist. Clone generation is allowed only after review status is `accepted` or `accepted_with_limitations`, with required evidence refs, limitations, reviewer identity, timestamps, source watermarks, audit refs, and AAF exception refs where policy requires.

The design covers source URL, captured pages, screenshots, DOM/source/raw refs, text refs, images/assets, fonts, styles/layout, visual identity/CGP, metadata, diagnostics, source evidence package refs, completeness status, review status, review decision, limitations, missing evidence, accepted degraded capture, retry required, reviewer identity, timestamps, audit refs, AAF evidence refs, privacy labels, and retention labels.

## 6. State Transition Contract Summary

The transition contract covers the MVP-2 state machine from `site_candidate_created` through `migration_closed_out`, `migration_failed`, and `migration_cancelled`. Every transition requires actor, role, idempotency, correlation, source refs, evidence refs, approval refs where applicable, audit refs, retry rules, forbidden shortcuts, and derived Command Center/Ops Inbox projection behavior.

The contract explicitly distinguishes source evidence review, clone review, proposal approval, content approval, DDOM readiness, subscription/hosting readiness, launch approval, and publish activation approval.

## 7. AAF Integration Conclusion

AAF should remain the canonical approval, audit, evidence package, policy evaluation, and approval/evidence link system. The spine should store AAF refs, not create a parallel approval system.

Future AAF scope additions will likely be needed for single-site source evidence acceptance, clone fidelity acceptance, proposal approval, content approval, hosting entitlement exceptions, launch signoff, publish activation, rollback, and closeout. MVP-5 can create nullable AAF refs in persistence; MVP-6 should enforce required AAF refs in the server-only transition writer before runtime integration.

## 8. DDOM Integration Conclusion

DDOM remains canonical for domain readiness snapshots and freshness. The spine should reference latest acceptable DDOM snapshot ids, source watermarks, readiness states, freshness states, blockers, and exception approvals.

DDOM readiness is a prerequisite, not DNS truth, registrar truth, launch approval, or publish activation approval. MVP-4 does not authorize live DNS, registrar, Openprovider, Vercel, or provider mutation.

## 9. PASR/PTT Integration Conclusion

PTT remains canonical publish target truth. The spine should reference target id and source watermark when assembling publish readiness.

PASR remains a derived, read-only, shadow-only publish readiness evidence source until a later enforcement milestone. It may be referenced by the spine, Command Center, and Ops Inbox, but it must not mutate state, create approvals, or block publish until enforcement is explicitly implemented.

## 10. Billing/Stripe/Hosting Conclusion

Stripe remains billing/customer-payment truth where used. GNR8 must own local subscription projection, site hosting entitlement, hosting operating status, cost center, cost/margin visibility, and audit refs.

The spine should track `subscription_required`, `subscription_created`, and `hosting_entitlement_ready` as launch prerequisites. Subscription creation and hosting entitlement readiness do not imply content approval, launch approval, or publish activation approval.

## 11. Command Center/Ops Inbox Conclusion

Command Center should consume a read-only projection of the spine after persistence and writer services exist. It may show current state, blockers, evidence freshness, stage summaries, refs, and allowed/prohibited actions.

Ops Inbox should derive stable work items from canonical blockers and missing transition requirements. Ops Inbox item dismissal must not resolve canonical state. Both Command Center and Ops Inbox remain derived-only.

## 12. Source-Of-Truth Conclusion

The future state spine is canonical for single-site migration operational state and source evidence review truth. It should not absorb runtime serving truth, AAF approval truth, DDOM domain readiness truth, PTT publish target truth, Stripe payment truth, or GNR8 entitlement/cost truth. It should link to those systems with durable refs, source watermarks, audit refs, and evidence refs.

## 13. Architecture Risks Found

- Existing runtime lifecycle states are too coarse for the corrected MVP workflow.
- Existing migration job/batch tables encode earlier batch/factory stages and should not become the corrected single-site state truth.
- Source evidence review must be first-class or clone/proposal/publish decisions will rest on ambiguous evidence.
- AAF scopes may need additional single-site vocabulary before all approvals can be enforced cleanly.
- Billing/Stripe/entitlement schema ownership remains ambiguous for MVP-lite site hosting truth.
- DDOM/PASR/PTT foundations are strong but must remain readiness/source refs, not approvals.
- Command Center and Ops Inbox are useful but can become accidental source truth if write boundaries are not explicit.
- Heavy evidence must stay in artifact/object storage with hashes and refs, not in state rows.

## 14. Whether Implementation May Begin

Yes. Implementation may begin with MVP-5 SQL persistence core for single-site state and source evidence review.

Implementation should not begin with runtime integration, capture mutation, clone gating, proposal execution, billing UI, domain automation, publish enforcement, Command Center mutation, Ops Inbox mutation, batch migration, provider calls, or external service calls.

## 15. Recommended Next Milestone

Recommended sequence:

1. MVP-5 SQL persistence core for single-site state and source evidence review.
2. MVP-6 server-only writer/repository for state transitions and evidence review.
3. MVP-7 read model for Command Center/Ops Inbox projection.
4. MVP-8 integrate capture completion into state spine.
5. MVP-9 gate clone generation behind accepted source evidence.
6. Later milestones for clone review/fidelity, proposal approval, content approval, domain readiness, subscription/hosting, publish readiness, rollback readiness, closeout, and 20-site validation.

## 16. Validation Performed

Documentation validation performed:

- Confirmed all MVP-4 docs exist and are readable.
- Confirmed canonical documentation index references MVP-4 docs.
- Confirmed no TypeScript, JavaScript, SQL, migrations, API routes, runtime, publish, rollback, Command Center implementation, Ops Inbox implementation, worker, public runtime, provider, DNS/domain implementation, billing implementation, Stripe implementation, AI, storage, auth implementation, or client portal files were modified.
- Ran `git diff --check`.
- Checked new Markdown files for trailing whitespace.
- Confirmed docs explicitly define canonical single-site migration state truth.
- Confirmed docs explicitly define source evidence review truth.
- Confirmed docs explicitly define transition requirements.
- Confirmed docs explicitly distinguish source evidence review, clone review, proposal approval, content approval, launch approval, publish activation approval, DDOM readiness, and subscription/hosting readiness.
- Confirmed docs explicitly state Command Center and Ops Inbox are derived only.
- Confirmed docs explicitly state no runtime behavior changed.
- Confirmed docs recommend the next implementation milestone.

## 17. Git Status Summary

MVP-4 changed Markdown documentation only:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `docs/architecture/gnr8-single-site-state-spine-implementation-design.md`
- `docs/architecture/gnr8-single-site-state-schema-design.md`
- `docs/architecture/gnr8-source-evidence-review-schema-design.md`
- `docs/architecture/gnr8-single-site-state-transition-contract.md`
- `docs/product/gnr8-single-site-state-evidence-operator-workflow.md`
- `docs/product/gnr8-single-site-state-evidence-spine-closeout.md`

No commit or push was performed.

## 18. Commands Run

- `sed -n ...` over MVP-2/MVP-3 baseline docs.
- `sed -n ...` over AAF, DDOM, PASR, PTT, billing, runtime, capture, migration job, migration batch, domain, and proposal evidence files.
- `rg --files ...` over migrations, implementation, docs, AAF/DDOM/PTT/PASR/billing/capture/runtime areas.
- `rg -n ...` for table, RLS, idempotency, append-only, correlation, audit, privacy, retention, runtime active pointer, publish, rollback, state, and canonical-index patterns.
- `git status --short`.
- `git diff --name-only`.
- `test -r ...` for MVP-4 doc readability.
- `rg -n ...` validation checks over MVP-4 docs and canonical index.
- `git diff --check`.
- Markdown trailing whitespace checks.
- Changed-file guardrail checks.

No production Supabase, staging Supabase, Vercel, DNS provider, Openprovider, Stripe, AI provider, or external provider calls were run.

## 19. Runtime Behavior Confirmation

No runtime behavior changed. MVP-4 created Markdown documentation and updated the canonical documentation index only.
