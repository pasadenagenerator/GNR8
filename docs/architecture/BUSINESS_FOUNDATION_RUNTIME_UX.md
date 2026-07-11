# Business Foundation Runtime UX

## Phase Boundary

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
analysis.

## Page Sections

The page exposes these read-only sections:

- Header
- Business Summary
- Business Knowledge
- Offerings
- Audience
- Missing Knowledge
- Transformation Story
- Business Health
- Attention States
- Artifact Explorer

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

Business Health displays existing business confidence, known knowledge count,
missing knowledge count, limitation count, evidence quality, and Website
Generation Package readiness/status. It does not calculate a new business
score.

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
