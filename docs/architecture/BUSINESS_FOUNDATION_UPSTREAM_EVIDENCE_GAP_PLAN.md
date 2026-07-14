# Business Foundation Upstream Evidence Gap Plan

## Phase Boundary

MVP-3.1-B analyzes why the ODV Business Foundation page still lacks
canonical offerings, audience, logo, brand colors, typography, and complete
CGP knowledge even though imported website evidence and original assets exist.

Target site version:

```text
09dce7ea-d860-4f60-a1eb-26c3335b302e
```

This phase is analysis and documentation only. It does not implement evidence
extraction, logo detection, color extraction, font classification, AI
analysis, Business Alignment editing, correction UX, persistence, schema,
API, workers, generation, approval, publishing, deployment, DNS, or production
mutation.

## Executive Result

The ODV Business Foundation gaps are real upstream evidence-governance gaps,
not merely display bugs.

ODV has substantial source evidence:

- rendered HTML with business title, body text, headings, contact details,
  service-area wording, audience wording, and structured logo reference
- original raw file map with `383` non-entry imported files in the current
  Business Foundation asset projection
- imported asset baseline with `384` persisted assets recorded upstream
- `314` image assets, `3` icons, `17` font files, and `2` CSS files
- rendered-capture evidence with `1` route, `6` navigation items, `2`
  navigation-type section boundaries, `3` layout regions, `2` screenshots,
  and strong rendered DOM quality
- persisted Business Discovery, DBT, BUR, Business Alignment, WDB, WGP,
  Candidate Discovery, Candidate Review, Reconstruction Package, and Structure
  Plan artifacts

The current canonical chain does not promote those raw signals into canonical
business truth because the implemented Business Discovery builder uses only a
narrow deterministic slice: source URL, route paths, navigation labels,
section boundary region types, asset inventory count, upstream limitations,
diagnostics, and optional Candidate Discovery context. It does not consume
rendered body text, page metadata beyond source URL, image `alt`, structured
logo metadata, CSS values, font-face declarations, or actual asset usage as
business knowledge.

The smallest safe path is therefore not a new inference layer. It is a
governed candidate path:

1. Asset Evidence Classification
2. Visual Identity Candidate Model
3. Business Evidence Enrichment
4. Human Confirmation / Alignment UX
5. Canonical DBT Update
6. WDB/WGP Regeneration

Only the first three phases are deterministically recoverable candidates.
Canonical promotion requires explicit human governance.

## Current Evidence Path

```text
Imported Website
↓
Raw Evidence
↓
Imported Asset Registry
↓
Candidate Discovery
↓
Business Discovery
↓
Digital Business Twin
↓
Business Understanding Report
↓
Business Alignment
↓
Website Design Brief
↓
Website Generation Package
↓
Business Foundation Projection
```

Current ODV loss points:

| Domain | Where Information Is Lost Or Downgraded |
| --- | --- |
| Offerings | Rendered body text contains legal-service signals, but Business Discovery does not inspect body content or headings for offerings. DBT receives no offerings finding and records missing knowledge. |
| Audience | Rendered body text contains customer-type wording, but Business Discovery does not inspect body content for audience. DBT records missing audience. |
| Logo | HTML contains image `alt="Logo"` and structured logo URL, but the asset projection only labels logo candidates when file paths contain `logo`; the imported path is `Tabla40x20cm_51.png`. |
| Brand colors | CSS contains repeated color values, but no canonical color contract or computed-style candidate is present in the Business Foundation-consumed evidence. |
| Typography | Raw assets include `Nationale` and `Fontello` font files and CSS `@font-face` declarations, but computed typography is not materialized as canonical brand knowledge. |
| Visual style | Screenshots, layout geometry, CSS, and asset inventory exist, but no CGP candidate model separates observable visual implementation from canonical identity. |
| Business differentiators | Rendered body text contains differentiator-like claims, but no deterministic business differentiator classification exists. |
| Trust evidence | Contact path is classified as a weak trust signal. Stronger trust evidence in body text, address, languages, registry/tax details, and working hours is not classified. |

## Current Canonical Findings

Persisted Business Discovery for ODV:

```text
business_discovery_7b37413651d79de0d109e31690a34b62
status: partial
findings: 12
limitations: 104
confidence: MEDIUM
```

Its findings cover:

- brand: imported asset count only, LOW confidence
- business identity: source host and `O nas`
- digital presence: source URL, route inventory, navigation labels
- goals: `Kontakt`
- trust: contact path only, LOW confidence
- content: captured region type `navigation`
- constraints: upstream limitations and Candidate Discovery context

Persisted aligned DBT used by Business Foundation:

```text
status: partial
missing knowledge: audience, offerings
confidence: LOW
```

The current Business Foundation projection reports:

- confirmed offerings: unavailable
- target audience: unresolved
- confirmed logo: unavailable
- canonical colors: unavailable
- canonical typography: unavailable
- visual identity: partial / unresolved
- imported assets: `logos: 0`, `images: 314`, `icons: 3`,
  `fonts: 17`, `videos: 0`, `other files: 49`

## Offerings Evidence

Available ODV signals:

- Page title: `SANDRA CVIJANOVIC - ODVETNICA`.
- Meta description: `Odvetnica Sandra Cvijanovic`.
- Body copy says the lawyer provides legal support, consulting, and
  representation before courts and other authorities.
- Body copy lists potential service areas: commercial and civil law, legal
  representation in different proceedings, insolvency law, labor law, real
  estate law, and the office's main orientation toward commercial and labor
  law.
- Navigation labels are `Home`, `O nas`, `Galerija`, `Kontakt`, plus phone
  and email. None match the current offering keyword patterns.
- Current Candidate Discovery contributes only reconstruction candidates, not
  service semantics.

Current canonical result:

- Business Discovery has no `offerings` finding.
- DBT has missing offerings knowledge.
- WDB target/service sections fall back to "No aligned Digital Business Twin
  knowledge is available for this section."
- WGP preserves offering uncertainty instead of inventing services.

Why unresolved:

- Evidence exists but is not classified. The implemented builder never
  inspects rendered body text, headings, repeated phrases, metadata, or image
  context for service areas.
- Confidence and governance also matter: even a deterministic candidate such
  as "legal representation" must not become canonical offerings without human
  confirmation.

Deterministically recoverable:

- Yes, as candidates with source references and confidence.

Human confirmation required:

- Yes. Offerings define the business promise and must not be silently
  promoted from website text into canonical DBT truth.

## Audience Evidence

Available ODV signals:

- Body copy references `fizicnim osebam in podjetjem`, indicating potential
  customer types: individuals and companies.
- Geographic evidence exists through Nova Gorica address and map link.
- Body copy lists operating languages: Slovenian, Italian, English, Serbian,
  and Croatian.
- Calls to action are contact-oriented.
- No testimonials were observed in the inspected source summary.

Current canonical result:

- Business Discovery has no `audience` finding.
- DBT has missing audience knowledge.
- Business Alignment preserved audience unresolved because no new business
  truth was provided.
- WGP explicitly requires generated output to preserve audience uncertainty.

Why unresolved:

- Evidence exists but is not interpreted. The implemented audience detection
  only checks route and navigation labels for narrow audience keywords.
- Body text carries stronger audience signals than navigation does.

Deterministically recoverable:

- Yes, as audience candidates only.

Human confirmation required:

- Yes. Target audience affects positioning, copy, page hierarchy, and
  generation strategy.

## Logo Candidates

Available ODV signals:

- Rendered HTML includes an image with `alt="Logo"`.
- The image source is:

```text
/uploads/uz6Dg2kX/236x0_247x0/Tabla40x20cm_51.png
```

- The rendered preview URL was already available through the existing preview
  asset boundary:

```text
/api/gnr8/runtime/preview-assets/site_135623aa7648136dba36/09dce7ea-d860-4f60-a1eb-26c3335b302e/uploads/uz6Dg2kX/236x0_247x0/Tabla40x20cm_51.png
```

- Structured page data includes a logo URL:

```text
https://www.odv-cvijanovic.si/uploads/uz6Dg2kX/Tabla40x20cm_51.png
```

- The raw file-map search found only favicon as filename-logoish because the
  candidate asset filename does not contain `logo`.

Candidate confidence:

- High as a logo candidate because it has `alt="Logo"`, header/early-page use,
  a structured logo reference, and safe preview path evidence.
- Not canonical. The file appears to be a sign/table image and must be
  visually validated by a human before it can be the canonical logo.

Why logo count is zero:

- Current classification is path/media based. It only labels
  `logo_candidate` when the raw path or media string contains `logo`.
- It does not inspect HTML `alt`, structured logo metadata, header placement,
  repeated use, dimensions, or CSS/background references.

Required validation:

- Confirm preview loads.
- Confirm it is an intended logo/identity asset rather than an incidental sign
  or content image.
- Record source location, confidence, and human confirmation before canonical
  DBT reference.

## Brand Colors

Available ODV signals:

- `assets/sitestyle.css` contains repeated colors including
  `rgb(184,102,61)`, `rgb(224,142,101)`, `rgb(69, 69, 69)`,
  `rgb(255, 255, 255)`, and other UI colors.
- `assets/user-style.css` contains repeated values including `#d65b3f`,
  `#454545`, `#FFF`, `#333`, `#ccc`, and form/plugin UI colors.
- Evidence baseline shows `computedStyle: null` while summaries record
  `computedStyleSampleCount: 6` and style sampling diagnostics.

Conceptual classification:

| Color Evidence | Conceptual Class |
| --- | --- |
| Repeated warm accent values such as `rgb(184,102,61)` / `#d65b3f` | repeated visual color signal |
| Whites, grays, black, borders, form colors | generic UI color |
| Plugin/provider colors such as selection or error styles | uncertain / generic UI color |
| Explicit named brand color | absent |

Why no canonical colors are persisted:

- No current canonical brand color contract is populated from imported CSS.
- No deterministic color candidate model filters repeated visual colors from
  generic UI, plugin, form, map, or cookie-banner colors.
- Business Foundation correctly avoids inventing a canonical palette.

Deterministically recoverable:

- Yes, as candidate palette evidence with source CSS refs, frequency,
  selector context, and generic-color filtering.

Human confirmation required:

- Yes. Canonical colors are brand identity, not raw CSS statistics.

## Typography Evidence

The imported asset registry includes `17` font files.

Detected families and files:

- `Fontello`: TTF, EOT, WOFF, and SVG references. This is likely an icon font,
  not canonical text typography.
- `Nationale`: regular, demibold, and extrabold in TTF, EOT, WOFF, WOFF2, and
  SVG references.
- CSS also references fallback/system stacks including `FreeSans`, `Arimo`,
  `Droid Sans`, Helvetica, Arial, and sans-serif.
- `assets/sitestyle.css` references `Open Sans`, but no matching local
  imported `Open Sans` font file was identified in the file-map sample.

Observed usage:

- `@font-face` exists for `Nationale` regular, demibold, and extrabold.
- `Fontello` and `FontAwesome` references appear tied to icon rendering and
  UI controls.
- The capture baseline records `missing_font_source_evidence`, so actual
  used-family confidence is incomplete.

Why canonical typography remains unavailable:

- Font files exist, but current Business Discovery and DBT do not classify
  font assets or CSS usage.
- Business Foundation typography currently reads only
  `evidenceCaptureBaselineArtifact.computedStyle.fontsDetected`, which is not
  present in the consumed baseline.
- No human-governed typography candidate has been confirmed.

Deterministically recoverable:

- Yes, as typography candidates with source CSS refs and local asset
  availability.

Human confirmation required:

- Yes. Canonical typography should be versioned only after confirmation.

## Other Visual Identity Evidence

Observable visual signals:

- Header/early image with `alt="Logo"`.
- Large content image gallery.
- CSS color palette with warm accent, grays, whites, and plugin colors.
- Fonts include `Nationale`, icon fonts, and fallback stacks.
- Layout evidence captures navigation regions and screenshots.
- Buttons/links/contact paths exist in rendered HTML.
- Body copy has a professional legal tone: personal approach, care,
  responsiveness, expertise, and optimal solutions.

Canonical CGP knowledge:

- Not complete. There is no governed canonical logo, palette, typography,
  imagery style, button system, icon style, spacing rhythm, border-radius
  system, layout-density guidance, or brand-voice contract.

Implementation details that must not become business truth:

- CSS colors alone.
- Cookie-banner and plugin colors.
- Icon-font presence.
- Map marker assets.
- Gallery/image dimensions.
- Fallback font stacks.

## Original Imported Assets Versus Generated Proposal Assets

Original Imported Assets are source website evidence. For ODV they come from
the raw imported site artifact and preview-assets route under the original
site/version identity.

Generated Proposal Assets are quarantined output assets attached to generated
proposal iterations. They must remain in the Generation Evolution / proposal
preview boundary until separately approved.

Current distinction:

- Business Foundation already summarizes original imported assets separately
  from generated proposal assets.
- Evolution preview routes already serve generated proposal bundles from
  their quarantined sources.

Missing boundary for future UX:

- Candidate UI should label every asset candidate with provenance:
  `original_imported` or `generated_proposal`.
- Canonical logo/color/font confirmation must only source from explicitly
  chosen and governed evidence. Generated proposal assets must not overwrite
  original identity unless a later human decision authorizes a rebrand.

## Evidence-Gap Matrix

| Domain | Desired Canonical Knowledge | Existing Evidence | Current Producing Stage | Current Consuming Stage | Gap Type | Confidence | Deterministically Recoverable? | Human Confirmation Required? | Recommended Future Phase | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Offerings | Confirmed service portfolio | Body text lists legal support, consulting, representation, legal areas | Raw Evidence | Business Discovery / DBT | CAPTURED_NOT_CLASSIFIED, LOW_CONFIDENCE, HUMAN_CONFIRMATION_REQUIRED | Medium as candidate, not canonical | Yes | Yes | Business Evidence Enrichment | P0 |
| Audience | Confirmed target audience | Body text references individuals and companies, geography, languages | Raw Evidence | Business Discovery / DBT | CAPTURED_NOT_CLASSIFIED, LOW_CONFIDENCE, HUMAN_CONFIRMATION_REQUIRED | Medium as candidate, not canonical | Yes | Yes | Business Evidence Enrichment | P0 |
| Logo | Confirmed canonical logo asset | `alt="Logo"` image and structured logo URL | Raw Evidence / Imported Asset Registry | Business Foundation Projection | CAPTURED_NOT_CLASSIFIED, RUNTIME_PROJECTION_MISSING, HUMAN_CONFIRMATION_REQUIRED | High as candidate, not canonical | Yes | Yes | Asset Evidence Classification | P1 |
| Brand colors | Confirmed canonical palette | Repeated CSS color values | Raw Evidence / CSS | Business Foundation Projection | CAPTURED_NOT_CLASSIFIED, CANONICAL_CONTRACT_MISSING, HUMAN_CONFIRMATION_REQUIRED | Medium as candidate | Yes | Yes | Visual Identity Candidate Model | P1 |
| Typography | Confirmed canonical fonts | 17 font assets, `Nationale` CSS `@font-face`, icon fonts | Raw Evidence / CSS | Business Foundation Projection | CAPTURED_NOT_CLASSIFIED, LOW_CONFIDENCE, CANONICAL_CONTRACT_MISSING, HUMAN_CONFIRMATION_REQUIRED | Medium for `Nationale`, low for usage | Yes | Yes | Visual Identity Candidate Model | P1 |
| Visual style | Governed CGP/visual identity | Screenshots, CSS, layout geometry, assets, imagery | Evidence Capture / Raw Evidence | WDB / Business Foundation | CAPTURED_NOT_CLASSIFIED, CANONICAL_CONTRACT_MISSING, HUMAN_CONFIRMATION_REQUIRED | Low to medium | Partly | Yes | Visual Identity Candidate Model | P1 |
| Business differentiators | Confirmed differentiators | Body copy mentions expertise, personal approach, care, responsiveness, languages | Raw Evidence | Business Discovery / DBT | CAPTURED_NOT_CLASSIFIED, LOW_CONFIDENCE, HUMAN_CONFIRMATION_REQUIRED | Medium as candidate | Yes | Yes | Business Evidence Enrichment | P1 |
| Trust evidence | Confirmed trust proof | Contact, address, working hours, registry/tax numbers, languages, contact path | Raw Evidence / Business Discovery | DBT / WDB / WGP | CLASSIFIED_NOT_PROJECTED, CAPTURED_NOT_CLASSIFIED, LOW_CONFIDENCE, HUMAN_CONFIRMATION_REQUIRED | Low canonical, medium candidate | Yes | Yes | Business Evidence Enrichment | P1 |

## Gap Classifications

Allowed classes:

- `NOT_CAPTURED`
- `CAPTURED_NOT_CLASSIFIED`
- `CLASSIFIED_NOT_PROJECTED`
- `LOW_CONFIDENCE`
- `CONFLICTING_EVIDENCE`
- `HUMAN_CONFIRMATION_REQUIRED`
- `CANONICAL_CONTRACT_MISSING`
- `RUNTIME_PROJECTION_MISSING`

ODV classifications:

| Domain | Classes |
| --- | --- |
| Offerings | `CAPTURED_NOT_CLASSIFIED`, `LOW_CONFIDENCE`, `HUMAN_CONFIRMATION_REQUIRED` |
| Audience | `CAPTURED_NOT_CLASSIFIED`, `LOW_CONFIDENCE`, `HUMAN_CONFIRMATION_REQUIRED` |
| Logo | `CAPTURED_NOT_CLASSIFIED`, `RUNTIME_PROJECTION_MISSING`, `HUMAN_CONFIRMATION_REQUIRED` |
| Brand colors | `CAPTURED_NOT_CLASSIFIED`, `CANONICAL_CONTRACT_MISSING`, `HUMAN_CONFIRMATION_REQUIRED` |
| Typography | `CAPTURED_NOT_CLASSIFIED`, `LOW_CONFIDENCE`, `CANONICAL_CONTRACT_MISSING`, `HUMAN_CONFIRMATION_REQUIRED` |
| Visual style | `CAPTURED_NOT_CLASSIFIED`, `CANONICAL_CONTRACT_MISSING`, `HUMAN_CONFIRMATION_REQUIRED` |
| Business differentiators | `CAPTURED_NOT_CLASSIFIED`, `LOW_CONFIDENCE`, `HUMAN_CONFIRMATION_REQUIRED` |
| Trust evidence | `CLASSIFIED_NOT_PROJECTED`, `CAPTURED_NOT_CLASSIFIED`, `LOW_CONFIDENCE`, `HUMAN_CONFIRMATION_REQUIRED` |

No domain currently requires `CONFLICTING_EVIDENCE` as the primary
classification. There may be future candidate conflicts, especially between
CSS theme colors and generic/plugin colors, but MVP-3.1-B did not classify
them as canonical conflicts.

## MVP Priorities

P0 blocks credible website generation:

- Offerings
- Audience

P1 materially improves visual or business fidelity:

- Logo
- Brand colors
- Typography
- Visual style
- Business differentiators
- Trust evidence

P2 useful but not required for first migration wave:

- Full CGP beyond candidate logo, palette, typography, imagery, buttons, and
  density
- Fine-grained icon style
- Complete responsive visual style taxonomy

## Human-Governance Boundary

| Domain | May Observe Automatically | May Propose Candidate | May Classify Deterministically | Requires Human Confirmation | Persist Canonical Only After Confirmation |
| --- | --- | --- | --- | --- | --- |
| Offerings | Body text, headings, metadata, repeated phrases | Service candidates with source refs | Confidence and evidence coverage | Yes | Yes |
| Audience | Customer-type wording, geography, language, CTA context | Audience candidates with source refs | Confidence and evidence coverage | Yes | Yes |
| Logo | HTML image refs, alt text, structured logo URL, header usage | Logo asset candidate | Candidate confidence and preview state | Yes | Yes |
| Brand colors | CSS values, SVG fills, style samples | Candidate palette | Frequency, selector context, generic-color filtering | Yes | Yes |
| Typography | Font assets, `@font-face`, usage samples | Typography candidates | Family/source/local availability | Yes | Yes |
| Visual style | Layout, screenshots, CSS, image style | CGP candidate observations | Evidence-backed style categories | Yes | Yes |
| Differentiators | Body claims, repeated themes, trust copy | Differentiator candidates | Evidence and confidence | Yes | Yes |
| Trust evidence | Contact, legal identifiers, testimonials, address, hours | Trust candidates | Source class and confidence | Yes | Yes |

AI or deterministic extraction must not silently turn candidates into truth.

## Reuse Existing Architecture

Reuse first:

- Evidence Capture baseline for layout, navigation, section, screenshot,
  source URL, raw DOM, diagnostics, and asset counts.
- Raw imported site artifact and raw file map for HTML, CSS, image, font, icon,
  and favicon evidence.
- Candidate Discovery lineage for route/navigation/section context.
- Candidate Review governance pattern for a future candidate confirmation UX.
- Reconstruction Package and StructurePlan for layout and section context,
  not business truth.
- Existing `siteVersion.importProvenanceSummary` latest-pointer pattern for
  future candidate artifacts if persistence is later authorized.

Avoid:

- A parallel extraction pipeline disconnected from the imported raw artifact
  and evidence-capture lineage.
- Directly mutating DBT from raw extraction.
- Treating generated proposal assets as original identity.

## Contract Expansion Decision

Do not add contracts merely because Business Foundation displays an empty
state.

First future implementation should determine:

- whether raw evidence can be projected as candidates without persistence
- whether existing Business Discovery can receive a narrow evidence-enrichment
  input
- whether Candidate Review-style governance can authorize promotion
- whether current DBT missing knowledge already supports unresolved state
- whether WDB/WGP can consume confirmed DBT revisions without new fields

Precise justifications if contract changes become necessary:

- Asset Evidence Classification may need a candidate artifact if candidate
  lists must be persisted, reviewed, and reloaded independently.
- Visual Identity Candidate Model may need a candidate contract if logo,
  palette, typography, and style evidence need stable source refs and
  confidence before human confirmation.
- Canonical DBT changes are only justified after confirmed candidates need to
  become governed business knowledge.

## Minimal Future Sequence

### A. Asset Evidence Classification

Goal: classify existing original imported assets as candidates, not canonical
truth.

Scope:

- logo candidates from filename, alt text, structured data, header use,
  repeated use, SVG, favicon, dimensions, and preview availability
- font assets and icon fonts
- image/icon/content/decorative classes
- provenance label `original_imported`

Stop before DBT mutation.

### B. Visual Identity Candidate Model

Goal: present candidate logo, palette, typography, and visual style from
existing evidence.

Scope:

- source refs
- preview refs
- confidence
- limitations
- generic/plugin color filtering
- local/external font availability

Stop before canonical CGP.

### C. Business Evidence Enrichment

Goal: produce evidence-backed candidates for offerings, audience,
differentiators, and trust.

Scope:

- rendered text, headings, metadata, structured data, repeated phrases, CTA
  context, and contact/legal details
- confidence and source refs
- conflict visibility

Stop before confirmation.

### D. Human Confirmation / Alignment UX

Goal: let a human confirm, reject, defer, or correct candidates.

Scope:

- governed review events
- candidate status
- rationale
- source evidence visibility

Stop before automatic truth promotion.

### E. Canonical DBT Update

Goal: persist confirmed facts into a DBT revision with lineage.

Scope:

- confirmed offerings
- confirmed audience
- confirmed visual identity references
- confirmed differentiators and trust evidence

Requires human confirmation artifacts.

### F. WDB/WGP Regeneration

Goal: rebuild WDB/WGP only after confirmed DBT changes.

Scope:

- regenerate downstream website intent and generation package from the new DBT
  revision

This is not part of MVP-3.1-B.

## Success Criteria For Future Evidence Enrichment

Logo:

- candidate asset identified
- source location known
- preview available
- confidence visible
- human confirmation recorded
- canonical DBT reference created only after confirmation

Colors:

- source evidence listed
- candidate palette produced
- duplicate/generic/plugin colors filtered
- human confirmation recorded
- canonical palette versioned

Typography:

- used family identified
- source and license/reference known where available
- local/external availability known
- icon fonts separated from text fonts
- human confirmation recorded
- canonical typography versioned

Offerings and audience:

- evidence-backed candidates
- confidence and source refs
- conflicts visible
- human alignment completed
- DBT version updated only after confirmation

## WU-0 Reconciliation Note

Phase WU-0 audited the wider repository boundary between Website Import and
Business Discovery after this gap plan. Its canonical record is:

- `docs/architecture/WEBSITE_UNDERSTANDING_REALITY_AUDIT.md`

WU-0 preserves this plan's finding that ODV has captured-but-not-classified
offerings, audience, logo, colors, typography, visual style, differentiators,
and trust evidence. It changes the immediate next step from a narrow visual
identity planning phase to a repository-wide reconciliation/design boundary:
define the source-site Website Understanding projection over existing Import,
Evidence Capture, Candidate Discovery, Candidate Review, Reconstruction
Package, StructurePlan, semantic import, asset inventory, and Business
Discovery input artifacts first.

## Superseded Recommended Next Phase

MVP-3.1-C - Asset Evidence Classification and Visual Identity Candidate
Planning.

Keep it bounded to original imported assets and visual-identity candidates.
Do not persist canonical identity, mutate DBT, edit Business Alignment,
regenerate WDB/WGP, call AI, create workers, or publish anything.

WU-0 supersedes this as the immediate next step with:

```text
WU-1 - Source Website Understanding Projection Contract Design
```

Keep WU-1 design-only. Do not implement extraction, persistence, schema, API,
UI, workers, AI, Business Discovery behavior changes, DBT mutation, WDB/WGP
changes, generation, publishing, deployment, DNS, or production mutation.

## WU-1 Projection Contract Note

Phase WU-1 completed the design-only projection boundary and made this plan's
evidence-governance distinction explicit in the source-site contract.

Canonical specification:

- `docs/architecture/SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_SPECIFICATION.md`

The Source Website Understanding Projection exposes original-import asset
inventory, asset usage evidence where available, visual identity signals,
offering candidates, audience candidates, trust candidates, confidence,
limitations, and diagnostics as source-site understanding only. It does not
create canonical logo, palette, typography, offerings, audience, or DBT truth.

The immediate implementation path therefore becomes WU-2: implement the pure
runtime projection over existing artifacts, prove it on ODV and ViroiDoc, and
only then add optional Business Discovery consumption.
