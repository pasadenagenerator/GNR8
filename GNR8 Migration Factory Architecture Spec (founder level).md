GNR8 Migration Factory Architecture Spec (founder level)

1. Purpose

Migration Factory is:

A deterministic pipeline that transforms an existing website into a Structured Site Model.

It is NOT:
	•	a visual clone engine
	•	a pixel-perfect scraper
	•	a runtime mirroring system

It is:
	•	a semantic reconstruction engine
	•	a best-effort structure recovery system
	•	an AI bootstrap layer

⸻

2. Migration Factory Role in GNR8 V1

Migration Factory exists to:
	1.	Bootstrap agency portfolio into GNR8
	2.	Create structured baseline for AI optimization
	3.	Enable rapid onboarding of legacy clients
	4.	Reduce manual rebuild cost
	5.	Generate consistent design systems

Migration is:

A strategic growth channel, not the core runtime product.

⸻

3. High-Level Pipeline

Canonical deterministic flow:

URL → Snapshot → Parsing → Structure Recovery → Semantic Inference → Design Token Extraction → Asset Graph → Structured Site Model → Validation → Preview → Approval → Publish


⸻

4. Stage Definitions

4.1 Intake

Input types:
	•	public URL (V1 primary)
	•	static export (future)
	•	CMS API (future)
	•	builder JSON (legacy fallback)

Output:
	•	migration job
	•	deterministic snapshot id
	•	crawl policy

⸻

4.2 Snapshot Stage

Purpose:

Create frozen representation.

Includes:
	•	HTML
	•	CSS
	•	JS references
	•	assets
	•	font references

Rules:
	•	snapshot must be immutable
	•	snapshot must be replayable
	•	snapshot must be cacheable

⸻

4.3 Parsing Stage

Transforms raw snapshot into:
	•	DOM model
	•	asset reference graph
	•	style dependency graph

No semantic assumptions yet.

⸻

4.4 Structure Recovery

Critical stage.

Transforms DOM into:

semantic layout tree.

Includes:
	•	section detection
	•	grid inference
	•	navigation detection
	•	hero detection
	•	content grouping
	•	footer inference

This is:

Deterministic + heuristic hybrid.

⸻

4.5 Semantic Inference

AI-assisted stage.

Extracts:
	•	business type
	•	industry signals
	•	value propositions
	•	CTA intent
	•	content tone
	•	funnel maturity

Outputs:

→ semantic profile for site.

⸻

4.6 Design Token Extraction

Builds:
	•	color system
	•	typography system
	•	spacing rhythm
	•	UI component patterns

Goal:

Create baseline design system.

Not pixel clone.

⸻

4.7 Asset Graph Construction

Creates:
	•	asset registry
	•	deduplication mapping
	•	usage mapping
	•	optimization candidates

Rules:
	•	localize when needed
	•	preserve originals
	•	annotate quality

⸻

4.8 Structured Model Assembly

Outputs:
	•	site entity
	•	pages
	•	layout trees
	•	content fields
	•	tokens
	•	semantics

This is:

canonical migration output.

⸻

4.9 Validation Stage

Ensures:
	•	structure completeness
	•	content coverage threshold
	•	asset integrity
	•	semantic confidence

Produces:
	•	migration score
	•	warning list
	•	blocking issues

⸻

4.10 Preview Generation

Generates:
	•	runtime artifact
	•	hosted preview

Purpose:

Human verification.

Preview is:

Not authoritative state.

⸻

4.11 Approval Stage

Operator decides:
	•	approve
	•	request fixes
	•	reject
	•	partial accept

Approval creates:

→ site version candidate

⸻

4.12 Publish Stage

Publish:
	•	promotes structured model
	•	generates runtime artifact
	•	binds domain

⸻

5. Determinism Requirement

Migration must be:
	•	reproducible
	•	explainable
	•	diffable

Same input → same model.

AI cannot introduce nondeterministic structure.

⸻

6. Quality Scoring Model

Migration produces:

Composite score:
	•	layout fidelity
	•	content completeness
	•	semantic confidence
	•	asset integrity
	•	design token quality

Used for:
	•	autopilot eligibility
	•	agency pricing
	•	internal prioritization

⸻

7. Operator Workflow

Operator can:
	•	run migration
	•	inspect diagnostics
	•	inspect semantic extraction
	•	inspect layout tree
	•	compare preview vs source
	•	adjust thresholds
	•	approve version

Operator is:

Mandatory in V1.

⸻

8. AI Role in Migration

AI assists in:
	•	semantic inference
	•	content structuring
	•	layout correction
	•	design token normalization

AI does NOT:
	•	invent layout arbitrarily
	•	overwrite deterministic structure blindly

⸻

9. Failure Modes

Migration must handle:
	•	broken HTML
	•	inline CSS chaos
	•	JS-driven layout
	•	builder artifacts
	•	missing assets
	•	CDN blocking
	•	lazy loading traps

Graceful degradation required.

⸻

10. Migration Limits (V1)

Out of scope:
	•	multi-page crawl orchestration (deep)
	•	dynamic app migration
	•	complex ecommerce
	•	authenticated content
	•	animation reconstruction
	•	custom JS logic recreation

⸻

11. Rollback Model

Every migration:
	•	produces version candidate
	•	can be discarded safely
	•	does not mutate existing published site

⸻

12. Learning Loop

Migration outputs feed:
	•	AI training signals
	•	pattern detection
	•	token refinement heuristics

But:

Migration must remain deterministic.

⸻

13. Agency Economics

Migration factory must:
	•	reduce rebuild time
	•	standardize quality
	•	allow tiered pricing
	•	enable batch processing

⸻

14. Strategic Vision

Long term:

Migration becomes:
	•	dataset generator
	•	pattern discovery engine
	•	AI design intelligence source

But V1 goal:

migrate real customers safely.

⸻

15. Founder Directive

Migration Factory is:

the bridge between legacy web and AI-native web.

If built right:
	•	GNR8 becomes migration standard.

If built wrong:
	•	it becomes brittle scraper tech.