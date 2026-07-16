# Source Content & Visual Continuity Projection Specification

## Phase Boundary

Phase VCU-1 defines the canonical Source Content & Visual Continuity Projection
boundary.

This phase is documentation and conceptual contract design only. It does not
implement runtime contract code, a builder, loader, persistence, schema, API,
UI, workers, extraction, HTML parsing, screenshot capture, thumbnail
generation, content transformation, asset classification runtime, Candidate
Review changes, Business Discovery changes, DBT changes, WDB changes, WGP
changes, Provider Payload changes, Proposal v3, AI execution, provider
execution, generation, approval, publishing, deployment, DNS mutation,
production mutation, or runtime refactors.

## Canonical Definition

Source Content & Visual Continuity Projection:

> A deterministic, connector-neutral, evidence-backed, read-only projection of
> source content and visual materials that may need to be preserved, improved,
> reviewed, or intentionally excluded during future website generation.

The projection answers:

```text
What source content, assets, visual signals, and structural characteristics
should remain available to future generation so that the new website remains
recognizably connected to the imported website?
```

The projection:

- composes existing evidence;
- preserves exact source artifact references;
- separates observed evidence, structured evidence, candidates, reviewed
  decisions, reuse readiness, unavailable material, and unsafe material;
- exposes continuity material without changing it;
- keeps missing and uncertain signals explicit;
- remains read-only and connector-neutral.

The projection does not:

- perform source acquisition;
- create business facts;
- confirm brand identity;
- authorize asset reuse;
- transform content;
- instruct a provider directly;
- persist new canonical truth.

The projection is not business truth, canonical brand identity, a Digital
Business Twin, a Website Design Brief, a Website Generation Package, a Provider
Payload, generated content, an approval artifact, a publishing artifact, or a
replacement for Source Website Understanding.

## Architectural Position

Canonical causal flow:

```text
Imported Source Website
-> Import / Raw Artifacts / Asset Registry
-> Evidence Capture / Semantic Import / Candidate Discovery
-> Source Website Understanding Projection
-> Source Content & Visual Continuity Projection
   -> future WDB enrichment
   -> future WGP enrichment
   -> future Provider Payload enrichment
   -> future human confirmation
-> Generated Website Proposal
```

The continuity projection is an upstream source-site read model. Future WDB,
WGP, Provider Payload, and generation layers may consume it after their own
contracts are updated, but those downstream layers must never feed back into the
projection.

## Persistence Policy

Preferred model: **A. Pure runtime projection with no dedicated persistence.**

This is the smallest safe model because repository reality already persists the
authoritative inputs: source import identity, raw imported artifacts, file and
asset metadata, semantic import output, Evidence Capture records, rendered
screenshots, Candidate Discovery output, Candidate Review decisions,
Reconstruction Package context, Source Website Understanding Projection inputs,
limitations, and diagnostics. VCU-1 does not need a new canonical artifact to
answer a read-only continuity question.

Rejected models:

| Model | VCU-1 decision |
| --- | --- |
| B. Persisted derived projection in existing provenance | Possible later as a cache or evidence snapshot, but premature before VCU-2 proves rebuild cost, equality stability, and operator value. |
| C. New canonical persisted artifact | Rejected for MVP because it would imply canonical content, brand, or reuse authority that belongs to evidence, candidate review, human governance, DBT, WDB/WGP, or approval layers. |

Deterministic reconstruction must be possible from exact source artifact refs,
contractVersion, stable identity rules, stable sorting, normalized output, and
explicit missing/stale diagnostics. The same refs must rebuild an equivalent
projection, and normalized equality checks must be available for validation and
future caching.

Stale-input detection compares selected artifact refs with the expected latest
or explicitly requested upstream heads for the same siteVersionId, sourceSiteId,
dryRunId, and connector lineage. Stale inputs remain visible as stale
limitations. They do not become fresh by being projected.

Inspectability requires the projection to expose lineage, source refs,
knowledge states, continuity states, readiness dimensions, limitations,
diagnostics, and validation results rather than one opaque score. Optional
future caching may store a derived snapshot, but that cache must not become
canonical business truth or brand truth.

## Allowed Inputs

The projection may consume only upstream source-site evidence, candidate, and
review/context artifacts.

| Input class | Required | Authority | Contribution | Stale behavior | Missing behavior | May provide |
| --- | --- | --- | --- | --- | --- | --- |
| Source Website Understanding Projection | Required for ready states | Structured source understanding | source identity, routes, content, assets, visual signals, limitations, diagnostics, lineage | mark stale and block delivery readiness | projection invalid or not_ready for source continuity | observations, candidates, reviewed decisions, limitations |
| source import metadata | Required | import authority | siteVersionId, sourceSiteId, dryRunId, connector type, source URL, import timestamp | stale identity blocks ready state | invalid if no source identity exists | observations |
| raw imported artifact metadata | Optional but expected | immutable source evidence | raw file refs, source paths, file map, source availability | stale refs lower readiness | unavailable/missing diagnostics | observations |
| semantic import result | Optional | structured source evidence | text, headings, metadata, links, image refs, structured data, semantic sections | stale structured evidence flagged | no reparsing inside projection | observations, structured evidence |
| source text evidence | Optional but expected | immutable/structured evidence | page titles, headings, paragraphs, lists, CTAs, contact details, service text, legal text, alt text | stale text refs remain stale | text domains partially_ready or missing | observations, candidates |
| asset registry and file metadata | Optional but expected | raw evidence | asset identity, path, MIME type, size, hash, dimensions, source refs, preview refs | stale inventory blocks reuse readiness | asset inventory incomplete | observations |
| Evidence Capture | Optional but expected | structured rendered evidence | DOM/capture evidence, layout refs, computed styles, screenshots, capture limitations | stale capture lowers visual readiness | screenshot/style/layout unavailable | observations, diagnostics |
| rendered screenshots | Optional but expected | immutable rendered evidence | visual baseline, layout reference, original thumbnail source | stale screenshot cannot be delivery-ready | screenshot availability dimension missing | observations |
| computed-style samples | Optional | structured rendered evidence | typography, color, spacing, radius, shadow, density, button signals | stale samples lower confidence | style signals unavailable | observations, candidates |
| Candidate Discovery | Optional but expected | deterministic candidates | content, structure, asset, visual, and business-signal candidates with confidence and refs | stale candidates not delivery-ready | candidates missing, not inferred | candidates |
| Candidate Review decisions | Optional | human-reviewed candidate governance | approved/rejected/deferred/unreviewed decisions and review lineage | stale review decision flagged | unreviewed, not approved | reviewed decisions |
| Reconstruction Package context | Optional | reviewed reconstruction eligibility | eligibility, blockers, approved candidate refs, limitations | stale context only affects readiness | no reconstruction eligibility inferred | reviewed decisions, planning context |
| StructurePlan | Optional context only | downstream planning context | planned organization, route/section intent, context for future enrichment | stale context cannot prove source reality | no readiness block for source evidence | planning context only |
| source limitations and diagnostics | Required when emitted upstream | layer-local diagnostics | completeness gaps, unsupported evidence, stale refs, conflicts, unsafe refs | propagated with stale status | missing diagnostics becomes diagnostic gap | diagnostics |
| safe preview/access references | Optional but required for reuse readiness | access-control boundary | authenticated preview refs for assets/screenshots | stale refs block reuse/delivery readiness | asset may remain evidence but not reusable | observations, reuse readiness |

## Forbidden Inputs

The projection must never consume:

- Digital Business Twin;
- Business Understanding Report;
- Business Alignment;
- Website Design Brief;
- Website Generation Package;
- Provider Generation Payload;
- Generated Website Proposal;
- Generated Proposal Bundle;
- Observed Website Model;
- Compliance;
- Compliance Report;
- Improvement Plan;
- Evolution Analysis;
- Business Approval;
- publishing state.

This protects causal direction. Downstream artifacts can compare against or
consume the continuity projection in future phases, but they cannot rewrite the
source continuity read model.

## Authority Hierarchy

Authority order:

```text
Immutable source evidence
-> Structured source evidence
-> Deterministic continuity candidates
-> Human-reviewed decisions
-> Continuity projection
-> Future website design and generation intent
```

Rules:

- reviewed decisions may affect candidate presentation;
- rejected candidates remain traceable;
- unreviewed candidates remain unconfirmed;
- source implementation details cannot silently become brand truth;
- downstream generated artifacts cannot rewrite source continuity;
- StructurePlan cannot prove source reality.

## Continuity Domains

### A. Source Text Continuity

Cover page titles, metadata, headings, paragraphs, lists, navigation labels,
CTA labels, contact details, service and offering text, audience language,
trust statements, differentiators, geographic and multilingual text, footer
text, legal text, alt text, and structured-data text.

### B. Content Structure Continuity

Cover page association, route association, section association, content order,
heading hierarchy, CTA relationship, contact-path relationship, semantic role,
and source evidence references.

### C. Content Transformation Candidates

Expose proposed policies only: preserve verbatim, preserve with cleanup,
improve wording while preserving meaning, summarize, restructure, exclude,
require confirmation, or prohibit automatic generation. No transformation
occurs in this projection.

### D. Asset Continuity

Cover source images, logo candidates, hero-image candidates, content-image
candidates, background-image candidates, icons, SVGs, fonts, videos, documents,
favicons, manifest assets, and other files.

### E. Asset Usage Evidence

Cover source page usage, section usage, header/navigation usage, CSS usage,
background usage, repeated usage, alt text, dimensions, MIME type, size, source
path, and safe preview/access reference.

### F. Asset Reuse Candidates

Expose safe to reuse automatically, candidate for reuse, requires confirmation,
licensing unresolved, technically unusable, low quality, duplicate, decorative,
unknown role, or prohibited. VCU-1 does not approve any real asset for reuse.

### G. Visual Identity Signals

Cover logo candidates, color signals, typography candidates, icon-font
candidates, icon-style signals, image-style signals, button-style signals,
spacing signals, radius signals, shadow signals, visual-density signals, and
layout tendencies.

### H. Source Layout Continuity

Cover page structure, section sequence, section proportions, hero presence,
header/footer behavior, grid tendencies, alignment, responsive evidence,
layout geometry, and source screenshots.

### I. Continuity Readiness And Governance

Cover evidence completeness, content coverage, asset coverage, candidate review
coverage, licensing state, visual continuity coverage, unresolved conflicts,
transformation-policy coverage, safe-delivery readiness, limitations, and
diagnostics.

## Conceptual Contract Types

These are conceptual contracts only. VCU-1 does not define TypeScript.

| Concept | Responsibility |
| --- | --- |
| SourceContentVisualContinuityProjection | Top-level deterministic read model for one imported website's source continuity materials. |
| SourceContentVisualContinuityLineage | Exact source refs, selected inputs, forbidden-input proof, staleness checks, equality key, and validation lineage. |
| ContinuityArtifactReference | Stable reference to an upstream source artifact, evidence artifact, candidate artifact, review artifact, screenshot, or safe access ref. |
| SourceContentBlock | Deterministic source text block with route/section/type/content hash, evidence refs, role candidates, and transformation policy candidates. |
| SourceContentEvidenceReference | Pointer to source text, DOM, semantic import, Evidence Capture, or Candidate Discovery evidence. |
| SourceContentContinuityCandidate | Candidate for preserve/improve/summarize/restructure/exclude behavior with confidence, evidence, and review state. |
| SourceContentTransformationPolicy | Proposed source text policy with eligibility, required evidence, confidence, review requirement, examples, and forbidden behavior. |
| SourceAssetContinuityItem | Imported asset continuity record with registry identity, source path, media metadata, preview/access refs, usage evidence, state, and lineage. |
| SourceAssetUsageEvidence | Source page, section, CSS, background, alt text, repeated-use, dimension, and safe-preview evidence for an asset. |
| SourceAssetReuseCandidate | Candidate reuse state and constraints for an asset. |
| SourceLogoContinuityCandidate | Logo candidate evidence without confirmed-logo promotion. |
| SourceImageContinuityCandidate | Image role candidates and reuse guidance without classifier implementation. |
| SourceTypographyContinuityCandidate | Font family/file/usage candidates, separating text fonts from icon fonts. |
| SourceColorContinuitySignal | Color value, declaration, computed usage, semantic candidate role, evidence refs, and confidence. |
| SourceVisualStyleContinuitySignal | Style signals for icon/image/button/spacing/radius/shadow/density/layout tendencies. |
| SourceLayoutContinuity | Source structure, layout relationships, section sequence, geometry refs, and screenshot refs. |
| SourceScreenshotReference | Source screenshot metadata and safe access lineage. |
| ContinuityReadiness | Overall readiness plus named dimensions and blockers. |
| ContinuityReadinessDimension | One domain-level readiness result with status, coverage, limitations, and refs. |
| ContinuityConfidence | LOW, MEDIUM, or HIGH with caps and reasons. |
| ContinuityLimitation | Human-readable and machine-readable limitation with domain, severity, state, refs, and remediation hint. |
| ContinuityDiagnostic | Technical diagnostic for missing, stale, conflicting, unsupported, unsafe, or invalid inputs. |
| ContinuityValidationResult | Validation outcome for identity, lineage, states, confidence, readiness, forbidden inputs, and safety rules. |

## Top-Level Projection Shape

Conceptual shape:

```text
SourceContentVisualContinuityProjection
  projectionId
  contractVersion
  generatedAt
  siteVersionId
  sourceSiteId
  dryRunId
  connectorType
  sourceWebsiteUnderstandingProjectionId
  sourceArtifactRefs
  evidenceArtifactRefs
  candidateArtifactRefs
  reviewArtifactRefs
  screenshotArtifactRefs
  sourceIdentity
  contentBlocks
  contentTransformationCandidates
  assetContinuity
  visualIdentitySignals
  layoutContinuity
  sourceScreenshots
  readiness
  confidence
  limitations
  diagnostics
  lineage
```

Not every field must be populated. Missing fields must remain explicit.

## Knowledge And Continuity States

Knowledge states should stay WU-compatible where possible:

| State | Meaning |
| --- | --- |
| observed | Directly observed in immutable source evidence. |
| structured | Organized from observed evidence by upstream deterministic source/evidence layers. |
| candidate | Proposed meaning or role from deterministic candidate extraction. |
| reviewed | Candidate has a recorded governance outcome. |
| confirmed_source_fact | Confirmed about the imported source website only, not canonical business truth. |
| rejected | Reviewed or invalidated candidate should not be treated as accepted. |
| conflicting | Inputs disagree or evidence supports incompatible interpretations. |
| missing | Expected evidence was checked and not found. |
| unavailable | Evidence cannot be checked because the source/artifact/capture is absent or inaccessible. |

Continuity-specific status is separate from knowledge state:

| Status | Meaning |
| --- | --- |
| preserve_candidate | Candidate to keep source wording/material recognizable. |
| improve_candidate | Candidate to improve wording/design while preserving evidence-backed meaning. |
| reuse_candidate | Candidate asset/style/material for future reuse. |
| exclude_candidate | Candidate to intentionally exclude with reason. |
| confirmation_required | Human review is required before use. |
| licensing_unresolved | Legal/source authorization is unresolved; no automatic reuse. |
| technically_unusable | Broken, unsupported, unsafe, or inaccessible for delivery. |

There is no `canonical` state inside this projection.

## Source Content Identity

Every source content block must have deterministic identity based on stable
inputs such as siteVersionId, route, source section identity, source node or
evidence identity, content type, and normalized source content hash.

Identity must support repeatable builds, source lineage, transformation
history, later comparison between source and generated copy, and duplicate
detection. Random IDs are forbidden.

## Source Asset Identity

Every asset continuity item must preserve the existing imported asset identity,
normalized safe path/reference, content hash where available, source artifact
reference, usage evidence, preview/access reference, classification state, and
review state. VCU-1 does not create a second asset registry.

## Content Transformation Policy

Policies are recommendations and obligations for future contracts. No
transformation occurs in VCU-1.

| Policy | Eligibility | Required evidence | Confidence | Review requirement | Examples | Forbidden behavior |
| --- | --- | --- | --- | --- | --- | --- |
| PRESERVE_VERBATIM | exact legal, identity, contact, or source copy that must stay unchanged | direct source text ref and stable identity | HIGH for exact evidence | required when legal/licensing/identity is sensitive | business name, phone, email, legal text | paraphrase, strengthen, translate, or omit silently |
| PRESERVE_WITH_CLEANUP | source text needs typography, whitespace, punctuation, or markup cleanup only | source text and cleanup rationale | MEDIUM or HIGH | required for sensitive claims | fix spacing or broken line breaks | meaning change |
| IMPROVE_PRESERVING_MEANING | wording can be improved without new claims | source text, role candidate, evidence-backed meaning | MEDIUM or HIGH | required when classification is uncertain | clearer service copy | add unsupported offerings or audience claims |
| SUMMARIZE | long source text can be shortened while preserving meaning | source block refs and summary scope | MEDIUM or HIGH | required for legal/trust/service claims | shorten long intro copy | omit required contact/legal details |
| RESTRUCTURE | content can move/split while preserving meaning and lineage | source block refs, section relationship, target intent | MEDIUM or HIGH | required if source order matters | split a service paragraph into bullets | detach from source lineage |
| EXCLUDE | content should not appear in generated site | exclusion reason and source ref | LOW to HIGH | required when exclusion may remove important information | placeholder or obsolete copy | silently drop legal/contact/trust content |
| REQUIRE_CONFIRMATION | no transformation until reviewed | unresolved classification, conflict, or sensitivity | LOW or conflicting | mandatory | inferred audience or differentiator | use automatically |
| PROHIBIT_AUTOMATIC_GENERATION | must never be automatically changed or reproduced | legal, safety, licensing, privacy, or policy blocker | any | mandatory | unsafe/legal text, prohibited asset-associated text | include in provider payload as reusable content |

Default content governance:

- Contact details: preserve verbatim unless explicitly corrected.
- Legal text: preserve verbatim or require confirmation.
- Business name: preserve verbatim.
- Navigation labels: preserve or improve cautiously.
- Service/offer text: candidate for meaning-preserving improvement; require
  confirmation when classification is uncertain.
- Audience statements: require confirmation when inferred.
- Trust claims: preserve only when directly evidenced; never strengthen
  automatically.
- Differentiators: require confirmation unless explicit.
- Placeholder/legacy text: exclude or require confirmation.

VCU-1 does not implement policy assignment.

## Asset Reuse Policy

No real asset is assigned a final reuse state in VCU-1.

| State | Requirement |
| --- | --- |
| SAFE_TO_REUSE | valid asset, known source, safe preview, supported media type, no known blocker, clear role, acceptable quality, and licensing/source state sufficient under future policy. |
| CANDIDATE_FOR_REUSE | evidence exists, but role, quality, source status, or governance is unresolved. |
| REQUIRES_CONFIRMATION | human approval required before delivery or generation use. |
| LICENSING_UNRESOLVED | no automatic reuse. |
| TECHNICALLY_UNUSABLE | unsupported, broken, unsafe, inaccessible, or unsuitable for delivery. |
| LOW_QUALITY | may remain evidence but should not automatically be reused. |
| DUPLICATE | use preferred canonical candidate only after governance. |
| DECORATIVE | may be reused only as non-semantic decoration. |
| PROHIBITED | never deliver to generation. |

## Logo Policy

Logo candidates must expose source asset identity, source usage,
structured-data reference, alt text, header/navigation usage, repeated usage,
dimensions, preview reference, evidence refs, confidence, review state,
licensing/source status, and continuity recommendation.

A logo candidate must never be labelled as the confirmed company logo without
human governance.

## Typography Policy

Typography candidates must distinguish brand/body/heading candidates, icon
fonts, fallback fonts, externally referenced fonts, locally available fonts,
and unsupported or missing fonts.

Required fields include family, files, weights, styles, source usage,
heading/body usage, local/external availability, license/source metadata where
available, confidence, and review state.

Fontello, FontAwesome, or another icon font must never be promoted as a brand
typeface merely because it is frequent or locally available.

## Color Policy

Color signals should include value, representation, source CSS variable or
declaration, SVG use, computed-style use, semantic usage, frequency, contrast
context, evidence refs, confidence, and candidate role.

Candidate roles may include primary candidate, secondary candidate, accent
candidate, background candidate, text candidate, generic UI color, or
uncertain. No candidate role equals canonical brand palette.

## Image Policy

Image continuity candidates should expose source asset, role candidates,
page/section usage, hero/background usage, dimensions, quality indicators, alt
text, caption, repeated usage, preview, licensing/source state, review state,
and reuse recommendation.

Required role candidates: logo, hero, content, gallery, background, icon,
decorative, testimonial, team/person, location, product/service, and unknown.
VCU-1 implements no new classifier.

## Layout Continuity Policy

Future generation may preserve information hierarchy, section relationships,
recognizable layout patterns, and key hero/content sequencing without copying
obsolete implementation details.

The projection must distinguish observed source layout, continuity candidate,
future design intent, and generated implementation. It does not require
pixel-identical recreation.

## Screenshot Role

Source screenshots may serve as visual evidence, layout reference,
design-continuity reference, original thumbnail source, and later comparison
baseline. Screenshots must not become business truth.

Required metadata: artifact/reference, viewport, capture timestamp, source URL,
dimensions, completeness, safe access reference, and lineage.

## Thumbnail Architecture Boundary

Preferred MVP model from VCU-0: **hybrid persisted screenshot thumbnail with
live preview on click.**

Conceptual model:

- Original Website card: persisted Evidence Capture screenshot thumbnail.
- Generated Iteration cards: persisted immutable screenshot associated with
  Generated Proposal Bundle.
- Live preview: existing durable authenticated preview route.

Rules:

- screenshot is presentation metadata;
- live bundle remains the authoritative interactive preview;
- thumbnail must be immutable per iteration;
- thumbnail generation is out of scope for VCU-1;
- thumbnail persistence must not mutate the underlying generated proposal.

Future ownership recommendation:

| Concern | Preferred owner |
| --- | --- |
| original-source thumbnail | Evidence Capture screenshot presentation metadata |
| generated-iteration thumbnail | derived child artifact associated with the Generated Proposal Bundle |
| thumbnail metadata | preview presentation artifact metadata with bundle/source refs |
| screenshot bytes | immutable screenshot storage controlled by future thumbnail/capture runtime |
| preview URL | existing authenticated preview routes |
| regeneration/retry | future screenshot/thumbnail runtime, never proposal mutation |
| failure state | explicit thumbnail readiness dimension and diagnostic |

Preferred generated-thumbnail model: **a derived child artifact associated with
the Generated Proposal Bundle.** It is not additional mutable bundle metadata
and not a canonical generated proposal asset. This keeps the bundle immutable
while allowing presentation thumbnails to be generated, retried, invalidated,
or replaced under their own lineage.

## Readiness Model

Statuses:

| Status | Meaning |
| --- | --- |
| not_ready | Required source identity or minimum continuity evidence is missing. |
| partially_ready | Some continuity material exists, but important domains are incomplete, unreviewed, inaccessible, or unresolved. |
| ready_for_design_enrichment | Enough continuity material exists to enrich WDB/WGP conservatively. |
| ready_for_generation_delivery | Continuity materials are sufficiently classified, governed, accessible, and safe to include in a future provider package. |
| blocked | A required upstream artifact is unavailable, invalid, unsafe, or contradictory. |
| stale | One or more selected inputs are not expected source-lineage heads. |
| invalid | Validation failed because identity, lineage, states, refs, safety, or forbidden-input rules are unsafe. |

`ready_for_design_enrichment` does not mean website approval, complete business
knowledge, licensed assets, or publishing authorization. It means WDB/WGP can
be enriched conservatively.

`ready_for_generation_delivery` does not mean website approval, complete
business knowledge, all assets licensed, or publishing authorization. It means
materials are classified, governed, accessible, and safe enough for a future
provider package under explicit constraints.

Readiness dimensions:

- source content capture;
- content identity;
- content classification;
- transformation-policy coverage;
- asset inventory;
- asset usage evidence;
- logo candidate coverage;
- image candidate coverage;
- typography signal coverage;
- color signal coverage;
- visual-style coverage;
- layout continuity coverage;
- screenshot availability;
- asset-access readiness;
- candidate review coverage;
- licensing/source status;
- unresolved conflicts;
- generation-delivery readiness.

Readiness must not collapse into one opaque score.

## Confidence Model

Use LOW, MEDIUM, and HIGH.

Confidence inputs may include directness of source evidence, independent
evidence count, consistency, repeated usage, review state, coverage, ambiguity,
recency, source authority, and safe accessibility.

Rules:

- counts alone do not raise confidence;
- repeated technical use does not prove brand authority;
- reviewed decisions may raise governance confidence;
- missing licensing/source information limits reuse confidence;
- confidence must not silently increase downstream.

## Fail-Closed Behavior

| Scenario | Required behavior |
| --- | --- |
| source text exists but identity is unstable | expose text only with unstable-identity limitation; block delivery readiness. |
| body copy is incomplete | build partial blocks; mark content coverage partial; do not summarize missing text. |
| asset role is unknown | keep as unknown role or candidate; no automatic reuse. |
| logo candidate conflicts | mark conflicting; require confirmation. |
| font usage is ambiguous | separate font-file evidence from usage candidate; protect icon fonts. |
| colors are generic | expose as generic UI or uncertain; do not promote to palette. |
| screenshot is unavailable | mark screenshot dimension missing/unavailable; no thumbnail claim. |
| asset preview is unavailable | asset may remain evidence but not delivery-ready. |
| licensing is unresolved | no automatic reuse. |
| Candidate Review is missing | unreviewed candidates remain unconfirmed. |
| source files are unavailable | mark unavailable; do not infer from generated output. |
| evidence is stale | mark stale and block ready_for_generation_delivery. |
| input artifacts disagree | mark conflicting, preserve all refs, lower confidence. |

The projection should build partially where safe. It must never fabricate
continuity.

## Validation Rules

Future conceptual validator:

```text
validateSourceContentVisualContinuityProjection(...)
```

Validation must check:

- source identity;
- exact WU/source lineage;
- deterministic IDs;
- unique content and asset identities;
- evidence refs;
- allowed knowledge states;
- allowed continuity states;
- confidence validity;
- readiness consistency;
- no canonical-brand promotion;
- no unsupported reuse authorization;
- no downstream artifact contamination;
- no generated-site inputs;
- no unsafe file paths;
- no missing lineage for delivered candidates;
- no icon-font-to-brand-font promotion;
- no unreviewed trust-claim strengthening.

## Future WDB Enrichment Boundary

Future WDB enrichment may consume content priorities, preserve/improve/exclude
candidates, visual identity candidates, source screenshot references, layout
continuity, unresolved governance, confidence, and limitations.

WDB remains design intent. It must not become an asset store. VCU-1 does not
change WDB.

## Future WGP Enrichment Boundary

Future WGP enrichment may consume exact source content references,
transformation obligations, source asset references, safe asset-access
references, reuse constraints, candidate visual signals, layout continuity
requirements, validation expectations, unresolved items, and licensing
restrictions.

WGP remains a generation contract. It must not silently confirm candidates.
VCU-1 does not change WGP.

## Future Provider Payload Boundary

Minimum future delivery shape for recognizable generation:

- continuity projection reference;
- source content excerpts;
- transformation policies;
- source asset manifest;
- asset access/preview references;
- logo candidates;
- image candidates;
- typography candidates;
- color candidates;
- source screenshots;
- layout continuity;
- preserve/improve/remove obligations;
- review status;
- licensing/source limitations;
- unresolved items;
- expected output continuity evidence.

VCU-1 does not modify Provider Payload.

## Generated-Output Continuity Validation

Future validation concepts:

- source content retained;
- source meaning preserved;
- required contact details retained;
- source assets reused correctly;
- logo use conforms to review state;
- typography continuity;
- color continuity;
- layout continuity;
- source structure continuity;
- unsupported claims not introduced;
- excluded content not reintroduced.

VCU-1 does not implement Compliance changes.

## Connector Neutrality

The contract must work for static HTML, WordPress, Joomla, Webflow, Shopify,
Ecwid, Mono, and future connectors. Connector-specific modules remain upstream.
The projection consumes normalized WU/import/evidence concepts only.

## Anti-Duplication Rules

Do not rebuild:

- import;
- raw artifact storage;
- asset registry;
- semantic import;
- Evidence Capture;
- Candidate Discovery;
- Candidate Review;
- Reconstruction Package;
- StructurePlan;
- Source Website Understanding;
- WDB;
- WGP;
- Provider Payload;
- Generated Proposal Bundle;
- Observed Website Model;
- Compliance;
- Evolution.

The continuity projection is composition, governance state, and delivery
readiness only.

## MVP Scope

P0:

- source body-copy identity and references;
- headings;
- CTA/contact continuity;
- section relationships;
- logo candidates;
- key image candidates;
- typography candidates;
- color signals;
- source screenshot references;
- continuity readiness;
- limitations;
- diagnostics;
- exact lineage.

P1:

- richer image-role candidates;
- visual-style signals;
- asset quality indicators;
- layout continuity;
- licensing/source metadata;
- thumbnail metadata model.

P2:

- automated creative clustering;
- visual embeddings;
- AI-assisted transformation proposals;
- advanced design-system extraction;
- sophisticated copyright/license inference.

## Real-Target Acceptance Criteria

Future ODV and ViroiDoc runtime proof must show:

- builds without new extraction;
- exact WU/source refs preserved;
- source body-copy blocks represented;
- headings/CTA/contact represented;
- logo candidates represented without confirmation;
- source image candidates represented;
- Nationale and Fontello correctly distinguished;
- color signals represented as candidates;
- source screenshot represented;
- layout/section continuity represented;
- transformation policies remain candidates;
- unresolved licensing/governance visible;
- readiness fail-closed;
- deterministic rebuild equality;
- no downstream contamination.

Primary future proof target:

```text
ODV siteVersionId: 09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Secondary future proof: ViroiDoc using documented real-target identifiers in
canonical repository docs.

## Future Runtime Modules

Recommended conceptual future files:

```text
apps/platform/gnr8/architecture/source-content-visual-continuity-projection-contract.ts
apps/platform/gnr8/architecture/source-content-visual-continuity-projection-builder.ts
apps/platform/gnr8/architecture/source-content-visual-continuity-projection-loader.ts
apps/platform/gnr8/architecture/source-content-visual-continuity-projection.test.ts
```

Because VCU-1 selects pure runtime projection, do not propose a persistence
module for VCU-2.

## Rollout Sequence

Recommended sequence:

```text
VCU-2   Pure runtime continuity projection
VCU-2-R ODV and ViroiDoc real-target validation
VCU-3   Content transformation candidate hardening
VCU-4   Visual/asset candidate hardening
VCU-5   Human confirmation UX
VCU-6   WDB/WGP enrichment shadow path
VCU-7   Provider Payload v3 shadow delivery
VCU-8   First recognizable continuity-preserving regeneration
```

Thumbnail implementation may proceed as an independent product sub-track only
if it does not alter continuity truth or generation behavior.

## Architecture Diagrams

### A. Current Narrowing Path

```text
Import / raw source evidence
-> WU source understanding
-> Business Discovery narrowing
-> DBT/BUR governance
-> WDB/WGP intent
-> Provider Payload envelope
-> manual generation
-> generic generated proposal
```

### B. Proposed Continuity Projection

```text
Import + raw artifacts + asset registry
Evidence Capture + semantic import + screenshots/styles
Candidate Discovery + Candidate Review
Source Website Understanding Projection
-> Source Content & Visual Continuity Projection
```

### C. Content Authority Hierarchy

```text
source text evidence
-> structured source content
-> transformation candidates
-> reviewed decisions
-> continuity projection
-> future WDB/WGP/payload obligations
```

### D. Asset Governance Hierarchy

```text
asset registry identity
-> source usage evidence
-> role/reuse candidate
-> review/licensing/source state
-> continuity projection
-> future delivery constraints
```

### E. Source Screenshot And Thumbnail Relationship

```text
Evidence Capture screenshot
-> source screenshot reference
-> original website thumbnail candidate
-> Workspace card presentation

Generated Proposal Bundle
-> derived immutable screenshot child artifact
-> generated iteration thumbnail
-> Workspace card presentation
```

### F. Future WDB/WGP Enrichment

```text
Continuity Projection
-> WDB source-continuity enrichment
-> WGP continuity obligations
```

### G. Provider Delivery Path

```text
Continuity Projection
-> WGP obligations
-> Provider Payload v3 shadow delivery
-> external generation
-> continuity validation
```

### H. Connector-Neutral Continuity Flow

```text
static HTML / WordPress / Joomla / Webflow / Shopify / Ecwid / Mono / future
-> connector-specific import and evidence normalization
-> normalized WU/import/evidence concepts
-> connector-neutral continuity projection
```

## VCU-1 Closeout

VCU-1 creates the canonical projection boundary only. It introduces no runtime,
persistence, schema, extraction, content transformation, asset reuse,
thumbnail generation, WDB/WGP change, Provider Payload change, Proposal v3, AI,
generation, approval, publishing, deployment, DNS mutation, or production
mutation.

Recommended next phase:

```text
VCU-2 - Pure Runtime Source Content & Visual Continuity Projection
```

## VCU-2 Runtime Implementation Update

VCU-2 is now implemented as the first pure runtime projection. Canonical runtime
record:

- `docs/architecture/SOURCE_CONTENT_VISUAL_CONTINUITY_PROJECTION_RUNTIME.md`

Implemented runtime files:

- `apps/platform/gnr8/architecture/source-content-visual-continuity-projection-contract.ts`
- `apps/platform/gnr8/architecture/source-content-visual-continuity-projection-builder.ts`
- `apps/platform/gnr8/architecture/source-content-visual-continuity-projection-loader.ts`
- `apps/platform/app/gnr8/admin/continuity/[siteVersionId]/page.tsx`

The VCU-1 persistence decision remains unchanged: no VCU persistence module,
schema, table, mutation API, extraction path, content transformation, asset
approval, thumbnail generation, WDB/WGP enrichment, Provider Payload change,
proposal regeneration, AI, publishing, deployment, DNS, or production mutation
was added.

ODV and ViroiDoc both validate read-only as `ready_for_design_enrichment`, not
`ready_for_generation_delivery`, because source assets remain candidate-only
and licensing/source reuse is unresolved.
