# Website Evolution Lifecycle Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no APIs, no UI, no database changes

## Purpose
GNR8 manages continuous website evolution.

A website is never finished.

A website continuously moves through governed lifecycle stages.

The Website Digital Twin is the primary operational object carried through the lifecycle.

Digital Twin canonical reference:
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`

Twin Generation canonical reference:
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`

Twin Observation canonical reference:
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`

Twin Optimization canonical reference:
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`

## Lifecycle Stages
Canonical lifecycle stages:
- Import
- Modeling
- Twin Generation
- Editing
- Proposal Review
- Approval
- Version Creation
- Publishing
- Observation
- Optimization
- Evolution

## Stage Relationships
Canonical lifecycle relationship graph:

```text
Import
 -> Content/Design/Experience Models

Models
 -> Twin Generation

Twin Generation
 -> Digital Twin

Digital Twin
 -> Workspace

Workspace
 -> Editing

Editing
 -> Proposals

Proposals
 -> Approvals

Approvals
 -> Versions

Versions
 -> Publishing

Publishing
 -> Observation

Observation
 -> Optimization

Optimization
 -> New Editing Cycle
```

## Lifecycle Flow By Stage
### Import
Import gathers source website evidence and input artifacts.

Import produces canonical model candidates for content, design, and experience.

### Modeling
Modeling creates governed representations:
- Content Model
- Design Model
- Experience Model

Modeling outputs become workspace-operable state.

### Twin Generation
Twin Generation transforms imported evidence, canonical models, provider state, governance state, and environment state into a governed Website Digital Twin.

Twin Generation stage progression:
- Evidence Extraction
- Model Construction
- Signal Generation
- Observation Generation
- Scoring
- Recommendation Generation
- Twin Assembly

Twin Generation refresh modes:
- Initial Generation
- Manual Refresh
- Scheduled Refresh
- Event-driven Refresh

### Editing
Editing happens inside workspace governance.

Editing is proposal-first and does not directly mutate published state.

### Proposal Review
Proposals are reviewed for quality, intent alignment, and risk.

### Approval
Approved proposals become eligible for version creation.

Unapproved proposals cannot publish.

### Version Creation
Approved changes are materialized as explicit versions.

Version identity is required before publish operations.

### Publishing
Publishing promotes approved versions to governed environments.

Publishing is controlled by publish governance and rollback readiness.

### Observation
Observation inspects published outcomes and operating behavior.

Observation captures signals required for optimization decisions.

Canonical observation signal families:
- Content Signals
- Design Signals
- Experience Signals
- Governance Signals
- Operational Signals

Observation outputs canonical observation families:
- Warnings
- Risks
- Insights
- Recommendations

Observation evaluates intelligence domains:
- Content Health
- Design Health
- Experience Health
- Governance Health
- Operational Health

Observation outputs score surfaces:
- Website Health
- Content Score
- Design Score
- Experience Score
- Governance Score
- Operations Score

### Optimization
Optimization converts observed evidence into proposed improvements.

Optimization does not bypass proposal and approval governance.

Optimization recommendation progression:
- Observation
- Recommendation
- Optimization Opportunity
- Proposal Candidate

Canonical optimization structure, prioritization dimensions, and governance sequence are defined in:
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`

### Evolution
Evolution restarts the governed editing cycle with better context.

Evolution is continuous lifecycle operation, not one-time launch.

## Governance Principles
The lifecycle follows these principles:
- evidence before scoring
- observation before recommendation
- recommendation before proposal
- proposal before mutation
- approval before publish
- version before overwrite
- rollback before risk
- observe before optimize
- audit before execution

## AI Participation
AI may assist signal generation.

AI may assist recommendations.

AI may assist every lifecycle stage.

AI may not bypass governance.

AI may not bypass approval.

AI may not publish directly.

AI does not directly mutate the Twin.

## Current State
Architecture only.

Lifecycle runtime is not implemented.

Twin generation runtime is not implemented.

Observation layer is not implemented.

Scoring engine is not implemented.

Optimization layer is not implemented.

Prioritization engine is not implemented.

## Future Integration Points
This lifecycle architecture anchors future integration with:
- Twin Generation Architecture
- Website Digital Twin Architecture
- Website Intelligence Architecture
- Twin Observation Architecture
- Twin Optimization Architecture
- Import Pipeline
- Content Model
- Design Model
- Experience Model
- AI Editor
- Versioning & Rollback
- Publish Governance
- Provider Governance
- Workspace Architecture

## Related Canonical Documents
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`
- `docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
- `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`

## Success Condition
GNR8 gains the canonical website evolution lifecycle connecting import, modeling, twin generation, editing, governance, and publishing.
