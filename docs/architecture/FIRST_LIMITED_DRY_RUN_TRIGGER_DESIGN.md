# First Limited Dry Run Trigger Design

## Scope

Phase 8B-6 designed the admin-only trigger boundary for creating and persisting a `FirstLimitedDryRunOutput`.

Phase 8B-7 implements the admin-only API trigger.

This phase answers:

> How should an authorized operator trigger the limited dry-run builder safely?

It does not implement a UI button, worker job, queue execution, dry-run worker runtime, simulation runtime, reconstruction execution, AI generation, React generation, GNR8 block generation, content generation, design token generation, CMS binding, publishing logic, or public/client-user access.

## Implementation Status

Implemented:

- admin-only API trigger at `app/api/gnr8/admin/first-limited-dry-run/route.ts`
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

Still missing:

- UI surface
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

Equivalence should compare the normalized `FirstLimitedDryRunOutput` payload, including IDs, route scope, model arrays, limitations, evidence refs, status, and validation-relevant fields. It should not depend on persistence timestamps.

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

## Recommended Next Phase

Recommended next phase:

- Phase 8B-8 - Admin Trigger Re-Assessment / Read-Only Surface Design

8B-8 should reassess the implemented admin-only trigger and design a read-only operator surface. It should still avoid public/client access, UI publish controls, approval execution, AI generation, React generation, block generation, content generation, design token generation, worker jobs, queue execution, reconstruction execution, simulation execution, CMS mutation, domain/DNS changes, and publishing.
