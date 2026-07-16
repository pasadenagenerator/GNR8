# Source Content & Visual Continuity Reality Audit

## Executive Conclusion

VCU-0 finds that GNR8 already captures far more original source content and
visual evidence than the current generation handoff uses. ODV has body text,
headings, navigation labels, CTA/contact signals, imported images, a strong logo
candidate, font files, CSS color evidence, screenshots, layout evidence, and
section boundary evidence. The recognizable identity is lost because those
signals are either candidate-only, not classified, not projected into WDB/WGP,
not serialized into the Provider Payload as usable source materials, or not
delivered to manual generation as assets and preservation instructions.

The exact body-copy loss is not at import. Body/source HTML and semantic text
exist. The first hard loss is Business Discovery and the WU-to-Business
Discovery adapter, which reduce source content to route, navigation, section
type, asset count, limitations, and diagnostics. DBT, BUR, WDB, WGP, Provider
Payload, and exports then correctly preserve missing knowledge and
non-invention constraints, but they do not carry source copy excerpts or
governed copy transformation policy. Manual Codex generation therefore received
permission to avoid invention, not the source material and rules needed to
preserve or improve the original site.

The exact visual-continuity loss is split. WU can now expose ODV visual signals:
`Tabla40x20cm_51.png` as a logo candidate, structured color signals only,
Nationale local font-file signals, Fontello icon-font signals, and large asset
inventory. Business Foundation still uses a simpler filename/media heuristic for
asset preview classification, WDB/WGP have no first-class source asset/font/color
preservation obligations, Provider Payload serializes WGP rather than a source
asset manifest, and generated proposals use generic CSS plus locally generated
abstract SVGs instead of original source assets.

Near-term architecture choice: **E. One combined Source Content & Visual
Continuity projection is needed**, implemented as a pure runtime projection over
existing Source Website Understanding, import artifacts, Evidence Capture,
Candidate Discovery/Review, Reconstruction Package, StructurePlan, WDB, WGP,
and generated bundle records. Do not create a new persisted canonical
Creative/Brand artifact in the MVP. Long term, confirmed content and identity
candidates may justify a persisted governed Brand/Creative memory, but only
after candidate review and human confirmation exist.

Preferred thumbnail architecture: **E. Hybrid: persisted screenshot thumbnail
with live preview on click**. The card should use immutable screenshot/thumb
evidence for reliability and historical comparison, while the existing live
preview routes remain the full interactive inspection path.

## Evidence Base

Repository evidence inspected:

- Architecture docs for WU, Business Foundation, Business Discovery, DBT, WDB,
  WGP, Provider Payload, generated bundles, Knowledge Workspace, architecture
  manifesto, blueprint, MVP pipeline, current state, and handoff.
- Runtime contracts and builders under
  `apps/platform/gnr8/architecture/*`.
- Import, semantic import, style signal, Evidence Capture, preview asset, and
  generated preview route code.
- ODV export packages: `ODV_EXPORT/` and `ODV_REGENERATION_EXPORT_002/`.
- ODV generated proposal bundles:
  `ODV_GENERATED_PROPOSAL_001/` and `ODV_GENERATED_PROPOSAL_002/`.
- Prior ODV/ViroiDoc real-target records documented in canonical docs and tests.

Important code evidence:

- WU contract supports `SourceContentUnderstanding`, `SourceAssetUnderstanding`,
  and `SourceVisualIdentitySignals`, including headings, visible messages, CTA
  signals, contact signals, metadata, asset usages, alt text, dimensions,
  preview URLs, logo candidates, color signals, typography signals, icon style,
  and image style.
- WU builder materializes body-text availability, headings, visible messages,
  CTA/contact signals, asset preview URLs, logo candidates, typography signals,
  and color signals without promoting them to DBT truth.
- Business Discovery builder currently emits content themes from section types
  and brand evidence from asset counts. It does not inspect original body copy,
  rendered paragraphs, service lists, CSS colors, fonts, logo alt text, or image
  roles as business facts.
- WDB contract is website intent over aligned DBT: objectives, audience,
  messages, journey, constraints, and text items. It has source refs but no
  source-copy, source-asset, typography, color, logo, screenshot, or visual-style
  carrier.
- WGP contract is generation obligations from WDB: business context, objectives,
  audience, messages, navigation, page/section contracts, content requirements,
  constraints, and validation expectations. It has evidence refs but no source
  excerpt, source asset manifest, candidate status, or asset copy rules.
- Provider Payload v1 serializes the full WGP and an implementation-proposal
  task envelope. Provider Payload v2 serializes the WGP plus regeneration
  planning context. Neither delivers original assets or copy excerpts.
- Knowledge Workspace version cards set generated `previewImageHref` to `null`
  and render generated versions as live iframes; Original Website uses the first
  imported asset preview as an image, not an Evidence Capture screenshot.

## Current Pipeline Map

Current real pipeline:

```text
Imported source URL
-> raw imported site artifact and file map
-> semantic import / rendered capture / Evidence Capture baseline
-> Candidate Discovery / Candidate Review
-> Reconstruction Package / StructurePlan
-> Source Website Understanding Projection
-> Business Discovery
-> Digital Business Twin
-> Business Understanding / Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Payload v1/v2
-> export folder
-> manual Codex proposal bundle
-> Generated Proposal Bundle persistence
-> Observed Website Model / Compliance / Evolution
-> Knowledge Workspace
```

The continuity break is not one break. It is a series of narrowing projections:

```text
source evidence rich
-> conservative business facts narrow
-> WDB/WGP intent and missing knowledge
-> Provider Payload serializes obligations, not materials
-> manual proposal avoids invention with sparse source material
-> generated output becomes a governance demonstration
```

## Source Content Trace

### Captured Text Types

| Text type | Current evidence | Structured/classified? | Current consumer | Reaches generation? |
| --- | --- | --- | --- | --- |
| Page title | ODV title documented as `SANDRA CVIJANOVIC - ODVETNICA`; WU metadata can carry title | Partially structured | WU, docs, limited DBT identity | Only as broad identity context |
| Meta description | `Odvetnica Sandra Cvijanovic` documented | Raw/partial | WU/docs | No exact reuse |
| Headings | WU content headings and sections | Structured in WU, weakly classified | WU, limited business signal candidates | Not as source section copy |
| Paragraph/body copy | Body/source HTML available; legal support, consulting, representation, service areas, languages documented | Materialized in WU as visible messages only; not full copy block carrier | WU only | No |
| Lists/service descriptions | ODV body lists legal areas and support modes | Raw/candidate-only | Docs/WU candidates | No |
| Navigation labels | `Home`, `O nas`, `Galerija`, `Kontakt`, phone, email | Structured | Business Discovery, DBT, WDB, WGP | Yes, only labels/intents |
| CTA labels | `Kontakt` and contact-oriented signals | Structured as CTA/contact signals in WU; BD detects route/nav goal | Business Discovery as goal/contact path | Yes, sparse |
| Contact details | Phone/email/nav/contact path; address/map noted in docs | Partially structured; exact details not carried through WGP | Business Discovery weak trust/contact path | Contact path only |
| Trust statements | Body tone and contact accessibility | Candidate-only | Mostly absent | No, except contact path |
| Geography/languages | Nova Gorica and languages documented | Candidate-only | Not canonical | No |
| Structured data text | Logo URL documented | Raw/candidate-only | Not canonical | No |
| Alt text | Logo alt text exists; WU asset alt can carry it | Structured in WU asset/logos | WU only | No |
| Footer/legal text | Not first-class in current WU/WGP handoff | Raw/unknown | None | No |
| Multilingual content | Slovenian source and languages | Partial | WU language/business candidate | No |

### Body-Copy Loss Point

Body copy is captured enough to prove availability and candidate evidence. It is
lost for generation at these exact layers:

1. **Business Discovery input narrowing**: WU-to-BD adapter synthesizes source
   URL, route/navigation/section evidence, asset count, limitations, and
   diagnostics. It does not pass `SourceContentUnderstanding.visibleMessages`,
   original paragraph blocks, service lists, legal text, language statements, or
   contact details.
2. **Business Discovery builder scope**: BD currently derives content from route,
   navigation, section types, and asset count. It does not inspect rendered body
   copy or classify service/audience/body claims.
3. **DBT/BUR governance**: DBT correctly records missing offerings/audience
   rather than promoting website text to canonical truth.
4. **WDB/WGP contract shape**: WDB/WGP express intent, missing knowledge, and
   generation obligations, but not source-copy preservation blocks.
5. **Provider Payload serializer**: payload serializes WGP and an envelope; it
   omits source copy excerpts and transformation policy.
6. **Manual instructions**: Codex was told not to invent and to preserve WGP
   meaning; it was not supplied original body copy as reusable content.
7. **Generation choice under sparse input**: proposals chose safe governance
   language, missing-knowledge notices, and abstract evidence sections.

Gap class for body copy: `MATERIALIZED_NOT_CLASSIFIED`,
`PROJECTED_NOT_CONTRACTED`, `CONTRACTED_NOT_SERIALIZED`, and
`SERIALIZED_NOT_DELIVERED`.

## Content Ownership Model

| Category | Current owner | Current state | Recommended owner |
| --- | --- | --- | --- |
| Source Content Evidence | Import, semantic import, Evidence Capture, WU | Captured/partial | Existing WU plus VCU projection |
| Source Content Candidates | WU business-signal candidates; future candidate layer | Partial and unreviewed | VCU projection with candidate lineage |
| Confirmed Business Facts | DBT and Business Alignment | Conservative, missing for ODV offerings/audience | DBT only after human/governed confirmation |
| Preserved Source Copy | No clear current owner | Missing | VCU projection proposes copy blocks and policy; WGP contracts preservation obligations |
| Improved Generated Copy | No current governed owner | Missing | Future content transformation candidate runtime |
| Newly Generated Copy | Manual proposal bundle only | Generic/governance-heavy | Provider/generation layer under explicit policy |
| Placeholder Copy | Generated proposals and missing-knowledge sections | Present | Generated output, explicitly labeled and bounded |

DBT should not store full website copy. WGP should not embed every paragraph by
default. The missing near-term owner is a derived continuity projection that
selects evidence-backed excerpts, candidate status, transformation policy, and
delivery obligations.

## Visual Identity Trace

### Logo

ODV logo candidate evidence:

- Source path:
  `/uploads/uz6Dg2kX/236x0_247x0/Tabla40x20cm_51.png`.
- Original URL:
  `https://www.odv-cvijanovic.si/uploads/uz6Dg2kX/Tabla40x20cm_51.png`.
- Safe preview route already documented:
  `/api/gnr8/runtime/preview-assets/site_135623aa7648136dba36/09dce7ea-d860-4f60-a1eb-26c3335b302e/uploads/uz6Dg2kX/236x0_247x0/Tabla40x20cm_51.png`.
- Signals: `alt="Logo"`, structured logo URL, header/early-page use, safe
  preview route evidence.
- WU status: logo candidate only.
- Business Foundation historical gap: filename/media classifier did not count it
  as logo because path does not contain `logo`.
- Review state: not human-confirmed.
- WDB/WGP/Provider Payload: not present as logo candidate with source asset ID,
  preview URL, confidence, and review state.
- Proposal result: absent.

Logo gap class: `CANDIDATE_NOT_REVIEWED`,
`PROJECTED_NOT_CONTRACTED`, `CONTRACTED_NOT_SERIALIZED`,
`SERIALIZED_NOT_DELIVERED`, `HUMAN_CONFIRMATION_REQUIRED`.

### Images

ODV has hundreds of original image/SVG assets. WU runtime status records 383
assets total, 315 images/SVGs, 2 icons, 17 fonts, 18 candidate-meaning assets,
and 365 unresolved-meaning assets. Business Foundation upstream evidence records
384 upstream persisted assets and a large gallery.

Available image information:

- Asset path, media type, size, and hash where present in raw file map.
- Preview route for safely persisted image assets.
- Some semantic image usage and alt text in WU.
- Section usage is partial.
- Hero/background/CSS usage is not consistently classified.
- Captions, licensing, image-role confidence, and copyright metadata are not
  first-class.

Generated proposals:

- Iteration 1 includes only HTML/CSS/JS and no source images.
- Iteration 2 includes five local abstract SVGs:
  `identity-signal.svg`, `navigation-evidence.svg`, `contact-path.svg`,
  `asset-inventory.svg`, and `constraint-map.svg`.
- Iteration 2 notes explicitly say these are abstract evidence visuals, not ODV
  brand assets, logos, offices, staff, products, or legal identity.

Image gap class: `MATERIALIZED_NOT_CLASSIFIED`, `CANDIDATE_NOT_REVIEWED`,
`PROJECTED_NOT_CONTRACTED`, `CONTRACTED_NOT_SERIALIZED`,
`SERIALIZED_NOT_DELIVERED`, `LICENSING_UNRESOLVED`.

### Typography

ODV typography evidence:

- 17 font files are imported.
- `Nationale` exists in regular, demibold, and extrabold formats.
- `Fontello` exists in TTF/EOT/WOFF/SVG and is likely an icon font.
- `FontAwesome` references are tied to icons/UI controls.
- CSS references fallback/system stacks and Open Sans in stylesheet text.
- WU classifies Nationale as local font-file signals and Fontello as icon-font
  signals.
- Capture baseline included `missing_font_source_evidence`, so exact used-family
  confidence is incomplete.

Generated proposals:

- Both use `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", sans-serif`.
- No Nationale or Fontello files are delivered to proposal bundles.

Typography gap class: `MATERIALIZED_NOT_CLASSIFIED`,
`CANDIDATE_NOT_REVIEWED`, `PROJECTED_NOT_CONTRACTED`,
`CONTRACTED_NOT_SERIALIZED`, `SERIALIZED_NOT_DELIVERED`,
`HUMAN_CONFIRMATION_REQUIRED`.

### Colors

ODV color evidence:

- Imported CSS includes repeated warm accent values such as
  `rgb(184,102,61)` / `#d65b3f`, repeated grays, whites, form colors, plugin
  colors, and UI colors.
- WU exposes color signals as structured signals only.
- There is no canonical palette, generic/plugin filtering model, or human review
  state.

Generated proposal colors:

- Iteration 1 uses blue/governance defaults such as `#14213d` and `#0b5cab`.
- Iteration 2 uses green/wine/gold defaults such as `#1f6b4b`, `#7b2438`,
  `#b6842f`.
- These are not shown by repository evidence to be source-derived. They are
  provider/manual choices under sparse WGP input.

Color gap class: `MATERIALIZED_NOT_CLASSIFIED`, `CANDIDATE_NOT_REVIEWED`,
`PROJECTED_NOT_CONTRACTED`, `CONTRACTED_NOT_SERIALIZED`,
`SERIALIZED_NOT_DELIVERED`, `HUMAN_CONFIRMATION_REQUIRED`.

### Visual Style

Already observed or partly capturable:

- Raw CSS implementation detail: colors, fonts, spacing, button/link styles,
  image sizes, icon fonts, backgrounds, forms, plugin styles.
- Observed visual pattern: screenshots, rendered DOM, layout/navigation/section
  evidence, content image gallery, header/early logo-like image, contact path.
- Candidate design-system signal: logo, colors, typography, imagery style,
  button style, icon style, layout density, section rhythm.
- Canonical brand identity: not established.
- Future website design intent: WDB/WGP currently expresses journey and
  high-level brand expression only, not source visual continuity.

Visual-style gap class: `MATERIALIZED_NOT_CLASSIFIED`,
`CANDIDATE_NOT_REVIEWED`, `PROJECTED_NOT_CONTRACTED`.

## Layout And Section Continuity

Source section/layout evidence exists through Evidence Capture, Candidate
Discovery, Reconstruction Package, StructurePlan, and WU. WU records ODV as 1
page, 1 route, 11 navigation items, 6 source sections, and 2 planning-only
sections. Evidence Capture already owns rendered DOM refs, screenshots, computed
styles, layout geometry, navigation evidence, and section boundary evidence.

Generation preserves:

- Navigation labels/intents: partially.
- Source structure: not faithfully.
- Semantic journey: partially.
- Business requirements: yes, mostly as visible uncertainty and limitation
  sections.
- Original section copy and visual layout: no.

This loss is partly intentional. WDB/WGP were designed as business-governed
intent contracts, not source-site reconstruction contracts. It is also partly a
projection gap because source sections, headings, geometry, and style signals
are available but not carried into generation as continuity obligations.

## WDB Coverage

| Desired capability | WDB status |
| --- | --- |
| Source copy preservation | Unsupported |
| Exact source excerpts | Unsupported |
| Content strategy | Supported as intent from DBT |
| Information priorities | Supported |
| Brand expression | Supported as broad section, not source visual identity |
| Typography | Unsupported |
| Colors | Unsupported |
| Logo | Unsupported |
| Images/assets | Unsupported |
| Visual style | Unsupported beyond broad expression |
| Layout intent | Partially supported through journey/sections, not source layout |
| Trust signals | Supported only if DBT facts exist |
| Constraints | Supported |
| Evidence refs | Supported |
| Candidate/review state | Unsupported |

WDB correctly remains DBT-aligned and conservative. It should not directly
promote raw source evidence. It needs a projection input and additional
serialization of governed source continuity decisions only after VCU candidates
exist.

## WGP Coverage

| Desired capability | WGP status |
| --- | --- |
| Source content references | Evidence refs only, no source excerpts |
| Preserved copy obligations | Unsupported |
| Copy-improvement obligations | Unsupported |
| Asset references | Asset count as message/requirement only |
| Logo candidates | Unsupported |
| Image candidates | Unsupported |
| Font candidates | Unsupported |
| Color candidates | Unsupported |
| Layout/style signals | Partially through section/page intent only |
| Brand constraints | Broad, missing source material |
| Content requirements | Supported but derived from WDB/DBT |
| Section contracts | Supported as obligations, not source sections |
| Validation expectations | Supported |

ODV WGP describes what must be created or preserved as constraints. It does not
provide the materials required to create a recognizable evolution.

## Provider Payload And Export Coverage

Provider Payload v1:

- Contains WGP, provider task envelope, constraints, validation expectations,
  lineage, confidence, limitations, and diagnostics.
- Task objective says implementation proposal only; no generation or provider
  execution.
- Omits original body copy, exact source snippets, source asset IDs as reusable
  assets, asset preview URLs, logo candidate, image manifest, font files,
  palette candidates, source screenshots, source HTML/CSS, and copy policy.

Provider Payload v2:

- Contains WGP, regeneration guidance, improvement-plan references, and a ready
  planning payload.
- Objective says business-level regeneration planning only; no output
  generation or mutation.
- Improvement actions ask to expose asset/message evidence, but do not deliver
  original assets or source copy.

Exports:

- `ODV_EXPORT/` includes WGP, provider payload v1, execution README,
  business summary, limitations, and lineage.
- `ODV_REGENERATION_EXPORT_002/` includes WGP, generation improvement plan,
  provider payload v2, execution README, regeneration summary, improvement
  delta, manifest, and lineage.
- Neither export includes original source asset files, source screenshot files,
  font files, source CSS/HTML files as reusable materials, or a governed source
  content/visual manifest.

Gap class: `CONTRACTED_NOT_SERIALIZED`, `SERIALIZED_NOT_DELIVERED`,
`DELIVERED_NOT_USED`.

## Manual Codex Instruction Coverage

Manual instructions permitted safe preservation of WGP meaning and required
non-invention. They did not require or enable original-source continuity:

- Codex was not supplied original body copy as a reusable corpus.
- Codex was not supplied source asset files, image previews, font files, or logo
  candidate preview.
- Codex was told imported assets may carry brand signals but logo/brand semantics
  are not confirmed.
- Codex was prohibited from inventing services, audience, trust claims, contact
  details, deployment, compliance, approval, or production authority.
- The expected output was an implementation proposal bundle, not a final
  generated website.

This explains why generated results look like governance reports. The task was
safe and honest, but materially under-supplied for customer-site evolution.

## Proposal Comparison

| Domain | Iteration 1 | Iteration 2 | Missing-source classification |
| --- | --- | --- | --- |
| Original copy | Generic governance text, `O nas`, `Kontakt` only | Same with more evidence attributes | Not supplied as copy blocks |
| Logo | Absent | Absent | Candidate not reviewed or delivered |
| Original images | Absent | Absent | Inventory exists but roles/assets not delivered |
| Generated images | None | Five abstract SVGs | Generation decision under sparse input |
| Fonts | Inter/system | Inter/system | Font candidates not delivered |
| Colors | Blue defaults | Green/wine/gold defaults | Source palette not contracted |
| Navigation | Proposal sections around WGP limits | Proposal sections around WGP/evidence | Semantic journey only |
| Source sections | Not preserved | Not preserved | Source layout not contracted |
| WGP obligations | Preserves missing knowledge | Improves evidence visibility | No source material to preserve |

## Thumbnail Audit

### Original Website

GNR8 already has screenshot evidence in Evidence Capture when rendered capture
succeeds. The baseline artifact supports viewport screenshot refs and full-page
screenshot refs. ODV handoff evidence records screenshots `2`, rendered DOM
quality strong, computed style samples, raw imported files, and high-fidelity
import.

Workspace card root cause:

- `KnowledgeWorkspaceProjection.versionCards` chooses Original Website
  `previewImageHref` from the first imported asset preview, not from Evidence
  Capture screenshot evidence.
- Business Foundation `assetSummary` only verifies up to 12 image preview
  candidates from the raw file map.
- A random imported image or no verified image is not a useful original-site
  thumbnail.
- Screenshot refs are captured elsewhere but not projected into Workspace card
  thumbnail fields.

Classification: `PREVIEW_RENDERING_GAP` and `THUMBNAIL_PIPELINE_MISSING`.
More exact: screenshot captured in the evidence chain, but not projected or
rendered as the Workspace card thumbnail.

### Iteration 1 And 2

Durable generated previews work through Evolution preview routes and persisted
Generated Proposal Bundles. The Workspace version-card model sets generated
`previewImageHref` to `null` and uses an iframe when `previewHref` exists. The
preview route applies restrictive security headers including `frame-ancestors
'none'` and CSP sandbox, while the Workspace tries to frame the preview URL.
Depending on browser behavior, this can cause a blank or blocked card despite
the direct preview route working.

Root cause:

- No persisted screenshot thumbnail exists for generated bundles.
- Workspace expects either `previewImageHref` or a live iframe.
- Generated cards intentionally have `previewImageHref: null`.
- Live iframe cards are less reliable with restrictive preview CSP, auth/session
  behavior, sizing, and same-origin framing.

Classification: `THUMBNAIL_PIPELINE_MISSING` plus possible
`PREVIEW_RENDERING_GAP`. The fix should not be another live mini-preview as the
primary thumbnail.

### Preferred Thumbnail Model

Preferred MVP: **Hybrid persisted screenshot with live preview on click**.

| Criterion | Result |
| --- | --- |
| Production reliability | High; image thumbnail does not depend on iframe runtime |
| Security | High; preview route remains restricted, thumbnail is inert |
| Performance | Good; cards load small images |
| Historical immutability | Strong; each iteration keeps its captured thumbnail |
| Vercel compatibility | Good; static/persisted image route is simpler than iframe |
| Visual accuracy | Good enough for cards; live route still available |
| Authentication | Easier; thumbnail can use authenticated image route |
| Public sharing | Compatible later with controlled thumbnail exposure |
| Storage cost | Manageable at 200-site scale with small derivatives |

## Capability Matrix

| Capability | Captured at import? | Structured? | Candidate? | Reviewed? | Present in WDB? | Present in WGP? | Present in Payload? | Present in Export? | Present in Proposal? | Exact loss point | Gap class | Recommended owner | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Original body copy | Yes | Partial in WU | Partial | No | No | No | No | No | No | BD/WU adapter and WGP contract | MATERIALIZED_NOT_CLASSIFIED | VCU projection | P0 |
| Headings | Yes | Yes in WU | Partial | No | Broadly | Broadly | Broadly | Broadly | Minimal | WDB/WGP omit exact headings | PROJECTED_NOT_CONTRACTED | VCU projection | P0 |
| CTA text | Yes | Yes in WU/BD | Partial | No | Yes as intent | Yes as intent | Yes as intent | Yes as intent | `Kontakt` only | Sparse serialization | SERIALIZED_NOT_DELIVERED | WGP plus VCU | P0 |
| Contact details | Yes/partial | Partial | Partial | No | Contact path only | Contact path only | Contact path only | Contact path only | Contact path only | Body/contact details not classified | MATERIALIZED_NOT_CLASSIFIED | VCU candidate | P0 |
| Offerings text | Yes | No | Not enough | No | Missing | Missing/uncertain | Missing/uncertain | Missing/uncertain | Placeholder | BD ignores body/service text | MATERIALIZED_NOT_CLASSIFIED | Content candidate | P0 |
| Audience language | Yes | No | Not enough | No | Missing | Missing/uncertain | Missing/uncertain | Missing/uncertain | Placeholder | BD ignores body/audience text | MATERIALIZED_NOT_CLASSIFIED | Content candidate | P0 |
| Trust text | Yes | Partial | Partial | No | Contact trust only | Contact trust only | Contact trust only | Contact trust only | Generic trust | Body trust not classified | MATERIALIZED_NOT_CLASSIFIED | Content candidate | P1 |
| Logo | Yes | Yes in WU | Yes | No | No | No | No | No | No | Candidate not reviewed/projected to WGP | CANDIDATE_NOT_REVIEWED | Visual candidate | P0 |
| Hero image | Unknown/partial | No | No | No | No | No | No | No | No | Role not classified | MATERIALIZED_NOT_CLASSIFIED | Visual/asset candidate | P1 |
| Content images | Yes | Inventory/preview | Partial | No | No | No | No | No | No | WGP/payload omission | PROJECTED_NOT_CONTRACTED | Asset candidate | P0 |
| Icons | Yes | Inventory | Partial | No | No | No | No | No | Abstract SVGs only | Role not classified/delivered | MATERIALIZED_NOT_CLASSIFIED | Visual candidate | P2 |
| Fonts | Yes | WU signals | Yes | No | No | No | No | No | No | Typography not contracted | PROJECTED_NOT_CONTRACTED | Typography candidate | P1 |
| Colors | Yes | WU signals | Yes | No | No | No | No | No | No | Palette not contracted | PROJECTED_NOT_CONTRACTED | Color candidate | P1 |
| Layout | Yes/partial | Evidence Capture | Candidate context | Partial for structure | Journey only | Section intent only | Section intent only | Section intent only | Semantic only | Source layout not contracted | PROJECTED_NOT_CONTRACTED | VCU/StructurePlan projection | P1 |
| Section structure | Yes | Yes in WU | Yes | Some review lineage | Intent only | Contracts only | Contracts only | Contracts only | Different sections | Source sections collapsed to journey | PROJECTED_NOT_CONTRACTED | VCU projection | P0 |
| Visual style | Partial | Raw/observed | No governed candidate | No | No | No | No | No | Generic | No style candidate model | MATERIALIZED_NOT_CLASSIFIED | Visual continuity candidate | P1 |
| Source screenshot | Yes when capture succeeds | Evidence ref | No | No | No | No | No | No | No | Not projected to Workspace | PREVIEW_RENDERING_GAP | Thumbnail projection | P0 |
| Iteration thumbnails | Preview bundles yes; thumbs no | No | No | No | n/a | n/a | n/a | No | iframe/blank | No persisted screenshot thumbnail | THUMBNAIL_PIPELINE_MISSING | Bundle thumbnail | P0 |

## Gap Classifications

Use exactly these classes in future VCU work:

- `NOT_CAPTURED`: source signal is not available in import/evidence.
- `CAPTURED_NOT_MATERIALIZED`: available only in raw files, not surfaced.
- `MATERIALIZED_NOT_CLASSIFIED`: surfaced but no role/meaning/policy.
- `CANDIDATE_NOT_REVIEWED`: candidate exists without human/governed decision.
- `REVIEWED_NOT_PROJECTED`: reviewed signal not carried downstream.
- `PROJECTED_NOT_CONTRACTED`: projection has it, WDB/WGP do not.
- `CONTRACTED_NOT_SERIALIZED`: contract has it, provider payload omits it.
- `SERIALIZED_NOT_DELIVERED`: payload/export describes it but does not deliver
  usable source material.
- `DELIVERED_NOT_USED`: delivered but proposal did not use it.
- `INTENTIONALLY_EXCLUDED`: excluded by safety/design boundary.
- `HUMAN_CONFIRMATION_REQUIRED`: cannot become canonical without review.
- `LICENSING_UNRESOLVED`: use rights not established.
- `PREVIEW_RENDERING_GAP`: preview evidence exists but UI projection/rendering
  does not show it.
- `THUMBNAIL_PIPELINE_MISSING`: no persisted thumbnail/capture derivative exists.

## Governance Policy

| Domain | Automatically observed | Deterministically classified | Proposed as candidate | Automatically preserved | Improved without confirmation | Requires human confirmation | Canonical DBT storage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Source body copy | Yes | Block type, location, language | Yes | Legal/contact only with caution | Cleanup only | For offerings/audience/trust claims | No full copy |
| Contact details | Yes | Phone/email/address/link | Yes | Yes if directly observed | Formatting cleanup | For business-critical correctness | Confirmed contact facts |
| Legal text | Yes | Legal/footer/privacy | Yes | Yes verbatim | No | For changes | Confirmed legal references |
| Offerings | Yes | Candidate service areas | Yes | No | No | Yes | Confirmed offerings only |
| Audience | Yes | Candidate customer groups | Yes | No | No | Yes | Confirmed audience only |
| Logo | Yes | Candidate asset | Yes | No | No | Yes | Confirmed logo ref |
| Colors | Yes | Candidate palette | Yes | No | No | Yes | Confirmed palette |
| Fonts | Yes | Text vs icon font candidate | Yes | No | No | Yes/license | Confirmed typography ref |
| Images | Yes | Role/quality/usage | Yes | No | No | Yes/license | Selected asset refs only |
| Trust claims | Yes | Claim type | Yes | No | No | Yes | Confirmed trust facts |
| Differentiators | Yes | Candidate themes | Yes | No | No | Yes | Confirmed differentiators |
| Layout/style | Yes | Pattern candidates | Yes | Broadly preserve | Yes for low-risk polish | For brand-defining style | Design intent refs |

## Content Transformation Policy

| Source text block | Future policy |
| --- | --- |
| Business name/title | Preserve verbatim or with minimal cleanup; require lineage |
| Navigation labels | Preserve unless WDB explicitly improves IA |
| CTA labels | Preserve or improve with same intent; keep source/ref |
| Contact details | Preserve verbatim; formatting cleanup only |
| Legal/footer/privacy text | Preserve verbatim or exclude with explicit reason |
| Offering paragraphs | Candidate for preserve with cleanup or meaning-preserving improvement; require confirmation before canonical use |
| Audience language | Candidate for meaning-preserving improvement; require confirmation |
| Trust/differentiator claims | Candidate only; require confirmation for stronger wording |
| SEO metadata | Preserve as evidence, improve only under SEO policy |
| Duplicates/boilerplate/plugin text | Exclude or summarize with reason |
| Low-confidence or conflicting copy | Require confirmation or prohibit generation |
| Missing knowledge placeholders | Preserve as explicit gaps until resolved |

Every transformed block must keep source path/section refs, original excerpt,
policy decision, confidence, unresolved risks, and whether human confirmation
was required.

## Asset Usage Policy

| Asset class | Future policy |
| --- | --- |
| Confirmed logo | Safe to reuse after human confirmation and license/source check |
| Strong logo candidate | Candidate for reuse; not automatic canonical logo |
| Source content image | Candidate for reuse; require role, quality, and licensing state |
| Hero/background image | Candidate for reuse; require section role and quality |
| Decorative/plugin image | Exclude unless explicitly selected |
| Icon font/icons | Classify separately from text fonts; use only if license/source supports |
| Text font files | Candidate; require usage evidence and license/source state |
| Duplicate/resized image | Deduplicate; choose highest safe representative |
| Low quality asset | Exclude or keep as evidence only |
| Unknown licensing | Do not automatically reuse |
| Technically unusable | Evidence only |
| Generated proposal SVGs | Generated output evidence, not original identity |

## Generation Delivery Requirements

A future Provider Payload capable of recognizable evolution must receive:

- Source content excerpts with source refs and transformation policies.
- Explicit preserve/improve/remove/exclude decisions.
- Original source asset manifest with IDs, paths, MIME, dimensions, sizes,
  hashes, usage refs, role candidates, preview/access URLs, and license state.
- Logo candidates with confidence and review state.
- Font candidates with text/icon distinction, file availability, usage evidence,
  and license state.
- Color candidates with source CSS refs, selector context, frequency, generic
  filtering, and review state.
- Visual-style candidates: spacing, rhythm, button style, image treatment,
  density, border radius, shadow, alignment, header/footer behavior.
- Source screenshots and section references.
- Human-confirmation status and unresolved items.
- Output asset-copy rules and prohibited-use rules.
- Validation expectations that verify recognizable continuity, not only
  governance compliance.

## Preferred Architecture

Preferred near-term architecture: **E. One combined Source Content & Visual
Continuity projection is needed.**

Shape:

```text
Source Website Understanding Projection
+ raw import file map
+ Evidence Capture screenshots/styles/layout refs
+ Candidate Discovery/Review lineage
+ Reconstruction Package / StructurePlan context
-> Source Content & Visual Continuity Projection
-> candidate governance / human confirmation
-> WDB/WGP enrichment
-> Provider Payload v3 shadow delivery
```

Why this is the right near-term boundary:

- It reuses existing WU instead of rebuilding import/evidence capture.
- It keeps raw source evidence separate from DBT truth.
- It can carry both content and visual continuity together, because generation
  fidelity needs copy, assets, layout, and style in one delivery view.
- It can remain pure runtime first, no schema or persistence.
- It gives WDB/WGP a governed projection to consume later instead of directly
  consuming raw evidence.

Long-term architecture:

- Confirmed candidates can become DBT/business facts or governed brand/creative
  memory.
- A persisted canonical Creative/Brand artifact may be justified after VCU
  candidates, review UX, copy policy, asset policy, and payload delivery prove
  their value.
- Generated observations must never rewrite source understanding; they can only
  inform comparison/evolution reports.

## VCU-1 Contract Decision

VCU-1 adds
`docs/architecture/SOURCE_CONTENT_VISUAL_CONTINUITY_PROJECTION_SPECIFICATION.md`
as the canonical projection contract. It tightens the VCU-0 recommendation into
one pure runtime, read-only projection over Source Website Understanding,
source import metadata, raw imported artifact metadata, semantic import,
source text evidence, asset registry/file metadata, Evidence Capture, rendered
screenshots, computed-style samples, Candidate Discovery, Candidate Review,
Reconstruction Package context, StructurePlan as context only, limitations,
diagnostics, and safe preview/access refs.

VCU-1 explicitly forbids downstream artifacts as inputs: DBT, BUR, Business
Alignment, WDB, WGP, Provider Payload, Generated Website Proposal, Generated
Proposal Bundle, OWM, Compliance, reports, improvement/evolution artifacts,
Business Approval, and publishing state. WDB/WGP/Provider Payload may consume
the projection in future phases, but they do not feed it.

VCU-1 also locks the preferred thumbnail architecture conceptually: persisted
Evidence Capture screenshot thumbnails for Original Website cards, derived
immutable screenshot child artifacts associated with Generated Proposal Bundles
for generated iteration cards, and existing durable authenticated live preview
routes for click-through inspection. It implements no thumbnail runtime.

## Rejected Alternatives

- A. No new boundary: insufficient, because WDB/WGP currently lack source
  materials and governance status.
- B. WU directly enriches WDB/WGP: too direct; risks raw candidate promotion.
- C. Visual Identity Candidate projection only: misses body-copy continuity.
- D. Content Continuity projection only: misses logo/assets/style needed for
  recognizable evolution.
- F. New persisted canonical Creative/Brand artifact now: too heavy and
  premature without review/policy/payload proof.

## DO NOT REBUILD

Future work must reuse:

- import pipeline
- raw artifact storage
- asset registry
- preview asset route
- semantic import
- Evidence Capture
- Candidate Discovery/Review
- Reconstruction Package
- StructurePlan
- Source Website Understanding Projection
- WDB
- WGP
- Provider Payload
- durable Generated Proposal Bundle
- Observed Website Model
- Generation Compliance
- Evolution Analysis

## GENUINELY MISSING

Missing materialization:

- Source copy blocks with stable source/section refs.
- Source screenshot thumbnail projection for Workspace.
- Generated bundle thumbnail artifacts.

Missing classification:

- Body-copy type, service/audience/trust/contact/legal block roles.
- Logo/image/hero/content/decorative/icon roles beyond simple heuristics.
- Font text-vs-icon usage and source/license state.
- Palette candidates with generic/plugin filtering.
- Visual-style pattern candidates.

Missing candidate governance:

- Reviewable content continuity candidates.
- Reviewable visual identity and asset candidates.
- Human confirmation UX for logo, colors, fonts, images, offerings, audience,
  trust claims, and differentiators.

Missing projection:

- Combined continuity projection from WU/evidence/import/candidates.
- WDB/WGP input projection for source continuity.
- Workspace thumbnail projection from screenshot evidence.

Missing contract support:

- WDB/WGP source-copy and source-asset preservation obligations.
- Provider Payload fields for source materials and transformation policy.

Missing serialization/delivery:

- Source copy excerpts.
- Asset manifest and preview/access URLs.
- Font files or explicit font access rules.
- Screenshot refs.
- Licensing limitations and unresolved state.

Missing generation instructions:

- Preserve/improve/remove/exclude instructions by source block and asset.
- Recognizable evolution validation criteria.

Missing thumbnail capability:

- Persisted thumbnail image generation for source and generated iterations.
- Card projection from persisted screenshot/thumbnail refs.

## Prioritized Roadmap

VCU-1 - Source Content & Visual Continuity Projection Contract Design - COMPLETE

- Contract only.
- Define input refs, output sections, gap classes, copy policies, asset policies,
  review states, and delivery-readiness states.
- No persistence, runtime, WDB/WGP mutation, or provider payload change.

VCU-2 - Pure Runtime Projection - RECOMMENDED NEXT

- Compose existing WU/import/evidence/candidate/review/context data.
- Produce read-only projection, no new extraction.

VCU-2-R - ODV/ViroiDoc Real-Target Validation

- Validate projection on ODV and ViroiDoc.
- Record exact counts, candidates, missing states, and thumbnail evidence states.

VCU-T1 - Thumbnail Contract Design

- If separated, define persisted screenshot thumbnail model for Original and
  generated iterations.
- Contract/design only before any worker or capture implementation.

VCU-3 - Content Transformation Candidate Runtime

- Candidate-only source text block policy and transformation recommendations.

VCU-4 - Visual Identity & Asset Candidate Runtime

- Candidate-only logo/image/font/color/style projection.

VCU-5 - Human Confirmation UX

- Review/approve/reject/defer content and visual candidates.

VCU-6 - WDB/WGP Enrichment

- Add governed continuity inputs to WDB/WGP after candidates exist.

VCU-7 - Provider Payload v3 Shadow Generation

- Serialize source materials and policies without executing generation.

VCU-8 - First Content-and-Brand-Preserving Regeneration

- Use confirmed/candidate-safe payload to generate a recognizable ODV evolution.

## Risks

- Promoting candidate source evidence into DBT truth too early.
- Reusing images/fonts without licensing confirmation.
- Overfitting to one ODV target instead of validating ViroiDoc.
- Treating CSS/plugin colors as brand palette.
- Treating icon fonts as typography.
- Making thumbnails depend on live iframes.
- Rebuilding import/evidence pipelines instead of projecting existing evidence.

## Final Recommendation

VCU-1 is complete as documentation and contract design only. Proceed to
**VCU-2 - Pure Runtime Source Content & Visual Continuity Projection** when
implementation scope is explicitly opened. VCU-2 should compose existing
WU/import/evidence/candidate/review/context data into a read-only projection
with no new extraction and no persistence module. Do not create a persisted
canonical brand artifact, change generation behavior, mutate WDB/WGP/Provider
Payload, or implement thumbnails until a later phase explicitly authorizes it.

## VCU-2 Implementation Update

VCU-2 has now implemented the audit's recommended pure runtime projection:

- canonical runtime record:
  `docs/architecture/SOURCE_CONTENT_VISUAL_CONTINUITY_PROJECTION_RUNTIME.md`;
- read-only operator route:
  `/gnr8/admin/continuity/[siteVersionId]`;
- ODV route:
  `/gnr8/admin/continuity/09dce7ea-d860-4f60-a1eb-26c3335b302e`;
- ODV projection:
  `source_content_visual_continuity_8e855e8cb481f78e8131b579d6760357`;
- ViroiDoc projection:
  `source_content_visual_continuity_aba6d40c4453e6bd2bec3405a66945b8`.

The audit diagnosis remains accurate. VCU-2 exposes source continuity evidence
and candidates, but WDB, WGP, Provider Payload, and generated proposals still do
not consume VCU output. Source assets remain unapproved; logo/font/color/image
signals remain non-canonical; thumbnails are readiness-only and not generated.
