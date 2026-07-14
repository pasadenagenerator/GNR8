# Website Understanding Reality Audit

## Executive Conclusion

GNR8 already has a de facto Website Understanding layer, but it is distributed
across existing artifacts instead of expressed as one canonical boundary.

The implemented chain is:

```text
Website Source
-> URL/static import
-> raw imported site artifact and import provenance
-> rendered/raw Evidence Capture baseline
-> First Limited Dry Run route/navigation/section models
-> Candidate Discovery
-> Candidate Review
-> Reconstruction Package
-> StructurePlan
-> Business Discovery
```

The correct WU-0 conclusion is **D. A small new Website Understanding
projection is needed over existing artifacts, with no new extraction
pipeline**.

That projection should reconcile and name the existing boundary. It should not
create parallel import, evidence capture, asset extraction, AI analysis,
Business Discovery, DBT, WDB, WGP, generation, or observation behavior.

The repository already owns source acquisition, raw provenance, rendered
evidence, route/navigation/section candidates, human review, reconstruction
eligibility, structure planning, and conservative Business Discovery. The real
gap is that there is no single source-site read model that answers:

```text
What exists on the imported website, what is known about it, what is only a
candidate, what has been reviewed, and what is safe for Business Discovery to
consume?
```

WU-6 extends this conclusion into a production migration strategy. The future
cutover must not create a second Website Understanding system or bypass the
existing distributed evidence chain. It must use Source Website Understanding
as the connector-neutral upstream input to the existing Business Discovery
builder through the adapter, with `LEGACY`, `SHADOW_COMPARE`, and
`WEBSITE_UNDERSTANDING` runtime modes documented in:

- `docs/architecture/BUSINESS_DISCOVERY_RUNTIME_INTEGRATION_PLAN.md`

WU-6 is planning-only. It does not activate Website Understanding, modify
Business Discovery, persist projections, introduce feature flags, or change
runtime behavior.

## Current Architecture Map

Canonical docs now describe a Website Understanding Engine:

```text
Import
-> Evidence
-> Discovery
-> Context
-> Review
-> Reconstruction Package
-> Structure Plan
```

That engine exists in code and persisted artifacts, but its ownership is spread
across several phase families:

| Layer | Current repository reality |
| --- | --- |
| Import | URL import, static import, multi-page discovery, source URL preservation, raw imported artifact storage, asset persistence, preview asset serving. |
| Evidence Capture | Rendered DOM, screenshots, computed style samples, layout geometry evidence, navigation evidence, section boundary evidence, diagnostics, baseline partial artifact. |
| Candidate Discovery | Deterministic route/navigation/section candidates from Limited Dry Run and Evidence Capture refs. |
| Candidate Review | Immutable human review events and latest review package snapshots for exact Candidate Discovery artifacts. |
| Reconstruction Package | Metadata-only eligibility handoff from the exact latest Candidate Review package. |
| StructurePlan | Metadata-only organization of approved candidates into planned route/navigation/section assignments. |
| Business Discovery | Conservative business interpretation from source URL, routes, navigation, section boundary types, asset counts, limitations, diagnostics, and optional Candidate Discovery context. |
| DBT and downstream | Governed business truth and generation contracts. These are downstream of Business Discovery and must not be bypassed by source-site heuristics. |

The architecture is therefore not missing a whole Website Understanding system.
It is missing a canonical reconciliation/read-model boundary over the existing
source-site understanding chain.

## Code And Runtime Map

### Import

Primary files:

- `apps/platform/gnr8/import/import-contract.ts`
- `apps/platform/gnr8/import/runtime/import-static-site.ts`
- `apps/platform/gnr8/import/runtime/extract-assets.ts`
- `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`
- `apps/platform/gnr8/site/scoped-import-pipeline.ts`
- `apps/platform/gnr8/multipage-import/*`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/app/api/gnr8/runtime/preview-assets/[siteId]/[siteVersionId]/[...assetPath]/preview-assets-route-handlers.ts`

Import already owns:

- local static HTML/assets import with deterministic path normalization;
- URL fetch intake and source URL preservation;
- rendered capture orchestration and raw fallback selection;
- multi-page discovery, route candidates, sitemap/canonical/redirect/alias and robots evidence;
- raw imported site artifact persistence;
- imported file map with media type, size, SHA, entry HTML, asset base path;
- persisted raw asset serving for preview routes;
- import fidelity status, diagnostics, run identity, and source-mode metadata.

Import does not own:

- semantic business truth;
- canonical brand identity;
- confirmed logo/color/font knowledge;
- generated-site observation;
- DBT mutation;
- WDB/WGP generation.

### Evidence Capture

Primary files:

- `apps/platform/gnr8/import-rendered-capture/rendered-capture-contract.ts`
- `apps/platform/gnr8/import-rendered-capture/rendered-capture-service.ts`
- `apps/platform/gnr8/import-rendered-capture-worker/*`
- `apps/platform/gnr8/architecture/evidence-capture-baseline-artifact.ts`
- `apps/platform/gnr8/architecture/evidence-capture-expansion.ts`
- `apps/platform/gnr8/architecture/evidence-capture-layout-contract.ts`
- `apps/platform/gnr8/architecture/layout-geometry-capture.ts`
- `apps/platform/gnr8/architecture/navigation-capture.ts`
- `apps/platform/gnr8/architecture/section-boundary-capture.ts`
- `docs/architecture/EVIDENCE_CAPTURE_INVENTORY_AUDIT.md`

Evidence Capture already owns immutable observations:

- raw HTML refs;
- rendered DOM refs;
- viewport/full-page screenshot refs;
- computed style sample refs;
- layout geometry evidence;
- navigation evidence;
- section boundary evidence;
- route identity;
- source/final URL;
- imported asset inventory summaries;
- route discovery summaries;
- capture provider/status;
- diagnostics, limitations, worker health, worker job state.

The persisted baseline is intentionally `baseline_partial` and
`reconstructionGrade: false`. It is operational, but it is not yet a full
reconstruction-grade evidence model.

### Asset Handling

Primary files:

- `apps/platform/gnr8/import/runtime/extract-assets.ts`
- `apps/platform/gnr8/site/scoped-import-pipeline.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/architecture/generation-business-foundation-projection.ts`
- `apps/platform/app/api/gnr8/runtime/preview-assets/[siteId]/[siteVersionId]/[...assetPath]/preview-assets-route-handlers.ts`

Current asset support:

- inventory: yes, through raw imported file map and asset references;
- file type/media type/path/size/SHA: yes for persisted files;
- source references: partial through raw refs, file map, fetch manifest, semantic import images;
- page usage: partial;
- CSS usage: partial through direct stylesheet/local asset discovery and computed style samples;
- alt text: partial through semantic import images, not canonical asset registry;
- filenames: yes;
- SVG metadata: not canonical;
- dimensions: partial/missing for imported asset registry;
- repeated usage: partial/missing;
- logo candidates: display-only path heuristic in Business Foundation projection;
- image/icon/font candidates: display-only media/path categorization;
- font-family usage: partial through computed style samples and evidence expansion helpers;
- color signals: partial through computed styles/style signals, not canonical brand palette;
- visual style signals: partial.

The distinction is important:

| Step | Current state |
| --- | --- |
| Extraction | Implemented for raw/local/remote asset references, direct images/scripts/stylesheets, srcset/lazy/gallery candidates, stylesheet-linked local assets. |
| Inventory | Implemented through raw imported file map and artifact storage. |
| Classification | Partial and mostly display/read-model oriented. |
| Candidate generation | Missing for governed visual identity candidates. |
| Confirmation | Missing for asset meaning, logo, palette, typography. |
| Canonical knowledge | Missing until human-confirmed DBT/brand knowledge exists. |

### Candidate Discovery And Review

Primary files:

- `apps/platform/gnr8/architecture/candidate-discovery-contract.ts`
- `apps/platform/gnr8/architecture/candidate-discovery-builder.ts`
- `apps/platform/gnr8/architecture/candidate-discovery-persistence.ts`
- `apps/platform/gnr8/architecture/candidate-review-contract.ts`
- `apps/platform/gnr8/architecture/candidate-review-persistence.ts`
- `apps/platform/gnr8/architecture/candidate-review-action-application.ts`
- `apps/platform/app/gnr8/admin/candidate-discovery/[siteVersionId]/page.tsx`
- `apps/platform/app/gnr8/admin/candidate-review/[siteVersionId]/page.tsx`

Candidate Discovery currently produces:

- `route`, `navigation`, and `section` candidates only;
- source evidence refs;
- dry-run refs;
- confidence level and reasons;
- candidate limitations;
- diagnostics;
- deterministic candidate IDs;
- append-only persisted `candidate_discovery_result` records with latest pointer.

Candidate Review currently owns:

- immutable review events;
- approved/rejected/deferred decisions;
- supersession-aware latest decisions;
- review packages tied to exact Candidate Discovery artifacts;
- append-only persisted `candidate_review_package` records with latest pointer;
- compare-and-set latest advancement for actions.

Candidate Discovery is a natural candidate layer for Website Understanding, but
not the whole Website Understanding boundary. It does not classify assets,
visual identity, offerings, audience, trust claims, body text, or business
meaning.

### Reconstruction Package

Primary files:

- `apps/platform/gnr8/architecture/reconstruction-package-contract.ts`
- `apps/platform/gnr8/architecture/reconstruction-package-builder.ts`
- `apps/platform/gnr8/architecture/reconstruction-package-persistence.ts`
- `docs/architecture/RECONSTRUCTION_PACKAGE_FOUNDATION.md`
- `docs/architecture/RECONSTRUCTION_PACKAGE_CONTRACT.md`
- `docs/architecture/RECONSTRUCTION_PACKAGE_PERSISTENCE_REAL_ARTIFACT_VALIDATION.md`

Reconstruction Package is a de facto Website Understanding Model only for
reviewed reconstruction eligibility:

- exact Candidate Review artifact lineage;
- exact Candidate Discovery artifact lineage;
- approved candidate refs;
- route/navigation/section candidate type;
- decision review event refs;
- confidence copied from source candidates;
- evidence refs;
- eligibility counts;
- propagated limitations and diagnostics;
- latest-head/stale protection.

It does not understand:

- full page content;
- business offerings/audience/goals beyond approved structure candidates;
- asset identity or logo meaning;
- colors, fonts, CSS roles, visual style;
- SEO/social/contact/trust details beyond what Candidate Discovery provided;
- generation intent;
- implementation output.

It is reconstruction-oriented, not business-oriented. It should be reused as a
canonical reviewed-eligibility dependency, not inflated into a complete source
website model.

### StructurePlan

Primary files:

- `apps/platform/gnr8/architecture/structure-plan-contract.ts`
- `apps/platform/gnr8/architecture/structure-plan-builder.ts`
- `apps/platform/gnr8/architecture/structure-plan-persistence.ts`
- `apps/platform/gnr8/architecture/structure-plan-surface-projection.ts`
- `apps/platform/app/gnr8/admin/structure-plan/[siteVersionId]/page.tsx`
- `docs/architecture/STRUCTURE_PLANNING_FOUNDATION.md`
- `docs/architecture/STRUCTURE_PLAN_PERSISTENCE_REAL_ARTIFACT_VALIDATION.md`

StructurePlan adds planned organization beyond Reconstruction Package:

- planned routes;
- planned navigation;
- planned sections;
- assignments from approved candidates to route/navigation/section targets;
- exact Reconstruction Package lineage;
- stale/latest checks;
- propagated limitations and diagnostics.

StructurePlan is a downstream planning projection. It is not raw understanding
and should not be treated as the source of website facts. It answers how
reviewed structure candidates are organized for future planning.

### Semantic And Content Inference

Primary files:

- `apps/platform/gnr8/import-semantic/semantic-import-engine.ts`
- `apps/platform/gnr8/importer/html-section-detector.ts`
- `apps/platform/gnr8/importer/html-to-page.ts`
- `apps/platform/gnr8/runtime/content-binding.ts`
- `apps/platform/gnr8/site/scoped-import-pipeline.ts`

Existing semantic import supports:

- title and language;
- navigation labels/hrefs;
- hero candidate;
- section types such as hero, services, gallery, contact, testimonials, FAQ,
  navigation, header, footer, content;
- section titles/intros/items/images/CTAs/forms;
- image role hints such as logo, hero image, gallery image, service image,
  testimonial avatar, content image, icon, unknown;
- content slot inference for runtime materialization.

This is deterministic heuristic import support. It is not currently the
canonical governed Website Understanding boundary, and Business Discovery does
not consume its full body/content/asset signal set as canonical business truth.

## Artifact Map

| Artifact | Kind/storage | Append-only | Latest pointer | By-ID load | Idempotent reuse | Real-target proof |
| --- | --- | --- | --- | --- | --- | --- |
| Import provenance | `siteVersion.importProvenanceSummary` | Mutated summary with nested histories | n/a | via siteVersion | n/a | ODV/ViroiDoc import docs and runtime validation |
| Raw imported site | `raw_imported_site` in runtime raw template artifact storage | latest artifact rows, DB-backed files | selected by siteVersion/artifact | raw artifact loaders | import-dependent | ODV durable raw artifact docs |
| Asset registry/file map | raw imported `fileMap`, `gnr8_runtime_raw_template_files`, preview assets route | persisted file rows | artifact-bound | by artifact/path | import-dependent | ODV imported assets in Business Foundation docs |
| Evidence Capture baseline | `evidence_capture_baseline` inside import provenance | current baseline record | embedded current baseline | via siteVersion summary | pipeline-attached | ODV/ViroiDoc baseline used by downstream real-target validations |
| First Limited Dry Run | `first_limited_dry_run_output` artifacts in import provenance | yes | `latestFirstLimitedDryRunOutputArtifact` | yes | yes | ODV `first_limited_dry_run_output_4e86...`, ViroiDoc `first_limited_dry_run_output_f913...` |
| Candidate Discovery | `candidate_discovery_result` artifacts in import provenance | yes | `latestCandidateDiscoveryResultArtifact` | yes | yes | ODV `candidate_discovery_result_dbf786...`, ViroiDoc `candidate_discovery_result_3fb206...` |
| Candidate Review | `candidate_review_package` artifacts in import provenance | yes | `latestCandidateReviewPackageArtifact` | yes | yes/compare-and-set for actions | ODV `candidate_review_package_9c9d...`, ViroiDoc `candidate_review_package_ecb5...` |
| Reconstruction Package | `reconstruction_package` artifacts in import provenance | yes | `latestReconstructionPackageArtifact` | yes | yes | ODV `reconstruction_package_d91a...`, ViroiDoc `reconstruction_package_0e14...` |
| StructurePlan | `structure_plan` artifacts in import provenance | yes | `latestStructurePlanArtifact` | yes | yes | ODV `structure_plan_08e1...`, ViroiDoc `structure_plan_7b73...` |
| Business Discovery | `business_discovery` artifacts in import provenance | yes | `latestBusinessDiscoveryArtifact` | yes | yes | ODV `business_discovery_7b37...`, ViroiDoc `business_discovery_360f...` |
| DBT | `digitalBusinessTwinArtifacts` in import provenance | yes | latest helper/pointer conventions | yes | yes | ODV/ViroiDoc DBT validation docs |
| WDB/WGP | `websiteDesignBriefArtifacts`, `websiteGenerationPackageArtifacts` | yes | latest helper/pointer conventions | yes | yes | ODV/ViroiDoc real-target chain |
| Generated-site observation | `observed_website_model` for generated proposals | yes | latest OWM pointer | yes | yes | ODV generated proposal iterations, separate boundary |

## Evidence Type Classification

| Evidence type | Status | Notes |
| --- | --- | --- |
| HTML | Captured | raw HTML, selected source HTML, rendered DOM refs. |
| Text | Partially captured | semantic import/body parsing exists, but Business Discovery consumes only narrow route/nav/section text. |
| Routes | Captured | single-page root plus multi-page route discovery and dry-run route model. |
| Navigation | Captured | navigation evidence and Candidate Discovery navigation candidates. |
| Sections | Captured | section boundary evidence and Candidate Discovery section candidates. |
| Headings | Partially captured | semantic import/html detectors inspect headings; not canonical Website Understanding output. |
| Images | Captured/partial | raw file map and image refs; roles partial, dimensions/usage incomplete. |
| Logos | Partially captured | semantic hints and HTML alt may exist; governed logo candidate/confirmation missing. |
| Icons | Partially captured | media/path display classification; no governed icon role model. |
| Fonts | Partially captured | font files and computed font-family samples; no canonical typography candidate. |
| CSS | Captured/partial | stylesheets and computed samples; no full CSS model. |
| Colors | Partially captured | computed/style signals can expose values; no canonical palette candidate/confirmation. |
| Metadata | Partially captured | title/language/meta sometimes parsed; not consistently projected. |
| Structured data | Referenced only/partial | documented in ODV evidence gap as present for logo; no governed extractor boundary. |
| Forms | Partially captured | semantic import forms and widget evidence helpers; not canonical. |
| CTAs | Partially captured | semantic import and route/nav patterns; not canonical. |
| Links | Captured | anchors/navigation/multi-page discovery. |
| Downloads | Missing/partial | file map can include documents; no first-class download understanding. |
| Screenshots | Captured | viewport/full-page where rendered capture succeeds. |
| Geometry/layout | Captured/partial | layout geometry evidence exists; baseline still partial. |
| Language | Partially captured | semantic import language; not canonical business knowledge. |
| SEO signals | Partially captured | title/meta can be parsed; no first-class SEO understanding artifact. |
| Social links | Missing/partial | links exist; no canonical social classifier. |
| Contact signals | Partially captured | Business Discovery detects contact route/nav; body/contact details not fully classified. |
| Trust signals | Partially captured | weak trust/contact path plus route/nav trust keywords; body evidence not fully classified. |

## Capability Matrix

| Capability | Existing implementation | Producing module | Canonical artifact | Persistence | Real-target validated | Current consumer | Gap | Recommended owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Source identity | Yes | URL/scoped import | import provenance/raw artifact | siteVersion + raw artifact | Yes | Business Discovery | none major | Import |
| Page inventory | Partial | multi-page discovery/raw assembly | import provenance | siteVersion | Partial | import/runtime previews | stronger route/page projection | Import/Evidence |
| Route inventory | Yes | Evidence, Limited Dry Run, Candidate Discovery | Candidate Discovery, StructurePlan | append-only | Yes | Business Discovery, StructurePlan | unify into WU projection | Website Understanding |
| Navigation | Yes | navigation capture, Limited Dry Run | Candidate Discovery/StructurePlan | append-only | Yes | Business Discovery | none for current scope | Website Understanding |
| Section inventory | Yes | section boundary capture, Limited Dry Run | Candidate Discovery/StructurePlan | append-only | Yes | Business Discovery | richer section text/role candidates | Website Understanding |
| Heading hierarchy | Partial | semantic import/html detector | semantic import in provenance | embedded | Not separately proven | import/migration | no canonical projection | Evidence/WU projection |
| Content text | Partial | semantic import/raw DOM | semantic import/provenance | embedded/files | ODV gap docs prove evidence exists | limited consumers | not consumed by Business Discovery | Evidence -> Candidate Knowledge |
| Content themes | Partial | section boundaries/semantic import | Business Discovery content finding | append-only | Yes partial | DBT | body text not used | Candidate Knowledge/Business Discovery |
| CTA detection | Partial | semantic import/nav patterns | semantic import/Business Discovery | embedded/append-only | Partial | Business Discovery | not first-class | Candidate Knowledge |
| Contact path | Partial | nav/route patterns | Business Discovery | append-only | Yes | DBT | body contact details missing | Business Discovery over WU |
| Forms | Partial | semantic import/widget hints | semantic import | embedded | Not as canonical | import/migration | no governed form understanding | Website Understanding |
| Images | Yes/partial | asset extraction/raw file map | raw imported site | raw artifact | Yes ODV assets | previews, Business Foundation | dimensions/usage/classification | Evidence/WU projection |
| Logo candidates | Partial | semantic import/display heuristic | none canonical | none | ODV gap proves miss | Business Foundation display | governed candidate missing | Candidate Knowledge |
| Icons | Partial | file/media path classification | raw file map/read model | raw artifact | ODV asset summary | Business Foundation | role/classification missing | Evidence/WU projection |
| Fonts | Partial | raw file map/computed samples | evidence/projection | embedded/raw artifact | ODV gap docs | Business Foundation display | usage/confirmation missing | Candidate Knowledge |
| Font usage | Partial | computed style samples | evidence baseline | embedded | Partial | Business Foundation | no canonical typography | Candidate Knowledge |
| Colors | Partial | computed styles/style signals | evidence baseline/styleSignals | embedded | ODV gap docs | Business Foundation display | no palette candidate | Candidate Knowledge |
| CSS variables | Missing/partial | stylesheet capture | raw files | raw artifact | Not separately proven | none | no parsed CSS var model | Evidence |
| Visual style | Partial | screenshots/style signals | evidence/read models | embedded/files | ODV gap docs | Business Foundation | no governed visual model | Candidate Knowledge |
| Layout geometry | Yes partial | rendered capture/layout capture | evidence baseline | embedded | Yes in downstream counts | Candidate Discovery | not complete/breakpoint-rich | Evidence |
| Structured data | Partial | raw/rendered HTML | raw evidence | files | ODV gap docs | none canonical | extraction/projection missing | Evidence/WU projection |
| SEO metadata | Partial | semantic import/title/meta | semantic import | embedded | Partial | none canonical | no SEO candidate | Website Understanding |
| Language | Partial | semantic import | semantic import | embedded | Partial | none canonical | no business boundary | Website Understanding |
| Social links | Missing/partial | link inventory | raw/semantic links | embedded | Not proven | none | classifier missing | Candidate Knowledge |
| Trust signals | Partial | route/nav patterns | Business Discovery | append-only | Yes partial | DBT | body/details not classified | Business Discovery over WU |
| Offering signals | Partial | route/nav patterns | Business Discovery | append-only | Yes partial | DBT | body text not used | Business Discovery over WU candidates |
| Audience signals | Partial | route/nav patterns | Business Discovery | append-only | Yes partial | DBT | body text not used | Business Discovery over WU candidates |
| Goals | Partial | route/nav/contact patterns | Business Discovery | append-only | Yes | DBT | richer CTAs missing | Business Discovery |
| Constraints | Yes | diagnostics/limitations | all downstream artifacts | append-only/embedded | Yes | many | fragmentation | Each layer owns its own; WU projects |
| Evidence refs | Yes | all artifacts | multiple | append-only/embedded | Yes | all downstream | needs index/projection | Website Understanding projection |
| Confidence | Yes partial | candidates/Business Discovery | CD/BD/RP | append-only | Yes | Review/DBT | missing for asset/visual candidates | Candidate Knowledge |
| Limitations | Yes | evidence/CD/RP/SP/BD | multiple | append-only/embedded | Yes | all downstream | needs unified display | Website Understanding projection |
| Diagnostics | Yes | all layers | multiple | append-only/embedded | Yes | all downstream | needs unified display | Website Understanding projection |
| Human review | Yes for structure candidates | Candidate Review | candidate_review_package | append-only | Yes | Reconstruction Package | missing for asset/business candidates | Candidate Knowledge/Review |

## Concept Classification

| Concept | Primary classification | Secondary notes |
| --- | --- | --- |
| URL import | IMPORT_MECHANICS | source acquisition and provenance |
| Static-site import contract | IMPORT_MECHANICS | deterministic local input boundary |
| Raw imported site artifact | RAW_EVIDENCE | also IMPORT_MECHANICS |
| Raw imported file map | RAW_EVIDENCE | asset inventory substrate |
| Preview asset serving | IMPORT_MECHANICS | read-only source access |
| Rendered capture result | RAW_EVIDENCE | browser-observed evidence |
| Evidence Capture baseline | STRUCTURED_EVIDENCE | partial, not reconstruction-grade |
| Layout geometry evidence | STRUCTURED_EVIDENCE | supports Website Understanding |
| Navigation evidence | STRUCTURED_EVIDENCE | supports Candidate Discovery |
| Section boundary evidence | STRUCTURED_EVIDENCE | supports Candidate Discovery |
| Semantic import result | STRUCTURED_EVIDENCE | LEGACY_OR_OVERLAP with Business Discovery if overused |
| First Limited Dry Run output | STRUCTURED_EVIDENCE | bridge into Candidate Discovery |
| Candidate Discovery result | CANDIDATE_KNOWLEDGE | Website Understanding candidate layer |
| Candidate Review package | CANDIDATE_KNOWLEDGE | human-governed decisions |
| Candidate Context projection | CANDIDATE_KNOWLEDGE | context/view layer, not authority |
| Reconstruction Package | WEBSITE_UNDERSTANDING | reviewed reconstruction eligibility only |
| StructurePlan | PLANNING_PROJECTION | downstream of understanding |
| Business Discovery artifact | BUSINESS_UNDERSTANDING | consumes website evidence narrowly |
| Digital Business Twin | BUSINESS_UNDERSTANDING | canonical governed business truth |
| Website Design Brief | GENERATION_CONTRACT | experience intent, downstream |
| Website Generation Package | GENERATION_CONTRACT | generation contract |
| Business Foundation projection | BUSINESS_UNDERSTANDING | read-only product projection, not source WU |
| Observed Website Model | STRUCTURED_EVIDENCE | generated-site observation, separate boundary |
| Generation Compliance | GENERATION_CONTRACT | validates generated output, not source import |
| Original Mirror Preview | RAW_EVIDENCE | read-only source preview |
| Reconstruction Readiness | PLANNING_PROJECTION | readiness projection over evidence |
| Future Website Understanding projection | WEBSITE_UNDERSTANDING | small read model over existing artifacts |

## Overlap And Duplication Risks

### Candidate Discovery vs Business Discovery

Candidate Discovery already proposes route/navigation/section candidates with
evidence refs and confidence. Business Discovery currently interprets website
structure into business domains. A new Website Understanding runtime must not
rediscover route/navigation/section candidates or create a second confidence
ledger.

Risk: duplicating candidate IDs, evidence refs, limitations, diagnostics, and
review state.

Recommendation: Website Understanding projection reads Candidate Discovery and
Review. Business Discovery consumes WU/candidate outputs for website facts and
candidate business signals only when explicitly designed.

### Reconstruction Package vs Website Understanding

Reconstruction Package already records the reviewed eligible subset of
candidate structure. It should not be replaced by a new Website Understanding
artifact. It is too narrow to be the whole boundary, but too important to
duplicate.

Risk: a new WU artifact that invents its own approved candidates would fork
human decisions.

Recommendation: WU projection must treat Reconstruction Package as the
canonical reviewed-eligibility artifact.

### StructurePlan vs Website Understanding

StructurePlan organizes approved candidates into planned structure. It is
planning intent, not source truth.

Risk: conflating "what the source website has" with "how GNR8 plans to
organize approved candidates."

Recommendation: WU may display StructurePlan lineage, but ownership remains
Planning.

### Semantic Import vs Business Discovery

Semantic import already extracts body/section/image/form/CTA hints. Business
Discovery currently does not consume the full semantic output. A new WU
pipeline that re-parses the same raw HTML would duplicate semantic import.

Recommendation: reuse semantic import as upstream structured evidence and add
candidate projections, not a second parser.

### Asset Registry vs Visual Identity Candidates

The raw file map and Business Foundation display classification already expose
many assets. They do not confirm asset meaning.

Risk: silently promoting filename/media-type heuristics into canonical logo,
palette, or typography.

Recommendation: add governed candidates over existing assets before DBT
promotion.

### Evidence Capture vs Observed Website Model

Evidence Capture observes source websites. Observed Website Model observes
generated proposals.

Risk: merging source-site understanding and generated-site compliance
observation into one artifact would blur source truth and output validation.

Recommendation: keep them separate. Share vocabulary where useful:
routes, sections, links, headings, assets, limitations, diagnostics, evidence
refs. Do not share artifact identity or canonical ownership.

## Canonical Boundary Recommendation

Preferred outcome: **D. A small new Website Understanding projection is needed
over existing artifacts, with no new extraction pipeline.**

The projection should:

- be source-site only;
- read existing import provenance, raw imported artifact metadata, Evidence
  Capture baseline, semantic import, First Limited Dry Run, Candidate Discovery,
  Candidate Review, Reconstruction Package, and StructurePlan;
- expose current known website structure/content/asset/candidate/review state;
- preserve evidence refs, limitations, diagnostics, confidence, lineage, and
  source artifact IDs;
- separate observed evidence, candidate knowledge, reviewed knowledge,
  business interpretation, and planning projection;
- fail closed when an upstream artifact is missing or stale;
- avoid new persistence at first unless a later phase proves durable snapshot
  history is required.

Rejected alternatives:

| Alternative | Why weaker |
| --- | --- |
| A. No new Website Understanding artifact/projection | Avoids new work, but leaves the boundary implicit and hard for Business Discovery/connectors/operators to reason about. |
| B. Reconstruction Package as canonical Website Understanding | Too narrow and review-gated; it only represents approved structure candidates, not raw/structured evidence or unreviewed website facts. |
| C. Candidate Discovery + Reconstruction Package together | Closer, but still misses import/evidence/semantic/assets/Business Discovery handoff and StructurePlan/planning separation. |
| E. New canonical Website Understanding artifact | Too heavy now; would invite duplicate extraction, persistence, and confidence/review systems before a projection proves the exact gap. |

## Ownership Model

| Capability family | Owner | Rule |
| --- | --- | --- |
| Source acquisition | Import | Fetch/read source material, normalize paths, preserve source URL/final URL. |
| File extraction | Import | Persist raw imported files and asset references without meaning promotion. |
| Raw provenance | Import | Preserve run identity, paths, diagnostics, fidelity status, source mode. |
| Immutable observations | Evidence Capture | Capture DOM, screenshots, styles, layout/navigation/section evidence, limitations. |
| Source references | Evidence Capture | Normalize evidence refs and artifact refs. |
| Structured description of what exists | Website Understanding projection | Reconcile existing import/evidence/candidate/review/reconstruction/structure facts. |
| Possible meanings requiring confidence/review | Candidate Knowledge | Assets, visual identity, content meaning, route/section interpretations, business candidates. |
| Human decisions on candidates | Candidate Review | Immutable events and latest package snapshots. |
| Business interpretation | Business Discovery | Interpret WU/candidate evidence into business domains without silently promoting guesses. |
| Governed business truth | DBT | Canonical business knowledge after validation/governance. |
| Intended future website structure | Planning | StructurePlan/LayoutPlan/ContentPlan style projections. |
| Generation requirements | WDB/WGP | Downstream provider-neutral generation intent and contract. |
| Generated proposal observation | Observed Website Model | Separate generated-output observation and compliance input. |

## Generated-Site Observation Boundary

Existing Website Understanding and Observed Website Model must remain separate.

Website Understanding is about the imported source website:

```text
source website -> import/evidence -> source-site candidates/review/planning
```

Observed Website Model is about generated proposals:

```text
GeneratedWebsiteProposalArtifact -> observation -> compliance/evolution
```

Concepts may be shared:

- route;
- page;
- navigation;
- section;
- headings;
- links;
- images/assets;
- screenshots;
- limitations;
- diagnostics;
- evidence refs.

Concepts must remain separate:

- artifact identity;
- source truth vs generated output truth;
- candidate review vs compliance findings;
- Business Discovery input vs Generation Contract Compliance input;
- original imported assets vs generated proposal assets;
- source-site limitations vs generated-output deviations.

## Connector Compatibility

The recommended projection supports future connectors because it separates
source-specific acquisition from downstream understanding.

| Connector/source | Compatibility rule |
| --- | --- |
| Static websites | Use existing static/url import, raw artifact, Evidence Capture baseline, and WU projection. |
| WordPress | Connector maps posts/pages/media/theme evidence into Import/Evidence-owned source observations; WU reads normalized artifacts. |
| Joomla | Same: connector-specific acquisition, connector-neutral source/evidence projection. |
| Webflow | Preserve CMS/collection/page/style evidence upstream; Business Discovery consumes normalized WU/candidates. |
| Shopify | Product/catalog/collection data should become commerce/domain evidence, not website-only heuristics. |
| Ecwid | Commerce connector evidence stays source-specific upstream and connector-neutral downstream. |
| Mono | Existing runtime/widget/map limitations stay Evidence/Candidate concerns before business promotion. |
| Future connectors | Must not place source-specific business logic inside Business Discovery or DBT builders. Normalize evidence first. |

## DO NOT REBUILD

Future tasks must reuse these existing capabilities:

- deterministic static import: `apps/platform/gnr8/import/runtime/import-static-site.ts`;
- URL import/rendered capture: `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`;
- scoped import pipeline: `apps/platform/gnr8/site/scoped-import-pipeline.ts`;
- raw imported site artifacts and asset file map: `apps/platform/gnr8/runtime/runtime-store.ts`;
- preview asset serving: `apps/platform/app/api/gnr8/runtime/preview-assets/[siteId]/[siteVersionId]/[...assetPath]/preview-assets-route-handlers.ts`;
- rendered capture contract/worker: `apps/platform/gnr8/import-rendered-capture/*` and `apps/platform/gnr8/import-rendered-capture-worker/*`;
- Evidence Capture baseline: `apps/platform/gnr8/architecture/evidence-capture-baseline-artifact.ts`;
- layout/navigation/section evidence contracts: `apps/platform/gnr8/architecture/evidence-capture-layout-contract.ts`;
- semantic import engine: `apps/platform/gnr8/import-semantic/semantic-import-engine.ts`;
- First Limited Dry Run output/persistence;
- Candidate Discovery contract/builder/persistence/surface;
- Candidate Review contract/persistence/action/UI;
- Candidate Context projection;
- Reconstruction Package contract/builder/persistence;
- StructurePlan contract/builder/persistence/surface;
- Business Discovery contract/builder/persistence;
- DBT, BUR, Business Alignment, WDB, and WGP persisted artifact chain;
- generated-site Observed Website Model and compliance/evolution chain, but only for generated proposals.

## Genuinely Missing

### Missing runtime

- no canonical source-site Website Understanding projection loader yet;
- no governed visual identity candidate builder;
- no body-text/offering/audience candidate projection consumed upstream of
  Business Discovery;
- no source-site social/trust/contact classifier beyond narrow route/nav
  patterns;
- no full browser network/script/widget evidence runtime.

### Missing contract

- no explicit source-site Website Understanding projection contract;
- no governed asset/visual identity candidate contract;
- no connector-neutral source evidence handoff contract for non-website
  connectors into WU.

### Missing projection

- no single read model that reconciles Import, Evidence Capture, semantic import,
  Candidate Discovery, Candidate Review, Reconstruction Package, StructurePlan,
  and Business Discovery input readiness;
- no unified capability/coverage projection for Business Discovery inputs;
- no first-class asset usage/meaning projection.

### Missing classification

- logo candidates beyond path/media heuristics;
- canonical color candidates with usage counts/roles/evidence refs;
- typography candidates with font-family usage/source/weights;
- offering/audience candidates from body text/headings/metadata;
- structured data, SEO, social links, trust details, downloads/forms as
  governed candidates.

### Missing governance

- human confirmation loop for visual identity and business candidates;
- clear promotion path from WU candidates to Business Discovery/DBT;
- stale/missing upstream handling for a WU projection.

### Missing UX

- source-site Website Understanding read-only surface;
- candidate visual identity review surface;
- operator display of "observed vs candidate vs reviewed vs business truth".

### Missing validation

- ODV/ViroiDoc proof for any future WU projection;
- connector compatibility validation against at least one non-static source;
- regression tests proving no generated-site OWM artifacts are consumed by
  source-site WU.

## Prioritized Reconciliation Plan

### P0 - Required Before Reliable 200-Site Migration

1. Documentation-only: adopt this audit as the canonical boundary record.
2. Define ownership rules in existing architecture docs without renaming code.
3. Design a source-site Website Understanding projection over existing artifacts.
4. Define fail-closed input readiness for Business Discovery:
   - required source identity;
   - required route/navigation/section evidence;
   - optional semantic/body/asset candidates;
   - explicit missing/partial states.
5. Design governed candidate paths for offerings and audience from existing
   rendered/body/semantic evidence.
6. Prove the projection on ODV and ViroiDoc using persisted artifacts only.

### P1 - Materially Improves Fidelity

1. Add visual identity candidate planning over existing raw assets, computed
   styles, CSS, and semantic image hints.
2. Add logo candidate evidence refs beyond filename heuristics.
3. Add color and typography candidates with usage/evidence refs.
4. Add trust/contact/social/SEO candidate classification.
5. Add a read-only Website Understanding surface for operators.
6. Add human review for asset and business candidates before DBT promotion.

### P2 - Future Refinement

1. Expand browser network inventory.
2. Expand script/runtime/widget evidence.
3. Add connector-specific evidence mappers for WordPress/Joomla/Webflow/Shopify.
4. Add multi-breakpoint layout evidence.
5. Add richer download/form/widget semantics.

## Risks

- Creating a new WU runtime could duplicate proven Candidate Discovery,
  Review, Reconstruction Package, and StructurePlan lineage.
- Treating Reconstruction Package as the whole WU layer would hide unreviewed
  evidence and candidate gaps.
- Letting Business Discovery parse raw HTML directly for everything would turn
  it into an import/semantic engine and blur ownership.
- Promoting asset heuristics to DBT truth would violate the GNR8 evidence
  hierarchy.
- Merging source-site WU with generated-site OWM would confuse source truth
  with compliance observation.
- Connector-specific logic downstream would make future connectors brittle.

## Final Recommendation

Do not create a parallel Website Understanding system.

Define a small **Source Website Understanding Projection** over existing
artifacts. Keep extraction and persistence where they already are. Let the
projection reconcile:

```text
Import provenance
+ raw imported artifact/file map
+ Evidence Capture baseline
+ semantic import evidence
+ First Limited Dry Run
+ Candidate Discovery
+ Candidate Review
+ Reconstruction Package
+ StructurePlan
+ Business Discovery input readiness
```

Then use that projection as the future boundary between imported website
evidence and Business Discovery. The next implementation phase should be design
only for that projection contract and ownership model, followed by read-only
ODV/ViroiDoc validation before any Business Discovery input change.

## WU-1 Projection Contract Closure

WU-1 defines the canonical projection contract recommended by this audit.

Canonical specification:

- `docs/architecture/SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_SPECIFICATION.md`

WU-1 selects a pure runtime projection with no dedicated persistence. The
projection is deterministic, connector-neutral, evidence-backed, read-only,
fail-closed, and non-canonical business truth. It composes existing Import,
Evidence Capture, semantic import, asset inventory, Candidate Discovery,
Candidate Review, Reconstruction Package, StructurePlan context, and
diagnostic artifacts without creating new extraction, schema, persistence, UI,
AI, or Business Discovery behavior.

The WU-1 boundary preserves this audit's core separation:

- source website understanding stays upstream of Business Discovery;
- Candidate Discovery and Candidate Review keep candidate identity,
  confidence, evidence refs, and governance authority;
- Reconstruction Package remains the exact reviewed reconstruction eligibility
  artifact;
- StructurePlan remains planning context, not source truth;
- Observed Website Model remains generated-site observation and must never feed
  source-site understanding.

## WU-2 Runtime Closure

WU-2 implements the recommended small source-site Website Understanding
projection as a pure runtime read model.

Canonical runtime record:

- `docs/architecture/SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_RUNTIME.md`

The implementation composes existing Import, Evidence Capture, semantic
import, asset inventory, Candidate Discovery, Candidate Review, Reconstruction
Package, and StructurePlan-context artifacts. It does not create a parallel
extraction, persistence, candidate, review, Business Discovery, DBT,
generation, publishing, or generated-observation pipeline.

## WU-3 Business Discovery Input Equivalence Closure

WU-3 validates the WU-0 recommendation against the current Business Discovery
builder.

Canonical equivalence record:

- `docs/architecture/BUSINESS_DISCOVERY_INPUT_EQUIVALENCE.md`

The audit conclusion still holds: GNR8 does not need a parallel Website
Understanding system. It needs the existing projection hardened enough to
replace scattered Business Discovery input assembly.

Evidence:

- ODV WU projection
  `source_website_understanding_17e489688596671bf353e23f216bd1e4` validates
  against Business Discovery artifact
  `business_discovery_7b37413651d79de0d109e31690a34b62` at 89% dependency
  coverage.
- ViroiDoc WU projection
  `source_website_understanding_b9796806c7e95914abce1845675bcd4f` validates
  against Business Discovery artifact
  `business_discovery_360fa099cbcede288c2d0e04f2ec7986` at 89% dependency
  coverage.
- Both targets had valid projections, zero conflicts, and zero duplicates.
- The remaining blockers are first-class `sourceSiteId` projection and
  verbatim Evidence Capture baseline/fidelity limitation projection.

WU-3 adds no Business Discovery migration, DBT mutation, extraction, AI,
generation, approval, publishing, deployment, persistence, schema, API, or
worker behavior.
## WU-4 Shadow Adapter Result

WU-4 confirms the WU-0/WU-1 architectural direction: the existing Website
Understanding layer can serve as a connector-neutral upstream boundary for
Business Discovery shadow construction without adding a new extraction
pipeline or projection persistence.

Result:

- first-class `sourceSiteId` and verbatim Evidence Capture limitations are now
  projected;
- Business Discovery input dependency coverage is 100% for ODV and ViroiDoc;
- Business Discovery can be built in memory from the WU projection using the
  existing `buildBusinessDiscoveryFromSiteEvidence(...)` builder;
- no Business Discovery, DBT, WDB/WGP, generation, publish, schema, API,
  worker, or provenance mutation occurred;
- runtime cutover remains blocked because both real-target shadows lose at
  least one current section-boundary evidence ref on
  `content_theme_observed`.

The next architecture gap is not another extraction/classification layer. It
is exact section evidence lineage preservation through the projection and
adapter.
