# Generated Proposal Bundle Runtime

## Phase

P0 - Durable Generated Proposal Preview Runtime Foundation

## Status

Runtime foundation implemented and locally verified. Production runtime
materialization of the ODV bundle artifacts was not performed in this thread
because writing those artifacts to the production database is a production
data mutation and the approval guard rejected that action.

## Boundary

This phase introduces a durable, immutable Generated Proposal Bundle artifact
for read-only preview reconstruction.

It allows:

- runtime artifact contract
- runtime persistence in `siteVersion.importProvenanceSummary`
- bundle metadata
- asset persistence
- immutable bundle records
- preview loader
- existing preview route reuse
- deterministic lineage
- focused validation and tests

It does not add publishing, deployment, hosting, production website serving,
Business Approval, provider execution, AI execution, runtime generation, WGP
mutation, proposal regeneration, schema redesign outside preview storage, or
new generation.

## Runtime Model

Previous preview dependency:

```text
Generated Proposal
-> local folder
-> preview
```

Durable preview dependency:

```text
Generated Proposal
-> Generated Proposal Bundle
-> durable artifact storage
-> read-only preview route
-> Knowledge Workspace
-> Generation Evolution
-> Business Foundation
```

The persisted artifact kind is:

```text
generated_proposal_bundle
```

Runtime module:

```text
apps/platform/gnr8/architecture/generated-proposal-bundle-persistence.ts
```

ODV materialization helper:

```text
apps/platform/gnr8/architecture/generated-proposal-bundle-odv.cli.ts
```

The helper reads the existing local proposal folders only to materialize the
durable artifact. The preview route does not read those folders.

## Bundle Contents

Each bundle stores:

- `source/index.html`
- CSS assets
- JavaScript assets
- images
- fonts
- icons
- manifest files
- asset metadata
- content types
- relative path map
- lineage references
- SHA-256 integrity hashes
- preview metadata
- immutable asset bytes as persisted base64 content

The record carries `immutable: true`, deterministic `bundleSha256`, per-asset
SHA-256 values, total byte size, asset count, and the source Generated Website
Proposal lineage.

## Preview Route

Existing URLs remain unchanged:

```text
/gnr8/admin/evolution/[siteVersionId]/iterations/1/preview/
/gnr8/admin/evolution/[siteVersionId]/iterations/2/preview/
```

Runtime module:

```text
apps/platform/gnr8/architecture/generation-evolution-preview-boundary.ts
```

The preview boundary now loads the allowlisted iteration from the persisted
Generated Proposal Bundle artifact for the current `siteVersionId`. It no
longer computes a bundle root, checks `ODV_GENERATED_PROPOSAL_001/`, checks
`ODV_GENERATED_PROPOSAL_002/`, reads proposal files from the repository, or
uses filesystem realpaths during preview.

Security remains:

- superadmin only
- read-only
- `no-store`
- no traversal
- no mutation
- no provider execution
- no AI execution
- no publishing or deployment

Path traversal, encoded traversal, unknown iteration, missing assets, and
missing persisted bundle state remain fail-closed.

## Surface Impact

Knowledge Workspace keeps the same UX and links. `Open Preview` continues to
point at the Evolution preview routes, but those routes reconstruct from
persisted bundle assets.

Generation Evolution keeps the same iteration cards and preview controls. The
projection asks the preview boundary for availability by `siteVersionId` and
iteration.

Business Foundation keeps its read-only generated proposal links through the
same Evolution projection.

No UI redesign was introduced.

## Validation

Focused tests:

```text
pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/architecture/generated-proposal-bundle-persistence.test.ts apps/platform/gnr8/architecture/generation-evolution-dashboard-projection.test.ts apps/platform/gnr8/architecture/generation-business-foundation-projection.test.ts apps/platform/app/gnr8/admin/generation-evolution-dashboard-page.test.ts
```

Result:

```text
30 pass / 0 fail
```

Filesystem independence proof:

```text
ODV_GENERATED_PROPOSAL_001 -> ODV_GENERATED_PROPOSAL_001.__preview_independence_tmp
ODV_GENERATED_PROPOSAL_002 -> ODV_GENERATED_PROPOSAL_002.__preview_independence_tmp
pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/app/gnr8/admin/generation-evolution-dashboard-page.test.ts
```

Result:

```text
8 pass / 0 fail
```

The folders were restored after validation.

Coverage includes bundle persistence, retrieval, asset resolution, relative
paths, CSS, JavaScript, images, fonts, icons, manifests, 404 handling,
security traversal rejection, immutable reload, idempotent persistence,
lineage, preview rendering, and filesystem independence.

Broad TypeScript validation:

```text
cd apps/platform && pnpm exec tsc --noEmit
```

Result: failed on existing repository-wide test/type issues. One route-context
type issue introduced by this phase was fixed. Remaining failures were in
unrelated test fixtures and older runtime/template areas.

## ODV Status

Code-level ODV preview verification passed for Iteration 1 and Iteration 2
using persisted bundle bytes in tests.

Production ODV bundle materialization remains pending explicit operator
approval because it writes durable artifacts to the runtime database.

The prepared command is:

```text
set -a
source apps/platform/.env.production
set +a
pnpm exec tsx --tsconfig apps/platform/tsconfig.json apps/platform/gnr8/architecture/generated-proposal-bundle-odv.cli.ts
```

This command persists both ODV Generated Proposal Bundles and verifies
reloaded `source/index.html`, `source/styles.css`, and `source/script.js`
from persisted storage.

## Stop Line

Stop after:

- durable bundle persistence
- preview route reads persisted bundle
- ODV Iteration 1 code-path preview verified
- ODV Iteration 2 code-path preview verified
- filesystem independence proven locally

Do not continue toward publishing, deployment, hosting, Business Approval,
provider execution, AI generation, Proposal v3, runtime serving, production
activation, or generation.
