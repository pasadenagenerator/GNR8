# Website Intelligence Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no UI implementation, no APIs, no database changes

## Purpose
Website Intelligence is the observation and understanding layer of GNR8.

This architecture defines how GNR8 evaluates, understands, and scores websites as the intelligence foundation behind the Website Digital Twin.

Digital Twin canonical reference:
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`

Twin Generation canonical reference:
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`

Twin Observation canonical reference:
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`

Twin Optimization canonical reference:
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`

## Intelligence Domains
Canonical Website Intelligence domains:
- Content Health
- Design Health
- Experience Health
- Governance Health
- Operational Health

## Signals
Canonical Website Intelligence signal families:
- Content Signals
- Design Signals
- Experience Signals
- Governance Signals
- Operational Signals

## Scores
Canonical Website Intelligence score surfaces:
- Website Health
- Content Score
- Design Score
- Experience Score
- Governance Score
- Operations Score

## Observations
Canonical Website Intelligence observation surfaces:
- Warnings
- Risks
- Insights
- Recommendations

## Recommendation Model
Website Intelligence outputs governed recommendation artifacts in this progression:
- Signals
- Observations
- Insights
- Recommendations
- Optimization Opportunities
- Proposal Candidates

## AI Relationship
AI may assist signal generation.

AI may assist interpretation.

AI may assist recommendations.

AI consumes Twin observations.

AI may not directly publish changes.

AI outputs must remain inside governed proposal and approval workflows.

AI may not bypass governance.

AI does not directly mutate the Twin.

## Relationship Model
Website Intelligence relationship graph:

```text
Website Digital Twin (Overview)
 -> Website Intelligence

Website Intelligence
 -> Signal Generation
 -> Observation Generation
 -> Scoring
 -> Recommendations

Signal Generation
 -> Content Signals
 -> Design Signals
 -> Experience Signals
 -> Governance Signals
 -> Operational Signals

Observation Generation
 -> Warnings
 -> Risks
 -> Insights
 -> Recommendations

Recommendation Generation
 -> Optimization Opportunities

Optimization Opportunities
 -> Proposal Candidates

Scoring
 -> Website Health
 -> Content Score
 -> Design Score
 -> Experience Score
 -> Governance Score
 -> Operations Score

Proposal Candidate
 -> Governance Review
 -> Approval
 -> Version
 -> Publishing
```

Canonical observation flow and severity are defined in:
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`

Canonical optimization and prioritization are defined in:
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`

## Current State
Architecture plus first deterministic observation runtime milestone and first deterministic insight runtime milestone.

Explicitly:
- no scoring engine
- no recommendation engine
- no observation engine
- no recommendation runtime
- no optimization runtime
- no prioritization engine
- no runtime changes
- no UI implementation
- no APIs
- no database changes

Twin Insight Runtime v1 milestone confirmed (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-insights.ts`
  - `apps/platform/gnr8/runtime/twin/twin-insights.test.ts`
- implemented function:
  - `generateTwinInsights(observations)`
- implemented deterministic insight rules:
  - `Focused Website Footprint`
  - `Primary Entry Experience Detected`
  - `Limited Design Evidence Available`
  - `Governance Boundary Enforced`
- verified deployed insights for `Transporti Maver`:
  - `Focused Website Footprint`
  - `Primary Entry Experience Detected`
  - `Limited Design Evidence Available`
  - `Governance Boundary Enforced`
- supporting observation relationships:
  - `Focused Website Footprint` <- `Small Site Footprint`
  - `Primary Entry Experience Detected` <- `Small Site Footprint` + `Homepage Successfully Identified`
  - `Limited Design Evidence Available` <- `No Asset Evidence Detected`
  - `Governance Boundary Enforced` <- `Read-Only Runtime Validation`
- diagnostics:
  - `TWIN_INSIGHTS_STARTED`
  - `TWIN_INSIGHTS_COMPLETED`
- preserved boundaries:
  - no AI model calls
  - no recommendations
  - no optimization engine
  - no editing
  - no publishing
  - deterministic read-only insights only

## Success Condition
GNR8 gains the intelligence foundation behind the Website Digital Twin.

Current runtime conclusion:
- Workspace Overview now displays deterministic Website OS insights derived from deterministic observations.

Recommended next milestone:
- Twin Recommendation Runtime v1

## Related Canonical Documents
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/product/WORKSPACE_WIREFRAMES_V1.md`
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_THREAD_HANDOFF.md`
