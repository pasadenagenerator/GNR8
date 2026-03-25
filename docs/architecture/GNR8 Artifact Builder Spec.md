GNR8 Artifact Builder Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Deterministic construction of runtime-ready site artifacts from canonical model
Depends On:
	•	GNR8 Canonical Data Model Spec
	•	GNR8 Structural Reconstruction Engine Spec
	•	GNR8 Semantic Reconstruction Spec
	•	GNR8 Layout Graph Spec

⸻

1. Purpose

Artifact Builder is the final deterministic transformation step in migration.

It converts:

→ canonical structured site model
into
→ deployable runtime artifact

Artifact = what runtime serves

This layer defines:
	•	HTML document generation
	•	asset mapping
	•	section rendering
	•	runtime metadata injection
	•	structural guarantees
	•	safety constraints

Artifact Builder does NOT:
	•	redesign layout
	•	optimize content
	•	generate new UX
	•	interpret marketing meaning
	•	apply AI creativity

It builds truth-preserving runtime output.

⸻

2. Position in Migration Pipeline

Migration pipeline:
	1.	Snapshot Capture
	2.	Layout Graph
	3.	Structural Reconstruction
	4.	Canonical Sectionization
	5.	Semantic Reconstruction
	6.	Artifact Builder ← THIS SPEC
	7.	Governance
	8.	Runtime Serving

Artifact Builder consumes fully canonicalized site data.

⸻

3. Artifact Definition

A GNR8 Artifact is:
	•	deterministic
	•	immutable
	•	versioned
	•	deployable
	•	explainable

It contains:
	•	rendered HTML documents
	•	asset references
	•	canonical metadata
	•	runtime routing info
	•	migration diagnostics

Artifact is NOT:
	•	editable content state
	•	AI proposal
	•	draft mutation
	•	runtime cache

⸻

4. Artifact Types

ArtifactType =
  MIGRATION_SHADOW
  MIGRATION_CANARY
  MIGRATION_PRODUCTION
  PROPOSAL_PREVIEW
  OPTIMIZATION_DRAFT

Migration artifacts are strictest.

Proposal artifacts may contain AI-suggested layouts.

⸻

5. Artifact Builder Inputs

Artifact Builder consumes:
	•	canonical site model
	•	canonical sections
	•	semantic roles
	•	layout graph metadata
	•	style tokens (if present)
	•	asset graph
	•	migration diagnostics

It must never fetch raw HTML again.

⸻

6. Deterministic Rendering Principle

Rendering must be:
	•	deterministic
	•	reversible
	•	explainable
	•	layout-safe
	•	content-safe

Given same canonical input → identical artifact output.

No randomness.

No runtime heuristics.

⸻

7. Document Rendering Model

Artifact Builder generates:
	•	full HTML document per route
	•	minimal runtime wrapper
	•	canonical section rendering

Example:

<html data-gnr8-render-mode="publish">
  <head>...</head>
  <body>
    <main data-gnr8-page-path="/">
      canonical section rendering
    </main>
  </body>
</html>

No app shell wrapping allowed.

Artifact HTML must be final runtime HTML.

⸻

8. Section Rendering Strategy

Sections render based on:
	•	canonical section type
	•	semantic role
	•	layout metadata
	•	style tokens

Rendering modes:
	•	STRUCTURAL_RENDER
	•	LEGACY_SUMMARY_RENDER
	•	COMPONENT_RENDER (future)
	•	PROPOSAL_RENDER (future)

Migration phase prioritizes:

→ STRUCTURAL + LEGACY safe rendering

⸻

9. Legacy Content Handling

Legacy HTML must NEVER be authoritative.

Instead:
	•	converted to semantic summary
	•	extracted signals rendered
	•	structural boundaries preserved
	•	raw HTML not persisted as truth

Legacy summary modes:
	•	visible-v1
	•	visible-v2
	•	visible-structured (future)

⸻

10. Asset Resolution

Artifact Builder must:
	•	resolve canonical asset graph
	•	normalize image paths
	•	dedupe equivalent assets
	•	preserve asset determinism
	•	ensure runtime resolvability

Asset strategy:
	•	source-aware fallback mapping
	•	deterministic path normalization
	•	MIME correctness

⸻

11. Style Strategy

Migration artifacts use:
	•	style tokens
	•	safe layout scaffolding
	•	minimal CSS safety layer

Artifact Builder must NOT:
	•	replay original CSS blindly
	•	inject complex style engines
	•	depend on external builder CSS

Style hierarchy:
	1.	canonical tokens
	2.	migration scaffold
	3.	runtime theme layer (future)

⸻

12. Metadata Injection

Artifact Builder injects:
	•	render mode
	•	section ids
	•	semantic markers
	•	structural markers
	•	diagnostics markers

Example:

<section data-gnr8-section-id="..." data-gnr8-section-type="...">

This enables:
	•	explainability
	•	diffing
	•	runtime governance
	•	operator inspection

⸻

13. Routing Model

Artifact defines:
	•	path → document mapping
	•	host binding compatibility
	•	fallback routing safety
	•	shadow routing support

Routing must be deterministic.

Artifact must not depend on dynamic routing logic.

⸻

14. Versioning Model

Each artifact has:
	•	artifactId
	•	siteVersionId
	•	buildTimestamp
	•	migrationSignature

Artifacts are immutable.

New migration → new artifact.

No mutation in place.

⸻

15. Governance Hooks

Artifact Builder attaches:
	•	structural confidence
	•	semantic confidence
	•	migration gate state
	•	rollout policy signals
	•	anomaly summaries

These must travel with artifact.

Runtime must not recompute them.

⸻

16. Runtime Compatibility

Artifact Builder must produce output compatible with:
	•	edge runtime
	•	static hosting
	•	streaming runtime (future)
	•	AI mutation layer (future)

Artifact must be:
	•	portable
	•	self-describing
	•	runtime-agnostic

⸻

17. Failure Handling

If artifact rendering fails:
	•	fail build
	•	attach failure diagnostics
	•	prevent publish candidate

Never:
	•	partially render
	•	silently degrade
	•	invent fallback HTML

⸻

18. Deterministic Integrity Guarantees

Artifact integrity guarantees:
	•	section order preserved
	•	structure preserved
	•	content preserved
	•	semantic metadata preserved
	•	diagnostics preserved

Violation = migration trust failure.

⸻

19. Relationship to Diff Engine

Diff Engine compares:
	•	canonical vs artifact
	•	artifact vs artifact
	•	artifact vs proposal

Artifact Builder must expose:
	•	stable structure markers
	•	deterministic layout signals

So diffs remain explainable.

⸻

20. Relationship to AI Optimizer

Artifact Builder produces:

→ baseline truth artifact

AI Optimizer produces:

→ proposal artifacts

Migration artifact must remain:
	•	non-AI
	•	trustable
	•	audit-grade

⸻

21. Founder Directive

Artifact Builder is the moment migration becomes real.

Everything before is interpretation.
Everything after is governance.

If artifact is wrong:

Migration is wrong.

GNR8 must build artifacts that are:

boring
correct
deterministic
trustworthy

Beauty comes later.