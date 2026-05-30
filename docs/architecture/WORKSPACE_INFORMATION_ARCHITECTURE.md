# Workspace Information Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no UI implementation, no editor implementation, no APIs, no database changes

## Purpose
Define how users navigate and understand websites inside GNR8.

This architecture bridges canonical system architecture and future workspace UI design.

Workspace is the primary operating environment of a website.

Users do not manage pages.

Users manage website evolution.

## Core Philosophy
- Website-first
- Governance-first
- AI-assisted
- Version-aware
- Lifecycle-aware

## Primary Workspace Areas
Canonical primary workspace areas:
- Overview
- Content
- Design
- Experience
- AI
- Governance
- Operations

## Navigation Model
### Global Navigation
Global navigation anchors movement across top-level GNR8 operating surfaces.

Workspace is one governed operating surface inside global navigation.

### Workspace Navigation
Workspace navigation anchors movement across primary workspace areas:
- Overview
- Content
- Design
- Experience
- AI
- Governance
- Operations

### Context Navigation
Context navigation anchors movement inside each workspace area.

Context navigation changes by area while preserving workspace governance boundaries.

## Overview Concept
Overview is the homepage of a website workspace.

Overview acts as the Digital Twin of the Website.

## Overview Surfaces
Canonical overview information surfaces:
- Website Health
- Website Status
- Recent Activity
- Pending Proposals
- Pending Approvals
- Latest Publish
- Optimization Opportunities
- AI Recommendations
- Environment Status
- Provider Status

Homepage purpose:
- orient website operators quickly
- surface action-relevant governance state
- expose next critical decisions

## Content Area
Canonical content area information domains:
- Pages
- Collections
- Products
- Media
- SEO

Content area purpose:
- understand and evolve structured website content
- keep content identity and governance explicit before publish

## Design Area
Canonical design area information domains:
- Themes
- Tokens
- Components
- Templates
- Layouts

Design area purpose:
- understand and evolve reusable design system structure
- maintain design consistency across website experiences

## Experience Area
Canonical experience area information domains:
- Journeys
- Funnels
- Navigation
- Personalization

Experience area purpose:
- understand and evolve user movement through the website
- align experience intent with measurable lifecycle outcomes

## AI Area
Canonical AI information domains:
- Governed Editing
- Suggestions
- Proposal Queue
- Optimization Opportunities
- Recommendation History

AI area purpose:
- keep AI assistance visible, auditable, and governance-bound
- ensure AI participation never bypasses proposal, approval, or publish controls
- ensure AI cannot publish directly

## Governance Area
Canonical governance information domains:
- Proposals
- Versions
- Approvals
- Publishing
- Rollback
- Audit Trail

Governance area purpose:
- enforce proposal-first change management
- protect publish operations with approvals and rollback readiness

## Operations Area
Canonical operations information domains:
- Providers
- Environments
- Credentials
- Deployments
- Execution Governance

Operations area purpose:
- make operational website dependencies visible and governed
- keep execution controls explicit, auditable, and boundary-aware

## Relationships
Workspace information architecture relationship graph:

```text
Global Navigation
 -> Workspace

Workspace
 -> Overview
 -> Content
 -> Design
 -> Experience
 -> AI
 -> Governance
 -> Operations

Overview
 -> Website Health
 -> Website Status
 -> Recent Activity
 -> Pending Proposals
 -> Pending Approvals
 -> Latest Publish
 -> Optimization Opportunities
 -> AI Recommendations
 -> Environment Status
 -> Provider Status

AI
 -> Governed Editing
 -> Suggestions
 -> Proposal Queue
 -> Optimization Opportunities
 -> Recommendation History

Governance
 -> Proposals
 -> Versions
 -> Approvals
 -> Publishing
 -> Rollback
 -> Audit Trail

Operations
 -> Providers
 -> Environments
 -> Credentials
 -> Deployments
 -> Execution Governance
```

## Current State
Architecture only.

Explicitly:
- no workspace runtime implemented
- no workspace UI implemented
- no editor implementation
- no API implementation
- no database implementation
- no wireframes

## Success Condition
GNR8 gains the conceptual product blueprint required before creating the first Workspace wireframes.

## Related Canonical Documents
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/CANONICAL_CONTENT_MODEL.md`
- `docs/architecture/CANONICAL_DESIGN_MODEL.md`
- `docs/architecture/CANONICAL_EXPERIENCE_MODEL.md`
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
- `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`
