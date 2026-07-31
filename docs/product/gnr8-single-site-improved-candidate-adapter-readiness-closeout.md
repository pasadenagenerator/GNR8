# GNR8 Single-Site Improved Candidate Adapter Readiness Closeout

Phase: MVP-22
Scope: Design-only improved candidate adapter and dry-run fixture contract.

MVP-22 created documentation and architecture contracts only. It did not implement TypeScript, SQL migrations, services, routes, workers, UI, runtime mutation, artifact mutation, site-version mutation, active pointer changes, content editing, AI/provider calls, Generated Proposal Bundles, publish, rollback, billing, domain/DNS, Command Center, Ops Inbox, client portal behavior, commit, or push.

## Files Reviewed

- `apps/platform/gnr8/single-site/improvement-execution-contracts.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.ts`
- `apps/platform/supabase/migrations/20260731120000_single_site_improvement_execution_core.sql`
- `apps/platform/gnr8/single-site/improvement-execution-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.integration.test.ts`
- `docs/product/gnr8-single-site-improvement-execution-persistence-boundary-closeout.md`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.integration.test.ts`
- `docs/product/gnr8-single-site-improvement-execution-aaf-validator-closeout.md`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.test.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.integration.test.ts`
- `docs/product/gnr8-single-site-real-clone-executor-closeout.md`
- `docs/product/gnr8-single-site-real-clone-executor-runtime-verification-closeout.md`
- `docs/architecture/gnr8-single-site-existing-capability-reuse-map.md`
- `docs/architecture/gnr8-single-site-improvement-execution-architecture.md`
- `docs/architecture/gnr8-single-site-improvement-execution-source-of-truth.md`
- `docs/architecture/gnr8-single-site-improvement-execution-aaf-revalidation-contract.md`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/artifact-builder.ts`
- `apps/platform/gnr8/runtime/types.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/rollback-switch.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/rollback/route.ts`
- `apps/platform/app/(public)/[[...slug]]/route.ts`
- `apps/platform/app/(public)/[[...slug]]/public-route-handlers.ts`
- `apps/platform/src/public-site/public-runtime-render.tsx`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/overrides-route-helpers.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/batch/route.ts`
- `apps/platform/app/api/gnr8/ai/transformation-plan/route.ts`
- `apps/platform/app/api/gnr8/ai/transformation-execute/route.ts`
- `apps/platform/gnr8/ai/transformation-executor.ts`
- `apps/platform/gnr8/architecture/generated-proposal-bundle-persistence.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-import.ts`
- `docs/architecture/GENERATED_PROPOSAL_BUNDLE_RUNTIME.md`
- `docs/architecture/GENERATED_WEBSITE_PROPOSAL_IMPORT_BOUNDARY.md`
- `docs/architecture/SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_RUNTIME.md`
- `docs/architecture/SOURCE_CONTENT_VISUAL_CONTINUITY_PROJECTION_RUNTIME.md`
- `apps/platform/gnr8/architecture/source-website-understanding-projection-contract.ts`
- `apps/platform/gnr8/architecture/source-content-visual-continuity-projection-contract.ts`

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-improved-candidate-adapter-design.md`
- `docs/architecture/gnr8-single-site-improved-candidate-dry-run-contract.md`
- `docs/architecture/gnr8-single-site-improved-candidate-runtime-primitive-map.md`
- `docs/architecture/gnr8-single-site-improved-candidate-evidence-watermark-contract.md`
- `docs/product/gnr8-single-site-improved-candidate-operator-workflow.md`
- `docs/product/gnr8-single-site-improved-candidate-adapter-readiness-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Current State Summary

Execution attempt persistence exists. The future executor boundary exists. Execution-time AAF validation is required. The MVP-12 clone executor is runtime-store verified and provides the pattern for a safe adapter. No real improved candidate adapter exists yet. No runtime mutation should happen until a future implementation milestone.

## Primitive Classification Summary

Safe behind adapter:

- `createSiteVersionFromMigration`;
- `buildDeterministicArtifactBundle`;
- `createArtifact`;
- `bindArtifactToVersion`;
- MVP-12 clone executor discipline as the implementation pattern.

Safe for dry-run only:

- `getSiteVersion`;
- `getArtifactById`;
- deterministic planned change and placeholder ref computation.

Evidence/advisory only:

- WU projection;
- VCU projection;
- CGP/style/brand candidates;
- source evidence refs;
- clone review refs;
- Generated Proposal Bundles;
- Generated Website Proposal import outputs;
- AI transformation plan output;
- public/preview render observations.

Unsafe direct mutation:

- content override draft/batch/publish/rollback routes and runtime functions;
- AI transformation execute route and page-storage publish path;
- `switchActivePointer`;
- `publishApprovedSiteVersion`;
- `rollbackToSiteVersionArtifact`.

Not needed for improved candidate creation:

- publish shadow/PTT/DDOM/domain/billing/provider activation paths.

## Selected Future Adapter Primitive

The selected future adapter primitive is a new server-only improved candidate adapter modeled after MVP-12. It should read the accepted clone runtime version/artifact, apply only deterministic/operator-authored approved recommendation mappings, create a distinct non-published `DRAFT` improved candidate runtime site version, create a `shadow` review artifact, bind that artifact to the candidate version, verify read-back, return stable refs, and keep the active pointer untouched.

## Adapter Input Contract

The adapter must require tenant/client/site identity, migration id, execution attempt id/ref, successful MVP-20 validation result, implementation authorization refs, proposal plan and approval refs, selected recommendation refs, proposal and authorization limitations, clone review ref, source evidence review ref, clone site version ref, clone artifact ref, WU/VCU/CGP refs where available, implementation scope summary, non-goals, actor, correlation id, idempotency key, and semantic input watermark.

## Adapter Output Contract

The adapter must return improved candidate site version ref, improved runtime artifact ref, source clone refs, execution attempt ref, applied recommendation refs, not-applied recommendations, limitations carried forward, warnings, evidence refs, semantic output watermark, idempotency/reuse result, dry-run summary in dry-run mode, and explicit false flags for published, active pointer changed, content approved, client approved, launch approved, and publish approved.

## Dry-Run Fixture Contract

Dry-run must run after MVP-20 validation, use the same input contract as execute mode, inspect clone version/artifact and selected recommendations, compute planned changes, compute deterministic expected refs/placeholders and watermarks, list limitations and warnings, prove no runtime write, prove no active pointer mutation, prove no Generated Proposal Bundle creation, prove no AI/provider calls, and return a structured result compatible with MVP-21 attempts.

Dry-run must not create runtime versions, create artifacts, bind artifacts, mutate content overrides, publish, rollback, or call providers.

## Recommendation-To-Change Mapping

MVP execution should support only deterministic/manual recommendation application at first:

- exact manual text/content replacement with target identity and current hash;
- exact metadata changes with target identity and current hash;
- asset replacement only when asset evidence/licensing/source refs exist;
- bounded style/brand token tweaks only with CGP/style evidence and operator-authored values.

Recommendations needing operator input, AI/advisory support, unsupported execution, or manual implementation must be carried as not applied with reasons.

## Evidence And Watermark Contract

Required watermarks:

- proposal plan;
- selected recommendations;
- implementation authorization evidence;
- execution-time validation;
- clone site version;
- clone runtime artifact;
- WU/VCU/CGP evidence where available;
- planned change set;
- output bundle;
- limitations.

Evidence and limitations must be carried forward from source evidence, clone review, proposal, proposal approval, implementation authorization, MVP-20 validation, WU/VCU/CGP advisory refs, unsupported recommendations, dry-run no-write proof, and future execute read-back proof.

## MVP-21 Execution Attempt Integration

Dry-run can attach validation refs, input refs, selected recommendation items, limitation items, warning items, and dry-run placeholder output refs. It should not mark completed execution unless the future-boundary fixture cannot be mistaken for runtime mutation. Execute mode should require successful dry-run or equivalent validation with matching semantic input watermark. Successful future execute records improved candidate refs and moves to improved version review required. Completed execution does not imply content/client/launch/publish approval.

## Operator Workflow Summary

The operator confirms proposal approval, confirms implementation authorization, runs MVP-20 validation, runs dry-run, reviews planned changes, resolves unsupported recommendations, approves future execution attempt in a later milestone, runs execute in a future milestone, reviews the improved candidate, and preserves limitations/evidence.

## Explicit Deferrals

- No dry-run adapter implementation in MVP-22.
- No real improved candidate adapter implementation in MVP-22.
- No runtime mutation.
- No content editing.
- No AI generation or provider calls.
- No Generated Proposal Bundle creation.
- No improved version review implementation.
- No content/client/launch/publish approval implementation.
- No publish, rollback, active pointer, domain/DNS, billing, hosting, UI, API, Command Center, Ops Inbox, or client portal implementation.

## Architecture Warnings

- Do not use AI execution routes as shortcuts.
- Do not use Generated Proposal Bundle output as truth.
- Do not mutate active pointer.
- Do not mutate the accepted clone version.
- Do not apply unsupported recommendations silently.
- Do not lose CGP/source evidence refs.
- Do not let dry-run diverge from execute mode.
- Do not treat improved candidate creation as content-approved.
- Do not skip future improved version review.
- Do not skip content/client/launch/publish approvals.

## Whether Implementation May Begin

Implementation may begin only for MVP-23 dry-run adapter core. Real runtime mutation should not begin yet.

## Recommended Next Milestone

Recommended next milestone: MVP-23 improved candidate dry-run adapter core, still no real runtime mutation.

After MVP-23 passes, MVP-24 may implement real improved candidate creation behind the same contract.

## Validation Performed

- created docs exist and are readable;
- canonical index references MVP-22 docs;
- required sections are present;
- primitive map covers runtime, clone, content override, AI transformation, Generated Proposal Bundle, WU/VCU/CGP, public runtime, publish, and rollback;
- dry-run contract is explicit;
- runtime mutation boundary is explicit;
- active pointer non-mutation boundary is explicit;
- improved candidate approval boundary is explicit;
- no implementation files changed;
- `git diff --check` passed for tracked changes;
- trailing whitespace check passed across all MVP-22 docs and the canonical index.

## Git Status Summary

MVP-22 leaves only the allowed documentation files changed:

- modified: `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`;
- untracked new docs under `docs/architecture/gnr8-single-site-improved-candidate-*.md`;
- untracked new docs under `docs/product/gnr8-single-site-improved-candidate-*.md`.

## Runtime Behavior Confirmation

No runtime behavior changed.

No runtime artifact, runtime site version, active pointer, content override, public runtime, preview runtime, API route, UI, worker, service, SQL migration, AI/provider, billing, domain/DNS, publish, rollback, Command Center, Ops Inbox, client portal, or Generated Proposal Bundle behavior was added or changed.

## Commit And Push Confirmation

No commit or push was performed.
