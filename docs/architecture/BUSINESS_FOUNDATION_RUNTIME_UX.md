# Business Foundation Runtime UX

## Phase Boundary

MVP-3.1-A transforms the Business Foundation page into a story-first product
experience while preserving the read-only runtime boundary from MVP-3.0-C.
The canonical transformation record is:

```text
docs/architecture/BUSINESS_FOUNDATION_PRODUCT_UX_TRANSFORMATION.md
```

MVP-3.0-C implements the second real read-only GNR8 Runtime UX surface:
the Business Foundation page for ODV site version
`09dce7ea-d860-4f60-a1eb-26c3335b302e`.

The implementation is read-only. It consumes existing persisted artifacts and
existing site-version provenance. It does not edit artifacts, execute AI,
generate output, regenerate output, execute providers, edit Business
Alignment, approve output, publish output, deploy output, mutate DNS, run
workers, change schema, change persistence, or expose mutation server actions.

## Runtime Route

Business Foundation route:

```text
/gnr8/admin/business-foundation/[siteVersionId]
```

ODV route:

```text
/gnr8/admin/business-foundation/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

The page is server-rendered, guarded by `requireSuperadminUserIdForPage`, and
contains no forms, editable inputs, generation controls, regeneration
controls, approval controls, publishing controls, deployment controls,
provider execution controls, AI controls, DNS controls, or mutation server
actions.

## Projection

Runtime projection:

```text
apps/platform/gnr8/architecture/generation-business-foundation-projection.ts
```

The projection is not a canonical artifact. It is a read model derived from
the existing `siteVersion.importProvenanceSummary` business artifact chain.
It consumes only:

- Business Discovery
- Digital Business Twin
- Business Understanding Report
- Business Alignment
- Aligned Digital Business Twin
- Website Design Brief
- Website Generation Package

It intentionally excludes provider payloads, generated proposals, compliance,
compliance reports, improvement plans, observed website models, and evolution
analysis from the business artifact explorer.

MVP-3.1-A extends the runtime projection with product-facing read-only
concepts: business hero, source website, generated iteration links, business
narrative, product attention summary, visual identity, brand colors,
typography, imported asset summary, imported asset previews, missing
knowledge gaps, and advanced technical details. These are composed from
existing persisted sources and existing evolution dashboard projections. They
are not canonical artifacts and are not persisted.

## Page Sections

After MVP-3.1-A, the top-level page hierarchy is:

- Business Hero
- Website Versions
- What GNR8 Understands
- Offerings and Audience
- Detected Brand & Visual Identity
- Original Imported Assets
- What GNR8 Still Needs to Know
- Transformation Story
- Advanced: Evidence, Lineage & Canonical Artifacts

The page no longer begins as a grid of technical diagnostic cards. Artifact
IDs, dry-run IDs, detailed evidence counts, attention codes, and the full
limitation ledger are secondary advanced material.

## Earlier MVP-3.0-C Sections

The page exposes these read-only sections:

- Header
- Business Summary
- Business Knowledge
- Offerings
- Audience
- Missing Knowledge
- Transformation Story
- Business Foundation Status
- Attention States
- Artifact Explorer
- Related Read-Only Surface

Business Summary displays business name, business identity, business purpose,
business goals, business confidence, business tone, trust strategy, and
digital presence from persisted business knowledge where available.

Business Knowledge groups persisted knowledge under Identity, Offerings,
Goals, Brand, Content, Trust, Digital Presence, and Constraints. Each group
shows confidence, evidence count, limitations, known statements, and missing
knowledge when present.

Missing Knowledge explicitly separates known knowledge, unknown knowledge, and
persisted assumptions. When no persisted assumptions are present, the page says
so instead of inventing assumptions.

Business Foundation Status displays existing business confidence, known
knowledge count, missing knowledge count, limitation count, evidence quality,
and Website Generation Package readiness/status. It does not calculate a new
business score or unsupported health judgement.

## Transformation Story

The visual story is:

```text
Business Discovery
↓
Digital Business Twin
↓
Business Understanding
↓
Business Alignment
↓
Website Design Brief
↓
Website Generation Package
```

Each step explains what the existing artifact contributes:

- Business Discovery captures deterministic website-derived business signals
  and limitations.
- Digital Business Twin turns discovery findings into structured business
  knowledge and missing knowledge.
- Business Understanding projects the Digital Business Twin into a readable
  business report.
- Business Alignment records governed corrections or confirmations and
  identifies the aligned Digital Business Twin.
- Website Design Brief transforms aligned business knowledge into website
  experience intent.
- Website Generation Package transforms website intent into provider-neutral
  generation requirements.

## Artifact Explorer

The Artifact Explorer provides read-only copyable IDs for:

```text
Business Discovery
Digital Business Twin
Business Understanding Report
Business Alignment
Aligned Digital Business Twin
Website Design Brief
Website Generation Package
```

The explorer uses hash anchors and code-rendered IDs only. It provides no
editors, no raw JSON editor, no approval path, and no downstream execution
controls.

## Attention States

The page projects these read-only operator attention states:

- `low_confidence`
- `missing_audience`
- `missing_offerings`
- `missing_evidence`
- `large_limitation_count`
- `business_partially_understood`

These states are visibility only. They do not trigger recomputation, AI,
provider execution, generation, regeneration, approval, publishing,
deployment, DNS mutation, production mutation, or artifact mutation.

## Runtime UX Pairing

After MVP-3.0-C, GNR8 has two complete read-only Runtime UX surfaces:

```text
Business Foundation
(WHY)
↓
Generation Evolution Dashboard
(HOW)
```

The Business Foundation page explains the business understanding that drove
the Website Design Brief and Website Generation Package. The Generation
Evolution Dashboard explains how generated website iterations evolved from
that foundation.

After MVP-3.0-D, the two surfaces include plain read-only cross-links:
Business Foundation links to `Inspect Generation Evolution`, and Generation
Evolution links back to `Inspect Business Foundation`.

## Validation

Focused tests:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test \
  apps/platform/gnr8/architecture/generation-business-foundation-projection.test.ts \
  apps/platform/app/gnr8/admin/business-foundation-page.test.ts
```

Required build:

```text
cd apps/platform && pnpm run vercel-build
```

MVP-3.0-C validation completed with focused tests passing, full platform
build passing, and `git diff --check` passing.

## MVP-3.0-D Verification Status

MVP-3.0-D completed the first authenticated real-target operator verification
of the ODV Business Foundation route.

Canonical verification record:

```text
docs/architecture/BUSINESS_FOUNDATION_REAL_TARGET_VERIFICATION.md
```

The authenticated local browser session loaded:

```text
/gnr8/admin/business-foundation/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

The route did not redirect to login or agency workspace, displayed the target
`siteVersionId`, and remained read-only. Browser and source inspection found
no rendered forms, inputs, textareas, selects, buttons, editable content,
mutation server actions, correction controls, Business Alignment controls,
generation/regeneration controls, provider controls, AI controls, approval
controls, publish/deploy controls, or DNS controls.

Narrow MVP-3.0-D fixes:

- Added a read-only link from Business Foundation to Generation Evolution.
- Added a reciprocal read-only link from Generation Evolution to Business
  Foundation.
- Renamed the visible `Business Health` heading to `Business Foundation
  Status` to avoid implying a newly calculated health judgement.

No projection meaning, canonical data, persistence, schema, auth logic,
provider behavior, AI behavior, generated source, publishing, deployment, DNS,
or production behavior changed.

## MVP-3.1-A Product UX Status

MVP-3.1-A completed the story-first Business Foundation transformation.

The hero now shows the observed business identity, persisted original website
URL, business description, apparent website purpose, confidence/current state,
and a concise missing-knowledge summary. Primary actions are read-only links:
`Open Original Website`, `Inspect Generation Evolution`, and `Open Latest
Generated Proposal`.

Website Versions now appears near the top and links Original Website,
Iteration 1, and Iteration 2. Iteration 2 is clearly marked as the latest
quarantined generated proposal, not approved, not published, still
non-compliant, and a meaningful improvement with no regressions according to
persisted evolution data.

The Visual Identity section shows ODV's current CGP gap honestly: no
confirmed logo preview, no canonical brand colors, and no canonical
typography. Imported original assets are summarized separately from generated
proposal assets and are not all labeled as brand assets.

The advanced technical section preserves lineage, IDs, evidence counts,
diagnostics, and the Artifact Explorer. The page remains entirely read-only
and adds no mutation controls or execution behavior.

## MVP-3.1-B Upstream Gap Planning Status

MVP-3.1-B confirms that the Business Foundation page is exposing real upstream
gaps, not merely display defects.

Canonical planning record:

```text
docs/architecture/BUSINESS_FOUNDATION_UPSTREAM_EVIDENCE_GAP_PLAN.md
```

The ODV source evidence contains body-copy service and audience signals, an
HTML/structured-data logo candidate, repeated CSS color values, and imported
font assets. The runtime projection does not promote them because it is a
read model over confirmed business artifacts, and those upstream signals have
not been classified, governed, or confirmed as canonical DBT knowledge.

Future Business Foundation UX may show candidate evidence only if provenance,
confidence, original-vs-generated asset boundaries, and human-confirmation
state are explicit. Candidate evidence must remain visually distinct from
canonical business truth.

## GX-1 Knowledge Workspace Relationship

GX-1 adds the Knowledge Workspace as the first page an operator should open
for a site version:

```text
/gnr8/admin/workspace/[siteVersionId]
```

Business Foundation remains the supporting page for business meaning and WHY
context. The Workspace composes Business Foundation with Source Website
Understanding and Generation Evolution so operators can see the original
website, generated proposal history, knowledge quality, gaps, and health in
one place before drilling into the Business Foundation module.

GX-1 adds a read-only `Open Knowledge Workspace` link from Business
Foundation. It does not change the Business Foundation projection semantics,
Business Discovery, DBT, BUR, Business Alignment, WDB, WGP, persistence,
schema, API, generation, AI, publishing, deployment, DNS, or runtime
architecture.
