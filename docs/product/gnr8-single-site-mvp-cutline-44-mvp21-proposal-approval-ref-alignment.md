# GNR8 Single-Site MVP CUTLINE-44 MVP-21 Proposal Approval Ref Alignment

Date: 2026-08-20
Scope: local implementation and tests only

## Result

MVP-21 improvement execution attempt creation is now locally aligned with the proposal-event approval evidence model already accepted by the implementation authorization bridge and MVP-20 validator.

Before this cutline, `ImprovementExecutionService.createOrReuseExecutionAttempt(...)` required AAF-shaped proposal approval fields in proposal `approval_refs_json`: proposal approval request, decision, and evidence package. The chs.si rehearsal proposal is approved through proposal-event evidence, so MVP-21 blocked before attempt creation with `proposal approval request ref is required` even after MVP-20 returned `allowed=true`.

After this cutline, MVP-21 accepts proposal approval refs with `approvalSource: "proposal_event"`, `proposalEventId`, `stateEventId`, and an approved proposal/event status as proof of the proposal-approval prerequisite. The proposal-event refs are recorded as proposal approval evidence only. They do not substitute for implementation authorization request, decision, evidence, execution-time MVP-20 validation, AAF gate attempt, improvement execution approval, or publish approval.

## Behavior

- AAF-shaped proposal approval refs remain supported.
- Proposal-event approval evidence can satisfy the proposal approval prerequisite when the plan is approved and the event-shaped refs match the proposal identity/watermark metadata supplied on the plan row.
- Implementation authorization refs must remain AAF approval-decision scoped refs and must match the fresh refs attached to the proposal plan.
- Missing MVP-20 validation status now blocks instead of defaulting to granted.
- Proposal-event refs used as implementation authorization decision substitutes block before attempt creation.
- No SQL migration is required.

## Local Validation

- Focused MVP-21 service test: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/improvement-execution-service.test.ts` -> passed, 13/13.
- Bridge and MVP-20 validator tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/improvement-execution-aaf-validator.test.ts apps/platform/gnr8/single-site/implementation-authorization-bridge.test.ts` -> passed, 22/22.
- Focused TypeScript touched-file filter: `pnpm exec tsc -p apps/platform/tsconfig.json --noEmit --pretty false 2>&1 | rg "apps/platform/gnr8/single-site/improvement-execution-service(\\.test)?\\.ts"` -> no touched-file diagnostics.
- Broad platform TypeScript no-emit remains blocked by existing unrelated test fixture diagnostics outside the touched files.

## Boundary

No production improvement execution, production attempt creation, improved candidate creation, AAF row creation, SQL migration, dry-run, shadow-publish, runtime publish, rollback, active pointer switch, provider/DNS/domain/billing/Stripe/Openprovider action, commit, push, or deploy occurred.

## Files Changed

- `apps/platform/gnr8/single-site/improvement-execution-service.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.test.ts`
- `docs/product/gnr8-single-site-mvp-cutline-44-mvp21-proposal-approval-ref-alignment.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Next Milestone

After deployment and a fresh explicit execution approval, rerun the chs.si improvement execution rehearsal from MVP-20 validation into MVP-21 attempt creation. Stop before any downstream review, approval, publish, provider, domain, billing, deploy, migration, or active-pointer action unless separately authorized.
