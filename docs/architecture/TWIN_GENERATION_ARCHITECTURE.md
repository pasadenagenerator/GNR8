# Twin Generation Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no APIs, no UI implementation, no database changes

## Purpose
This architecture defines how GNR8 transforms websites into Website Digital Twins.

First operational runtime implementation contract reference:
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`

The Twin is generated from:
- imported website evidence
- canonical models
- provider/governance/environment runtime context

## Inputs
Twin generation consumes these canonical inputs:
- Import Pipeline Output
- Content Model
- Design Model
- Experience Model
- Provider State
- Governance State
- Environment State

## First Operational v1 Generation Stages
Canonical first operational stages:
- Import Evidence Ingestion
- Canonical Model Projection
- Runtime State Projection (`contentState`, `designState`, `experienceState`, `governanceState`, `operationalState`)
- Metadata + Diagnostics Assembly
- Twin Contract Assembly (`identity`, `status`, `snapshot`, `metadata`)

## First Operational Stage Relationship Graph

```text
Import Pipeline Output
 -> Canonical Model Projection

Canonical Model Projection
 -> Runtime State Projection

Runtime State Projection
 -> Metadata + Diagnostics Assembly

Metadata + Diagnostics Assembly
 -> Twin Contract Assembly

Twin Contract Assembly
 -> Website Digital Twin (v1 runtime object)
```

## Twin Components Produced (v1)
Twin Assembly produces first operational runtime components:
- Twin Identity
- Twin Status
- Twin Snapshot
- Twin Metadata
- Twin Diagnostics

## Twin Status Lifecycle (v1)
First operational status lifecycle:
- `building` during generation
- `ready` when generation succeeds
- `stale` when source site version lineage indicates drift
- `failed` when generation fails (diagnostics required)

## Twin Refresh Model
First operational refresh behavior:
- Initial generation per site version
- New site version creates a new twin
- Existing twin v1 remains immutable once generated
- Existing twin may be marked `stale` without destructive overwrite

## Out of Scope for First Operational Runtime
The following remain outside v1 Twin Runtime Contract execution:
- signal generation runtime
- observation generation runtime
- scoring runtime
- recommendation generation runtime
- optimization opportunity runtime
- proposal candidate runtime

## Governance Principles
Twin generation follows these principles:
- evidence before observation
- immutable per site version in v1
- diagnostics required on failure
- no hidden mutation of ready twins

## AI Relationship
AI participation for v1 generation runtime:
- AI output is not required for twin generation.
- AI recommendation output is out of scope.
- AI does not directly mutate generated twin state.

## Current State
Architecture only.

Explicitly:
- no twin generation runtime implemented
- no contract runtime types implemented
- no deterministic twin builder implemented
- no scoring engine implemented
- no observation engine implemented
- no recommendation runtime implemented

Documentation milestone recorded (2026-05-31):
- Twin Snapshot Hydration from Imported Site Model
- route: `/gnr8/admin/twin-preview-real`
- source: `fixtureId=real-site-01`
- documented runtime chain:
  - `real-site-01 fixture`
  - `buildWebsiteDigitalTwin()`
  - `InMemoryTwinStore`
  - `getTwinBySiteVersion()`
  - `createTwinOverview()`
  - browser-rendered read-only preview
- documented verified values:
  - `title`: `Website Digital Twin Runtime Preview (Real Site)`
  - `sourceSiteVersionId`: `site_version_real-site-01_072929becae7`
  - `sourceImportId`: `import_real-site-01_c167859409d8`
  - `status`: `ready`
  - `environmentScope`: `preview`
  - `contentSummary`: `pages=1; sections=8; detectedTitle=Northstar Widgets — Simple Marketing Site; homepagePath=index.html`
  - `designSummary`: `assets=5; layoutEvidence=available`
  - `experienceSummary`: `navigationEvidence=available; homepageDetected=true`
  - `governanceSummary`: `sourceImportId=import_real-site-01_c167859409d8; sourceSiteVersionId=site_version_real-site-01_072929becae7; readOnly=true`
  - `operationalSummary`: `environmentScope=preview; providerState=preview/runtime-only`
- documented implemented evidence fields:
  - `pageCount`
  - `sectionCount`
  - `assetCount`
  - `detectedTitle`
  - `detectedHomepagePath`
  - `providerStateSummary`
- documented diagnostics:
  - `TWIN_BUILD_STARTED`
  - `TWIN_IDENTITY_CREATED`
  - `TWIN_SNAPSHOT_CREATED`
  - `TWIN_BUILD_SUCCEEDED`
  - `TWIN_STORE_SAVE_SUCCEEDED`
  - `TWIN_STORE_GET_SUCCEEDED`
  - `TWIN_STORE_LIST_SUCCEEDED`
  - `TWIN_OVERVIEW_CREATED`
- documented boundaries:
  - read-only validation surface
  - no editing
  - no publish
  - no AI
  - no scoring
  - no recommendations
  - no optimization

## Future Integration Points
This architecture anchors future integration with:
- Twin Runtime Contract
- Import Pipeline
- Canonical Models
- Twin Store
- Twin Viewer
- Workspace Overview
- Twin Observation Architecture
- Digital Twin Architecture
- Website Intelligence Architecture
- AI Editor Architecture
- Website Evolution Lifecycle

## Success Condition
GNR8 gains the canonical architecture describing how websites become first-operational Twin runtime objects under a strict runtime contract.

## Related Canonical Documents
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_THREAD_HANDOFF.md`
