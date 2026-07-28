# GNR8 Publish Shadow Result Surfacing Closeout

PASR-3 closeout for the documentation-only architecture phase defining operator-visible surfacing of publish activation shadow gate results.

No runtime behavior, TypeScript implementation, JavaScript implementation, SQL migration, API route, server action, publish route, rollback route, Command Center, Ops Inbox, public runtime, worker, provider, DNS/domain, billing, Stripe, AI, storage, DDOM snapshot creation, approval creation, enforcement, commit, push, production Supabase, staging Supabase, Vercel, registrar, Openprovider, DNS provider, Stripe, or AI provider was intentionally changed or called.

## 1. Files Reviewed

PASR-2 baseline:

- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.integration.test.ts`
- `apps/platform/gnr8/runtime/publish-activation-shadow-gate-observation.test.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `docs/product/gnr8-publish-activation-shadow-gate-integration-closeout.md`

Supporting PASR/AAF source contracts:

- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `docs/architecture/gnr8-aaf-publish-source-reader-architecture.md`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`

Governance and source-of-truth baseline:

- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/architecture/gnr8-audit-approval-foundation-design.md`
- `docs/architecture/gnr8-evidence-package-contract.md`
- `docs/architecture/gnr8-audit-event-taxonomy.md`
- `docs/architecture/gnr8-approval-schema-and-policy-contract.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-production-caller-architecture.md`
- `docs/architecture/gnr8-ddom-readiness-source-state-contract.md`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-writer-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-manual-snapshot-caller-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-manual-snapshot-trigger-closeout.md`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `docs/architecture/gnr8-command-center-ops-inbox-design.md`
- `docs/architecture/gnr8-command-center-read-model-contract.md`
- `docs/architecture/gnr8-ops-inbox-work-item-model.md`
- `docs/product/gnr8-command-center-ops-inbox-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 2. Files Created Or Updated

Created:

- `docs/architecture/gnr8-publish-shadow-result-surfacing-architecture.md`
- `docs/architecture/gnr8-publish-shadow-result-read-model-contract.md`
- `docs/product/gnr8-publish-shadow-evidence-review-workflow.md`
- `docs/product/gnr8-publish-shadow-result-surfacing-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. PASR-2 Behavior Summary

PASR-2 added a shadow observer behind `GNR8_PUBLISH_ACTIVATION_SHADOW_GATE`.

When disabled:

- no observer call occurs;
- no shadow result is produced;
- no extra AAF/PASR source read, evidence build, gate dry-run, or log result is produced.

When enabled:

- the publish orchestrator helper calls the observer before active pointer mutation;
- the observer reads PASR source truth through the read-only source reader;
- it builds a non-executing AAF publish activation evidence package;
- it evaluates the AAF publish activation gate in dry-run mode;
- it returns a `PublishActivationShadowResult`;
- it logs a compact internal summary;
- it fails open on observer errors.

The result is not persisted as a first-class shadow result, not returned in the publish API response, and not visible in Command Center or Ops Inbox yet. AAF evidence/gate/audit records can be written when the shadow observer is enabled.

Every result remains:

- `shadowOnly: true`
- `enforcementApplied: false`
- `publishActionBlocked: false`

## 4. Final Surfacing Recommendation

Surface shadow results first as internal operator diagnostics backed by a read-only read model. Do not start with broad UI, Ops Inbox items, publish response metadata, or enforcement.

The future UI should label every result as shadow-only, non-blocking, derived, and not approval. It should link evidence refs, source refs, watermarks, DDOM snapshot refs, publish target refs, approval refs, correlation ids, idempotency ids, gate attempt ids, and audit event ids.

## 5. Read-Model Recommendation

Implement a read-only publish shadow result read model/repository first.

The read model should:

- derive from canonical runtime, AAF, DDOM, publish target, content, approval, and audit refs;
- expose stable PASR-3 status vocabulary;
- show missing/stale/unavailable source truth;
- show freshness, severity, warnings, limitations, and next operator action;
- be role-aware and redaction-aware;
- never mutate source records;
- never create approvals;
- never create DDOM snapshots;
- never block publish.

## 6. Operator Workflow Summary

Operators start from a future Command Center publish/readiness drilldown, Ops Inbox item detail, evidence package drilldown, or logs until the read model exists.

They review:

- whether shadow was enabled and available;
- source read, evidence build, and gate dry-run status;
- DDOM readiness snapshot status;
- publish target status;
- publish activation approval status;
- missing/stale source truth;
- warnings, limitations, and blocked reasons;
- evidence/source/audit/correlation/idempotency refs.

Operators may run the DDOM manual trigger only outside PASR and only through the source-owned DDOM workflow. Operators may request publish activation approval only through AAF. Operators may repair publish target truth only through a future audited source-owned workflow.

## 7. Status Vocabulary Summary

PASR-3 defines:

- `shadow_not_enabled`
- `shadow_not_available`
- `shadow_ready`
- `shadow_ready_with_warnings`
- `shadow_missing_source_truth`
- `shadow_stale_source_truth`
- `shadow_missing_ddom_snapshot`
- `shadow_stale_ddom_snapshot`
- `shadow_missing_publish_target`
- `shadow_missing_publish_activation_approval`
- `shadow_gate_not_ready`
- `shadow_evaluation_failed`

All statuses have explicit meaning, severity, publish-blocking value, future-enforcement implication, recommended operator action, and required evidence links in the read-model contract.

## 8. Source-Of-Truth Boundary

The read model is derived only.

Canonical source truth remains:

- runtime site/version/artifact/active pointer records for runtime state;
- published content override rows for content state;
- DDOM append-only readiness snapshots for domain readiness snapshots;
- `gnr8_publish_targets` for publish target policy/config;
- AAF approval request/decision/revocation/supersession rows for approvals;
- AAF evidence/gate/audit rows for evidence and dry-run gate records;
- external providers remain authoritative for their own external systems.

Command Center, Ops Inbox, preview URLs, UI labels, AI output, external workflow messages, and logs do not become source truth.

## 9. Command Center/Ops Inbox Boundary

Command Center and Ops Inbox remain derived only.

Command Center may later display latest shadow status, evidence refs, source refs, and next actions. Ops Inbox may later derive work items from stable shadow blockers. Neither surface may approve, enforce, mutate, or close work without a canonical state transition or audited decision.

## 10. DDOM Snapshot Boundary

PASR must not create DDOM snapshots.

Missing or stale DDOM snapshots should be displayed as shadow-only readiness gaps. Operators may be directed to run the DDOM manual trigger outside PASR when safe and authorized. DDOM readiness is not publish activation approval.

## 11. Approval Boundary

Publish activation approval must be exact AAF approval truth for scope `publish_activation`.

The following are not publish activation approval:

- DDOM readiness;
- domain readiness;
- domain exception;
- launch signoff;
- client review;
- content approval;
- Command Center status;
- Ops Inbox item;
- AI output;
- external workflow text.

## 12. Publish Non-Enforcement Boundary

PASR-3 shadow result surfacing must never claim current publish was blocked by shadow.

Shadow results do not block publish, do not change active pointers, do not change publish response contracts, do not change rollback behavior, and do not implement enforcement.

## 13. Risks Found

- PASR-2 currently logs a compact summary but does not persist a first-class shadow result read model.
- Durable publish attempt refs may be absent, so correlation and idempotency refs may be the only linkage.
- AAF evidence/gate records can exist without an operator-facing reconstruction layer.
- Missing publish activation approval is expected in current shadow mode and could be misread as a failed publish unless labels are clear.
- DDOM snapshot gaps can dominate shadow results if manual snapshot operations lag source changes.
- Broad UI or Ops Inbox work items before read-model implementation could turn derived labels into accidental truth.
- Publish API metadata could be mistaken for publish outcome if introduced too early.

## 14. Whether Implementation May Begin

Implementation may begin only for the next narrow milestone: a read-only publish shadow result read model/repository with tests and no runtime behavior change.

Implementation should not begin yet for enforcement, broad UI, Ops Inbox derivation, publish API response metadata, or DDOM trigger wiring from publish/PASR.

## 15. Recommended Next Milestone

Recommended next milestone: implement the read-only publish shadow result read model/repository first.

Comparison:

| Candidate | Decision | Reason |
| --- | --- | --- |
| Read-only shadow result read model | Recommended first | Establishes stable derived contract, status vocabulary, evidence/source refs, and non-enforcement labels without UI/API blast radius. |
| Command Center surfacing | Deferred until read model exists | UI should consume a proven projection rather than reconstructing PASR/AAF details. |
| Ops Inbox derived work items | Deferred until read model and stable keys exist | Work items must remain derived and resolvable by canonical transitions. |
| Publish API response metadata | Deferred | Current PASR-2 intentionally avoided response contract changes; metadata can be misread as publish outcome. |
| Enforcement design | Deferred | Operators need real shadow data review before enforcement policy. |
| Operator-trigger wiring for DDOM snapshots | Separate source-owned milestone | DDOM trigger must remain outside PASR/publish evaluation. |

## 16. Validation Performed

Documentation validation only:

- confirmed all PASR-3 docs exist and are readable;
- confirmed canonical doc index references PASR-3 docs;
- confirmed only Markdown docs and canonical index were changed;
- confirmed no TypeScript, JavaScript, SQL, migration, route, worker, runtime, publish, rollback, Command Center, Ops Inbox, provider, DNS/domain, billing, Stripe, AI, or public serving files were modified;
- ran `git diff --check`;
- checked new Markdown files for trailing whitespace;
- searched new docs for accidental enforcement claims and ensured enforcement is future/deferred only;
- confirmed docs explicitly state shadow results do not block publish;
- confirmed docs explicitly state PASR must not create DDOM snapshots;
- confirmed docs explicitly state Command Center and Ops Inbox are derived only;
- confirmed docs explicitly state DDOM readiness is not publish activation approval.

## 17. Git Status Summary

Expected changed files:

- `docs/architecture/gnr8-publish-shadow-result-surfacing-architecture.md`
- `docs/architecture/gnr8-publish-shadow-result-read-model-contract.md`
- `docs/product/gnr8-publish-shadow-evidence-review-workflow.md`
- `docs/product/gnr8-publish-shadow-result-surfacing-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No commit or push was performed.

## 18. Commands Run

Commands run included:

- `pwd`
- `git status --short`
- `rg --files ...`
- `rg -n ...`
- `sed -n ...`
- `test -r ...`
- `git diff --name-only`
- `git diff --check`
- `git status --short -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs' '*.sql'`
- `rg -n "[ \\t]+$" ...`
- `rg -n "enforce|enforcement|block publish|blocked publish|does not block publish|PASR must not create DDOM snapshots|Command Center and Ops Inbox are derived only|DDOM readiness is not publish activation approval" ...`

No runtime tests were run because PASR-3 is documentation-only.

## 19. Final Confirmation

PASR-3 changed documentation only. No runtime behavior changed.
