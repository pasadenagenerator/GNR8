# Twin Runtime Contract

## Status
- Canonical: first operational runtime contract and implemented v1 runtime slice
- Scope: documentation + implemented runtime types/builder only
- Non-goals: no DB persistence, no APIs, no UI implementation, no scoring/recommendations/AI/optimization/publish execution

Implemented milestone (2026-05-30):
- Twin Runtime Types and Deterministic Builder
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-types.ts`
  - `apps/platform/gnr8/runtime/twin/twin-builder.ts`
  - `apps/platform/gnr8/runtime/twin/twin-builder.test.ts`

## Purpose
Define the smallest runtime contract required for the first operational Website Digital Twin.

This contract is the implementation source for:
- Twin Identity
- Twin Snapshot
- Twin Metadata
- Twin Status
- Twin Store
- Twin Viewer
- Workspace Overview integration

This contract must be specific enough that Codex can implement TypeScript types, builder, store, and viewer without inventing new architecture.

## Twin Identity
Canonical identity fields:
- `twinId`
- `siteId`
- `siteVersionId`
- `workspaceId`
- `environmentScope`
- `status`
- `createdAt`
- `updatedAt`

## Twin Status
Supported status states:
- `building`
- `ready`
- `stale`
- `failed`

## Twin Snapshot
Canonical v1 snapshot fields:
- `contentState`
- `designState`
- `experienceState`
- `governanceState`
- `operationalState`

v1 constraints:
- snapshot fields may be summary/read-model structures only
- no scoring
- no recommendations
- no optimization
- no AI output

## Twin Metadata
Canonical metadata fields:
- `sourceImportId`
- `sourceSiteVersionId`
- `sourceModels`
- `generatedAt`
- `generatedBy`
- `diagnostics`

## Twin Storage Rules
v1 storage rules:
- Twin exists per site version.
- Twin v1 is immutable once generated.
- New site version creates a new twin.
- Twin may be marked stale but not destructively overwritten.
- Failed twin generation returns diagnostics.

## Twin Viewer Contract
Workspace Overview receives:
- `identity`
- `status`
- `snapshot`
- `metadata`
- `diagnostics`

Viewer v1 must not require:
- scoring engine
- recommendation engine
- optimization engine
- AI editor
- publish runtime

## Implemented Runtime Types
Implemented in `apps/platform/gnr8/runtime/twin/twin-types.ts`:
- `TwinIdentity`
- `TwinStatus`
- `TwinSnapshot`
- `TwinMetadata`
- `WebsiteDigitalTwin`
- `TwinViewerPayload`

## Implemented Runtime Functions
Implemented in `apps/platform/gnr8/runtime/twin/twin-builder.ts`:
- `buildWebsiteDigitalTwin(input)`
- `toTwinViewerPayload(twin)`

## Deterministic Builder Behavior
Implemented deterministic behavior:
- `twinId` is derived from `siteId + siteVersionId + environmentScope`
- controlled timestamps via `nowIso` or `clock`
- `ready` status returned for valid input
- deterministic throw for missing `siteId`/`siteVersionId`

## Diagnostics
Builder diagnostics sequence:
- `TWIN_BUILD_STARTED`
- `TWIN_IDENTITY_CREATED`
- `TWIN_SNAPSHOT_CREATED`
- `TWIN_BUILD_SUCCEEDED`

## Runtime Boundaries (Still Explicit)
- no DB persistence yet
- no API yet
- no UI yet
- no scoring
- no recommendations
- no AI
- no optimization
- no publish execution

## Validation
- `twin-builder` tests passed (`apps/platform/gnr8/runtime/twin/twin-builder.test.ts`)
- `next build` passed (`apps/platform`)

## Out of Scope
Explicitly out of scope for this contract:
- Website Health scoring
- Content/Design/Experience scoring
- AI recommendations
- Optimization opportunities
- Proposal generation
- Publish execution
- Runtime observation engine
- Runtime optimization engine

## Integration Points
Future implementation targets anchored by this contract:
- Twin Builder
- Twin Store
- Twin Viewer
- Workspace Overview
- Import Pipeline
- Canonical Models
- Site Version runtime

## Success Criteria
Future bootstrap resumes from the implemented twin runtime types and deterministic builder, then proceeds to:
- Twin In-Memory Store / Read-Model Store
- workspace overview viewer surface
- tests proving twin generation from existing site/version fixtures

## Success
GNR8 now has the first runtime Website Digital Twin object and deterministic builder while remaining persistence/API/UI-free.

## Related Canonical Documents
- `docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_THREAD_HANDOFF.md`
