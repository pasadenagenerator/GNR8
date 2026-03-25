GNR8 Layout Graph Specification

1. Purpose

The Layout Graph is the deterministic structural perception layer of the GNR8 Migration Engine.

Its role is to convert raw DOM / snapshot HTML into a structured, machine-interpretable representation of:
	•	spatial hierarchy
	•	semantic regions
	•	structural boundaries
	•	layout clusters
	•	content density relationships

The Layout Graph is NOT:
	•	a semantic interpretation layer
	•	a rendering model
	•	a visual diff model
	•	a canonical content representation

It is:

→ a structural perception model

This enables:
	•	deterministic migration
	•	layout-faithful reconstruction
	•	semantic reconstruction grounding
	•	visual diff correctness
	•	AI optimization safety

Without Layout Graph:

Migration degenerates into:
	•	heuristic scraping
	•	AI hallucination
	•	structural collapse
	•	layout drift

⸻

2. Design Principles

2.1 Deterministic First

Layout Graph MUST:
	•	produce identical output for identical HTML input
	•	be independent of AI inference
	•	avoid probabilistic clustering as primary signal
	•	avoid CSS execution dependency

AI may consume Layout Graph.

AI MUST NOT define Layout Graph.

⸻

2.2 Structural Truth Over Visual Approximation

Layout Graph prioritizes:
	1.	DOM hierarchy
	2.	block segmentation
	3.	content density
	4.	structural repetition
	5.	region boundary signals

Not:
	•	pixel rendering
	•	exact CSS layout
	•	animation states
	•	runtime JS layout mutations

⸻

2.3 Migration Safety Over Completeness

When uncertain:
	•	prefer explicit UNKNOWN nodes
	•	never merge major regions heuristically
	•	preserve DOM span lineage
	•	attach anomaly signals

Lossless structure > perfect classification.

⸻

3. Layout Graph Data Model

3.1 LayoutGraph

LayoutGraph {
  rootNodeId: string
  nodeIndex: Map<NodeId, LayoutNode>
  regionClusters: LayoutRegionCluster[]
  anomalies: LayoutGraphAnomaly[]
  metadata: LayoutGraphMetadata
}


⸻

3.2 LayoutNode

LayoutNode {
  id: NodeId
  parentId: NodeId | null
  children: NodeId[]

  domPath: string
  domDepth: number
  domOrder: number
  domSpan: DomSpan

  nodeType: LayoutNodeType
  structuralRole: StructuralRole

  signals: LayoutNodeSignals
  visualSignals: LayoutVisualSignals

  boundaryConfidence: number
  clusterConfidence: number

  anomalyFlags: LayoutNodeAnomaly[]

  rawTagName: string
}


⸻

3.3 DomSpan

DomSpan {
  startIndex: number
  endIndex: number
}

Preserves exact snapshot lineage.

Critical for:
	•	diff engine
	•	anomaly detection
	•	deterministic rebuild

⸻

4. Layout Node Types

4.1 Structural Region Types
	•	HEADER
	•	NAV
	•	HERO
	•	SECTION
	•	GALLERY
	•	FORM
	•	FOOTER
	•	LEGAL
	•	SIDEBAR
	•	GRID_CONTAINER
	•	MEDIA_CLUSTER
	•	CONTENT_BLOCK
	•	UNKNOWN

These are:

→ deterministic classifications
→ not semantic meanings

Example:

HERO ≠ marketing hero
HERO = structural dominant intro region

⸻

4.2 StructuralRole (Orthogonal Axis)

PRIMARY
SECONDARY
UTILITY
REPEATING
DECORATIVE
UNKNOWN

Example:

NAV → PRIMARY + UTILITY
FOOTER → UTILITY
HERO → PRIMARY

⸻

5. Layout Signals

5.1 Content Density Signals

LayoutNodeSignals {
  textDensity: number
  imageDensity: number
  linkDensity: number
  headingPresence: boolean
  formPresence: boolean
  mediaPresence: boolean
  repetitionScore: number
}


⸻

5.2 Visual Structure Signals

LayoutVisualSignals {
  visualClusterConfidence: number
  sectionBreakConfidence: number
  whitespaceBoundaryScore: number
  gridLikelihood: number
}

Derived from:
	•	DOM grouping
	•	tag patterns
	•	class patterns
	•	sibling similarity
	•	media repetition

NOT from:
	•	computed CSS
	•	pixel layout

⸻

6. Region Clustering Model

6.1 LayoutRegionCluster

LayoutRegionCluster {
  id: string
  nodeIds: NodeId[]
  dominantType: LayoutNodeType
  clusterConfidence: number
  clusterRole: StructuralRole
}

Used for:
	•	multi-node region detection
	•	gallery grouping
	•	repeated section detection
	•	layout template detection

⸻

7. Boundary Detection

Boundary detection determines:
	•	where sections begin/end
	•	region transitions
	•	layout segmentation

7.1 Boundary Signals
	•	heading transitions
	•	DOM depth resets
	•	sibling density discontinuity
	•	media cluster edges
	•	form isolation
	•	nav repetition patterns
	•	footer density signature

BoundaryConfidence:

0 → uncertain
1 → deterministic


⸻

8. Anomaly Model

LayoutGraph MUST expose structural anomalies.

8.1 Example Anomalies
	•	NAV_MERGED_INTO_CONTENT
	•	FOOTER_MISSING
	•	HERO_SPLIT
	•	GALLERY_FRAGMENTED
	•	FORM_FRAGMENTED
	•	DOM_LOOP_DETECTED
	•	STRUCTURAL_COLLAPSE_RISK
	•	OVER_NESTED_LAYOUT

These are:

→ NOT errors
→ migration risk signals

⸻

9. Layout Graph Construction Pipeline

Step 1 — Snapshot DOM Parse
	•	parse5 or equivalent
	•	no JS execution
	•	no style resolution

Step 2 — Raw Block Extraction
	•	block-level nodes
	•	media containers
	•	form containers
	•	structural wrappers

Step 3 — Signal Extraction

Compute:
	•	densities
	•	repetition
	•	boundary scores
	•	visual clustering signals

Step 4 — Node Typing

Deterministic rule system:
	•	nav patterns
	•	hero dominance heuristics
	•	footer density signature
	•	gallery media clustering
	•	form isolation

Step 5 — Region Clustering

Group nodes into:
	•	structural regions
	•	media clusters
	•	repeated blocks

Step 6 — Anomaly Detection

Attach anomaly flags.

Step 7 — Final Graph Emit

Graph must be:
	•	stable
	•	deterministic
	•	explainable

⸻

10. Relationship to Canonical Model

Layout Graph:
	•	precedes canonical construction
	•	constrains sectionization
	•	provides structural confidence inputs
	•	defines ordering constraints
	•	prevents semantic hallucination

Canonical Model:
	•	consumes Layout Graph
	•	adds semantic intent
	•	adds content shaping
	•	defines renderable structure

⸻

11. Relationship to AI Optimizer

AI Optimizer MUST:
	•	read Layout Graph
	•	propose transformations ON graph
	•	never bypass graph
	•	never mutate canonical directly

Graph is:

→ optimization safety boundary

⸻

12. Relationship to Diff Engine

Layout Graph enables:
	•	structural diff
	•	layout drift detection
	•	region-level mutation tracking
	•	deterministic mismatch classification

⸻

13. Performance Requirements

Layout Graph build MUST:
	•	operate in O(n) DOM complexity
	•	avoid layout simulation
	•	avoid heavy CSS parsing
	•	avoid rendering engines

Target:

< 50ms for SMB site page

⸻

14. Future Extensions
	•	visual feature embedding layer
	•	template recognition layer
	•	cross-site layout learning
	•	probabilistic refinement (AI-assisted)
	•	responsive layout inference

BUT:

Deterministic layer remains foundation.

⸻

15. Key Philosophy

Layout Graph defines:

→ how GNR8 SEES the web

Not:
	•	how it understands
	•	how it designs
	•	how it generates

That comes later.

First:

Structure must be truth.