# First Limited Dry Run Trigger Design

## Scope

Phase 8B-6 designed the admin-only trigger boundary for creating and persisting a `FirstLimitedDryRunOutput`.

Phase 8B-7 implements the admin-only API trigger.

Phase 8B-10 verifies the trigger as part of the complete admin-only diagnostic
chain from API call to persisted artifact to read-only admin inspection.

This phase answers:

> How should an authorized operator trigger the limited dry-run builder safely?

It does not implement a UI button, worker job, queue execution, dry-run worker runtime, simulation runtime, reconstruction execution, AI generation, React generation, GNR8 block generation, content generation, design token generation, CMS binding, publishing logic, or public/client-user access.

## Implementation Status

Implemented:

- admin-only API trigger at `apps/platform/app/api/gnr8/admin/first-limited-dry-run/route.ts`
- superadmin-only access control through the existing server-side superadmin guard pattern
- request validation for required `siteVersionId` and `dryRunId`
- deterministic rejection of `routeScope`, `force`, evidence payloads, generated outputs, and other extra request fields
- latest Evidence Capture baseline loading from runtime site-version provenance
- `ReconstructionDryRunPackage` loading from runtime site-version provenance
- deterministic builder execution for Route Model, Navigation Model, and Section Model only
- output validation before persistence
- persistence as `first_limited_dry_run_output`
- idempotent reuse of the latest equivalent artifact, with append only when the rebuilt output differs
- metadata-only API response
- 8B-10 integration-style verification that a superadmin trigger creates an artifact, an equivalent second trigger reuses it, and changed Evidence Capture input appends a new artifact

Still missing:

- approval workflow
- worker execution
- public/client access
- tenant-admin access
- reconstruction execution

## Existing Basis

The trigger design assumes these pieces already exist:

- `FirstLimitedDryRunOutput` contract
- deterministic `buildFirstLimitedDryRunOutput(...)`
- `validateFirstLimitedDryRunOutput(...)`
- durable artifact persistence as `first_limited_dry_run_output`
- latest artifact readback through `loadLatestFirstLimitedDryRunOutput(...)`

The trigger is an authorization and orchestration boundary around those pieces. It is not a new generation runtime.

## Trigger Boundary

An admin-only trigger may:

- load the latest Evidence Capture baseline for the requested `siteVersionId`
- load the matching `ReconstructionDryRunPackage` for the requested `dryRunId`
- run the deterministic first limited dry-run builder
- validate the builder output
- persist a valid output artifact
- return artifact metadata and model counts

An admin-only trigger must not:

- call AI or LLM systems
- generate React
- generate GNR8 blocks
- generate content
- generate design tokens
- modify the public site
- publish or activate anything
- run workers
- enqueue jobs
- execute queue work
- execute simulation runtime
- execute reconstruction runtime
- mutate source content
- modify domains or DNS
- modify CMS content
- change importer behavior
- change Evidence Capture behavior
- change Original Mirror behavior
- change preview behavior

The trigger may call the deterministic builder in-process because the builder is already pure and model-limited. That call still produces only Route Model, Navigation Model, and Section Model output.

## Access Control

First implementation access must be superadmin-only.

Authorization rules:

- fail closed when no authenticated operator is present
- fail closed when the authenticated user is not a superadmin
- perform authorization before loading Evidence Capture baseline data or dry-run package data
- expose no public access
- expose no client-user access
- expose no tenant-admin access yet
- do not accept user-supplied role claims without server-side verification

The first implementation should treat authorization failure as a terminal deterministic failure. It must not partially run the builder, validate output, or persist artifacts after a failed authorization check.

## Input Contract

The future trigger request shape should be:

```ts
type AdminFirstLimitedDryRunTriggerRequest = {
  siteVersionId: string;
  dryRunId: string;
  routeScope?: never;
  force?: never;
};
```

Field rules:

| Field | Rule |
|---|---|
| `siteVersionId` | Required non-empty runtime site-version identity. |
| `dryRunId` | Required non-empty `ReconstructionDryRunPackage` identity. |
| `routeScope` | Forbidden for now. The trigger must use the route scope from the persisted dry-run package only. |
| `force` | Forbidden for now. The trigger must not provide an override path that bypasses idempotency, validation, missing evidence checks, or failure handling. |

If `routeScope` or `force` is present, the request must fail deterministically before loading evidence or building output.

## Output Contract

The implemented trigger response shape is:

```ts
type AdminFirstLimitedDryRunTriggerResponse = {
  ok: true;
  artifactRef: string;
  artifactKind: "first_limited_dry_run_output";
  outputStatus: "planned" | "valid" | "invalid" | "blocked";
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  routeModelCount: number;
  navigationModelCount: number;
  sectionModelCount: number;
  limitationsCount: number;
  blockerLimitationsCount: number;
  idempotencyResult: "reused" | "created";
  diagnostics: string[];
};
```

Response rules:

- `ok: true` means a valid artifact reference was returned, either newly persisted or reused idempotently.
- `artifactRef` and `artifactKind` must contain reference metadata only, not the full output payload.
- `outputStatus` must mirror the built `FirstLimitedDryRunOutput.outputStatus`.
- `validation` must mirror `validateFirstLimitedDryRunOutput(...)`.
- model counts must be derived from the built output.
- limitations must report counts only in the trigger response; detailed limitation records remain in the persisted artifact.
- `idempotencyResult` must be `reused` when the latest equivalent artifact is returned and `created` when a new artifact is appended.
- diagnostics must be deterministic strings suitable for audit and operator troubleshooting.

## Failure Cases

The trigger must have deterministic failures for:

| Failure | Required behavior |
|---|---|
| unauthorized | Return failure before reading evidence, dry-run package data, or artifacts. |
| missing `siteVersionId` | Return validation failure before data loading. |
| missing `dryRunId` | Return validation failure before data loading. |
| forbidden `routeScope` override | Return validation failure before data loading. |
| forbidden `force` override | Return validation failure before data loading. |
| missing `ReconstructionDryRunPackage` | Return not-found/blocking failure; do not build output. |
| dry-run package `siteVersionId` mismatch | Return validation failure; do not build output. |
| missing Evidence Capture baseline | Return blocking failure; do not synthesize evidence. |
| invalid builder output | Return validation failure; do not persist. |
| validation failure | Return validation failure; do not persist. |
| persistence failure | Return persistence failure with diagnostics; do not report success. |

Failures must not fall back to AI, preview inspection, Original Mirror product truth, live source-site reads, route-scope overrides, generated content, or partial publishing.

## Idempotency Strategy

Use deterministic append with a latest pointer, aligned with the existing 8B-5 persistence shape.

Rules:

- for a given `siteVersionId` + `dryRunId`, the active artifact is `latestFirstLimitedDryRunOutputArtifact`
- artifact history may remain append-only for auditability
- the trigger must not create duplicate active artifacts for the same deterministic output
- before persisting, the trigger should load the latest first limited dry-run output for the same `siteVersionId` + `dryRunId`
- if the newly built output is equivalent to the latest valid output, return the existing latest artifact reference without writing a duplicate
- if the newly built output differs because the underlying Evidence Capture baseline or dry-run package changed, append a new artifact and advance the latest pointer
- explicit versioning or forced replacement is out of scope for the first implementation

8B-10 verification result:

- first equivalent call persists one `first_limited_dry_run_output` artifact
- second equivalent call returns the same artifact ref with `idempotencyResult = "reused"` and does not write again
- changed navigation evidence rebuilds a different output, appends a second artifact, and the read-only surface projection resolves the changed model

Equivalence should compare the normalized `FirstLimitedDryRunOutput` payload, including IDs, route scope, model arrays, limitations, evidence refs, status, and validation-relevant fields. It should not depend on persistence timestamps.

## 8B-10 Verification

Verified:

- superadmin API trigger creates persisted output from an Evidence Capture baseline and matching `ReconstructionDryRunPackage`
- persisted artifact can be loaded with `loadLatestFirstLimitedDryRunOutput(...)`
- trigger response contains metadata only and excludes Route/Navigation/Section Model arrays and full output payloads
- unauthorized requests fail before persistence
- forbidden request fields including `force`, `routeScope`, `generatedOutputs`, and `reactOutput` are rejected
- forbidden generated output fields remain absent from persisted `FirstLimitedDryRunOutput`
- equivalent trigger calls reuse the latest artifact
- changed evidence creates a new latest artifact when the rebuilt output differs

No new trigger behavior, API routes, UI controls, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, worker execution, persistence schema, or publishing behavior was added for this verification.

## Auditability

The trigger should record or return diagnostics for:

- `triggeredBy`
- `triggeredAt`
- `siteVersionId`
- `dryRunId`
- Evidence Capture baseline ref
- `ReconstructionDryRunPackage` ref
- builder output ref
- validation result
- artifact ref
- output status
- route model count
- navigation model count
- section model count
- limitations count
- blocker limitations count
- idempotency result: `reused` or `created`

The persisted artifact already carries output, validation metadata, diagnostics, and artifact reference metadata. The trigger audit layer should add who/when/input-ref context without expanding the output model family or storing generated site output.

## Read-Only Operator Surface

The first operator surface should be read-only after a trigger result exists.

It may show:

- artifact reference metadata
- output status
- validation status
- route model count
- navigation model count
- section model count
- limitations count
- diagnostics

It must not show controls that publish, approve reconstruction, edit CMS content, enqueue workers, generate React, generate blocks, call AI, or alter route scope.

This phase does not implement that surface. It only defines the boundary a later implementation must respect.

## Post 8B-7 Re-Assessment

Phase 8B-7 implemented the API trigger described by this design.

Implemented:

- superadmin-only POST trigger at `apps/platform/app/api/gnr8/admin/first-limited-dry-run/route.ts`
- fail-closed request validation for required `siteVersionId` and `dryRunId`
- deterministic rejection of `routeScope`, `force`, evidence payloads, generated outputs, and all extra request fields
- runtime site-version loading behind the superadmin boundary
- latest Evidence Capture baseline loading from persisted site-version provenance
- matching `ReconstructionDryRunPackage` lookup from persisted site-version provenance
- deterministic `buildFirstLimitedDryRunOutput(...)` execution for Route Model, Navigation Model, and Section Model only
- `validateFirstLimitedDryRunOutput(...)` before persistence
- persistence as artifact kind `first_limited_dry_run_output`
- latest-equivalent idempotency with `idempotencyResult` of `reused` or `created`
- metadata-only success response with artifact ref, output status, validation result, model counts, limitations counts, blocker limitation count, idempotency result, and diagnostics

Still missing:

- read-only Site Workspace/Admin surface for persisted `first_limited_dry_run_output`
- operator inspection model for artifact metadata, validation, diagnostics, limitations, and route/navigation/section models
- route, navigation, and section display sections
- empty states for missing, invalid, blocked, evidence-missing, no-route, and limitations-present cases
- UI access wiring for the surface
- approval workflow
- dry-run worker execution
- simulation execution
- reconstruction execution
- AI generation
- React generation
- GNR8 block generation
- content generation
- design token generation
- publishing
- public/client-user access
- tenant-admin access

Safety boundaries still intact:

- no importer behavior changes
- no Evidence Capture behavior changes
- no Original Mirror behavior changes
- no preview behavior changes
- no capture behavior changes
- no candidate discovery execution
- no candidate review execution
- no dry-run worker execution
- no simulation execution
- no reconstruction execution
- no AI, LLM, React, block, content, or design-token generation
- no persistence schema changes beyond the existing provenance artifact shape
- no worker jobs or queues
- no publish, approve, edit, CMS binding, route-scope override, or force control
- no public, client-user, or tenant-admin access

Assessment:

The API-only trigger is sufficient for the next UI design phase because it can create or reuse a validated persisted `FirstLimitedDryRunOutput` and returns the exact metadata needed for a read-only operator summary. The next surface should read from the persisted latest artifact, not rebuild output, not call the trigger implicitly, and not introduce execution controls. The UI can therefore be designed as an artifact inspection surface around the existing persisted output contract.

## Recommended Next Phase

Historical 8B-6 recommended next phase:

- Phase 8B-8 - Admin Trigger Re-Assessment / Read-Only Surface Design

8B-8 should reassess the implemented admin-only trigger and design a read-only operator surface. It should still avoid public/client access, UI publish controls, approval execution, AI generation, React generation, block generation, content generation, design token generation, worker jobs, queue execution, reconstruction execution, simulation execution, CMS mutation, domain/DNS changes, and publishing.

Post 8B-7 recommended next phase:

- Phase 8B-9 - Read-Only First Limited Dry Run Surface Implementation

8B-9 should implement the read-only operator surface designed in `docs/architecture/FIRST_LIMITED_DRY_RUN_SURFACE_DESIGN.md`. It should read persisted output only and still avoid trigger execution from the display surface, public/client access, tenant-admin access, publish controls, approval controls, reconstruction controls, AI controls, edit controls, worker jobs, queues, CMS mutation, domain/DNS changes, and publishing.

Post 8B-10 recommended next phase:

- Phase 8B-11 - First Limited Dry Run Re-Assessment / Next Safe Boundary

8B-11 should reassess the verified diagnostic flow before any new implementation phase. It should not add trigger behavior, UI controls, public/client access, tenant-admin access, publish controls, approval controls, reconstruction controls, AI controls, edit controls, worker jobs, queues, CMS mutation, domain/DNS changes, generated output, or publishing without a separate explicit phase.
