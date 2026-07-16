# Source Content & Visual Continuity Projection Runtime

## Phase VCU-2 Runtime Boundary

VCU-2 implements the first pure-runtime Source Content & Visual Continuity
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

VCU-2 reuses existing upstream source-site systems:

- Source Website Understanding Projection;
- runtime import provenance summary;
- raw imported site artifact metadata and file map;
- semantic import;
- Evidence Capture metadata and screenshot references;
- Style Signal model where already structured;
- Candidate Discovery;
- Candidate Review;
- Reconstruction Package lineage;
- StructurePlan as planning context only;
- existing hardened source asset preview references.

VCU-2 does not add schema, persistence, extraction, HTML parsing, screenshot
capture, thumbnail generation, image analysis, AI analysis, content rewriting,
asset copying, asset approval, Candidate Review mutation, Business Discovery
behavior, DBT/BUR/Business Alignment behavior, WDB/WGP enrichment, Provider
Payload changes, proposal regeneration, publishing, deployment, DNS mutation,
or production mutation.

## Runtime Files

- `apps/platform/gnr8/architecture/source-content-visual-continuity-projection-contract.ts`
- `apps/platform/gnr8/architecture/source-content-visual-continuity-projection-builder.ts`
- `apps/platform/gnr8/architecture/source-content-visual-continuity-projection-loader.ts`
- `apps/platform/gnr8/architecture/source-content-visual-continuity-real-target.cli.ts`
- `apps/platform/app/gnr8/admin/continuity/[siteVersionId]/page.tsx`

The operator route is:

```text
/gnr8/admin/continuity/[siteVersionId]
```

For ODV:

```text
/gnr8/admin/continuity/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

## Projection Shape

The projection exposes:

- deterministic `projectionId`;
- exact Source Website Understanding projection ID;
- site/version/source identity;
- source, evidence, candidate, review, and screenshot artifact refs;
- original source content blocks with normalized text hashes;
- conservative transformation-policy candidates;
- imported asset continuity records;
- usage evidence from existing structured evidence only;
- logo, image, typography, color, and visual-style candidates;
- source layout continuity;
- source screenshot references;
- original-source thumbnail readiness only;
- readiness dimensions, limitations, diagnostics, and lineage.

The projection does not require all fields to be populated. Missing data remains
explicit through `missing` / `unavailable` states, readiness degradation,
limitations, and diagnostics.

## Deterministic Identity

`projectionId` is derived from stable normalized content:

- `siteVersionId`;
- authoritative `sourceSiteId`;
- `dryRunId` where available;
- Source Website Understanding projection ID;
- contract version;
- exact upstream artifact references;
- normalized projection content.

`generatedAt` is retained for inspectability but excluded from the stable
identity. Rebuilding with the same upstream inputs and different timestamps
produces the same projection ID.

## Content Identity And Policy Behavior

Content blocks preserve original text. VCU-2 does not rewrite, summarize, or
transform text.

Each block carries:

- deterministic block ID;
- route/page/section relationship where WU exposes it;
- content type;
- original text;
- normalized text hash;
- source order;
- evidence refs;
- artifact refs;
- language where known;
- knowledge state;
- confidence;
- review state where available;
- limitations.

Conservative policy defaults:

- business/title text: `PRESERVE_VERBATIM`;
- contact details: `PRESERVE_VERBATIM`;
- navigation labels: `PRESERVE_WITH_CLEANUP`;
- explicit service/offer candidates: `IMPROVE_PRESERVING_MEANING` with review
  required;
- inferred audience language: `REQUIRE_CONFIRMATION`;
- trust statements: `PRESERVE_VERBATIM` with review required and no
  strengthening;
- legal-like text: `REQUIRE_CONFIRMATION`;
- unclassified body copy: `REQUIRE_CONFIRMATION`;
- placeholder text: `EXCLUDE` only when explicitly observed by existing
  evidence.

## Asset Continuity Behavior

Asset continuity records preserve existing imported asset identity and safe
references. The projection does not create a second registry and does not
expose arbitrary filesystem paths.

Every asset reuse state remains conservative:

- no asset becomes `safe_to_reuse` without explicit licensing/source
  authorization;
- missing licensing/source state blocks automatic reuse;
- preview availability alone does not authorize reuse;
- file existence alone does not authorize reuse;
- unknown role remains unresolved or confirmation-required.

Logo candidates remain candidates. They are not canonical brand identity and
are not asset approvals.

## Typography And Color Behavior

Typography candidates come only from existing WU/style/file evidence.

Nationale font files are represented as local font-file signals unless explicit
upstream usage evidence marks heading/body usage. Fontello is represented as
icon-font evidence and is never promoted into heading/body brand typography
without explicit evidence.

Color signals come only from existing structured style signals. VCU-2 does not
extract colors from raw CSS and does not create a canonical palette.

## Screenshot And Thumbnail Behavior

VCU-2 projects existing Evidence Capture screenshot references from runtime
provenance metadata. It does not capture screenshots and does not generate
thumbnails.

Thumbnail readiness covers only the original source website:

- source screenshot available;
- safe screenshot reference available;
- suitable for Workspace thumbnail;
- blockers.

Generated iteration thumbnails remain outside VCU.

## Readiness

Readiness statuses:

```text
not_ready
partially_ready
ready_for_design_enrichment
ready_for_generation_delivery
blocked
stale
invalid
```

`ready_for_design_enrichment` means enough continuity material exists to enrich
future WDB/WGP conservatively. It does not authorize asset reuse, generation
delivery, approval, publishing, or deployment.

`ready_for_generation_delivery` requires classified, governed, safely
accessible, delivery-ready materials. VCU-2 correctly keeps this false for the
real targets because asset reuse/licensing remains unresolved.

## Operator Page

The superadmin page is server-rendered and read-only.

Default hierarchy:

1. Source Continuity Summary
2. Readiness
3. Original Content
4. Transformation Candidates
5. Source Assets
6. Logo and Image Candidates
7. Typography and Colors
8. Layout and Screenshot Continuity
9. Confirmation and Licensing Gaps
10. Source Lineage
11. Advanced Diagnostics

The page contains no forms, inputs, textareas, selects, mutation buttons,
confirmation controls, content editing controls, asset approval controls,
generation controls, provider/AI controls, publishing controls, deployment
controls, or server mutation actions.

Read-only cross-navigation now links:

```text
Knowledge Workspace -> Website Understanding -> Content & Visual Continuity
-> Business Foundation -> Generation Evolution
```

## Real-Target Validation

Read-only command:

```bash
cd apps/platform
set -a; source .env.production; set +a
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx gnr8/architecture/source-content-visual-continuity-real-target.cli.ts
```

No target writes were performed.

### ODV

- siteVersionId: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- projectionId: `source_content_visual_continuity_8e855e8cb481f78e8131b579d6760357`
- WU projectionId: `source_website_understanding_0caa89099ee02c9469b539cf2b2d0613`
- readiness: `ready_for_design_enrichment`
- confidence: `MEDIUM`
- content blocks: `25`
- headings: `2`
- paragraphs: `4`
- CTAs: `2`
- contact details: `4`
- service/offer blocks: `1`
- audience-language blocks: `0`
- trust blocks: `1`
- source assets: `383`
- logo candidates: `1`
- image candidates: `317`
- typography candidates: `19`
- color signals: `7`
- screenshots: `4`
- deterministic rebuild equality: `true`
- downstream contamination scan: none
- validation: valid, `0` errors, `0` warnings

ODV logo candidate:

```text
uploads/uz6Dg2kX/236x0_247x0/Tabla40x20cm_51.png
```

Nationale appears as local font-file evidence. Fontello appears separately as
icon-font evidence and is not promoted to heading/body typography.

Original-source screenshot references exist, but safe screenshot access refs
are not yet available, so Workspace thumbnail readiness remains blocked.

### ViroiDoc

- siteVersionId: `e26b0754-988b-45b9-9e24-8e213179b6cf`
- projectionId: `source_content_visual_continuity_aba6d40c4453e6bd2bec3405a66945b8`
- WU projectionId: `source_website_understanding_72cece90151974f980a2abf7b5528709`
- readiness: `ready_for_design_enrichment`
- confidence: `MEDIUM`
- content blocks: `58`
- headings: `2`
- paragraphs: `4`
- CTAs: `3`
- contact details: `3`
- service/offer blocks: `0`
- audience-language blocks: `1`
- trust blocks: `3`
- source assets: `401`
- logo candidates: `2`
- image candidates: `324`
- typography candidates: `27`
- color signals: `7`
- screenshots: `4`
- deterministic rebuild equality: `true`
- downstream contamination scan: none
- validation: valid, `0` errors, `0` warnings

ViroiDoc logo candidates:

```text
uploads/6u0e8YOs/320x0_320x0/ViroiDocCGP6k-logobela.webp
uploads/l3otKd4l/320x0_320x0/ViroiDocCGP6k-logobarvna.webp
```

ViroiDoc preserves the same governance distinction: typography and color are
source signals only, logo/image assets are candidates only, and asset
reuse/licensing remains unresolved.

## Remaining Gaps

- No VCU persistence exists.
- No WDB/WGP/Provider Payload consumer exists yet.
- No content transformation exists.
- No asset approval or reuse authorization exists.
- No screenshot safe-access route for original source screenshots was added in
  VCU-2.
- No thumbnail generation exists.
- Source content remains limited by the upstream WU projection granularity.

## Recommended Next Phase

VCU-3 should design a read-only downstream enrichment contract showing exactly
how WDB/WGP may consume VCU as source continuity context without promoting
content into business truth, canonical brand identity, asset approval, or
provider-ready generation instructions.

## KWX-3 Workspace Consumption

KWX-3 consumes the existing VCU runtime projection inside the Knowledge
Workspace as the consolidated:

```text
What Will Remain Recognizable
```

The Workspace uses VCU data for logo candidates, representative image
candidates, observed color signals, typography candidates, navigation, CTA,
contact, source content, and layout continuity. It keeps these signals as
candidates or observations only.

ODV still has source screenshot references but no safe screenshot access ref,
so the Workspace must not present them as displayed source screenshots. When a
representative source image is used, it is labelled `Representative imported
image`.

Fontello remains icon-font evidence. Observed colors remain observed color
signals, not brand colors. Candidate logo remains `Candidate logo -
confirmation required`.

KWX-3 does not change VCU truth, VCU runtime, source parsing, source capture,
asset extraction, screenshot access, thumbnail generation, content
transformation, asset approval, WDB/WGP enrichment, Provider Payload,
generation, publishing, deployment, DNS, schema, persistence, API, worker, or
AI behavior.
