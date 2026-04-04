Odličen korak — točno to je treba narediti pred implementacijo, da ne zaplavaš v “AI chaos”.

Spodaj imaš enoten, konsolidiran spec, ki:
	•	poveže tvoj model (import → prepoznavanje → redesign)
	•	se ujema z obstoječim GNR8 pipeline-om
	•	definira Design Intelligence Layer kot prvo-class komponento

⸻

GNR8 SPEC — DESIGN INTELLIGENCE & AI REDESIGN PIPELINE (V1)

STATUS: Working Spec (Pre-Implementation)
SCOPE: Phase 1–3 of GNR8 transformation system
GOAL: Introduce a deterministic + AI-assisted design system on top of existing migration pipeline

⸻

	1.	PURPOSE

⸻

GNR8 is not a builder.

GNR8 is:
→ a system that understands websites
→ restructures them
→ improves them
→ and evolves them over time

This spec defines the missing layer between:
	•	structure extraction
	•	and rendering

This layer is:

→ DESIGN INTELLIGENCE

⸻

	2.	CURRENT PIPELINE (EXISTING)

⸻

Already implemented (Phase 1 baseline):

Import
→ Structure Preparation
→ Layout Preparation
→ Render Preparation
→ Preview Generation

Problem:
There is no intelligence layer deciding how the site should look.

⸻

	3.	TARGET PIPELINE (UPDATED)

⸻

New pipeline:

Import
→ Structure Preparation
→ Design Intelligence Layer (NEW)
→ Layout Preparation
→ Render Preparation
→ Preview Generation

This spec defines the Design Intelligence Layer.

⸻

	4.	INPUTS TO DESIGN INTELLIGENCE

⸻

Design Intelligence receives:

4.1 IMPORT OUTPUT
	•	normalized DOM
	•	extracted assets (images, links)
	•	text content
	•	page segmentation

4.2 STRUCTURE MODEL
	•	domOutline
	•	section blocks
	•	hierarchy
	•	section types (if already inferred)

4.3 BRAND SIGNALS (CGP)
	•	primary/secondary colors
	•	typography (if detected)
	•	visual density
	•	tone (formal, playful, etc.)

4.4 PAGE CONTEXT
	•	page type (home, product, about, landing)
	•	content density
	•	image vs text ratio

⸻

	5.	OUTPUT OF DESIGN INTELLIGENCE

⸻

This layer DOES NOT generate HTML.

It produces a deterministic design model:

type DesignModel = {
layoutStrategy: string
sectionDecisions: SectionDecision[]
typographyScale: TypographyScale
spacingScale: SpacingScale
colorSystem: ColorSystem
componentVariants: ComponentVariantMap
}

Example responsibilities:
	•	choose hero layout (centered / split / image-first)
	•	define section order adjustments
	•	define CTA placement strategy
	•	define spacing rhythm
	•	define typography hierarchy

⸻

	6.	DESIGN INTELLIGENCE ARCHITECTURE

⸻

This layer is hybrid:

6.1 DETERMINISTIC CORE (REQUIRED)

Rules based on:
	•	content type
	•	structure
	•	density

Examples:
	•	if hero has image + headline → split layout
	•	if long text section → single-column readable layout
	•	if multiple CTAs → emphasize primary CTA

This ensures:
	•	stability
	•	reproducibility
	•	testability

⸻

6.2 AI ASSIST LAYER (OPTIONAL, CONTROLLED)

AI is used for:
	•	classification (what section is this?)
	•	enhancement suggestions (better layout choice)
	•	tone detection

AI must NOT:
	•	directly output HTML/CSS
	•	bypass deterministic layer
	•	produce non-debuggable output

AI outputs must be:
→ constrained
→ validated
→ explainable

⸻

	7.	REDESIGN STRATEGY (CORE CONCEPT)

⸻

Redesign is NOT free-form generation.

Redesign = selecting the best layout system for given content.

Process:

INPUT:
	•	content
	•	structure
	•	brand signals

PROCESS:
	•	classify sections
	•	assign layout types
	•	assign spacing + typography
	•	optimize hierarchy

OUTPUT:
	•	improved structured layout definition

⸻

	8.	RELATION TO LAYOUT PREPARATION

⸻

Design Intelligence feeds Layout Preparation.

Layout Preparation becomes:
→ executor of design decisions

Example:

Design Intelligence:
→ hero = “split-left-image”

Layout Preparation:
→ maps to actual layout config

⸻

	9.	RENDER LAYER RESPONSIBILITY

⸻

Render layer must remain:
	•	deterministic
	•	consistent
	•	fast

It should:
	•	consume DesignModel
	•	render predefined components
	•	not invent structure

⸻

	10.	SUBSCRIPTION & STRIPE ALIGNMENT

⸻

Design Intelligence is a monetizable layer.

Example model:

Free:
	•	import only
	•	raw structure

Pro:
	•	1 redesign
	•	preview

Premium:
	•	multiple redesigns
	•	iterative improvements
	•	optimization suggestions

Key idea:
→ users pay for transformations, not hosting

⸻

	11.	FUTURE EXTENSIONS (NOT IN V1)

⸻

	•	continuous optimization (AI loop)
	•	A/B layout testing
	•	performance-driven redesign
	•	cross-site learning
	•	personalization

⸻

	12.	NON-GOALS (IMPORTANT)

⸻

This system is NOT:
	•	a visual builder
	•	a drag-and-drop tool
	•	a pure AI generator

⸻

	13.	SUCCESS CRITERIA

⸻

	•	Design Intelligence produces consistent layout decisions
	•	Output is deterministic and explainable
	•	Pipeline remains stable
	•	Redesign produces visibly improved layouts
	•	System is monetizable via transformations

⸻

	14.	NEXT IMPLEMENTATION STEP

⸻

CODEX TASK:
→ Design Intelligence Layer (V1)

This will:
	•	define rule system
	•	define DesignModel schema
	•	integrate into pipeline
	•	prepare for AI-assisted redesign

END SPEC—