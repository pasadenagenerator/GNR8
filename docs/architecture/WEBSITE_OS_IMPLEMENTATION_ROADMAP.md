# Website Operating System Implementation Roadmap

## Goal
Transform the completed architecture set into a staged implementation plan from the current codebase (snapshot date: 2026-05-30) to the first operational Website OS runtime.

## First Operational Twin Slice
Canonical first implementation slice:
- `docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md`

This slice is the shortest delivery path for first visible Twin value:
- website imported
- twin generated
- twin stored
- twin displayed in Workspace Overview

Execution boundary for this slice:
- includes only Twin Identity, Twin Snapshot, Twin Builder, Twin Store, Twin Viewer, Workspace Overview integration
- explicitly excludes scoring, recommendations, optimization, AI editing, and publish automation

## Implementation Sequence
1. Phase A: Website Workspace Foundation
2. Phase B: Canonical Model Runtime
3. Phase C: Digital Twin Runtime
4. Phase D: Observation Engine
5. Phase E: Optimization Engine
6. Phase F: AI Editor
7. Phase G: Governed Publish
8. Phase H: Website Evolution Engine

## Phase A: Website Workspace Foundation
- Purpose: establish the operator workspace as the governed control surface for websites, versions, approvals, and twin visibility.
- Dependencies: ownership/auth foundation, agency/client/site hierarchy, workspace IA/UI architecture.
- Required Architecture Documents:
  - `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`
  - `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
  - `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
  - `docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md`
- Deliverables:
  - workspace navigation/read models wired to site and version entities
  - gated actions for proposal/review/approve/publish intents
  - overview panel contract ready to host Digital Twin state
- Success Criteria:
  - users can enter a single governed workspace and resolve current site/version context deterministically
  - all mutation-capable actions are policy-gated and auditable
- Blocked By: none (foundation phase).
- Risk Level: Medium.
- Current State: partial implementation exists (`apps/platform/src/workspace/*`, auth/RBAC foundations, site workspace read model), but not yet fully aligned to Twin-first operational UX.
- Implementation Priority: P0.

## Phase B: Canonical Model Runtime
- Purpose: turn canonical content/design/experience specifications into executable ingestion, validation, and storage runtime contracts.
- Dependencies: Phase A workspace context, import/template intake, canonical model specs.
- Required Architecture Documents:
  - `docs/architecture/CANONICAL_CONTENT_MODEL.md`
  - `docs/architecture/CANONICAL_DESIGN_MODEL.md`
  - `docs/architecture/CANONICAL_EXPERIENCE_MODEL.md`
  - `docs/architecture/GNR8 Canonical Data Model Spec.md`
  - `docs/architecture/GNR8 Canonical Layout Model Spec.md`
- Deliverables:
  - canonical model schema/version contracts
  - deterministic model construction pipeline from import evidence
  - model integrity checks and persistence/read APIs
- Success Criteria:
  - every imported site yields versioned canonical models with deterministic rebuild behavior
  - model validation failures are diagnosable and block downstream runtime safely
- Blocked By: Phase A completion for operator routing and lifecycle control.
- Risk Level: High.
- Current State: strong import/template/runtime building blocks exist, but end-to-end canonical runtime contract and lifecycle enforcement are not fully complete.
- Implementation Priority: P0.

## Phase C: Digital Twin Runtime
- Purpose: materialize the Website Digital Twin as a runtime entity generated from canonical models and operating state.
- Dependencies: Phase B canonical model runtime, twin generation architecture, identity/version contracts.
- Required Architecture Documents:
  - `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
  - `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
  - `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- Deliverables:
  - twin identity + storage schema (`twinId`, `siteId`, `versionId`, status, timestamps)
  - twin generation jobs (initial/manual/scheduled/event-driven)
  - workspace overview API that resolves current twin state
- Success Criteria:
  - each active site version has a resolvable governed twin snapshot
  - twin refresh is repeatable, observable, and non-destructive
- Blocked By: Phase B deterministic model outputs.
- Risk Level: High.
- Current State: architecture is complete and explicit that runtime is not implemented; selected runtime primitives exist but no complete twin runtime path.
- Implementation Priority: P0.

## Phase D: Observation Engine
- Purpose: convert raw website/twin signals into governed observations, insights, and recommendation-ready outputs.
- Dependencies: Phase C twin runtime, telemetry/event capture, signal extraction pipelines.
- Required Architecture Documents:
  - `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`
  - `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
  - `docs/architecture/GNR8 Observability Architecture Spec.md`
- Deliverables:
  - signal collectors across content/design/experience/governance/operations
  - observation classification + severity model
  - score surface computation (website/content/design/experience/governance/operations)
- Success Criteria:
  - governed observation objects are produced from live twin evidence
  - score surfaces update reproducibly and are queryable in workspace
- Blocked By: Phase C twin identity/state + evidence pipeline.
- Risk Level: High.
- Current State: first deterministic observation runtime milestone and first deterministic insight runtime milestone are complete (`Twin Observation Runtime v1`, `Twin Insight Runtime v1`), with recommendation/optimization progression still pending.
- Implementation Priority: P1.

## Phase E: Optimization Engine
- Purpose: convert observations into prioritized optimization opportunities and proposal candidates without direct mutation.
- Dependencies: Phase D observations/scores, governance constraints, provider constraints.
- Required Architecture Documents:
  - `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`
  - `docs/architecture/GNR8 Optimization Engine Architecture Blueprint.md`
  - `docs/architecture/GNR8 Proposal Artifact Spec.md`
  - `docs/architecture/GNR8 Mutation Engine Spec.md`
- Deliverables:
  - optimization opportunity generator and prioritization policy
  - proposal candidate artifact builder
  - confidence/impact/risk scoring for ranked opportunities
- Success Criteria:
  - observation-to-opportunity progression is deterministic, auditable, and policy-aware
  - no optimization can bypass proposal + approval flow
- Blocked By: Phase D observation outputs.
- Risk Level: High.
- Current State: architecture complete; partial AI/optimization scaffolding exists, but no full governed optimization runtime.
- Implementation Priority: P1.

## Phase F: AI Editor
- Purpose: provide governed human+AI editing flows that produce proposals against canonical models/twin context.
- Dependencies: Phases B/C/E, proposal schema, workspace action governance.
- Required Architecture Documents:
  - `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
  - `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
  - `docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md`
- Deliverables:
  - editor intent modes (human-assisted, AI-assisted, AI-suggested)
  - proposal-first editing commands bound to canonical model targets
  - preview + diff + rationale surfaces before approval
- Success Criteria:
  - AI can generate governed proposal artifacts but cannot publish or mutate directly
  - editors can create, compare, and submit proposals with full lineage
- Blocked By: Phase E ranked opportunities (for optimization-driven editing) and Phase B model target contracts.
- Risk Level: Medium-High.
- Current State: architecture-only baseline (explicit in current state), with AI modules present but not integrated as governed editor runtime.
- Implementation Priority: P1.

## Phase G: Governed Publish
- Purpose: enforce approval, versioning, publish, rollback, and provider execution governance to ship changes safely.
- Dependencies: Phases A/B/F for governed proposals and version identity; provider orchestration/publish contracts.
- Required Architecture Documents:
  - `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`
  - `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`
  - `docs/architecture/GNR8 Runtime Engine Spec.md`
  - `docs/architecture/PROVIDER_ORCHESTRATION_CONTRACT.md`
  - `docs/architecture/GNR8 Runtime Diff Governance Interaction Spec.md`
- Deliverables:
  - approval-to-version-to-publish state machine
  - publish enforcement/activation guards + rollback execution
  - provider handoff governance and execution evidence logging
- Success Criteria:
  - only approved, versioned artifacts can publish
  - rollback path is tested and can be executed under policy
  - publish audit trail is complete end-to-end
- Blocked By: proposal and version integrity from earlier phases.
- Risk Level: Medium.
- Current State: comparatively advanced; publish/approve/readiness routes and provider governance components exist, but must be unified with Twin/Observation/Optimization lifecycle.
- Implementation Priority: P0.

## Phase H: Website Evolution Engine
- Purpose: close the autonomous loop across observe -> optimize -> edit -> approve -> publish -> observe.
- Dependencies: Phases C through G operational and reliable.
- Required Architecture Documents:
  - `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
  - `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
  - `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`
  - `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`
- Deliverables:
  - lifecycle orchestrator with stage transitions and safety gates
  - scheduled/event-driven evolution cycles
  - learning loop signals, drift detection, and policy-bounded auto-recommendation
- Success Criteria:
  - runtime can continuously evolve websites through governed cycles without bypassing approvals
  - lifecycle telemetry proves stability and measurable improvement over cycles
- Blocked By: all prior phases.
- Risk Level: High.
- Current State: architecture-first and partial AI/orchestration scaffolding; no full lifecycle runtime.
- Implementation Priority: P2.

## Path To First Operational Website OS Runtime
The first operational runtime should target a **Phase A -> B -> C -> G** vertical slice first, then add D/E/F, and finalize H:
- Milestone 1 (Operational Foundation): A + B
- Milestone 2 (Twin Operationalization): C
- Milestone 3 (First Governed Runtime): G
  - Result: first production-capable Website OS loop for governed proposal publishing on twin-backed versions.
- Milestone 4 (Intelligence Activation): D + E
- Milestone 5 (AI-Native Editing): F
- Milestone 6 (Continuous Evolution): H

This preserves governance and publish safety early, while progressively activating intelligence and autonomous evolution.

### First Visible Twin Checkpoint
Before Milestone 3, execute the first-operational Twin checkpoint defined in:
- `docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md`

Checkpoint dependency path:
- Phase A readiness (workspace context + overview surface)
- Phase B readiness (deterministic canonical models)
- Phase C minimal runtime slice (identity/snapshot/build/store/view)

Checkpoint outcome:
- GNR8 has the first operational runtime representation of a website visible in Workspace Overview.

Latest completed canonical runtime milestone (2026-06-02):
- `Approval Queue Preview Runtime v1`
- completion date:
  - `2026-06-02`
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-approval-queue-preview.ts`
  - `apps/platform/gnr8/runtime/twin/twin-approval-queue-preview.test.ts`
- implemented function:
  - `generateTwinApprovalQueueItems(approvalStates, proposalCandidates)`
- approval queue item fields:
  - `queueId`
  - `proposalId`
  - `proposalTitle`
  - `approvalState`
  - `queueRank`
  - `queuePriority`
  - `optimizationScore`
  - `governanceState`
  - `executionAllowed`
  - `mutationAllowed`
  - `publishingAllowed`
  - `providerExecutionAllowed`
  - `summary`
- verified deployed Approval Queue for `Transporti Maver`:
  - `#1 Improve Homepage Conversion Flow`
    - `queuePriority`: `high`
    - `optimizationScore`: `390`
    - `approvalState`: `pending_review`
  - `#2 Improve Homepage Quality and Messaging`
    - `queuePriority`: `medium`
    - `optimizationScore`: `340`
    - `approvalState`: `pending_review`
  - `#3 Maintain Read-Only Validation Mode`
    - `queuePriority`: `medium`
    - `optimizationScore`: `320`
    - `approvalState`: `pending_review`
- governance values:
  - `executionAllowed`: `false`
  - `mutationAllowed`: `false`
  - `publishingAllowed`: `false`
  - `providerExecutionAllowed`: `false`
  - `governanceState`: `approval_queue_preview_only`
- diagnostics:
  - `TWIN_APPROVAL_QUEUE_PREVIEW_STARTED`
  - `TWIN_APPROVAL_QUEUE_PREVIEW_COMPLETED`
- preserved boundaries:
  - no approval workflow
  - no approval state changes
  - no approve action
  - no reject action
  - no review action
  - no request approval action
  - no execution
  - no publishing
  - no provider execution
  - no mutation execution
  - no AI model calls
  - read-only deterministic queue preview only
- conclusion:
  - Workspace Planning Console now displays a deterministic Approval Queue derived from Approval State records and ranked Proposal Candidates.
- architecture chain:
  - `Persisted Migration OS Evidence -> Digital Twin -> Observation Runtime -> Insight Runtime -> Recommendation Runtime -> Optimization Runtime -> Optimization Scoring Runtime -> Proposal Candidate Runtime -> Proposal Approval Preview Runtime -> Proposal Approval Runtime -> Approval State Runtime -> Approval Queue Preview Runtime -> Execution Plan Preview Runtime -> Execution Artifact Preview Runtime -> Workspace Planning Console`

Prior completed canonical runtime dependency:
- `Approval State Runtime v1`
- completion date:
  - `2026-06-01`
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-approval-state.ts`
  - `apps/platform/gnr8/runtime/twin/twin-approval-state.test.ts`
- implemented function:
  - `generateTwinApprovalStateRecords(approvalRecords)`
- approval state model:
  - `TwinApprovalState`
  - `approval_required`
  - `pending_review`
  - `ready_for_future_approval`
- current runtime emission:
  - `pending_review` only
  - future state support exists through typing/contracts only
- approval state record fields:
  - `approvalId`
  - `proposalId`
  - `proposalTitle`
  - `approvalState`
  - `requiredApprovals`
  - `receivedApprovals`
  - `approvalComplete`
  - `executionAllowed`
  - `mutationAllowed`
  - `publishingAllowed`
  - `providerExecutionAllowed`
  - `governanceState`
  - `summary`
- verified deployed approval state records for `Transporti Maver`:
  - `proposalTitle`: `Improve Homepage Conversion Flow`
  - `approvalState`: `pending_review`
  - `requiredApprovals`: `1`
  - `receivedApprovals`: `0`
  - `approvalComplete`: `false`
  - `governanceState`: `approval_state_preview_only`
  - all deployed approval state records currently share identical `governanceState`
- diagnostics:
  - `TWIN_APPROVAL_STATE_STARTED`
  - `TWIN_APPROVAL_STATE_COMPLETED`
- preserved boundaries:
  - no approval workflow
  - no approve action
  - no reject action
  - no request-review action
  - no execution
  - no provider execution
  - no publishing
  - no mutation execution
  - no AI model calls
  - read-only deterministic state modeling only
- conclusion:
  - Workspace Planning Console now displays deterministic Approval State records derived from Proposal Approval Records.
  - Approval governance modeling now exists independently from approval workflow execution.
- architecture chain:
  - `Persisted Migration OS Evidence -> Digital Twin -> Observation Runtime -> Insight Runtime -> Recommendation Runtime -> Optimization Runtime -> Optimization Scoring Runtime -> Proposal Candidate Runtime -> Proposal Approval Preview Runtime -> Proposal Approval Runtime -> Approval State Runtime -> Approval Queue Preview Runtime -> Execution Plan Preview Runtime -> Execution Artifact Preview Runtime -> Workspace Planning Console`

- `Proposal Candidate Operator UX Cleanup v1`
- completion date:
  - `2026-06-01`
- Workspace Overview hierarchy:
  - `Overview`
  - `Proposal Candidates`
  - `Optimization Ranking`
  - `Validation Surfaces`
  - `Provider Governance Snapshot`
  - `Explicit Boundaries`
  - `Advanced Runtime Analysis`
- operator-facing behavior:
  - `Proposal Candidates` is the primary operator-facing section.
  - `Advanced Runtime Analysis` is collapsed by default.
  - `Advanced Runtime Analysis` includes `Observations`, `Insights`, `Recommendations`, `Optimization Opportunities`, `Debug Diagnostics`, and `Twin Source chain`.
- visible operator-facing deployed sections for `Transporti Maver`:
  - `Proposal Candidates`
  - `Optimization Ranking`
  - `Provider Governance Snapshot`
  - `Explicit Boundaries`
- preserved boundaries:
  - no runtime logic changes
  - no proposal generation changes
  - no approval workflow
  - no API changes
  - no database changes
  - no execution controls
  - no approve/reject controls
  - no publish controls
  - no AI action controls
- validation:
  - workspace overview tests passed
  - next build passed
- conclusion:
  - Workspace Overview now behaves as an operator-first Website OS console rather than a runtime/debug transcript.
- success criteria:
  - future bootstrap resumes from Proposal Candidate Operator UX Cleanup v1 as the canonical Workspace Overview UX baseline.

- `Website OS Proposal Candidate Runtime v1`
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
- conclusion:
  - Workspace Overview now displays read-only, non-executable Proposal Candidates derived from ranked Optimization Opportunities.

- `Optimization Scoring Runtime v1`
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
- verified deployed ranking for `Transporti Maver`:
  - `#1 Homepage Conversion Review totalScore=390`
  - `#2 Homepage Quality Improvement totalScore=340`
  - `#3 Validation Stability Preservation totalScore=320`
  - `#4 Design Evidence Collection totalScore=270`
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
- conclusion:
  - Workspace Overview now displays deterministic ranked optimization opportunities derived from optimization scoring.

- `Persisted Migration OS Evidence -> Digital Twin -> Observation Runtime -> Insight Runtime -> Recommendation Runtime -> Optimization Runtime -> Optimization Scoring Runtime -> Proposal Candidate Runtime -> Proposal Approval Preview Runtime -> Proposal Approval Runtime -> Approval State Runtime -> Approval Queue Preview Runtime -> Execution Plan Preview Runtime -> Execution Artifact Preview Runtime -> Workspace Planning Console`
- verified runtime chain:
  - Persisted Migration OS runtime evidence
  - `buildWebsiteDigitalTwin()`
  - `generateTwinObservations(twin)`
  - `generateTwinInsights(observations)`
  - `generateTwinRecommendations(insights)`
  - `generateTwinOptimizationOpportunities(recommendations)`
  - `scoreOptimizationOpportunities(opportunities)`
  - `generateTwinProposalCandidates(input)`
  - `generateTwinProposalApprovalPreviews(candidates)`
  - `generateTwinExecutionPlanPreviews(approvalPreviews)`
  - Workspace Overview UI
- verified deployed runtime values:
  - `selectedSource`: `persisted_runtime_import_evidence`
  - `persistedEvidenceSelected`: `true`
  - `persistedEvidenceReason`: `persisted_runtime_evidence_selected`
  - `persistedEvidenceShapeStatus`: `valid`
  - `providerState`: `persisted/runtime-import-evidence`
- verified imported site:
  - `title`: `Transporti Maver d.o.o.`
  - `siteVersionId`: `88253466-783e-4484-8b68-df6c83b8a11c`
  - `importId`: `maver-reimport-1778654629704-63c7fcad`
  - evidence-derived summaries: `pages=2`, `sections=1`, `homepagePath=index.html`
- successful diagnostics:
  - `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_SUCCEEDED`
  - `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_VALID`
  - `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SELECTED`
- bootstrap state:
  - future bootstrap resumes from `Persisted Migration OS Evidence -> Website OS Workspace Overview` as completed.

Recommended next milestone:
- Execution Readiness Runtime v1
