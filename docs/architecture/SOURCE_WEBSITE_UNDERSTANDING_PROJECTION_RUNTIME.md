# Source Website Understanding Projection Runtime

## WU-6 Runtime Integration Plan Update

WU-6 defines how this runtime projection can become the future canonical
upstream input to Business Discovery without changing this projection runtime
in the current phase.

Canonical plan:

- `docs/architecture/BUSINESS_DISCOVERY_RUNTIME_INTEGRATION_PLAN.md`

The projection remains deterministic, read-only, connector-neutral,
source-site only, evidence-backed, fail-closed, rebuilt on demand, and not
persisted as a new artifact. Future `WEBSITE_UNDERSTANDING` mode may use the
projection through the WU -> Business Discovery adapter only after mandatory
coverage, lineage, comparison, confidence, diagnostics, limitations,
connector-compatibility, deterministic rebuild, ODV, and ViroiDoc gates pass.

WU-6 adds no projection fields, no loader changes, no persistence, no mode
selection, and no runtime switch.

## Phase WU-2 Runtime Boundary

WU-2 implements the first pure-runtime Source Website Understanding
Projection.

The runtime is:

- deterministic;
- read-only;
- connector-neutral;
- source-site only;
- evidence-backed;
- fail-closed;
- rebuilt on demand;
- not persisted as a new artifact.

It reuses existing persisted inputs:

- runtime import provenance summary;
- raw imported site artifact and file map;
- semantic import;
- Style Signal model where already present;
- Evidence Capture baseline where already present;
- First Limited Dry Run output where already present;
- Candidate Discovery;
- Candidate Review;
- Reconstruction Package lineage;
- StructurePlan as planning context only.

WU-2 does not add extraction, parsing, schema, persistence, mutation APIs,
workers, AI analysis, candidate confirmation, DBT updates, Business Discovery
behavior changes, generation, approval, publishing, deployment, or DNS
behavior.

## Runtime Files

- `apps/platform/gnr8/architecture/source-website-understanding-projection-contract.ts`
- `apps/platform/gnr8/architecture/source-website-understanding-projection-builder.ts`
- `apps/platform/gnr8/architecture/source-website-understanding-projection-loader.ts`
- `apps/platform/app/gnr8/admin/website-understanding/[siteVersionId]/page.tsx`

The operator route is:

```text
/gnr8/admin/website-understanding/[siteVersionId]
```

For ODV:

```text
/gnr8/admin/website-understanding/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

## Deterministic Identity

The projection ID is derived from:

- `siteVersionId`;
- `dryRunId` where available;
- `contractVersion`;
- exact artifact references;
- normalized projection content.

`generatedAt` is retained for inspectability but excluded from the stable
identity comparison. Rebuilding from the same normalized inputs produces the
same projection ID and the same projection body.

## Knowledge Boundary

The runtime preserves the WU-1 knowledge states:

```text
observed
structured
candidate
reviewed
confirmed_source_fact
rejected
conflicting
missing
unavailable
```

Candidate asset meanings, logo candidates, colors, typography, offerings,
audience, trust, identity, and differentiators are not promoted into canonical
business truth. Human confirmation and DBT mutation remain outside WU-2.

StructurePlan entries are projected only as planning context. They are marked
separately and must not override observed source routes, navigation, or
sections.

Observed Website Model, compliance reports, generated proposals, provider
payloads, improvement plans, evolution analyses, and published-site state are
forbidden downstream inputs.

## Operator Page

The superadmin page is server-rendered and read-only.

Default hierarchy:

1. Website Source
2. Understanding Readiness
3. Pages and Navigation
4. Structure and Content
5. Imported Assets
6. Visual Identity Signals
7. Business Signal Candidates
8. Technical and SEO Signals
9. Missing / Conflicting Understanding
10. Source Artifact Lineage
11. Advanced Diagnostics

The page exposes read-only links:

```text
Website Understanding -> Business Foundation -> Generation Evolution
```

Business Foundation also links back to Website Understanding.

## Current Real-Target Status

WU-2 was validated read-only against ODV and ViroiDoc on 2026-07-14. The
projection was rebuilt twice for each target with a fixed `generatedAt`; both
targets produced deterministic rebuild equality and rejected an injected
generated-proposal downstream contamination field.

ODV:

- siteVersionId: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- projectionId:
  `source_website_understanding_17e489688596671bf353e23f216bd1e4`
- readiness: `ready_for_business_discovery`
- confidence: `MEDIUM`
- source URL: `https://www.odv-cvijanovic.si/?gnr8_f12=20260617`
- counts: 1 page, 1 route, 11 navigation items, 6 source sections, 2
  planning-only sections, body text available
- assets: 383 total, 315 images/SVGs, 2 icons, 17 fonts, 18 candidate-meaning
  assets, 365 unresolved-meaning assets
- visual signals: `Tabla40x20cm_51.png` appears as a logo candidate only;
  color signals are structured signals only; Nationale font files are local
  font-file signals; Fontello files are icon-font signals
- business signal gap: audience classifier missing

ViroiDoc:

- siteVersionId: `e26b0754-988b-45b9-9e24-8e213179b6cf`
- projectionId:
  `source_website_understanding_b9796806c7e95914abce1845675bcd4f`
- readiness: `ready_for_business_discovery`
- confidence: `MEDIUM`
- source URL: `https://www.viroidoc.eu/?gnr8_8b_12n=20260618`
- counts: 1 page, 1 route, 39 navigation items, 9 source sections, 0
  planning-only sections, body text available
- assets: 401 total, 323 images/SVGs, 1 icon, 25 fonts, 27 candidate-meaning
  assets, 374 unresolved-meaning assets
- visual signals: two logo candidates; color signals are structured signals
  only; typography includes structured font-family signals plus local font
  files and icon fonts
- business signal gap: offering classifier missing

Browser verification loaded the ODV operator page at:

```text
/gnr8/admin/website-understanding/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

The page showed source identity, readiness, pages/navigation, assets, logo
candidate, typography, color signals, offering/audience gaps, secondary
advanced diagnostics, and zero mutation controls in `main`.

## Remaining Gaps

WU-2 intentionally leaves these gaps visible:

- body-copy offering classification is not a new runtime classifier;
- audience classification is not a new runtime classifier;
- logo candidates are not human-confirmed;
- color signals are not canonical palettes;
- typography signals are not canonical brand typography;
- font files such as icon fonts are not brand typefaces by default;
- trust and differentiator signals remain source-level candidates;
- Business Discovery does not yet consume the projection.

## WU-3 Equivalence Hardening

WU-3 adds deterministic Business Discovery input equivalence validation beside
the WU runtime without changing Business Discovery behavior.

Canonical equivalence record:

- `docs/architecture/BUSINESS_DISCOVERY_INPUT_EQUIVALENCE.md`

Runtime helpers:

- `apps/platform/gnr8/architecture/business-discovery-input-equivalence.ts`
- `apps/platform/gnr8/architecture/business-discovery-input-equivalence-real-target.cli.ts`

Hardening changes:

- diagnostic codes/messages/source refs are normalized;
- no-navigation readiness is now `missing`, not `partial`;
- projection validation rejects duplicate limitations and duplicate readiness
  dimensions;
- projection validation checks top-level artifact refs against lineage refs;
- projection validation checks deterministic lineage artifact IDs against
  projected artifact refs.

Real-target equivalence validation on 2026-07-14 showed both ODV and ViroiDoc
at 89% dependency coverage and 82% coverage-report coverage. Both projections
were valid, with zero conflicts and zero duplicates.

Remaining migration blockers:

- `sourceSiteId` is not projected as a first-class WU identity field.
- Evidence Capture baseline/fidelity limitations are not yet proven as
  verbatim projection limitations.

## WU-4 Shadow Adapter Update

WU-4 closes the WU-3 projection gaps without adding projection persistence.

Runtime changes:

- `sourceSiteId` is now projected at the top level, inside `sourceIdentity`,
  in lineage, and in deterministic inputs. The value comes from the existing
  authoritative runtime site-version `siteId`; it is not derived from
  `siteVersionId`.
- Missing `sourceSiteId` now produces a blocking
  `SOURCE_SITE_ID_MISSING` limitation and prevents shadow Business Discovery
  construction.
- Evidence Capture baseline and fidelity limitations are projected verbatim
  as WU limitations, preserving current Business Discovery codes
  (`UPSTREAM_EVIDENCE_LIMITATION`, `UPSTREAM_FIDELITY_LIMITATION`), original
  messages, source refs, source artifact refs, original fidelity type,
  severity/state, and deterministic ordering/deduplication.

New shadow runtime helpers:

- `apps/platform/gnr8/architecture/business-discovery-website-understanding-adapter.ts`
- `apps/platform/gnr8/architecture/business-discovery-shadow-comparison.ts`
- `apps/platform/gnr8/architecture/business-discovery-website-understanding-shadow.cli.ts`

The shadow adapter consumes only the projection object, reuses
`buildBusinessDiscoveryFromSiteEvidence(...)`, builds only in memory, and
does not read raw artifacts, import Business Discovery persistence, consume
downstream artifacts, or mutate provenance.

WU-5 section-lineage runtime update:

- `SourceSectionUnderstanding` now distinguishes WU projection section identity
  from original source section-boundary identity with `sourceSectionId`.
- Observed sections now carry explicit `regionType` when the upstream section
  evidence provides one.
- First Limited Dry Run section rows preserve exact
  `evidence:section-boundary:<routePath>:<sectionId>` refs and producing source
  artifact refs.
- The Business Discovery WU adapter consumes only these projection fields and
  fails closed when evidence-capture section lineage is internally inconsistent.

Current WU-5 real-target projection IDs:

- ODV:
  `source_website_understanding_0caa89099ee02c9469b539cf2b2d0613`
- ViroiDoc:
  `source_website_understanding_72cece90151974f980a2abf7b5528709`

Historical WU-4 real-target projection IDs:

- ODV:
  `source_website_understanding_b0cd478c45734c2e6f31db84ed9ad2c3`
- ViroiDoc:
  `source_website_understanding_d80895ffc313fb393b15ecbef3e90c1a`

The WU-2/WU-3 projection IDs changed because the normalized projection content
now includes `sourceSiteId` and verbatim upstream limitations. This is
expected deterministic identity behavior; no persisted projection ID was
rewritten.

WU-5 keeps dependency coverage at 100% for ODV and ViroiDoc, with no missing or
partial Business Discovery inputs. Shadow Business Discovery now preserves the
current `content_theme_observed` section-boundary evidence refs exactly for both
targets. Optional runtime integration is `ready_with_expected_differences`; no
runtime switch or projection persistence occurred.

WU-3 does not migrate Business Discovery, add classifiers, add extraction,
persist projections, mutate DBT/WDB/WGP, generate, approve, publish, deploy,
or change production data.

## Current Planning Status

WU-6 is complete as planning-only documentation. Recommended next phase:

```text
WU-7 - Business Discovery Runtime Mode Configuration Design
```

Keep WU-7 design-only unless explicitly authorized to implement runtime mode
selection. Do not switch Business Discovery runtime behavior by implication.

## GX-1 Knowledge Workspace Relationship

GX-1 adds the Knowledge Workspace as the product-facing home for one website:

```text
/gnr8/admin/workspace/[siteVersionId]
```

Website Understanding remains the supporting page for source-site structure,
content, navigation, assets, visual identity signals, and business signal
candidates. The Workspace composes the existing Source Website Understanding
runtime projection with Business Foundation and Generation Evolution so the
operator sees source understanding in the context of business meaning,
generated versions, current gaps, and workspace health.

GX-1 adds a read-only `Open Knowledge Workspace` link from the Website
Understanding page. It does not change the WU contract, builder, loader,
adapter, Business Discovery runtime behavior, projection persistence policy,
schema, API, workers, AI, generation, publishing, deployment, DNS, or runtime
architecture.

## GX-2 Knowledge Workspace Polish Relationship

GX-2 keeps Website Understanding as the supporting source-evidence page and
polishes only the Workspace presentation. Source signals continue to appear as
observed or candidate evidence, never canonical business truth. Unavailable
visual identity signals explain why they are unavailable, and the Workspace
does not change the WU projection, loader, adapter, persistence policy,
Business Discovery behavior, schema, API, workers, AI, generation, publishing,
deployment, DNS, or runtime architecture.

## VCU-0 Continuity Audit Relationship

VCU-0 adds
`docs/architecture/SOURCE_CONTENT_VISUAL_CONTINUITY_REALITY_AUDIT.md` as a
documentation-only repository audit over the source content and visual
continuity chain. The audit confirms that this WU runtime can already expose
source body-text availability, headings, CTA/contact signals, asset inventory,
logo candidates, color signals, typography signals, sections, and layout
context as source-site evidence or candidates.

VCU-0 does not change the WU contract, builder, loader, adapter, persistence
policy, Business Discovery behavior, schema, API, UI, workers, AI, generation,
publishing, deployment, DNS, or runtime mutation behavior. VCU-1 subsequently
completed the Source Content & Visual Continuity Projection Contract Design.

## VCU-1 Continuity Projection Relationship

VCU-1 adds
`docs/architecture/SOURCE_CONTENT_VISUAL_CONTINUITY_PROJECTION_SPECIFICATION.md`
as the canonical contract for a future Source Content & Visual Continuity
Projection. The future projection consumes this WU runtime output plus upstream
source import, raw artifact, semantic import, Evidence Capture, screenshot,
style, asset, Candidate Discovery, Candidate Review, Reconstruction Package,
and context-only StructurePlan refs. It preserves source content and visual
continuity as evidence/candidates, not business truth or brand truth.

VCU-1 does not change the WU runtime contract, builder, loader, validator,
page, adapter, persistence policy, Business Discovery behavior, schema, API,
UI, workers, AI, generation, thumbnails, publishing, deployment, DNS, or
production mutation. The recommended next phase is
`VCU-2 - Pure Runtime Source Content & Visual Continuity Projection`.
