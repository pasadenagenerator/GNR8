# GNR8 Canonical Data Model Spec

Status: DRAFT  
Owner: GNR8 Core Architecture  
Scope: Universal canonical representation for migrated, generated, and optimized websites  
Applies To:
- Migration Engine
- Runtime Engine
- AI Optimizer
- Diff Engine
- Governance Engine
- Proposal System

---

## 1. Purpose

The Canonical Data Model (CDM) defines the single source of structural truth inside GNR8.

It represents:

- site structure
- layout structure
- semantic structure
- content structure
- design tokens
- interaction logic
- runtime behavior metadata

All engines must read/write through CDM.

CDM is:

Not a CMS schema  
Not a page builder schema  
Not a database schema  

It is:

A structural reality model of a website.

---

## 2. Core Design Principles

CDM must be:

Deterministic  
Composable  
Layout-aware  
Semantic-aware  
Mutation-safe  
Diff-friendly  
Migration-stable  
Runtime-efficient  
AI-interpretable  

CDM must never:

Contain raw HTML as authoritative truth.

---

## 3. Canonical Object Hierarchy

```md id="h01cdo"
Site
 ├── Pages[]
 │    ├── Sections[]
 │    │     ├── Blocks[]
 │    │     │     ├── Nodes[]
 │    │     │     │     └── ContentAtoms[]

Each level carries:
	•	structural metadata
	•	semantic intent
	•	confidence signals
	•	layout signals
	•	governance signals

⸻

4. Site Object

CanonicalSite {
  id
  domainBindings[]
  designSystem
  navigationModel
  layoutModel
  analyticsModel
  governanceState
  migrationDiagnostics
  optimizerState
  rolloutState
  runtimeState
}

Site contains global invariants.

⸻

5. Page Object

CanonicalPage {
  id
  path
  title
  layoutGraphRef
  sections[]
  pageStructuralConfidence
  semanticModel
  pageIntent
  routingBehavior
  seoModel
  migrationDiagnostics
}

Page is:

Structural execution boundary.

⸻

6. Section Object

Section represents:

Layout region with semantic intent.

CanonicalSection {
  id
  intent
  structuralConfidence
  layoutGroupId
  order
  blocks[]
  responsiveBehavior
  visualHierarchy
  mutationPolicy
}

Possible intents:
	•	header
	•	hero
	•	content
	•	gallery
	•	form
	•	nav
	•	footer
	•	legal
	•	unknown

⸻

7. Block Object

Block represents:

Functional content cluster.

CanonicalBlock {
  id
  type
  semanticRole
  layoutRole
  contentModel
  interactionModel
  visualModel
  mutationSafety
  aiOptimizationHints
}

Block examples:
	•	text cluster
	•	image cluster
	•	CTA cluster
	•	card grid
	•	form container
	•	navigation group

⸻

8. Node Object

Node represents:

Lowest layout element.

CanonicalNode {
  id
  nodeType
  layoutConstraints
  styleTokens
  contentAtoms[]
  interactionHooks[]
}

Node types:
	•	container
	•	text
	•	media
	•	button
	•	input
	•	icon
	•	link
	•	structural wrapper

⸻

9. Content Atom

Smallest semantic unit.

ContentAtom {
  id
  type
  value
  language
  semanticWeight
  originTrace
}

Atom types:
	•	text
	•	image
	•	video
	•	link
	•	structured data
	•	CTA intent

⸻

10. Layout Graph Relationship

CDM references Layout Graph.

Layout Graph:

Structural detection model.

CDM:

Structural execution model.

They must stay decoupled.

⸻

11. Semantic Model Layer

Each level may contain:

SemanticModel {
  intentConfidence
  semanticClusters
  contentThemes
  conversionRole
  trustSignals
}

Semantic layer is:

AI-readable representation of meaning.

⸻

12. Design System Layer

CDM stores design tokens:

DesignSystem {
  colorTokens
  typographyTokens
  spacingTokens
  motionTokens
  componentTokens
  CGPConstraints
}

This enables:
	•	safe redesign
	•	generator mode
	•	optimizer proposals

⸻

13. Interaction Model

InteractionModel {
  events[]
  behaviors[]
  formFlows[]
  navigationFlows[]
  conversionFlows[]
}

Runtime engine consumes this.

⸻

14. Governance Metadata

Every object can contain:

GovernanceMetadata {
  mutationAllowed
  mutationRisk
  rolloutEligibility
  auditTrail
}

This ensures:

AI cannot mutate unsafe regions.

⸻

15. Migration Diagnostics

CDM embeds migration signals:

MigrationDiagnostics {
  structuralConfidence
  anomalySignals[]
  weakRegions[]
  migrationGateState
  rolloutPolicyState
  enforcementState
}

This keeps migration truth persistent.

⸻

16. Optimizer Metadata

OptimizerState {
  optimizationOpportunities[]
  proposalHistory[]
  simulationResults[]
  performanceSignals[]
}

Optimizer reads CDM.

⸻

17. Runtime Metadata

RuntimeState {
  activeVersion
  artifactBindings
  performanceTelemetry
  errorSignals
}

Runtime must not mutate structure.

⸻

18. Diff Compatibility

CDM must support:
	•	structural diff
	•	semantic diff
	•	visual diff
	•	governance diff

Diff granularity:

Site → Page → Section → Block → Node → Atom

⸻

19. Mutation Safety Rules

Mutation can occur only if:
	•	governance allows
	•	diff safety passes
	•	structural confidence not degraded
	•	rollout stage permits

CDM must track:

Mutation lineage.

⸻

20. Generator Compatibility

CDM must support:

AI-generated layouts.

Generator must output:

Valid CDM graph.

Migration and Generator must converge.

⸻

21. Performance Requirements

CDM must be:

Serializable
Incrementally loadable
Edge-executable
Partial hydration capable

⸻

22. Future Extensions

CDM must support:
	•	multi-experience sites
	•	personalization layers
	•	agent-driven commerce
	•	voice interfaces
	•	immersive layouts
	•	multi-brand systems

⸻

23. Founder Directive

Canonical Model is:

The DNA of the website.

Migration writes DNA.
Runtime expresses DNA.
Optimizer evolves DNA.
Diff understands DNA.
Governance protects DNA.