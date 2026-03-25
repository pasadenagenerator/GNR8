GNR8 Migration Data Contracts Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Defines deterministic data interfaces between all migration engine stages

Depends On:
	•	GNR8 Migration Architecture Blueprint
	•	GNR8 Canonical Data Model Spec
	•	GNR8 Layout Graph Spec
	•	GNR8 Artifact Lifecycle & Storage Spec
	•	GNR8 Migration Governance Spec
	•	GNR8 Runtime Engine Spec

⸻

1. Purpose

Migration Data Contracts define the strict interface boundaries between all deterministic stages of the GNR8 Migration Engine.

They ensure:
	•	deterministic execution
	•	explainable state transitions
	•	replayability
	•	safe parallelization
	•	agent interoperability
	•	optimizer safety isolation

They are the type system of migration reality.

Without contracts → migration becomes heuristic chaos.

⸻

2. Contract Philosophy

Migration contracts must be:
	•	immutable once emitted
	•	versioned
	•	backward compatible
	•	human readable
	•	machine enforceable
	•	structurally explicit
	•	semantically constrained

Contracts must NEVER:
	•	contain inferred redesign decisions
	•	contain runtime state mutation
	•	contain optimizer-generated structure
	•	embed unverified AI output

Contracts describe:

→ what WAS reconstructed
not
→ what SHOULD exist

⸻

3. Core Migration Data Flow

Deterministic pipeline contracts:

Source URL
  ↓
SnapshotBundle
  ↓
LayoutGraph
  ↓
StructuralPlan
  ↓
SemanticSections
  ↓
CanonicalPageModel
  ↓
ArtifactBundle
  ↓
RuntimeBinding

Each arrow is a formal contract boundary.

⸻

4. SnapshotBundle Contract

Represents captured source truth.

SnapshotBundle {
  snapshotId
  siteId
  createdAt

  htmlDocuments[]
  assetManifest[]
  navigationGraph

  captureDiagnostics
}

HTML Document Contract:

HtmlDocument {
  url
  normalizedUrl
  rawHtml
  domHash
  assetRefs[]
}

Constraints:
	•	rawHtml immutable
	•	normalization deterministic
	•	no structural interpretation allowed

⸻

5. LayoutGraph Contract

Represents structural interpretation of DOM.

LayoutGraph {
  graphId
  snapshotId

  rootNode
  nodeIndex: Map<nodeId, LayoutNode>

  anomalies[]
  diagnostics
}

LayoutNode:

LayoutNode {
  id
  parentId
  domPath
  nodeType

  signals {
    textDensity
    imageDensity
    linkDensity
    headingPresence
    clusterConfidence
  }

  children[]
}

Constraints:
	•	must preserve DOM lineage
	•	must be deterministic
	•	cannot collapse regions heuristically
	•	must expose anomalies

⸻

6. StructuralPlan Contract

Defines reconstructed structural intent.

StructuralPlan {
  planId
  layoutGraphId

  regions[]
  structuralConfidence
  anomalies[]
}

Region:

StructuralRegion {
  id
  intent
  domSpan
  nodeRefs[]
  confidence
}

Intent values:
	•	header_nav
	•	hero
	•	body
	•	gallery_media
	•	form_contact
	•	footer_legal
	•	unknown

Constraints:
	•	cannot invent regions
	•	must be traceable to layout graph
	•	confidence must be explainable

⸻

7. SemanticSections Contract

Adds meaning without changing structure.

SemanticSections {
  semanticId
  structuralPlanId

  sections[]
}

Section:

SemanticSection {
  regionId
  semanticType
  semanticConfidence

  signals {
    ctaPresence
    businessIntent
    productSignals
    informationalWeight
  }
}

Constraints:
	•	semantics cannot change region boundaries
	•	semantics cannot reorder structure
	•	semantics enhance interpretation only

⸻

8. CanonicalPageModel Contract

Unified migration truth model.

CanonicalPageModel {
  pageId
  snapshotId

  sections[]
  layoutStructuralMetadata
  semanticMetadata

  pageStructuralConfidence
  anomalies[]
}

Canonical Section:

CanonicalSection {
  id
  structuralIntent
  semanticType

  domLineage
  layoutConfidence
  semanticConfidence

  canonicalContentModel
}

Constraints:
	•	must preserve deterministic order
	•	must maintain lineage to snapshot
	•	must be render-agnostic

⸻

9. ArtifactBundle Contract

Represents deployable runtime artifact.

ArtifactBundle {
  artifactId
  siteId
  versionId

  htmlByPath
  assetMap
  routingMap

  artifactDiagnostics
}

Constraints:
	•	immutable
	•	reproducible from canonical model
	•	environment-independent
	•	no AI mutation allowed

⸻

10. RuntimeBinding Contract

Connects artifact to runtime environment.

RuntimeBinding {
  bindingId
  artifactId

  host
  pathScope

  bindingKind
  status
}

Binding kinds:
	•	shadow
	•	canary
	•	production

Constraints:
	•	runtime resolution must be deterministic
	•	binding changes must be auditable
	•	artifact cannot mutate post binding

⸻

11. Confidence Data Contract

Confidence must be:
	•	composable
	•	explainable
	•	traceable

StructuralConfidence {
  score
  components {
    domIntegrity
    signalStrength
    boundaryClarity
    densityCoherence
    semanticAgreement
  }
  anomalies[]
}

Confidence drives:
	•	migration governance
	•	rollout policy
	•	operator review priority

⸻

12. Migration Diagnostics Contract

Every stage must emit:

MigrationDiagnostics {
  stage
  anomalies[]
  confidenceMetrics
  executionTime
  lineageRefs
}

Diagnostics must enable:
	•	replay
	•	diffing
	•	debugging
	•	benchmarking

⸻

13. Contract Versioning Model

All contracts must include:

contractVersion
schemaVersion
compatibilityRange

Rules:
	•	forward compatible readers
	•	backward compatible writers
	•	migrations must be version-aware

⸻

14. Contract Safety Rules

Contracts must NEVER:
	•	contain runtime mutation state
	•	contain optimization proposals
	•	contain UI representation data
	•	contain agent execution state
	•	embed raw external system metadata

Contracts are:

Pure migration truth.

⸻

15. AI Boundary Enforcement

AI may:
	•	interpret
	•	classify
	•	suggest

AI may NOT:
	•	define contracts
	•	mutate canonical structure
	•	generate artifact truth
	•	alter lineage data

Contracts protect system determinism.

⸻

16. Founder Directive

Data Contracts define whether:

GNR8 becomes:

A tool
or
Global migration infrastructure.

If contracts break:

System becomes non-deterministic.

If contracts hold:

Migration becomes a computable science.

This document defines the mathematical integrity of migration reality.