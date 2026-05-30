# Versioning & Rollback Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no APIs, no UI, no database changes, no editor implementation

## Purpose
Versioning protects governed website evolution.

Rollback is a first-class safety mechanism.

## Versioned Models
Canonical versioned models:
- Content Model
- Design Model
- Experience Model
- Editing Proposals
- Publish Artifacts

## Version Identity
Canonical version identity fields:
- `versionId`
- `entityId`
- `entityType`
- `modelType`
- `createdAt`
- `createdBy`
- `source`
- `reason`
- `parentVersionId`
- `status`

## Change Sets
Canonical change set fields:
- `changeSetId`
- `versionId`
- `targetModel`
- `targetEntities`
- `changes`
- `reason`
- `createdBy`
- `reviewStatus`

## Rollback Model
Canonical rollback fields:
- `rollbackId`
- `fromVersionId`
- `toVersionId`
- `scope`
- `reason`
- `requestedBy`
- `approvedBy`
- `status`

## Version Lifecycle
Canonical version lifecycle states:
- `draft`
- `proposed`
- `reviewed`
- `approved`
- `published`
- `superseded`
- `rolled_back`
- `archived`

## Rollback Lifecycle
Canonical rollback lifecycle states:
- `requested`
- `validated`
- `approved`
- `executed`
- `failed`
- `cancelled`

## Governance Principles
The versioning and rollback architecture follows these principles:
- `version before publish`
- `rollback before mutation`
- `diff before approval`
- `audit before execution`
- `no destructive overwrite`

## AI Editing Relationship
AI editing integrates with versioning and rollback through a governed chain:
- AI proposals create change sets
- change sets create versions
- versions can be reviewed, published, or rolled back

## Publish Governance Relationship
Publish is governed promotion of approved versions into environments.

Publish is not direct mutation.

Canonical publish governance architecture reference:
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`

Environment promotion chain:
- `preview -> staging -> production`

## Current State
Architecture only.

Explicitly:
- no versioning runtime implemented
- no rollback runtime implemented

## Future Integration Points
This architecture anchors future integration with:
- Canonical Content Model
- Canonical Design Model
- Canonical Experience Model
- AI Editor Architecture
- Publish Governance Architecture
- Execution Approval Contract
- Preview Renderer
- Execution Governance

## Success Condition
GNR8 gains the versioning and rollback foundation required before AI-assisted editing can become executable.
