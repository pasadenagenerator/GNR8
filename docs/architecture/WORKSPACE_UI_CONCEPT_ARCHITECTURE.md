# Workspace UI Concept Architecture

## Status
- Draft: canonical concept architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no APIs, no UI implementation, no database changes

## Purpose
Workspace is the primary operating environment of a website.

Users do not manage pages.

Users manage website evolution.

This document is the canonical bridge between architecture and future UI design.

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

## Overview Concept
Overview is the homepage of a website workspace.

Overview acts as the Digital Twin of the Website.

Digital Twin canonical reference:
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`

## Overview Surfaces
Canonical overview information surfaces:
- Website Health
- Content Score
- Design Score
- Experience Score
- Governance Score
- Operations Score
- Website Status
- Recent Activity
- Pending Proposals
- Pending Approvals
- Latest Publish
- Optimization Opportunities
- AI Recommendations
- Environment Status
- Provider Status

## Website Intelligence Concept
Website Intelligence is the observation and understanding layer behind Overview as the Website Digital Twin.

Canonical intelligence domains:
- Content Health
- Design Health
- Experience Health
- Governance Health
- Operational Health

Canonical intelligence signals:
- Quality
- Freshness
- Consistency
- Accessibility
- Performance
- Conversion Friction
- Governance Risk
- Provider Readiness

Canonical recommendation progression:
- Observation
- Recommendation
- Optimization Opportunity
- Proposal Candidate

Canonical Twin observation surfaces represented in Overview:
- Health Signals
- Risks
- Warnings
- Recommendations
- Optimization Opportunities
- Proposal Candidates

## Navigation Concept
Canonical navigation model:
- Global Navigation
- Workspace Navigation
- Context Navigation

## AI Concept
AI is not a chatbot.

AI is a governed editor operating inside workspace rules.

AI suggestions enter proposal workflows.

AI cannot publish directly.

AI cannot bypass governance.

## Governance Concept
Canonical governance domains:
- Proposals
- Versions
- Approvals
- Publishing
- Rollback
- Audit Trail

## Operations Concept
Canonical operations domains:
- Providers
- Environments
- Credentials
- Deployments
- Execution Governance

## Relationship Model
Workspace UI concept relationship graph:

```text
Website Workspace
 -> Overview
 -> Content
 -> Design
 -> Experience
 -> AI
 -> Governance
 -> Operations

Overview
 -> Website Health
 -> Content Score
 -> Design Score
 -> Experience Score
 -> Governance Score
 -> Operations Score
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
 -> Governed Editor
 -> Proposal Workflow
 -> Non-Publish Boundary

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

Twin Viewer Read-Model Helper milestone is complete and ready for Workspace UI consumption:
- runtime files: `apps/platform/gnr8/runtime/twin/twin-viewer.ts`, `apps/platform/gnr8/runtime/twin/twin-viewer.test.ts`
- implemented type: `TwinOverview`
- implemented function: `createTwinOverview(twin)`
- mapped fields: `twinId`, `siteId`, `siteVersionId`, `workspaceId`, `environmentScope`, `status`, `contentSummary`, `designSummary`, `experienceSummary`, `governanceSummary`, `operationalSummary`, `lastUpdated`, `diagnostics`
- diagnostic: `TWIN_OVERVIEW_CREATED`
- validation: twin-viewer tests passed, next build passed

Explicitly:
- no UI implementation
- no runtime changes
- no API implementation
- no database changes
- no React implementation for Workspace Twin surfaces yet
- no scoring/recommendations/optimization/AI runtime in Overview read-model

## Success Condition
GNR8 gains the conceptual product blueprint required before creating and validating Workspace wireframe specifications.

## Related Canonical Documents
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
- `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/PROVIDER_ORCHESTRATION_CONTRACT.md`
- `docs/product/WORKSPACE_WIREFRAMES_V1.md`
