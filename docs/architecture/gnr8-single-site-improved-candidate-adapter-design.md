# GNR8 Single-Site Improved Candidate Adapter Design

Phase: MVP-22
Scope: Design-only improved candidate adapter architecture and future contract.

This document does not implement TypeScript, SQL, services, routes, workers, UI, runtime mutation, artifact mutation, site-version mutation, active pointer mutation, content editing, AI/provider calls, Generated Proposal Bundles, publish, rollback, billing, domain/DNS, Command Center, Ops Inbox, client portal, commit, or push behavior.

## Baseline Confirmed

MVP-21 provides durable improvement execution attempt persistence, refs, items, events, idempotency, semantic input watermarks, output ref slots, read-model projection, and a server-only future executor boundary in `apps/platform/gnr8/single-site/improvement-execution-contracts.ts` and `apps/platform/gnr8/single-site/improvement-execution-service.ts`.

MVP-20 provides execution-time AAF validation in `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.ts`. It validates exact implementation authorization scope, proposal approval, selected recommendation watermarks, clone/source evidence refs, freshness, prohibited substitutions, limitations, actor/correlation/idempotency, and fail-closed blocker reasons.

MVP-12 provides the closest safe runtime precedent in `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`: resolve source version, compute deterministic target id and semantic output watermark, create a new draft runtime site version, build a deterministic artifact bundle, create a shadow artifact, bind it to the new version, return stable refs, and prove active pointer non-mutation.

Current state:

- execution attempt persistence exists;
- future executor boundary exists;
- execution-time AAF validation is required;
- no real improved candidate adapter exists;
- no runtime mutation should happen in MVP-22.

## Decision

The future improved candidate adapter should be modeled after the MVP-12 real clone executor discipline.

The future adapter should create a new non-published improved candidate runtime site version and a new review/shadow runtime artifact from the accepted clone version plus approved proposal recommendations that can be applied deterministically. It should use runtime site version/artifact primitives behind a narrow server-only adapter, keep the active pointer untouched, and record stable output refs through MVP-21 execution attempts.

The adapter must not use Generated Proposal Bundles as truth, must not call broad AI transformation execute routes directly, and must treat WU, VCU, CGP/style signals, proposal outputs, AI/provider outputs, and Generated Proposal Bundles as inputs/evidence/advisory material only.

## Future Runtime Primitive

Selected future primitive set:

- `getSiteVersion` and `getArtifactById` to inspect the accepted clone version/artifact.
- A deterministic page transformation layer, future implementation, that maps approved recommendations into a copied candidate page set.
- `createSiteVersionFromMigration` to create a distinct `DRAFT` improved candidate site version with provenance.
- `buildDeterministicArtifactBundle` with `renderMode: "PREVIEW"` to create reviewable artifact payload.
- `createArtifact` with `publishStage: "shadow"` and review governance.
- `bindArtifactToVersion` to bind the new artifact to the new improved candidate version.

Forbidden primitives for this adapter:

- `switchActivePointer`;
- `publishApprovedSiteVersion`;
- `rollbackToSiteVersionArtifact`;
- content override write/publish/rollback functions;
- AI transformation execute route or page-storage publish routes;
- Generated Proposal Bundle import/materialization;
- public runtime serving as source truth.

## Adapter Input Contract

Future execute and dry-run modes must share the same input shape. MVP-23 should implement this contract as a dry-run fixture first.

Required identity:

- `tenantId`;
- `clientId`;
- `siteId`;
- `migrationId`;
- `executionAttemptRef` with attempt id, proposal plan id, implementation authorization decision id, and semantic input watermark;
- `actor` with actor type, id, role, and display label where available;
- `correlationId`;
- `idempotencyKey`;
- `adapterVersion`;
- `mode`, either `dry_run` or later `execute`.

Required authorization and validation:

- successful MVP-20 validation result with `allowed: true` and mode `allowed` or `allowed_with_limitations`;
- implementation authorization request ref;
- implementation authorization decision ref;
- implementation authorization evidence package ref;
- implementation authorization limitations;
- explicit confirmation that validation was produced execution-time, not attach-time only.

Required proposal scope:

- proposal plan ref, version, status, semantic watermark, and source watermark;
- proposal approval request, decision, and evidence refs;
- selected recommendation refs with recommendation id, plan id, source watermark, semantic watermark, category, and status;
- proposal limitations;
- implementation scope summary;
- non-goals;
- expected selected recommendations watermark.

Required clone/source baseline:

- accepted or accepted-with-limitations clone review ref;
- clone review watermark and limitations;
- clone site version ref;
- clone runtime artifact ref;
- source evidence review ref;
- source evidence review watermark and limitations;
- source clone site version snapshot watermark;
- source clone artifact watermark or bundle hash.

Required advisory/evidence refs where available:

- WU projection ref and watermark;
- VCU projection ref and watermark;
- CGP/style/brand evidence refs and watermarks where available;
- source capture refs for rendered DOM, raw HTML, screenshots, text, assets, fonts, styles, metadata, and diagnostics where available;
- Generated Proposal Bundle refs only as advisory evidence, never as runtime truth;
- AI/provider advisory refs only as advisory evidence, never as runtime truth.

Required semantic input watermark:

- stable digest over tenant/client/site/migration identity;
- execution attempt id;
- adapter version and mode;
- proposal plan id/version/watermark;
- implementation authorization decision/evidence refs;
- MVP-20 validation expected semantic watermark;
- selected recommendation ids/categories/watermarks;
- proposal and authorization limitations;
- clone review/source evidence refs and watermarks;
- clone runtime site version/artifact ids and hashes;
- WU/VCU/CGP evidence refs where used;
- implementation scope summary and non-goals.

## Adapter Output Contract

Future execute mode must return:

- improved candidate site version ref;
- improved runtime artifact ref;
- source clone site version ref;
- source clone artifact ref;
- execution attempt ref;
- selected recommendation refs applied;
- recommendations not applied with reason;
- limitations carried forward;
- warnings;
- evidence refs;
- semantic output watermark;
- idempotency/reuse result;
- `published: false`;
- `activePointerChanged: false`;
- `contentApproved: false`;
- `clientApproved: false`;
- `launchApproved: false`;
- `publishApproved: false`.

Dry-run mode must return the same output envelope with deterministic placeholders instead of persisted runtime refs:

- expected improved candidate site version ref placeholder;
- expected improved runtime artifact ref placeholder;
- expected planned change set refs;
- dry-run summary;
- write proof showing no runtime write, no active pointer mutation, no proposal bundle creation, and no AI/provider calls.

## Recommendation-To-Change Mapping

The first real adapter should support only deterministic/manual recommendation application.

| Recommendation category | MVP adapter behavior |
| --- | --- |
| Safe manual text/content replacement | Allowed only when recommendation carries exact target page/section/field identity, current text hash, replacement text, and operator-authored approval. |
| Safe metadata changes | Allowed only for deterministic fields such as title/description when target path, current value hash, replacement value, and scope approval exist. |
| Safe asset replacement | Allowed only when replacement asset evidence exists, licensing/source status is acceptable, current asset ref/hash is known, and operator authored the replacement ref. |
| Safe style/brand tweak | Allowed only for bounded token changes when CGP/style evidence refs exist and the change is operator-authored or separately governed. |
| Needs operator input | Not applied; return `not_applied` with missing operator-authored value or missing target identity. |
| Needs AI/advisory support later | Not applied in MVP; AI output may be cited as advisory evidence only. |
| Not executable in MVP | Not applied with explicit unsupported category. |
| Deferred to manual implementation | Not applied; preserve in limitations and review notes. |

Unsupported recommendations must never be silently ignored. They must be returned as `recommendationsNotApplied` with a stable reason code and carried limitation.

## Immediate Revalidation Before Mutation

Future execute mode must revalidate all of the following after resolving current source refs and before any runtime write:

- MVP-20 AAF validation is fresh, allowed, exact-scope, exact-subject, and exact-evidence;
- proposal plan remains approved or approved with limitations;
- selected recommendations still belong to the proposal plan and match expected watermarks;
- proposal approval remains distinct from implementation authorization;
- implementation authorization is not content, client, launch, publish, DDOM, PTT, Command Center, Ops Inbox, Generated Proposal Bundle, AI, provider, or advisory substitution;
- clone review remains accepted or accepted with limitations;
- source evidence review remains accepted or accepted with limitations;
- clone site version and clone artifact still exist and match expected ids/hashes/watermarks;
- limitations and non-goals are present;
- idempotency key has no semantic drift.

## Manual Versus Advisory Authority

Operator-authored or governed inputs:

- selected recommendation refs;
- exact target mappings;
- replacement copy/assets/tokens for MVP deterministic changes;
- implementation scope summary;
- non-goals;
- limitations acceptance;
- execution attempt authorization after dry-run review.

Advisory only:

- AI/provider suggestions;
- Generated Proposal Bundle output;
- WU/VCU projections;
- CGP/style candidates unless promoted through explicit governed evidence;
- public/preview render observations;
- Command Center or Ops Inbox projections.

## Transition Behavior

Dry-run should record validation/ref items against MVP-21 attempts but should not mark completed execution. Execute mode later may require a successful dry-run or explicitly equivalent validation with identical semantic input watermark.

Future successful execute should record improved candidate refs and transition to improved version review required. Completion means candidate creation completed, not content approval, client approval, launch approval, or publish approval.

## Architecture Warnings

- Do not use AI execution routes as shortcuts.
- Do not use Generated Proposal Bundle output as runtime truth.
- Do not mutate the active pointer.
- Do not mutate the accepted clone version.
- Do not apply unsupported recommendations silently.
- Do not lose WU/VCU/CGP/source evidence refs.
- Do not let dry-run diverge from execute mode.
- Do not treat improved candidate creation as content-approved.
- Do not skip improved version review.
- Do not skip content/client/launch/publish approvals.

## Recommended Next Milestone

Recommended next milestone: MVP-23 improved candidate dry-run adapter core.

MVP-23 should implement the shared input/output contract, source clone inspection, recommendation planning, deterministic placeholder refs, semantic watermarks, no-write proof, and MVP-21 attempt item/ref compatibility. It should still perform no real runtime mutation.

Only after MVP-23 passes should MVP-24 implement real improved candidate creation behind the same adapter contract.
