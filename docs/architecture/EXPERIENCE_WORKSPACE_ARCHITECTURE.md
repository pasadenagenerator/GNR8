# Experience Workspace Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no APIs, no UI, no wireframes, no editor implementation, no database changes

## Purpose
Workspace is the primary operating environment of a website.

Users do not manage pages.

Users manage website evolution through the workspace.

The Website Digital Twin is the central operational object represented in the workspace.

Digital Twin canonical reference:
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`

Workspace UI concept reference:
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`

Workspace information architecture reference:
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`

Website evolution lifecycle reference:
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`

## Core Philosophy
- Website-first
- Governance-first
- AI-assisted
- Version-aware
- Lifecycle-aware

## Workspace Areas
Canonical workspace areas:
- Overview
- Content
- Design
- Experience
- AI
- Governance
- Operations

Area-level information architecture details are defined in:
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`

## Workspace Responsibilities
Canonical workspace responsibilities:
- view website state
- evolve website state
- evaluate proposals
- approve changes
- publish versions
- rollback versions
- audit history
- govern operations

## Workspace Identity
Canonical workspace identity fields:
- `workspaceId`
- `siteId`
- `ownerScope`
- `environmentScope`
- `status`

## Workspace Relationships
Canonical workspace relationship graph:

```text
Workspace
  -> Website Digital Twin

Workspace
  -> Content Model

Workspace
  -> Design Model

Workspace
  -> Experience Model

Workspace
  -> AI (Governed Editor)

Workspace
  -> Governance

Workspace
  -> Operations
```

## Lifecycle Relationship
Workspace anchors the middle of the canonical lifecycle:
- Models -> Workspace -> Editing -> Proposals -> Approvals -> Versions -> Publishing

Lifecycle architecture reference:
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`

## AI Relationship
AI operates inside workspace governance.

AI suggestions enter proposal workflows.

AI does not bypass approval or publish controls.

AI cannot publish directly.

## Governance Principles
The workspace architecture follows these principles:
- observe before optimize
- understand before change
- proposal before mutation
- approval before publish
- version before overwrite
- rollback before risk
- audit before execution

## Current State
Architecture only.

Explicitly:
- no workspace runtime implemented
- no workspace UI implemented
- no wireframes
- no lifecycle runtime implemented
- no information architecture runtime implemented

## Future Integration Points
This architecture anchors future integration with:
- Website Digital Twin Architecture
- Workspace UI Concept Architecture
- Workspace Information Architecture
- Website Evolution Lifecycle Architecture
- Canonical Content Model
- Canonical Design Model
- Canonical Experience Model
- AI Editor Architecture
- Versioning & Rollback
- Publish Governance
- Provider Governance

## Success Condition
GNR8 gains the conceptual product blueprint required before creating the first Workspace wireframes.
