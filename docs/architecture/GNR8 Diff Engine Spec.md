# GNR8 Diff Engine Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Canonical Diff System + Operator Evidence Layer
Depends On:
- GNR8 Canonical Layout Model Spec
- GNR8 Mutation Engine Spec
- GNR8 Proposal Artifact Spec
- GNR8 Migration Quality Gate Architecture

---

## 1. Purpose

The Diff Engine defines how GNR8 measures change.

Its role is to:

- compare canonical states (before vs after)
- produce structured, explainable change evidence
- enable safe operator approval
- support governance enforcement
- support rollback decisions
- provide AI explainability grounding

The Diff Engine is the truth layer of change visibility.

If the Mutation Engine performs change,
the Diff Engine explains change.

---

## 2. Core Principle

Diff must be canonical, not visual-only.

GNR8 does not diff:

- raw HTML
- rendered screenshots only
- builder schema
- runtime DOM snapshots

GNR8 diffs:

- canonical graph state

Visual diff is a derived layer, not the primary truth.

---

## 3. Diff Scope

Diff Engine must support:

- PageVersion diff
- SiteVersion diff
- Proposal vs baseline diff
- Migration diff (source vs canonical)
- Optimization diff (proposal vs baseline)
- Rollout diff (shadow vs production)

---

## 4. Diff Targets

Diff Engine must operate on:

- Layout Graph
- Content Graph
- Semantic Graph
- Navigation Graph
- Style Token Graph
- Asset Graph
- Interaction Graph

Each graph has its own diff semantics.

---

## 5. Diff Output Philosophy

Diff output must be:

- deterministic
- structured
- explainable
- operator-readable
- machine-consumable
- governance-compatible

Diff must never rely solely on:

- pixel similarity
- heuristic screenshot diff
- DOM string comparison

---

## 6. Diff Execution Inputs

Minimum required inputs:

```md
DiffExecutionInput:
  diffId
  diffScope
  baselineVersionRef
  targetVersionRef
  proposalRef (optional)
  diffMode
  executionContext

diffScope enum

PAGE
SITE
PROPOSAL
MIGRATION
ROLLOUT

diffMode enum

STRUCTURAL
CONTENT
SEMANTIC
STYLE
ASSET
NAVIGATION
FULL


⸻

7. Diff Output Structure

Diff Engine must produce:

DiffResult:
  diffId
  baselineRef
  targetRef
  changeSummary
  structuralDiff
  contentDiff
  semanticDiff
  styleDiff
  assetDiff
  navigationDiff
  interactionDiff
  visualDiffRef
  riskScore
  riskFactors[]
  confidenceScore
  explainabilityBundle


⸻

8. Structural Diff

Structural diff compares:
	•	section ordering
	•	section grouping
	•	layout composition
	•	region presence
	•	region hierarchy
	•	layout boundaries

Structural diff must detect:
	•	hero moved
	•	nav merged into body
	•	footer removed
	•	gallery collapsed
	•	section split/merge
	•	layout depth changes

Structural diff output:

StructuralDiff:
  addedSections[]
  removedSections[]
  reorderedSections[]
  mergedSections[]
  splitSections[]
  hierarchyChanges[]
  boundaryConfidenceDelta


⸻

9. Content Diff

Content diff compares:
	•	text nodes
	•	headings
	•	CTA text
	•	content block density
	•	language changes
	•	duplication removal

Content diff output:

ContentDiff:
  textChanges[]
  headingChanges[]
  addedContentBlocks[]
  removedContentBlocks[]
  rewrittenContentBlocks[]
  languageShiftDetected
  densityDelta


⸻

10. Semantic Diff

Semantic diff compares:
	•	section intent classification
	•	hero identity changes
	•	CTA intent changes
	•	contact block identity
	•	product/service meaning shifts

Semantic diff output:

SemanticDiff:
  intentChanges[]
  heroIntentChange
  CTAIntentChanges[]
  contactSemanticsDelta
  businessMeaningShiftScore


⸻

11. Style Token Diff

Style diff compares canonical design tokens:
	•	color palette
	•	typography system
	•	spacing rhythm
	•	component styling
	•	visual hierarchy tokens

Output:

StyleDiff:
  colorChanges[]
  typographyChanges[]
  spacingChanges[]
  componentTokenChanges[]
  brandConstraintViolations[]


⸻

12. Asset Diff

Asset diff compares:
	•	hero images
	•	logo usage
	•	gallery composition
	•	asset preference variants
	•	asset duplication

Output:

AssetDiff:
  addedAssets[]
  removedAssets[]
  swappedAssets[]
  heroImageChange
  logoUsageChange
  galleryDelta


⸻

13. Navigation Diff

Navigation diff compares:
	•	nav structure
	•	nav ordering
	•	link targets
	•	footer nav structure
	•	information architecture

Output:

NavigationDiff:
  addedNavItems[]
  removedNavItems[]
  reorderedNavItems[]
  linkTargetChanges[]
  IAComplexityDelta


⸻

14. Interaction Diff

Interaction diff compares:
	•	form presence
	•	CTA behavior
	•	interactive components
	•	conversion paths

Output:

InteractionDiff:
  addedInteractions[]
  removedInteractions[]
  CTAFlowChanges[]
  formBehaviorChanges[]


⸻

15. Visual Diff Layer

Visual diff is secondary but important.

It may include:
	•	screenshot comparison
	•	layout bounding box diff
	•	typography visual change detection
	•	spacing variance detection

Visual diff must never be the primary approval signal.

It must reference canonical diff.

Output:

VisualDiff:
  screenshotBaselineRef
  screenshotTargetRef
  pixelDeltaScore
  layoutBoxDelta
  visualAnomalies[]


⸻

16. Risk Scoring Model

Diff Engine must compute:

riskScore in [0..1]

Based on:
	•	structural volatility
	•	semantic shifts
	•	brand constraint violations
	•	navigation disruption
	•	conversion path impact
	•	content meaning drift

Example risk categories:

LOW
MEDIUM
HIGH
CRITICAL

⸻

17. Confidence Scoring

Diff must include confidence:

confidenceScore in [0..1]

Confidence measures:
	•	diff signal strength
	•	graph completeness
	•	structural clarity
	•	semantic stability

Low confidence diffs must trigger:
	•	REVIEW_ONLY enforcement
	•	operator inspection requirement

⸻

18. Explainability Bundle

Diff must include machine-readable explainability.

ExplainabilityBundle:
  primaryChangeDrivers[]
  affectedRegions[]
  highRiskMutations[]
  semanticMeaningSummary
  conversionImpactSummary
  brandImpactSummary

This powers:
	•	operator UX
	•	governance enforcement
	•	AI training feedback loops

⸻

19. Diff Determinism Rule

Diff execution must be deterministic.

Given identical:
	•	baseline version
	•	target version
	•	diff mode

Diff result must be identical.

No stochastic visual heuristics may dominate canonical diff.

⸻

20. Diff Storage Model

Diff results must be:
	•	immutable
	•	version-linked
	•	proposal-linked
	•	mutation-linked
	•	rollback-linked

Diff records must be queryable.

⸻

21. Diff Engine and Governance

Governance uses Diff Engine outputs to:
	•	allow shadow rollout
	•	allow canary rollout
	•	allow production rollout
	•	block rollout
	•	require review

Diff riskScore and confidenceScore directly feed:
	•	Migration Quality Gates
	•	Rollout Policies
	•	Enforcement Decisions

⸻

22. Diff Engine and Operator UX

Operator must see:
	•	what changed
	•	where it changed
	•	why it changed
	•	how risky it is
	•	how confident the system is
	•	what action is recommended

Diff Engine must provide all data required for:
	•	side-by-side compare
	•	structural mismatch badges
	•	semantic change alerts
	•	brand violation warnings

⸻

23. Diff Engine and AI

AI uses Diff Engine outputs to:
	•	learn safe mutation patterns
	•	evaluate optimization outcomes
	•	predict rollout success
	•	detect regression risk
	•	improve proposal generation

Diff Engine is a core feedback loop input.

⸻

24. Rollback Compatibility

Diff Engine must support rollback reasoning.

Rollback decision requires:
	•	diff risk context
	•	structural change magnitude
	•	semantic impact
	•	conversion impact signals

Diff must enable:

“Is rollback safer than forward fix?”

⸻

25. Migration Diff Mode

Special migration diff compares:
	•	source snapshot structure
	•	canonical reconstructed structure

This powers:
	•	migration quality scoring
	•	layout reconstruction validation
	•	operator trust calibration

Migration diff is critical for:

GNR8 becoming the best migration engine.

⸻

26. Proposal Diff Mode

Proposal diff compares:
	•	baseline canonical
	•	proposed canonical

Before mutation execution.

This is the primary approval diff.

⸻

27. Rollout Diff Mode

Rollout diff compares:
	•	shadow artifact vs production artifact
	•	canary artifact vs production artifact

Used to detect:
	•	runtime regressions
	•	unexpected behavior shifts
	•	real-world content drift

⸻

28. Anti-Patterns (Forbidden)

Diff Engine must never degrade into:
	•	screenshot-only diff tool
	•	DOM diff tool
	•	builder diff proxy
	•	runtime hotfix detector
	•	AI hallucination validator

It must remain canonical-first.

⸻

29. Founder Directive

The Diff Engine is what makes AI evolution safe.

Without diff:
	•	mutation is blind
	•	governance is weak
	•	operator trust collapses

With strong diff:
	•	GNR8 becomes auditable AI evolution infrastructure
	•	migration becomes provably correct
	•	optimization becomes provably safe