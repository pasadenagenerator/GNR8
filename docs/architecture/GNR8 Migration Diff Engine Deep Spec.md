GNR8 Migration Diff Engine Deep Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Deterministic structural + semantic diff system for migration validation
Depends On:
	•	GNR8 Layout Graph Spec
	•	GNR8 Canonical Data Model Spec
	•	GNR8 Migration Governance Spec
	•	GNR8 Proposal Artifact Spec

⸻

1. Purpose

The Diff Engine exists to answer one fundamental question:

→ Did migration preserve structural truth?

Not visual similarity.
Not CSS parity.
Not pixel parity.

But:
	•	layout truth
	•	semantic continuity
	•	interaction survival
	•	region integrity

Diff Engine is the migration lie detector.

⸻

2. Diff Philosophy

Migration diff must be:

Deterministic
Explainable
Reproducible
Stable

Diff must NOT depend on:
	•	visual AI similarity
	•	screenshot comparison
	•	heuristic UX scoring

Diff is:

graph-based structural verification.

⸻

3. Diff Layers

GNR8 diff operates on 5 layers:
	1.	Layout Graph Diff
	2.	Canonical Section Diff
	3.	Interaction Diff
	4.	Content Semantic Diff
	5.	Structural Confidence Delta

Each layer produces independent signals.

⸻

4. Layout Graph Diff

Compares:

Source Layout Graph vs Migrated Layout Graph

Checks:
	•	region presence
	•	region order
	•	region nesting
	•	region boundaries
	•	region type drift

Mismatch classes:

HERO_MISSING
NAV_MERGED
FOOTER_LOST
SECTION_COLLAPSED
GALLERY_SPLIT
FORM_REMOVED
REGION_ORDER_DRIFT

Layout diff is:

binary structural truth detector.

⸻

5. Canonical Section Diff

Compares:

Source canonical projection vs Migrated canonical sections.

Checks:
	•	section count delta
	•	section intent drift
	•	structural boundary merge/split
	•	section hierarchy drift

Example:

3 sections → 1 legacy collapse = critical failure

Canonical diff is:

migration correctness validator.

⸻

6. Interaction Diff

Detects survival of:
	•	forms
	•	navigation
	•	anchor linking
	•	call-to-actions
	•	gallery interaction
	•	menus

Mismatch classes:

FORM_DEGRADED
NAV_LINKS_LOST
CTA_REMOVED
ANCHOR_SYSTEM_BROKEN
GALLERY_STATICIZED

Interaction diff is:

business continuity protection.

⸻

7. Content Semantic Diff

Not NLP heavy.

Uses:
	•	heading semantic continuity
	•	keyword density delta
	•	section meaning continuity
	•	hero message preservation

Example failures:

hero message replaced by legal text
about section replaced by nav residue

Semantic diff is:

message preservation check.

⸻

8. Structural Confidence Delta

Compares:

StructuralConfidence(source projection)
vs
StructuralConfidence(migrated canonical)

Delta classification:

DELTA_CRITICAL
DELTA_MAJOR
DELTA_ACCEPTABLE
DELTA_MINOR

Delta is:

migration regression signal.

⸻

9. Diff Scoring Model

Each layer contributes weighted score:

Example:

Layout: 40%
Canonical: 25%
Interaction: 20%
Semantic: 10%
Confidence Delta: 5%

Final Diff Score:

MigrationTruthScore = 0 → 100


⸻

10. Diff Result States

Final states:

MIGRATION_INVALID
MIGRATION_RISKY
MIGRATION_ACCEPTABLE
MIGRATION_STRUCTURALLY_TRUE

This feeds:

Migration Governance.

⸻

11. Diff Explainability

Diff must produce:
	•	mismatch list
	•	region diff tree
	•	section diff mapping
	•	interaction diff report
	•	semantic drift report
	•	confidence delta breakdown

Diff output is:

audit artifact.

⸻

12. Diff Visualization Model

Operator must see:
	•	source vs migrated layout overlay
	•	region mismatch highlights
	•	section mapping graph
	•	missing interaction markers
	•	semantic drift warnings

Diff UI is:

migration cockpit.

⸻

13. Deterministic Mapping Engine

Key requirement:

Stable Node Matching.

Uses:
	•	DOM span similarity
	•	structural ancestry
	•	region signals
	•	layout graph IDs
	•	content anchor fingerprints

No AI matching allowed.

⸻

14. Diff Engine Inputs

Required:
	•	source snapshot
	•	source layout graph
	•	migrated canonical model
	•	migrated layout graph
	•	interaction extraction map
	•	semantic signal map

⸻

15. Diff Engine Outputs

Produces:

MigrationDiffReport:
	•	truthScore
	•	mismatchClasses[]
	•	regionDiffGraph
	•	sectionMapping
	•	interactionDiff
	•	semanticDiff
	•	confidenceDelta
	•	explainabilityReport

⸻

16. Diff Engine Role in Pipeline

Diff sits between:

Migration → Governance

Flow:

snapshot → canonical → diff → governance → policy → enforcement

Diff is:

migration validator core.

⸻

17. Diff Engine Safety Doctrine

Diff must never:
	•	auto-fix migration
	•	auto-rewrite canonical
	•	auto-improve layout

Diff only:

detects truth.

⸻

18. Founder Directive

If Diff Engine is weak:

Migration engine is marketing tool.

If Diff Engine is strong:

Migration engine becomes infrastructure.

⸻

19. Future Extensions

Later phases may include:
	•	visual diff augmentation
	•	UX behavioral diff
	•	performance diff
	•	conversion-risk diff

But core must remain:

structural truth diff.

⸻

20. Key Principle

Migration success must be:

provable.

Diff Engine makes migration:

scientific.