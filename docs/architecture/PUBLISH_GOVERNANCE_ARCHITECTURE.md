# Publish Governance Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no APIs, no UI, no database changes, no publish implementation

## Purpose
Publishing is governed promotion of approved versions into an environment.

Publish is not direct mutation.

Publishing is a workspace-governed operation.

Website evolution lifecycle reference:
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`

## Workspace Relationship
Publish operates inside workspace governance.

Publish does not bypass proposal, version, or approval controls.

Canonical workspace architecture reference:
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`

## Lifecycle Relationship
Publishing consumes governed outputs from prior lifecycle stages:
- Proposals -> Approvals -> Versions -> Publishing -> Observation

Lifecycle architecture reference:
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`

## Publish Targets
Canonical publish targets:
- `preview`
- `staging`
- `production`

## Publish Inputs
Canonical publish inputs:
- `workspaceId`
- `approved version`
- `approved change set`
- `approval evidence`
- `target environment`
- `rollback target`
- `publish reason`

## Publish Plan
Canonical publish plan fields:
- `publishPlanId`
- `workspaceId`
- `targetEnvironment`
- `includedVersions`
- `includedChangeSets`
- `riskLevel`
- `rollbackPlanId`
- `approvalId`
- `executionAllowed`
- `executionBlocked`

## Publish Lifecycle
Canonical publish lifecycle states:
- `draft`
- `validated`
- `approved`
- `queued`
- `executed`
- `failed`
- `rolled_back`

## Environment Promotion
Canonical promotion path:
- `preview -> staging -> production`

## Publish Governance Principles
The publish architecture follows these principles:
- `understand before change`
- `proposal before mutation`
- `approval before publish`
- `version before overwrite`
- `rollback before risk`
- `observe before optimize`

## AI Editing Relationship
AI suggestions do not publish directly.

AI proposals must become approved versions before publish.

Canonical AI editor architecture reference:
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`

## Current State
Architecture only.

Explicitly:
- no workspace runtime implemented
- no workspace UI implemented
- no publish runtime implemented
- no environment promotion runtime implemented
- no lifecycle runtime implemented
- no observation runtime implemented

## Future Integration Points
This architecture anchors future integration with:
- Website Evolution Lifecycle Architecture
- Experience Workspace Architecture
- Versioning & Rollback Architecture
- AI Editor Architecture
- Execution Approval Contract
- Provider Execution Governance
- Observation Layer
- Optimization Layer
- Preview Renderer
- Deployment Providers

## Success Condition
GNR8 gains the canonical publish governance model required before edited website models can be promoted into real environments.
