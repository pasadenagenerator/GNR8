# Twin Observation Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no APIs, no UI implementation, no database changes

## Purpose
Observation converts raw signals into operational understanding.

This architecture defines the canonical observation layer behind the Website Digital Twin.

## Observation Inputs
Canonical observation input signal families:
- Content Signals
- Design Signals
- Experience Signals
- Governance Signals
- Operational Signals

## Observation Types
Canonical observation output types:
- Warning
- Risk
- Insight
- Recommendation

Optimization and proposal progression are defined in:
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`

## Observation Flow
Canonical observation progression:

```text
Signals
 -> Observations

Observations
 -> Insights

Insights
 -> Recommendations

Recommendations
 -> Optimization Inputs

Optimization Inputs
 -> Optimization Opportunities

Optimization Opportunities
 -> Proposal Candidates
```

## Observation Severity
Canonical observation severity levels:
- informational
- low
- medium
- high
- critical

## AI Relationship
AI participation is bounded:
- AI may assist interpretation
- AI may assist recommendation generation
- AI may not bypass governance

## Governance Principles
The observation layer follows these principles:
- evidence before observation
- observation before recommendation
- recommendation before proposal
- proposal before mutation

## Current State
Architecture plus deterministic observation, insight, recommendation, optimization, and optimization scoring runtime milestones.

Explicitly:
- Twin Observation Runtime v1 completed (`2026-06-01`)
- Twin Insight Runtime v1 completed (`2026-06-01`)
- Twin Recommendation Runtime v1 completed (`2026-06-01`)
- Twin Optimization Runtime v1 completed (`2026-06-01`)
- Optimization Scoring Runtime v1 completed (`2026-06-01`)
- Proposal Candidate Runtime v1 completed (`2026-06-01`)

Proposal Candidate Runtime v1 milestone confirmed (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.ts`
  - `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.test.ts`
- implemented function:
  - `generateTwinProposalCandidates(input)`
- proposal candidate fields:
  - `proposalId`
  - `status`
  - `executionState`
  - `title`
  - `summary`
  - `priority`
  - `expectedImpact`
  - `expectedEffort`
  - `risk`
  - `optimizationRank`
  - `optimizationScore`
  - `sourceOpportunityId`
  - `supportingRecommendations`
  - `reason`
  - `boundaries`
- verified deployed Proposal Candidates for `Transporti Maver`:
  - `#1 Improve Homepage Conversion Flow status=proposal_candidate executionState=blocked rank=1 score=390`
  - `#2 Improve Homepage Quality and Messaging status=proposal_candidate executionState=blocked rank=2 score=340`
  - `#3 Maintain Read-Only Validation Mode status=proposal_candidate executionState=blocked rank=3 score=320`
- top-rank selection behavior:
  - generated from top-ranked optimization opportunities
  - default limit: `3`
  - `Design Evidence Collection` remains an optimization opportunity and is not promoted in Runtime v1 because it is ranked `#4`
- preserved boundaries:
  - read-only
  - non-executable
  - no content mutation
  - no design mutation
  - no publishing
  - no provider execution
  - no approval workflow yet
  - no AI model calls

Twin Optimization Runtime v1 milestone confirmed (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-optimizations.ts`
  - `apps/platform/gnr8/runtime/twin/twin-optimizations.test.ts`
- implemented function:
  - `generateTwinOptimizationOpportunities(recommendations)`
- implemented deterministic optimization opportunities:
  - `Homepage Quality Improvement`
  - `Homepage Conversion Review`
  - `Design Evidence Collection`
  - `Validation Stability Preservation`
- recommendation-to-optimization mapping:
  - `Prioritize Core Page Quality` -> `Homepage Quality Improvement`
  - `Evaluate Homepage Conversion Flow` -> `Homepage Conversion Review`
  - `Collect Additional Design Evidence` -> `Design Evidence Collection`
  - `Maintain Read-Only Validation Mode` -> `Validation Stability Preservation`
- diagnostics:
  - `TWIN_OPTIMIZATIONS_STARTED`
  - `TWIN_OPTIMIZATIONS_COMPLETED`
- optimization fields:
  - `impact`
  - `effort`
  - `priority`
  - `supportingRecommendations`
- preserved boundaries:
  - no AI model calls
  - no optimization engine
  - no mutation execution
  - no editing
  - no publishing
  - deterministic read-only optimization opportunities only

Optimization Scoring Runtime v1 milestone confirmed (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-optimization-scoring.ts`
  - `apps/platform/gnr8/runtime/twin/twin-optimization-scoring.test.ts`
- implemented function:
  - `scoreOptimizationOpportunities(opportunities)`
- scoring fields:
  - `impactScore`
  - `effortScore`
  - `confidenceScore`
  - `evidenceQualityScore`
  - `totalScore`
  - `rank`
- diagnostics:
  - `TWIN_OPTIMIZATION_SCORING_STARTED`
  - `TWIN_OPTIMIZATION_SCORING_COMPLETED`
- preserved boundaries:
  - no AI model calls
  - no proposal generation
  - no optimization execution
  - no editing
  - no publishing
  - deterministic scoring only

Twin Recommendation Runtime v1 milestone confirmed (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-recommendations.ts`
  - `apps/platform/gnr8/runtime/twin/twin-recommendations.test.ts`
- implemented function:
  - `generateTwinRecommendations(insights)`
- implemented deterministic recommendation rules:
  - `Prioritize Core Page Quality`
  - `Evaluate Homepage Conversion Flow`
  - `Collect Additional Design Evidence`
  - `Maintain Read-Only Validation Mode`
- verified deployed recommendations for `Transporti Maver`:
  - `Prioritize Core Page Quality`
  - `Evaluate Homepage Conversion Flow`
  - `Collect Additional Design Evidence`
  - `Maintain Read-Only Validation Mode`
- insight-to-recommendation relationships:
  - `Focused Website Footprint` -> `Prioritize Core Page Quality`
  - `Primary Entry Experience Detected` -> `Evaluate Homepage Conversion Flow`
  - `Limited Design Evidence Available` -> `Collect Additional Design Evidence`
  - `Governance Boundary Enforced` -> `Maintain Read-Only Validation Mode`
- diagnostics:
  - `TWIN_RECOMMENDATIONS_STARTED`
  - `TWIN_RECOMMENDATIONS_COMPLETED`
- preserved boundaries:
  - no AI model calls
  - no optimization engine
  - no proposal generation
  - no editing
  - no publishing
  - deterministic read-only recommendations only

## Future Integration Points
This architecture anchors future integration with:
- Twin Generation
- Website Intelligence
- Twin Optimization
- Digital Twin
- Workspace Overview
- AI Editor

## Success Condition
GNR8 gains the canonical observation layer that transforms website evidence into actionable intelligence.

Current runtime conclusion:
- Workspace Overview now displays read-only, non-executable Proposal Candidates derived from ranked Optimization Opportunities.

Recommended next milestone:
- Proposal Candidate Operator UX Cleanup v1
- followed by: Proposal Approval Preview Runtime v1

## Related Canonical Documents
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_THREAD_HANDOFF.md`
