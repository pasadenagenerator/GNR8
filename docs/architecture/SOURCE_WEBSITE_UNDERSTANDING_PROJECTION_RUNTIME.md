# Source Website Understanding Projection Runtime

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

## Next Phase

Recommended next phase:

```text
WU-3 - Source Website Understanding Hardening and Business Discovery Input
Planning
```

Keep WU-3 read-only and focused on hardening the projection plus designing the
future Business Discovery input boundary.
