# Website Digital Twin Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture + first implemented runtime twin baseline
- Non-goals: no runtime changes outside twin types/builder baseline, no APIs, no UI implementation, no database changes

## Purpose
The Website Digital Twin is the continuously updated operational representation of a website inside GNR8.

The twin is not HTML.

The twin is not the deployed frontend.

The twin is the operational understanding of the website.

First operational runtime contract reference:
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`

Twin generation canonical reference:
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`

Twin observation canonical reference:
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`

Twin optimization canonical reference:
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`

First operational implementation slice reference:
- `docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md`

## Core Twin Domains
Canonical Digital Twin runtime domains for first operational twin:
- Content State
- Design State
- Experience State
- Governance State
- Operational State

Future architecture domain (out of first operational runtime contract):
- Intelligence State

## Twin Identity
Canonical first operational identity fields:
- `twinId`
- `siteId`
- `siteVersionId`
- `workspaceId`
- `environmentScope`
- `status`
- `createdAt`
- `updatedAt`

## Twin Status
Canonical first operational states:
- `building`
- `ready`
- `stale`
- `failed`

## Twin Relationships
Canonical Digital Twin relationship graph:

```text
Import Pipeline Output
  -> Twin Generation Architecture

Twin Generation Architecture
  -> Twin Runtime Contract

Twin Runtime Contract
  -> Digital Twin Runtime Object

Digital Twin Runtime Object
  -> Content Model

Digital Twin Runtime Object
  -> Design Model

Digital Twin Runtime Object
  -> Experience Model

Digital Twin Runtime Object
  -> Workspace Overview
```

## Twin Observations and Scoring Boundary
Observation, scoring, and recommendation layers remain outside the first operational runtime contract.

These stay architecture-layer integrations until later runtime phases:
- Twin Observation Architecture
- Twin Optimization Architecture
- Website Intelligence Architecture

## AI Relationship
AI boundaries for the first operational runtime contract:
- AI does not directly mutate the Twin.
- AI output is not required in Twin Snapshot v1.
- AI recommendations are out of scope.
- AI cannot bypass governance.
- AI cannot publish directly.

## Workspace Relationship
The Website Overview screen represents the Website Digital Twin.

The Overview is the primary first-operational visualization of the Twin.

First operational visibility target:
- `identity`
- `status`
- `snapshot`
- `metadata`
- `diagnostics`

Viewer dependency boundary:
- no scoring engine required
- no recommendation engine required
- no optimization engine required
- no AI editor required
- no publish runtime required

## Governance Principles
The Digital Twin architecture follows these principles:
- evidence before observation
- observation before recommendation
- recommendation before proposal
- proposal before mutation
- approval before publish
- audit before execution

## Current State
Architecture baseline with first implemented runtime twin slice.

Explicitly:
- twin runtime types implemented (`apps/platform/gnr8/runtime/twin/twin-types.ts`)
- deterministic twin builder implemented (`apps/platform/gnr8/runtime/twin/twin-builder.ts`)
- twin-builder tests implemented and passing (`apps/platform/gnr8/runtime/twin/twin-builder.test.ts`)
- no scoring engine implemented
- no observation engine implemented
- no recommendation engine implemented
- no recommendation runtime implemented
- no optimization runtime implemented
- no prioritization engine implemented

Deterministic builder baseline confirmed:
- `twinId` derived from `siteId + siteVersionId + environmentScope`
- controlled timestamps via `nowIso` or `clock`
- `ready` status for valid input
- deterministic throw for missing `siteId`/`siteVersionId`
- diagnostics: `TWIN_BUILD_STARTED`, `TWIN_IDENTITY_CREATED`, `TWIN_SNAPSHOT_CREATED`, `TWIN_BUILD_SUCCEEDED`

First operational next step:
- implement Twin In-Memory Store / Read-Model Store
- then project viewer/store integration against the existing runtime contract

## Future Integration Points
This architecture anchors future integration with:
- Twin Runtime Contract
- Twin Generation Architecture
- Twin Observation Architecture
- Twin Optimization Architecture
- Website Intelligence Architecture
- Workspace UI Concept
- Workspace Wireframes
- Content Model
- Design Model
- Experience Model
- Provider Governance
- Website Evolution Lifecycle

## Success Condition
GNR8 gains the canonical Website Digital Twin architecture that becomes the central object of the Website Operating System.

First operational success checkpoint:
- GNR8 now has the first runtime Website Digital Twin object and deterministic builder while remaining persistence/API/UI-free.

## Related Canonical Documents
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`
- `docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md`
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/architecture/CANONICAL_CONTENT_MODEL.md`
- `docs/architecture/CANONICAL_DESIGN_MODEL.md`
- `docs/architecture/CANONICAL_EXPERIENCE_MODEL.md`
- `docs/architecture/PROVIDER_ORCHESTRATION_CONTRACT.md`
- `docs/product/WORKSPACE_WIREFRAMES_V1.md`
