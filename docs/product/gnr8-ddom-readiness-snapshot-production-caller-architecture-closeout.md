# GNR8 DDOM Readiness Snapshot Production Caller Architecture Closeout

DDOM-4 closeout for the documentation-only architecture phase defining the first controlled production caller for DDOM readiness snapshots.

No runtime behavior, TypeScript implementation, SQL migration, provider code, worker, route, publish flow, rollback flow, Command Center, Ops Inbox, public runtime, billing, Stripe, AI, or external integration was intentionally changed.

## Files Reviewed

Baseline architecture and product docs:

- `docs/architecture/gnr8-domain-dns-operating-model-decision.md`
- `docs/architecture/gnr8-domain-dns-mvp-boundary.md`
- `docs/architecture/gnr8-domain-dns-readiness-and-evidence-model.md`
- `docs/product/gnr8-domain-dns-operator-workflow.md`
- `docs/product/gnr8-domain-dns-operating-model-closeout.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-persistence-design.md`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-writer-core-closeout.md`
- `docs/architecture/gnr8-aaf-publish-source-reader-architecture.md`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/architecture/gnr8-audit-approval-foundation-design.md`
- `docs/architecture/gnr8-evidence-package-contract.md`
- `docs/architecture/gnr8-audit-event-taxonomy.md`
- `docs/architecture/gnr8-publish-target-source-truth-design.md`
- `docs/product/gnr8-audit-approval-publish-gate-dry-run-closeout.md`
- `docs/product/gnr8-audit-approval-publish-evidence-builder-closeout.md`
- `docs/product/gnr8-audit-approval-policy-gate-facade-closeout.md`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Representative implementation evidence inspected read-only:

- `apps/platform/supabase/migrations/20260424170000_runtime_domain_host_bindings.sql`
- `apps/platform/supabase/migrations/20260427121000_runtime_domain_host_binding_verification_lifecycle.sql`
- `apps/platform/supabase/migrations/20260427194000_runtime_domain_dns_instructions.sql`
- `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-read-repository.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/readiness/runtime-domain-readiness.ts`
- `apps/platform/gnr8/runtime/hosting-operations/hosting-domain-operations-read-model.ts`
- `apps/platform/gnr8/runtime/hosting-operations/hosting-readiness-drilldown.ts`
- `apps/platform/gnr8/runtime/hosting-operations/hosting-operations-read-model.ts`
- `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`
- `apps/platform/src/lib/vercel/vercel-domain-client.ts`
- `apps/platform/src/lib/vercel/domain-dns-instructions.ts`
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/domain/route.ts`
- `apps/platform/app/api/gnr8/admin/hosting-operations/[siteId]/domains/[domainId]/recheck/hosting-domain-recheck-route-handlers.ts`
- `apps/platform/app/gnr8/command-center/_components/command-center-ops-table.tsx`

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-ddom-readiness-snapshot-production-caller-architecture.md`
- `docs/architecture/gnr8-ddom-readiness-source-state-contract.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-caller-options.md`
- `docs/product/gnr8-ddom-readiness-snapshot-operator-workflow.md`
- `docs/product/gnr8-ddom-readiness-snapshot-production-caller-architecture-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Final Recommended Caller Architecture

The first caller should be a server-only, read-from-stored-state, manual/operator-triggered DDOM snapshot caller. It should read stored GNR8 source rows and refs in a read-only transaction, compute deterministic source watermarks and DDOM-3 input, then call the DDOM-3 append-only writer.

It should not call live providers, mutate source state, create approvals, create publish evidence packages directly in MVP, or run inside PASR/publish gate evaluation.

## Source-State Contract Summary

Allowed source state:

- GNR8 domain binding records;
- GNR8 host binding records;
- runtime site/version and ownership identity;
- already-captured Vercel-shaped fields stored in GNR8;
- already-captured DNS instruction fields;
- previously captured operator/client completion evidence refs;
- previously captured domain exception approval/evidence refs;
- previously captured SSL/readiness refs;
- existing AAF audit/evidence/source-ref/freshness refs.

Forbidden source state and calls:

- live DNS checks created by the caller;
- live Vercel API calls created by the caller;
- Openprovider calls;
- registrar calls;
- DNS provider calls;
- inferred client or publish approval;
- Command Center or Ops Inbox labels as truth;
- AI recommendations as truth.

## Caller Option Decision Summary

Selected:

- manual/operator-triggered snapshot creation for MVP.

Deferred:

- scheduled refresh from stored state;
- event-triggered refresh after source event coverage is complete;
- hybrid manual plus scheduled refresh after MVP.

Rejected:

- request-time snapshot creation during PASR or publish gate evaluation;
- fully provider-backed live readiness checker.

## DDOM And PASR Mapping Conclusions

- `ready` maps to PASR `ready`.
- `ready_with_warnings` maps to PASR `ready` plus warnings.
- `not_applicable` maps to PASR `not_applicable`.
- `manually_excepted` maps to PASR `manually_excepted`.
- `blocked` maps to PASR `blocked`.
- `stale` or stale freshness maps to PASR `blocked` with `domain_readiness_stale`.

DDOM readiness is not publish approval. PASR must not create snapshots during gate evaluation.

## Command Center And Ops Inbox Boundary

Command Center may display latest DDOM snapshot state, freshness, blockers, warnings, refs, and a future allowed manual create/refresh action. Ops Inbox may derive domain work items from source state and DDOM snapshots.

Command Center and Ops Inbox are derived only. Neither surface is source truth, and neither may close work without a source transition, new snapshot, or audited decision.

## Audit And Evidence Boundary

The MVP caller should cite existing AAF evidence packages, approval decisions, source refs, freshness rows, external references, and audit events. It should not create AAF approvals. It should not create AAF evidence packages directly in the first implementation.

If snapshot-created audit events are added later, they must be separately reviewed and must describe the DDOM write only.

## Domain, DNS, And Provider Boundary

External DNS truth belongs to registrars/DNS providers. Vercel truth belongs to Vercel. GNR8 owns operating records, snapshots, refs, readiness projections, freshness labels, and evidence.

The caller must not call Vercel, DNS providers, Openprovider, registrars, Stripe, or AI providers. It must not mutate DNS, registrar state, Openprovider state, Vercel domain attachment, SSL issuance, active pointers, content, domain bindings, or publish state.

## Implementation Prerequisites

Minimum safe implementation path:

1. Implement a server-only manual operator caller.
2. Implement a dedicated read-only source-state repository with repeatable-read transaction semantics.
3. Implement a pure mapper from source-state bundle to DDOM-3 writer input.
4. Add static guardrails against provider, route, publish, runtime-store mutation, Command Center, Ops Inbox, public runtime, billing, Stripe, AI, and worker imports.
5. Add unit tests for mapping, freshness, idempotency, missing/stale/blocked states, and DDOM/PASR semantics.
6. Add disposable local Postgres integration tests for read-only source reads plus DDOM writer output.
7. Create representative snapshots in local fixtures.
8. Verify PASR can read the created snapshots without creating them.

## Before Publish-Route Shadow Integration

Before publish-route shadow integration:

- DDOM-4 caller implementation must be complete and validated;
- representative DDOM snapshots must exist for ready, warning, stale, blocked, not-applicable, and manually-excepted cases;
- PASR must read those snapshots as existing source truth;
- no missing-source noise should be caused by absent caller architecture;
- shadow integration must remain non-blocking and non-executing;
- publish-route code must not create snapshots;
- audit/observation behavior for shadow result capture must be designed.

## Residual Risks

- Existing domain routes and workers can call Vercel and update domain binding rows; the DDOM caller must stay separate and read only the stored results.
- Mutable domain binding rows require precise source watermarks.
- Manual operation can lag behind source changes, so stale display and no-op/idempotency behavior matter.
- Existing Command Center surfaces can over-simplify readiness labels unless DDOM snapshot ids and limitations are shown clearly.
- AAF evidence package creation by the caller is deferred, so the first caller relies on existing refs rather than creating a full approval package.

## Whether Implementation May Begin

Implementation may begin after DDOM-4 architecture review accepts this documentation.

The next implementation must remain narrow: manual server-only stored-state caller plus read-only repository, pure mapper, DDOM-3 writer integration, and tests. It must not begin publish-route shadow integration in the same milestone.

## Recommended Next Milestone

Recommended next milestone: DDOM-5 manual stored-state production caller core.

DDOM-5 should implement the manual caller and validation suite only. Publish-route shadow integration should be a later milestone after DDOM-5 closeout.

## Validation Performed

Passed documentation validation:

- all new DDOM-4 docs exist and are readable;
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` references the new DDOM-4 docs;
- `git status --short -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs' '*.sql'` returned no modified runtime, TypeScript, JavaScript, SQL, migration, provider, route, worker, UI, billing, AI, publish, rollback, Command Center, Ops Inbox, or public serving files;
- `git diff --check` passed;
- trailing whitespace search on the new Markdown files and canonical index returned no matches;
- guardrail search for live DNS mutation, registrar mutation, Openprovider mutation, Vercel mutation, autonomous cutover, and publish enforcement showed only forbidden, rejected, deferred, or boundary statements;
- docs explicitly say DDOM readiness is not publish approval;
- docs explicitly say PASR must not create snapshots during gate evaluation;
- docs explicitly say Command Center and Ops Inbox are derived only.

## Commands Run

Read-only inspection and validation commands included:

- `pwd`
- `git status --short`
- `rg --files docs`
- `rg --files`
- `rg -n ...`
- `sed -n ...`
- `wc -l ...`
- `test -r ...`
- `git diff --name-only`
- `git diff --check`
- `git status --short -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs' '*.sql'`

No runtime tests were run because this was a documentation-only phase.

## Final Confirmation

DDOM-4 changed documentation only. No runtime behavior changed.
