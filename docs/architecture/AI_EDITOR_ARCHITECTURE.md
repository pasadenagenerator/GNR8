# AI Editor Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no APIs, no UI, no editor implementation, no database changes

## Purpose
Editing in GNR8 is a governed workspace operation.

Editing is not direct mutation.

Editing produces proposed changes.

## Workspace Relationship
Editing is executed inside workspace governance.

AI does not bypass workspace approval or publish controls.

Canonical workspace architecture reference:
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`

## Editor Types
Canonical editor types:
- Human Editor
- AI Editor
- Collaborative Editor
- Automated Editor

## Editing Targets
Canonical editing targets:
- Content Model
- Design Model
- Experience Model

## Editing Operations
Canonical editing operations:
- create
- modify
- remove
- transform
- optimize
- translate
- personalize

## Editing Proposal Model
Canonical proposal fields:
- `proposalId`
- `workspaceId`
- `editorType`
- `targetModel`
- `targetEntity`
- `reason`
- `proposedChanges`
- `status`

## Proposal Lifecycle
Canonical proposal lifecycle states:
- draft
- generated
- reviewed
- approved
- rejected
- versioned
- superseded

## Human Editing
Human editing is direct intent expression.

Humans specify what should change.

The system still routes change through governed proposals.

## AI Editing
AI editing is intent-driven editing.

AI does not mutate models directly.

AI generates proposals that can be reviewed and governed.

Canonical examples:
- rewrite content
- improve SEO
- generate section
- improve conversion flow
- modernize design
- translate website

## Governance Principles
The editing architecture follows these principles:
- workspace before mutation
- proposal before mutation
- approval before publish
- version before overwrite
- rollback before mutation
- audit before execution

## AI Editing Relationship to Versioning
AI editing integrates with versioning and rollback through a governed chain:
- AI proposals create change sets
- change sets create versions
- versions can be reviewed, published, or rolled back

Canonical versioning and rollback architecture reference:
- `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`

Canonical publish governance architecture reference:
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`

AI publishing boundary:
- AI suggestions do not publish directly
- AI proposals must become approved versions before publish

## Current State
Architecture only.

Explicitly:
- no workspace runtime implemented
- no workspace UI implemented
- no editor runtime implemented
- no proposal engine implemented
- no approval workflow implemented
- no versioning runtime implemented
- no rollback runtime implemented

Website OS Proposal Candidate Runtime v1 completion dependency confirmed (`2026-06-01`):
- completed deterministic upstream runtime milestones:
  - Observation Runtime v1
  - Insight Runtime v1
  - Recommendation Runtime v1
  - Optimization Runtime v1
  - Optimization Scoring Runtime v1
  - Proposal Candidate Runtime v1
- Proposal Candidate Runtime v1 files:
  - `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.ts`
  - `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.test.ts`
- function:
  - `generateTwinProposalCandidates(input)`
- editor boundary remains unchanged:
  - read-only proposal candidates only
  - no approval workflow yet
  - no content/design mutation
  - no publishing
  - no provider execution
  - no AI model calls in this runtime slice

## Future Integration Points
This architecture anchors future integration with:
- Experience Workspace Architecture
- Canonical Content Model
- Canonical Design Model
- Canonical Experience Model
- Versioning & Rollback Architecture
- Publish Governance Architecture
- Execution Approval Contract
- AI Routing Architecture

## Success Condition
GNR8 gains the editing foundation of the AI-native Website Operating System.
