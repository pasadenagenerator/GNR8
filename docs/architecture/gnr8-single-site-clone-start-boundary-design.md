# GNR8 Single-Site Clone Start Boundary Design

Date: 2026-07-29
Phase: MVP-10 single-site clone start boundary design
Scope: Documentation-only architecture for the future runtime integration of the MVP-9 clone generation gate.

MVP-10 does not implement clone runtime integration. It does not modify clone generation code, runtime artifact creation, site version creation, proposal generation, capture/import behavior, billing, domain/DNS, publish, rollback, Command Center, Ops Inbox, API routes, UI, workers, SQL migrations, providers, or external calls.

## Recommendation

GNR8 should not reuse an existing runtime, import, proposal, site action, or AI route as the clone-start boundary.

The recommended future boundary is a new server-only single-site clone-start orchestrator:

- proposed module: `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`
- proposed function: `startSingleSiteCloneGeneration(...)`
- owner: single-site lifecycle, not generic runtime artifact generation
- behavior: wrap existing clone/runtime generation primitives after the MVP-9 gate allows
- source-truth writes: only through `SingleSiteStateTransitionService`

This is the narrowest safe path because the current generation surfaces are either generic runtime primitives, capture/import pipelines, template bootstrap workers, proposal-only builders, broad site actions, or legacy AI/page-storage routes. None is a clean single-site lifecycle start boundary with a required `migrationId`.

## Existing Candidate Boundaries Inspected

| Candidate | Purpose | Available identifiers | Migration id available | Source evidence context | Single-site specific | Safe for blocking gate | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `apps/platform/gnr8/runtime/runtime-store.ts` `createSiteVersionFromMigration` | Generic runtime site/page version creation | `siteId`, optional `siteVersionId`, `sourceUrl`, `actor` | No | No | No | No | Too low-level; used by import, actions, bootstrap, and generic runtime paths. |
| `apps/platform/gnr8/runtime/runtime-store.ts` `createArtifact` | Generic runtime artifact insertion | `siteId`, `siteVersionId`, artifact bundle fields | No | No | No | No | Too late and generic; blocking here would affect non-clone artifact creation. |
| `apps/platform/gnr8/runtime/runtime-store.ts` `persistRawImportedSiteArtifact` | Raw imported site artifact persistence | `siteId`, `siteVersionId`, raw artifact files | No | Import provenance only | No | No | Capture/import artifact path, not clone start. |
| `apps/platform/gnr8/runtime/migration-factory.ts` `migrateImportedPageToCanonicalDraft` | Legacy imported page to canonical draft version | generated `siteId`, runtime result | No | No accepted review context | No | No | Starts from a page/URL import shape; not the single-site lifecycle. |
| `apps/platform/app/api/gnr8/runtime/migrate/url/route.ts` | Legacy URL migration route | URL, slug, actor, returned runtime ids | No | No | No | No | Creates draft runtime output directly from URL capture; would mix legacy import and clone policy. |
| `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts` | Client-scoped import and capture completion | `clientId`, agency id, runtime site id, site version id, ownership site id | Creates/reuses via capture spine adapter, but not exposed as clone input | Capture evidence package and review creation, not accepted review | Single-site capture-adjacent | No | Correct for MVP-8 capture recording, but clone gating here would block import/capture instead of clone start. |
| `apps/platform/gnr8/site/scoped-import-pipeline.ts` `runScopedImportPipeline` | Import pipeline, runtime version, raw artifact, runtime artifact creation | source URL, actor, optional runtime identity, site version id | No | Import provenance, not accepted review | No | No | Too coupled to capture/import and generic runtime artifact writes. |
| `apps/platform/gnr8/site-actions/site-action-service.ts` `runSiteAction` | Rerun transformation, generate redesign, simulated publish | ownership `siteId`, agency id, source/runtime version id | No | No source evidence review | No | No | Broad operational action surface; includes publish and redesign semantics. |
| `apps/platform/app/api/gnr8/site-actions/route.ts` | Site action HTTP route | site id, agency id, action type | No | No | No | No | API/UI-facing route, not a narrow server-only clone lifecycle boundary. |
| `apps/platform/app/api/gnr8/ai/migration-run/route.ts` | Legacy AI migration/autofix route | slug, optional site/runtime ids, artifact id | No | No | No | No | Calls AI and page storage; explicitly outside clone-start integration scope. |
| `apps/platform/gnr8/architecture/website-generation-package-builder.ts` | Pure generation package contract builder | `siteVersionId` through source artifacts | No | Business/design refs, not source evidence review | No | No | Proposal preparation only; pure builder with no runtime generation. |
| `apps/platform/gnr8/architecture/provider-generation-payload-v2-builder.ts` | Provider payload export builder | WGP and improvement plan ids | No | No accepted review context | No | No | No provider execution or runtime output by design. |
| `apps/platform/gnr8/architecture/generated-website-proposal-import.ts` | Manual output proposal metadata import | WGP/payload/proposal ids, `siteVersionId` lineage | No | No source evidence review | No | No | Quarantined proposal-only import; runtime mutation is forbidden. |
| `apps/worker/gnr8/site/site-template-runtime-bootstrap-service.ts` | Template-site runtime bootstrap | ownership site id, template id, runtime site/version/artifact ids | No | Template raw HTML evidence, not source evidence review | No | No | Worker/template path; unrelated to single-site clone acceptance. |
| `apps/worker/gnr8/inngest/functions.ts` | Worker job registration | event names only | No | No | No | No | Dispatch registry, not generation business logic. |

## Boundary To Create

Create a new server-only orchestrator rather than modifying generic runtime generation directly.

Recommended future location:

`apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`

Recommended future function:

`startSingleSiteCloneGeneration(input: StartSingleSiteCloneGenerationInput): Promise<StartSingleSiteCloneGenerationResult>`

The orchestrator owns only the single-site clone start lifecycle. It should call existing clone/runtime generation primitives through injected dependencies after the gate allows. It must not embed runtime store SQL, artifact rendering internals, proposal generation, capture/import, publish, billing, DNS, UI, or provider behavior.

## Input Contract

Required fields:

- `migrationId`: required non-empty canonical single-site migration id. This is the identity key for the MVP-9 gate and MVP-6 state transitions.
- `clientId`: required caller scope; must match the MVP-7 read model.
- `siteId`: required ownership site id when known; must match the MVP-7 read model when the read model has a site id.
- `actor`: actor type/id/role for MVP-6 transitions.
- `correlationId`: required trace id for logs and state events.
- `idempotencyKey`: required stable key for clone start.
- `requestedMode`: `execute` or `dry_run`.

Optional fields:

- `sourceEvidenceReviewId`: if supplied, must match the latest accepted or accepted-with-limitations review in the MVP-7 read model.
- `targetRuntimeSiteId`: intended runtime site id, if already known.
- `targetSiteVersionId`: intended clone site version id, if preallocated or returned by the generation primitive.
- `targetArtifactId`: intended clone runtime artifact id, if preallocated or returned by the generation primitive.
- `sourceWatermark`: source evidence or capture watermark for state transitions.
- `sourceEvidencePackageRef`: evidence package reference to use in the `clone_generation_started` transition.
- `requestId`, `causationId`, and metadata for traceability.

## Migration Identity

`migrationId` must be supplied by the caller. The clone-start boundary must not infer the migration from `siteId`, `clientId`, `sourceUrl`, runtime site id, site version id, or latest runtime artifact.

The orchestrator validates `migrationId` by reading the MVP-7 read model through `SingleSiteStateReadRepository.readByMigrationId`. It must reject or return a blocked result when:

- `migrationId` is missing or blank;
- the read model is unavailable;
- the migration is not found;
- the read-model migration id does not match the requested id;
- `clientId` or `siteId` conflicts with the read model.

This requirement is intentional. Runtime artifacts and site versions are generic outputs; the single-site lifecycle id is the only safe gate key.

## MVP-9 Gate Call

The orchestrator calls:

`evaluateCloneGenerationGate({ migrationId })`

The MVP-9 gate must block clone start unless the latest source evidence review is `accepted` or `accepted_with_limitations` and `cloneGenerationAllowed` is true.

Allowed clean result:

- `allowed: true`
- `mode: "allowed"`
- `reason: "source_evidence_accepted"`

Allowed warning result:

- `allowed: true`
- `mode: "warning"`
- `reason: "source_evidence_accepted_with_limitations"`
- limitations copied into the orchestrator result and transition metadata

Blocked result:

- no runtime generation call;
- no runtime artifact creation;
- no site version creation;
- no clone state transition;
- return the gate result with `recommendedNextAction` and `missingRequirements`.

## Execution Flow

For `requestedMode: "dry_run"`:

1. Validate caller identity fields.
2. Read the MVP-7 model.
3. Call MVP-9 gate.
4. Return whether clone start would be allowed.
5. Do not call clone/runtime generation.
6. Do not call MVP-6 transitions.
7. Do not create runtime artifacts, site versions, proposal artifacts, or refs.

For `requestedMode: "execute"`:

1. Validate caller identity fields.
2. Read the MVP-7 model.
3. Call MVP-9 gate in blocking mode.
4. If blocked, return a blocked result and perform no runtime writes.
5. If allowed, transition through MVP-6 to `clone_generation_started`.
6. Call the existing clone/runtime generation primitive through a narrow dependency after `clone_generation_started` succeeds.
7. Capture returned runtime refs: runtime site id, clone site version id, runtime artifact id, raw template artifact id if applicable.
8. Transition through MVP-6 to `clone_generation_completed` with clone runtime refs.
9. Let the next workflow step transition to `clone_review_required`.

## State Transitions

All state transitions must use `SingleSiteStateTransitionService`.

Start transition:

- `toState: "clone_generation_started"`
- source state expected by MVP-6: `source_evidence_review_required`
- required refs: `source_evidence_review` or `source_evidence_package`
- `sourceEvidenceReviewId`: latest accepted or accepted-with-limitations review id
- `aafApprovalDecisionId`: required by MVP-6 when the accepted review has limitations
- metadata should include gate reason, gate mode, accepted-with-limitations flag, limitations, requested mode, and clone start boundary version

Completion transition:

- `toState: "clone_generation_completed"`
- source state expected by MVP-6: `clone_generation_started`
- refs should include `runtime_site_version_clone`, `runtime_artifact_clone`, and `raw_template_artifact` when present
- metadata should include generated output kind, runtime renderer compatibility, artifact ids, source watermark, and generation primitive version

Failure transition:

- If runtime generation fails after `clone_generation_started`, use MVP-6 transition to `migration_failed`.
- Metadata must include sanitized error code, retry classification, failed phase, and correlation id.
- Do not write partial clone refs as successful refs.

If failure occurs before `clone_generation_started`, return failure without moving state to `migration_failed` unless the current MVP-6 transition rules allow a valid failure transition from the current state. Do not add direct SQL or ad hoc state changes.

## Accepted With Limitations

Accepted-with-limitations is allowed but must remain visible:

- the MVP-9 gate returns `mode: "warning"`;
- the orchestrator proceeds only in `execute` mode after the normal blocking checks pass;
- limitations are carried into the result and state transition metadata;
- the `clone_generation_started` transition must include the source evidence review id and AAF degraded evidence approval decision ref required by MVP-6;
- clone output must not silently erase limitation context.

## Runtime Generation Relationship

The orchestrator should call existing clone/runtime generation primitives after the gate allows. It should not modify:

- `createSiteVersionFromMigration`;
- `createArtifact`;
- `persistRawImportedSiteArtifact`;
- `runScopedImportPipeline`;
- `migrateImportedPageToCanonicalDraft`;
- proposal builders/importers;
- site action routes;
- capture/import routes.

Generic runtime artifact generation must not be modified directly unless a later implementation milestone proves that a specific clone-only primitive already exists and can be wrapped without affecting import, template bootstrap, redesign, publish, or preview paths.

## What Must Remain Untouched

Future MVP-11 implementation must not modify:

- clone/runtime generation internals except through a narrow injected primitive;
- generic runtime artifact creation;
- generic site version creation;
- proposal generation/import;
- capture/import behavior;
- billing/Stripe;
- domain/DNS;
- publish;
- rollback;
- Command Center;
- Ops Inbox;
- public runtime serving;
- providers;
- AI execution;
- SQL migrations unless a later milestone explicitly scopes persistence changes.

## Test Requirements

Future implementation tests must include:

- missing `migrationId` blocks before generation;
- mismatched `migrationId` blocks before generation;
- read model unavailable blocks before generation;
- missing migration blocks before generation;
- source evidence missing, ready-for-review, in-progress, retry-required, rejected, or superseded blocks before generation;
- accepted review starts generation and writes `clone_generation_started` then `clone_generation_completed`;
- accepted-with-limitations starts with warning metadata and required AAF decision ref;
- gate-blocked responses do not call clone/runtime generation;
- dry-run never writes transitions or runtime artifacts;
- generation failure after started records failure through MVP-6;
- idempotent retry of the same start key reuses or reports the existing state safely;
- generic runtime import, template bootstrap, site action, proposal, publish, billing, DNS, Command Center, Ops Inbox, and worker paths are not modified or called by the new orchestrator.

## Next Milestone

MVP-11 should implement the new server-only single-site clone-start orchestrator, use MVP-9 in blocking mode, call an existing clone generation primitive only after the gate allows, and record state through MVP-6. MVP-11 should not modify generic runtime artifact generation directly and should not add UI or API unless an existing safe route already has `migrationId` and can call the orchestrator without broadening scope.
