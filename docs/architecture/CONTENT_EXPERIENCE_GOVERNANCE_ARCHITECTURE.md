# Content & Experience Governance Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no APIs, no UI, no editor implementation

## Purpose
GNR8 manages websites as operational systems.

A website is not a page collection.

A website is a governed digital experience.

Workspace is the operational home through which website evolution is managed.

Website evolution lifecycle reference:
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`

## Core Layers
Canonical layers:
- Workspace Layer
- Content Layer
- Design Layer
- Experience Layer
- Editing Layer
- Publish Layer

## Website Representation
Canonical website representation:

```text
Website
 ├─ Workspace
 ├─ Content
 ├─ Design
 ├─ Experience
 ├─ Business Logic
 ├─ Operations
 └─ Governance
```

## Lifecycle Relationship
This architecture operates inside the canonical website evolution lifecycle:
- Import -> Modeling -> Workspace -> Editing -> Proposal Review -> Approval -> Version Creation -> Publishing -> Observation -> Optimization -> Evolution

Lifecycle architecture reference:
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`

## Workspace Layer
Workspace governs the full operational lifecycle:
- view state
- edit state
- review proposals
- approve changes
- publish versions
- rollback versions
- audit history

Canonical workspace architecture reference:
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`

## Content Layer
Future responsibility includes:
- text
- media
- products
- collections
- blog
- SEO
- metadata

## Design Layer
Future responsibility includes:
- tokens
- theme
- layout
- components
- brand system

## Experience Layer
Future responsibility includes:
- navigation
- journeys
- personalization
- commerce flows
- interaction flows

## Editing Layer
Canonical editing modes:
- human editing
- AI editing
- collaborative editing
- governed editing

Editing architecture is proposal-first:
- editing is a governed operation
- editing is not direct mutation
- editing produces proposed changes

Canonical editor architecture reference:
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`

## Publish Layer
Canonical publish capabilities:
- versioning
- approval
- rollback
- publishing
- environment promotion

Canonical versioning and rollback architecture reference:
- `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`

Canonical publish governance architecture reference:
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`

## Governance Principles
The system follows these principles:
- understand before change
- proposal before mutation
- approval before publish
- version before overwrite
- rollback before risk
- observe before optimize

## Current State
Architecture only.

Explicitly:
- no workspace runtime implemented
- no workspace UI implemented
- no editor implemented
- no content model implemented
- no design model implemented
- no publish execution implemented
- no versioning runtime implemented
- no rollback runtime implemented
- no lifecycle runtime implemented
- no observation layer implemented
- no optimization layer implemented

## Future Child Documents
This document is the parent architecture for future:
- Website Evolution Lifecycle Architecture
- Experience Workspace Architecture
- Canonical Content Model
- Canonical Design Model
- Canonical Experience Model
- AI Editor Architecture
- Versioning & Rollback Architecture
- Publish Governance Architecture

Current child documents implemented:
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
- `docs/architecture/CANONICAL_CONTENT_MODEL.md`
- `docs/architecture/CANONICAL_DESIGN_MODEL.md`
- `docs/architecture/CANONICAL_EXPERIENCE_MODEL.md`
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
- `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`

## Success Condition
GNR8 has the parent architecture for the future AI-native Website Operating System.
