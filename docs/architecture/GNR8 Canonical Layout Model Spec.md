# GNR8 Canonical Layout Model Spec

Status: DRAFT  
Owner: Gregor Žigon  
System Scope: GNR8 Core Migration + Runtime + AI Editing Model  
Priority: CORE PLATFORM CONTRACT  

---

## 1. Purpose

This document defines the canonical internal representation of a website/page inside GNR8.

The Canonical Layout Model (CLM) is the primary contract between:

- migration engine
- semantic reconstruction
- runtime renderer
- publish system
- AI editing layer
- future visual/editor systems

CLM is not:

- raw HTML
- DOM replay
- React tree
- builder schema
- CMS schema

CLM is:

> the graph-based source of truth for reconstructed websites inside GNR8.

---

## 2. Core Principle

A website is not stored in GNR8 as markup.

A website is stored as:

- layout graph
- semantic graph
- content graph
- asset graph
- navigation graph
- style token graph

All rendering, editing, migration, and publishing flows must operate on this canonical model.

---

## 3. Why CLM Exists

Without CLM:

- migration output becomes ad-hoc
- runtime renderer becomes heuristic-only
- AI editing becomes unsafe
- publish artifacts become inconsistent
- builder removal becomes impossible
- future multi-channel output becomes fragile

CLM exists so GNR8 can become:

- deterministic
- editable
- AI-native
- migration-first
- runtime-safe

---

## 4. Graph-Based Modeling Doctrine

CLM is graph-based, not tree-based.

### Why not tree-only
A page is not only parent-child structure.

It also contains:
- semantic relationships
- navigation relationships
- asset reuse
- style inheritance
- cross-section references
- future personalization targets

These cannot be modeled cleanly as a single tree.

### CLM architecture
CLM is composed of:

1. Layout Graph
2. Semantic Graph
3. Content Graph
4. Asset Graph
5. Navigation Graph
6. Style Token Graph
7. Interaction Graph (future-ready)
8. Rendering Projection Layer

Each graph has a distinct responsibility.

---

## 5. CLM Object Hierarchy

Top-level hierarchy:

- Site
- SiteVersion
- Page
- PageVersion
- Graph Set

Each `PageVersion` contains one CLM graph set.

---

## 6. Core Entity Model

### 6.1 Site
Represents one web property.

Fields:
- siteId
- orgId
- source metadata
- canonical brand identity
- default locale
- runtime host bindings
- site-level settings

### 6.2 SiteVersion
Represents a publishable snapshot of the full site.

Fields:
- siteVersionId
- siteId
- version number
- lifecycle state
- active artifact pointer
- publish metadata

### 6.3 Page
Represents a logical route/page identity.

Fields:
- pageId
- siteId
- canonical path
- page type
- locale
- routing metadata

### 6.4 PageVersion
Represents one versioned graph snapshot of a page.

Fields:
- pageVersionId
- pageId
- siteVersionId
- graph payload
- migration metadata
- quality/fidelity metadata

---

## 7. Layout Graph

The Layout Graph models visual and structural composition.

### 7.1 Purpose
It answers:

- what blocks exist
- how blocks are nested
- how sections are ordered
- how content is grouped spatially
- how layout zones relate

### 7.2 Node types
Minimum node kinds:

- page
- section
- container
- group
- block
- media
- form
- list
- navigation
- footer
- header
- hero
- gallery
- contact
- CTA

### 7.3 Edge types
Minimum edge kinds:

- contains
- follows
- wraps
- overlays
- aligns_with
- mirrors
- anchors_to

### 7.4 Layout node shape
Each layout node should have:

- nodeId
- nodeType
- parentId (optional)
- childrenIds
- order
- region role
- inferred width behavior
- inferred density
- inferred responsive hints
- visibility metadata
- source evidence references

### 7.5 Layout graph guarantee
Layout graph must preserve:

- visual ordering
- section segmentation
- major grouping boundaries
- primary page rhythm

It must not depend on source DOM structure surviving unchanged.

---

## 8. Semantic Graph

The Semantic Graph models meaning.

### 8.1 Purpose
It answers:

- what a section means
- what a block is for
- what user intent it serves
- how content roles relate

### 8.2 Semantic node kinds
Minimum semantic roles:

- hero
- about
- services
- gallery
- contact
- faq
- pricing
- testimonial
- legal
- navigation
- footer
- call_to_action
- company_identity
- location
- form_intent

### 8.3 Semantic edge kinds
- elaborates
- supports
- duplicates
- translates
- summarizes
- leads_to
- belongs_to_intent_cluster

### 8.4 Key rule
Semantic graph may enrich layout graph.

It may not destroy layout ordering truth.

---

## 9. Content Graph

The Content Graph models textual and structured content.

### 9.1 Purpose
It answers:

- what content exists
- how it is grouped
- which content belongs to which semantic node
- what is primary vs secondary content

### 9.2 Content node types
- heading
- subheading
- paragraph
- bullet_list
- label
- caption
- CTA_text
- contact_value
- address
- opening_info
- legal_text
- translated_text
- metadata_text

### 9.3 Content attributes
- contentId
- contentType
- raw text
- normalized text
- locale
- confidence
- role
- source evidence
- dedupe key

### 9.4 Rule
Content graph stores normalized content, not markup.

---

## 10. Asset Graph

The Asset Graph models all images/files/media and their relationships.

### 10.1 Purpose
It answers:

- which assets exist
- which assets are equivalent
- which asset is preferred for rendering
- which blocks use which assets

### 10.2 Asset node types
- image
- logo
- icon
- gallery_image
- background_image
- downloadable_file
- video
- embedded_media

### 10.3 Asset fields
- assetId
- sourceUrl
- canonicalAssetKey
- mimeType
- width
- height
- file size
- semantic role
- alias group id
- materialization status
- preferredRenderVariant
- source evidence

### 10.4 Asset edge types
- used_by
- alias_of
- variant_of
- displayed_in
- background_for
- logo_for

### 10.5 Critical rule
Equivalent image paths such as:

- `/assets/image/...`
- `/uploads/...`

must be modelable as aliases of the same visual asset.

This is a core CLM requirement.

---

## 11. Navigation Graph

The Navigation Graph models routes, anchors, and navigational relationships.

### 11.1 Purpose
It answers:

- what pages exist
- what links are primary nav
- what anchors are section navigation
- what links are footer-only or utility links

### 11.2 Node types
- page_route
- external_link
- internal_link
- anchor_link
- utility_link
- footer_link
- contact_link

### 11.3 Key rule
Navigation must be reconstructable independently of source header DOM.

---

## 12. Style Token Graph

The Style Token Graph models design signals, not raw CSS.

### 12.1 Purpose
It answers:

- what colors define the site
- what typography hierarchy exists
- what spacing rhythm exists
- what visual density exists
- what card/image/button patterns exist

### 12.2 Token categories
- color.background
- color.surface
- color.text
- color.accent
- color.border
- typography.family.primary
- typography.scale.hero
- typography.scale.heading
- typography.scale.body
- spacing.section
- spacing.card
- radius.card
- shadow.card
- grid.density
- image.presentation

### 12.3 Rule
Style tokens are:
- canonical
- editable
- renderer-consumable
- AI-optimizable

They are not CSS files.

---

## 13. Interaction Graph

The Interaction Graph is future-ready and minimal in V1.

### 13.1 Purpose
It answers:
- which elements are interactive
- what forms exist
- what buttons/links exist
- where future agentic logic may attach

### 13.2 Node types
- link
- button
- form
- input
- textarea
- select
- map_link
- phone_action
- email_action

### 13.3 Rule
V1 interaction graph is descriptive, not fully behavioral.

---

## 14. Evidence Layer

Every CLM graph node should support source evidence references.

### Evidence examples
- source DOM node ids
- source URL
- extracted text span
- snapshot section id
- asset source path
- detection heuristic id
- confidence score

### Rule
CLM must be explainable.
Every important node should be traceable back to evidence.

---

## 15. Rendering Projection Layer

Renderer does not read arbitrary HTML.

Renderer projects CLM into artifact HTML.

### Projection responsibilities
- choose structural components
- bind content graph
- bind asset graph
- apply style token graph
- respect navigation graph
- emit deterministic artifact output

### Rule
Projection must be deterministic for the same `PageVersion`.

---

## 16. Migration Output Contract

Migration engine must emit CLM, not summary blobs.

Minimum acceptable migration output:

- valid layout graph
- valid content graph
- valid asset graph
- valid style token set
- semantic graph with confidence levels
- evidence references

If migration cannot fully reconstruct a page, it may emit:

- partial graph
- fallback semantic blocks
- confidence metadata

But never raw HTML as canonical truth.

---

## 17. Fallback Modeling Rule

Fallback is allowed only as modeled fallback.

Examples:
- `legacy_summary_block`
- `unresolved_gallery_block`
- `partial_contact_block`

Fallback must still be represented inside CLM.

Fallback must never bypass CLM.

---

## 18. Fidelity Levels Inside CLM

Each page version should carry fidelity metadata:

- structuralFidelity
- semanticFidelity
- assetFidelity
- styleFidelity
- navigationFidelity

Suggested scale:
- low
- medium
- high

This allows:
- migration auditing
- canary selection
- publish quality gates
- AI remediation prioritization

---

## 19. CLM Invariants

The following are non-negotiable:

1. No builder schema as source of truth  
2. No raw HTML as source of truth  
3. No runtime dependence on original DOM  
4. All rendered output must come from CLM projection  
5. All migration paths must converge into CLM  
6. Asset aliases must be representable  
7. Section order must be preserved deterministically  
8. Host binding must remain outside CLM core page graph  
9. AI must edit CLM, not HTML  
10. Publish must artifactize CLM, not source markup

---

## 20. CLM Evolution Path

### V1
- graph-based core
- deterministic layout reconstruction
- partial semantic enrichment
- runtime-safe artifact projection

### V2
- richer style inference
- multilingual graph layering
- smarter interaction modeling
- stronger semantic block templates

### V3
- AI-native page editing on CLM
- component synthesis from CLM
- adaptive personalization overlays
- multi-channel output generation

---

## 21. What CLM Is Not

CLM is not:

- a builder JSON format
- a serialized DOM clone
- a React component tree
- an import-only intermediate
- a CMS document model
- a visual editor state model

CLM is:

> the canonical reconstruction graph of a website.

---

## 22. Founder Directive

If GNR8 owns CLM, it owns the migration layer, the runtime layer, and the future AI editing layer.

If CLM is weak:
- migration becomes lossy
- runtime becomes heuristic
- AI becomes unsafe
- builder removal becomes impossible

If CLM is strong:
- migration becomes scalable
- runtime becomes deterministic
- AI becomes controllable
- GNR8 becomes the operating system for website reconstruction