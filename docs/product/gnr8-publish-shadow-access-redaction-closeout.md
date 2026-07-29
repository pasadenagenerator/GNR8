# GNR8 Publish Shadow Access Redaction Closeout

PASR-5 closeout for the documentation-only architecture phase defining access-control, role visibility, scoping, and redaction for operator-visible publish shadow results.

No runtime behavior, TypeScript implementation, JavaScript implementation, SQL migration, API route, server action, publish route, rollback route, Command Center, Ops Inbox, public runtime, worker, provider, DNS/domain, billing, Stripe, AI, storage, authentication/RBAC implementation, DDOM snapshot creation, AAF approval creation, enforcement, commit, push, production Supabase, staging Supabase, Vercel, registrar, Openprovider, DNS provider, Stripe, or AI provider was intentionally changed or called.

## 1. Files Reviewed

PASR-4 baseline:

- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.integration.test.ts`
- `docs/product/gnr8-publish-shadow-result-read-model-core-closeout.md`

Governance and surfacing baseline:

- `docs/architecture/gnr8-publish-shadow-result-surfacing-architecture.md`
- `docs/architecture/gnr8-publish-shadow-result-read-model-contract.md`
- `docs/product/gnr8-publish-shadow-result-surfacing-closeout.md`
- `docs/product/gnr8-publish-shadow-evidence-review-workflow.md`
- `docs/architecture/gnr8-command-center-ops-inbox-design.md`
- `docs/architecture/gnr8-command-center-read-model-contract.md`
- `docs/architecture/gnr8-ops-inbox-work-item-model.md`
- `docs/product/gnr8-command-center-operator-workbench.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/architecture/gnr8-audit-approval-foundation-design.md`
- `docs/architecture/gnr8-approval-persistence-model.md`
- `docs/architecture/gnr8-approval-schema-and-policy-contract.md`
- `docs/architecture/gnr8-audit-event-taxonomy.md`
- `docs/architecture/gnr8-evidence-package-contract.md`
- `docs/architecture/gnr8-domain-dns-operating-model-decision.md`
- `docs/architecture/gnr8-domain-dns-mvp-boundary.md`
- `docs/architecture/gnr8-domain-dns-readiness-and-evidence-model.md`
- `docs/architecture/gnr8-ddom-readiness-source-state-contract.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-production-caller-architecture.md`
- `apps/platform/src/auth/rbac.ts`
- `apps/platform/gnr8/client/client-dashboard-read-model.ts`
- `apps/platform/gnr8/client/client-user-membership-service.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 2. Files Created Or Updated

Created:

- `docs/architecture/gnr8-publish-shadow-access-redaction-architecture.md`
- `docs/architecture/gnr8-publish-shadow-role-visibility-matrix.md`
- `docs/product/gnr8-publish-shadow-operator-visibility-workflow.md`
- `docs/product/gnr8-publish-shadow-access-redaction-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. PASR-4 Read Model Sensitivity Summary

PASR-4 exposes safe boundary/status fields and sensitive diagnostic fields in one server-only derived read model.

Sensitive fields include:

- AAF evidence package ids, evidence idempotency keys, evidence freshness labels, source refs, source tables, source record ids, source watermarks, and source metadata.
- AAF gate attempt ids, policy evaluation result/blockers, audit event ids, partial timeline limitations, approval request ids, approval decision ids, and approval timeline limitations.
- DDOM snapshot ids/refs, readiness blockers, warnings, stale reasons, source watermarks, captured/freshUntil timestamps, and domain readiness status.
- Publish target ids, environment, publish stage, policy version, source refs, source watermarks, and limitations.
- Tenant/client/site/version/runtime artifact/publish attempt identity.
- Actor type/id/role.
- Correlation id, causation id, request id, idempotency key, shadow evaluation id, evidence idempotency key, gate dry-run idempotency key, and linkage strategy.
- Failure reason, warnings, limitations, stale/missing source truth, technical blockers, and reconstruction limitations.

Safe baseline fields include derived-only and non-enforcement flags, overall shadow status, severity, safe label, freshness category, empty/error safe message, and safe next action after redaction.

## 4. Final Access/Redaction Recommendation

Implement a role-aware redacted read model transformer before any broad UI surfacing.

The transformer should take the PASR-4 derived read model plus actor/role/scope/surface and return a redacted derived projection. It must fail closed on scope mismatch, preserve stable high-level status, hide or redact sensitive refs, and keep all derived-only/non-enforcement labels.

## 5. Role Visibility Matrix Summary

The matrix defines visibility for:

- platform superadmin;
- agency admin;
- agency operator;
- technical operator;
- account manager;
- client reviewer;
- read-only auditor;
- support/debug operator;
- future AI operator.

Visibility levels are full, summarized, redacted, hidden, and forbidden. Client reviewers are forbidden from PASR shadow diagnostic visibility in MVP.

## 6. Operator Visibility Workflow Summary

Future internal users should see publish shadow results as scoped, derived, non-blocking diagnostics. Workflows were defined for:

- platform/admin investigation;
- agency operator review;
- account manager review;
- technical operator debugging;
- client-facing review boundary;
- read-only audit review;
- missing/stale DDOM snapshots;
- missing publish activation approval;
- missing publish target;
- gate not ready;
- shadow evaluation failure;
- evidence limitations;
- domain/DNS ambiguity;
- escalation to DDOM, AAF approval, publish target, and engineering/debug workflows.

## 7. Redacted Read Model Requirements

Future transformer contract:

- Input: PASR-4 derived read model plus actor id, role, tenant/client/site/version scope, requested surface, and redaction policy version.
- Output: redacted derived read model with visibility status, hidden/redacted fields, safe next action, and boundary flags.
- Authorization failure: minimal denied envelope with no source/evidence existence leak.
- Scope mismatch: fail closed.
- Partial visibility: preserve status/severity/derived-only/non-blocking labels; redact field families recursively.
- Stable status: never turn a hidden high-risk condition into ready.
- Recommended action: preserve safe category; hide refs the actor cannot access.
- Links: emit only links whose source-owned drilldown has separate authorization.
- No mutation guarantee: no writes, triggers, provider calls, or side effects.
- No enforcement guarantee: never block publish or approve publish.

## 8. Client Visibility Boundary

Clients must not see PASR shadow diagnostics in MVP.

Forbidden for MVP client visibility:

- shadow diagnostic status;
- evidence package refs;
- evidence item payload summaries;
- source refs, source tables, record ids, query refs, snapshot refs, watermarks;
- audit refs and audit payload summaries;
- approval actor/decision details;
- DDOM snapshot refs, host internals, provider-shaped details, DNS ambiguity diagnostics;
- publish target internals;
- gate dry-run blockers;
- correlation/idempotency ids;
- internal diagnostics and failure reasons.

## 9. Command Center Boundary

Command Center may later show a redacted internal operator summary after the transformer exists. Command Center remains derived-only and must consume the transformer rather than the raw PASR-4 model.

Command Center must not approve, enforce, mutate, create DDOM snapshots, create AAF approvals, block publish, or become source truth.

## 10. Ops Inbox Boundary

Ops Inbox may later derive work items from stable redacted statuses after Command Center surfacing proves safe. Ops Inbox remains derived-only and item completion requires canonical source transition or audited decision.

Ops Inbox must not expose raw PASR-4 evidence/source/audit/correlation fields to unauthorized roles.

## 11. Source-Of-Truth Boundary

Redacted publish shadow results are still derived projections and never source truth.

Canonical truth remains in runtime, DDOM, PTT, AAF approval/evidence/gate/audit, source-owned domain systems, and external systems where applicable. Command Center, Ops Inbox, client portals, previews, AI output, logs, and redacted shadow summaries are not source truth.

## 12. Publish Non-Enforcement Boundary

Publish shadow results remain non-enforcing. They do not block publish, do not change active pointers, do not change rollback, do not change publish responses, and do not implement enforcement.

## 13. DDOM Snapshot Boundary

PASR and publish shadow result surfacing must not create DDOM snapshots. Missing or stale DDOM results route to the DDOM manual/source-owned workflow outside PASR. DDOM readiness is not publish activation approval.

## 14. Approval Boundary

Publish activation approval is exact AAF `publish_activation` approval truth. Launch signoff, client review, content review, domain readiness, domain exception, Command Center state, Ops Inbox item, external workflow text, and AI output do not satisfy publish activation approval.

## 15. Risks Found

- PASR-4 raw read model includes sensitive internal refs and diagnostics that are not safe for broad UI.
- Client-facing exposure before redaction would leak internal AAF/source/audit/DDOM/PTT details.
- Command Center or Ops Inbox surfacing before a transformer could cause derived status to be mistaken for source truth.
- Missing durable publish attempt ids mean correlation/idempotency linkage remains sensitive and important for technical reconstruction.
- DDOM readiness and missing publish activation approval are easy to mislabel as approval or publish outcome without strong copy.
- Evidence/source/audit links require separate target-surface authorization, not just PASR result visibility.

## 16. Whether Implementation May Begin

Implementation may begin only for the narrow next milestone: a role-aware redacted read model transformer with tests and no runtime behavior change.

Implementation should not begin yet for direct broad Command Center surfacing, Ops Inbox derived items, publish API metadata, enforcement, or first-class shadow result persistence.

## 17. Recommended Next Milestone

Recommended order:

1. Role-aware redacted read model transformer.
2. Command Center read-only surfacing that consumes the transformer.
3. Ops Inbox derived work items if stable keys and source-owned resolution paths are clear.
4. Publish API metadata deferred.
5. Enforcement deferred.
6. First-class shadow result persistence evaluated separately only if reconstruction proves insufficient.

## 18. Validation Performed

Documentation validation only was performed after writing PASR-5 docs:

- confirmed PASR-5 docs exist and are readable;
- confirmed canonical doc index references the PASR-5 docs;
- confirmed no TypeScript, JavaScript, SQL, migration, API route, runtime, publish, rollback, Command Center, Ops Inbox, worker, public runtime, provider, DNS/domain, billing, Stripe, AI, storage, or auth implementation files were modified;
- ran `git diff --check`;
- checked new Markdown files for trailing whitespace;
- confirmed docs explicitly state shadow results are derived-only;
- confirmed docs explicitly state shadow results do not block publish;
- confirmed docs explicitly state Command Center and Ops Inbox are derived-only;
- confirmed docs explicitly state DDOM readiness is not publish activation approval;
- confirmed docs explicitly state client visibility is restricted/deferred for MVP;
- confirmed docs explicitly state role-aware redaction must happen before broad UI surfacing.

## 19. Git Status Summary

Expected changed files:

- `docs/architecture/gnr8-publish-shadow-access-redaction-architecture.md`
- `docs/architecture/gnr8-publish-shadow-role-visibility-matrix.md`
- `docs/product/gnr8-publish-shadow-operator-visibility-workflow.md`
- `docs/product/gnr8-publish-shadow-access-redaction-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No commit or push was performed.

## 20. Commands Run

Commands run included:

- `pwd`
- `rg --files`
- `git status --short`
- `sed` reviews of PASR-4 read model, repository, unit tests, integration tests, and closeout.
- `sed` reviews of PASR-3 surfacing architecture, read-model contract, evidence workflow, and closeout.
- `sed` reviews of CCO Command Center/Ops Inbox architecture and workflow docs.
- `sed` reviews of AAF foundation, approval persistence, approval schema, evidence package, and audit taxonomy docs.
- `sed` reviews of DDOM/domain/DNS operating model, MVP boundary, readiness/evidence, source-state, and production caller docs.
- `sed` reviews of MVP source-of-truth and operational state docs.
- `sed` reviews of auth/RBAC and client visibility implementation patterns.
- `apply_patch` documentation edits.
- `test -r` checks for PASR-5 docs.
- `rg` checks for canonical index references and required boundary language.
- `git diff --check`
- `git diff -- docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `git diff --name-only`
- `wc -l` for PASR-5 docs.
- `git status --short`

No external providers, Supabase, Vercel, DNS, registrar, Stripe, or AI services were called.

## 21. Runtime Behavior Confirmation

No runtime behavior changed. PASR-5 created and updated Markdown documentation only. It did not implement redaction code, a transformer, UI, APIs, Ops Inbox items, publish API metadata, enforcement, migrations, provider calls, DDOM snapshot creation, AAF approval creation, publish behavior, rollback behavior, active pointer behavior, Command Center behavior, Ops Inbox behavior, authentication/RBAC behavior, storage behavior, billing behavior, Stripe behavior, AI behavior, or public runtime behavior.
