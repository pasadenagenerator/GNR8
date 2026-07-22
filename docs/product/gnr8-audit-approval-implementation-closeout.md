# GNR8 Audit, Approval, and Evidence Implementation Closeout (AAF-2)

## Purpose

This closeout records the AAF-2 documentation-only architecture phase for the GNR8 MVP Audit, Approval, and Evidence implementation design.

## Documents Created

- `docs/architecture/gnr8-audit-approval-implementation-design.md`
- `docs/architecture/gnr8-approval-schema-and-policy-contract.md`
- `docs/architecture/gnr8-audit-event-write-path-contract.md`
- `docs/architecture/gnr8-evidence-package-implementation-contract.md`
- `docs/architecture/gnr8-approval-gate-integration-map.md`
- `docs/product/gnr8-audit-approval-implementation-operator-workflow.md`
- `docs/product/gnr8-audit-approval-implementation-closeout.md`

## Baseline Docs Reviewed

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `docs/ai/GNR8_THREAD_HANDOFF.md`
- `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md`
- `docs/ai/GNR8_COLLABORATION_PROTOCOL.md`
- `docs/ai/GNR8_PROJECT_MAP.md`
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`
- `docs/ai/decisions/ADR-003-runtime-artifact-model.md`
- `docs/product/gnr8-mvp-boundary.md`
- `docs/product/gnr8-mvp-supported-site-classes.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/product/gnr8-mvp-boundary-closeout.md`
- `docs/architecture/gnr8-bulk-migration-factory-design.md`
- `docs/architecture/gnr8-bulk-migration-batch-lifecycle.md`
- `docs/architecture/gnr8-bulk-migration-failure-recovery.md`
- `docs/product/gnr8-bulk-migration-operator-workflow.md`
- `docs/product/gnr8-bulk-migration-factory-closeout.md`
- `docs/architecture/gnr8-command-center-ops-inbox-design.md`
- `docs/architecture/gnr8-command-center-read-model-contract.md`
- `docs/architecture/gnr8-ops-inbox-work-item-model.md`
- `docs/product/gnr8-command-center-operator-workbench.md`
- `docs/product/gnr8-command-center-ops-inbox-closeout.md`
- `docs/architecture/gnr8-audit-approval-foundation-design.md`
- `docs/architecture/gnr8-approval-persistence-model.md`
- `docs/architecture/gnr8-audit-event-taxonomy.md`
- `docs/architecture/gnr8-evidence-package-contract.md`
- `docs/product/gnr8-audit-approval-operator-workflow.md`
- `docs/product/gnr8-audit-approval-foundation-closeout.md`
- `docs/architecture/gnr8-domain-dns-operating-model-decision.md`
- `docs/architecture/gnr8-domain-dns-mvp-boundary.md`
- `docs/architecture/gnr8-domain-dns-readiness-and-evidence-model.md`
- `docs/product/gnr8-domain-dns-operator-workflow.md`
- `docs/product/gnr8-domain-dns-operating-model-closeout.md`

## Implementation Evidence Reviewed

Representative implementation areas inspected:

- auth/RBAC and agency action context,
- audit/activity modules and site action/publish event migrations,
- migration batch/job/stage stores, executor, factory, events, and tests,
- publish activation orchestrator, guard, safety checks, runtime store, publish route, and tests,
- rollback switch and rollback route,
- content publish/rollback routes and content runtime-store behavior,
- domain route, domain verification worker, runtime domain readiness, DNS/provider execution gate, domain binding migrations, and tests,
- provider operation approval artifacts, handoff repositories, migrations, and tests,
- billing/cost model and cost event migrations,
- Command Center read model, bulk action code, and operator table,
- AI autonomous execution route and policy modules,
- Supabase migrations for runtime bindings, publish events, provider approvals, batch/job stores, domain readiness, and cost events.

## Final Implementation Design Summary

AAF-2 defines a new canonical control-plane foundation for scoped approvals, append-only audit, immutable evidence packages, persisted policy evaluations, and fail-closed action gates. Existing runtime, migration, domain, billing, provider, content, AI, and external records remain source records or evidence refs; they do not become approval truth.

## Proposed Schema Summary

The proposed approval schema includes `approval_requests`, `approval_decisions`, `approval_policies`, `approval_evidence_links`, `approval_scope_definitions`, `approval_supersession_links`, `approval_revocations`, `approval_policy_evaluations`, and `approval_subject_refs`.

The proposed audit schema uses a canonical append-only envelope with actor, subject, family, severity, replay class, correlation, causation, idempotency, source metadata, evidence refs, approval refs, policy refs, before/after refs, privacy labels, and retention labels.

The proposed evidence schema includes `evidence_packages`, `evidence_package_items`, `evidence_package_source_refs`, `evidence_package_freshness_checks`, `evidence_package_redactions`, `evidence_package_supersession`, and `evidence_package_audit_links`.

## Proposed Service/Module Summary

Later implementation should add:

- approval request service,
- approval decision service,
- audit writer,
- evidence package builder,
- approval policy evaluator,
- action gate validator,
- subject ref adapters,
- Command Center/Ops Inbox read-model projector.

## Proposed Policy/Gate Summary

Privileged action gates must load canonical subject state, persist policy evaluation, verify evidence/freshness, verify approval or explicit `not_required_by_policy`, verify actor role/scope, write pre-action audit, execute only if allowed, write outcome audit, and update derived read models.

## Source-Of-Truth Conclusions

The canonical storage decision is a hybrid: new Supabase/Postgres AAF control-plane tables for approval, audit, evidence, policy, and gate truth, linked to existing domain source records. Heavy artifacts belong in object storage with immutable refs, hashes, and metadata stored in Postgres.

Command Center, Ops Inbox, UI state, external tools, screenshots, generated proposals, previews, provider artifacts, AI outputs, billing dashboards, and domain readiness badges are not approval truth.

## Major Implementation Risks

- Publish and rollback routes can mutate active runtime state before final AAF gates exist.
- Domain routes and workers can mutate GNR8/Vercel/domain binding state before AAF domain gates exist.
- Command Center bulk actions can call import/approve/publish/retry surfaces without per-subject approval scopes.
- BMF replay/resume/start can mutate jobs/stages/batches before AAF gates.
- Provider approval artifacts overlap in naming but are not AAF human approval decisions.
- Existing event-like tables are not a complete append-only AAF audit ledger.
- Content publish/rollback routes mutate content state without AAF content scope separation.
- External workflow refs and AI plans could be mistaken for approval truth.
- Evidence packages could silently mutate if implemented as live queries.
- Heavy evidence in Postgres could create storage, egress, privacy, and retention risk.

## Explicit Deferrals

AAF-2 defers all runtime implementation:

- no schemas or migrations,
- no APIs,
- no services,
- no workers, queues, schedulers, or leases,
- no UI changes,
- no Command Center/Ops Inbox implementation,
- no Domain/DNS behavior changes,
- no Publish/Rollback behavior changes,
- no Migration Factory behavior changes,
- no billing/cost behavior changes,
- no provider execution changes,
- no AI behavior changes,
- no storage migration.

## Recommended Next Milestone

The next milestone can begin implementation with the conservative sequence in `docs/architecture/gnr8-audit-approval-implementation-design.md`: schema/migration core first, then services, policy evaluator, audit writer, evidence builder, approval APIs, gate helper, focused tests, and one low-risk gate integration before BMF, Domain/DNS, Publish/Rollback, and read-model integrations.

No additional design closeout is required before implementation if the next milestone accepts the AAF-2 contracts as canonical.

## Validation Performed

Documentation-only validation confirmed:

- all AAF-2 files exist and are readable,
- required sections are present in the main implementation design,
- all required approval statuses are present,
- all required approval scopes are present,
- all required audit event families are present,
- all required evidence package types are present,
- all required gated actions are present in the gate map,
- DDOM-1 no-live-DNS/registrar/Openprovider boundary is preserved,
- AAF-1 scoped approval, append-only audit, immutable evidence, and fail-closed semantics are preserved,
- MVP-1 source-of-truth boundaries are preserved,
- CCO-1 derived-only Command Center/Ops Inbox semantics are preserved,
- BMF-1 retry/replay semantics are preserved,
- no runtime implementation is claimed,
- no live DNS/registrar/provider mutation is claimed,
- no Stripe/customer billing implementation is claimed,
- no autonomous AI execution is claimed,
- no storage migration is claimed,
- Markdown whitespace/diff checks passed.

## Commands Run

Representative commands:

- `sed -n ...` against canonical docs and representative implementation files.
- `rg -n ...` across auth, audit, migration, runtime, domain, provider, billing, Command Center, content, AI, migrations, and tests.
- `find ...` for existing AAF/audit/approval documentation.
- `test -r ...` for AAF-2 file readability.
- `rg -n ...` validation checks for sections, statuses, scopes, families, package types, gated actions, and preserved boundaries.
- `git diff --check -- ...`
- `git status --short`

## Runtime Behavior Confirmation

No runtime behavior changed. Only Markdown documentation and the canonical documentation index were changed during AAF-2.
