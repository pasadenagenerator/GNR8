# Canonical Design Model Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no APIs, no UI, no editor implementation, no database changes

## Purpose
Design in GNR8 is not page HTML.

Design is reusable experience structure.

## Core Design Entities
Canonical design entities:
- Design System
- Theme
- Token
- Component
- Component Variant
- Section Template
- Layout
- Template
- Brand Profile

## Design Responsibilities
Canonical design responsibilities include:
- visual language
- spacing
- typography
- colors
- layout
- components
- responsiveness
- accessibility

## Design Identity
Each canonical design entity should include:
- `designId`
- `designType`
- `stableKey`
- `ownerScope`
- `versionId`
- `status`

## Design Relationships
Canonical design relationship chain:

```text
Brand Profile
  -> Theme

Theme
  -> Tokens

Tokens
  -> Components

Components
  -> Section Templates

Section Templates
  -> Layouts

Layouts
  -> Templates
```

## Governance Principles
The canonical design model follows these principles:
- design before rendering
- tokens before CSS
- components before pages
- version before publish
- rollback before overwrite

## AI Design Editing
AI should edit design intent before implementation.

Canonical AI design editing examples:
- change spacing scale
- modernize typography
- increase contrast
- create section variation
- adapt theme
- generate landing-page layout

## Content Separation
Content and Design are independent.

Content can move between designs.

Design can move between content sets.

## Current State
Architecture only.

Explicitly:
- no canonical design model runtime implemented
- no editor implemented
- no design database schema implemented

## Future Integration Points
This architecture should integrate with future:
- Canonical Content Model
- AI Editor Architecture
- Versioning & Rollback Architecture
- Publish Governance Architecture
- Import Pipeline
- Preview Renderer

## Success Condition
GNR8 gains the canonical design foundation for future AI-native editing and website generation.
