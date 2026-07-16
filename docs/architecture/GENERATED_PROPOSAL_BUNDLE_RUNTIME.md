# Generated Proposal Bundle Runtime

## Phase

P0 - Durable Generated Proposal Preview Runtime Foundation

## Status

Runtime foundation implemented, locally verified, production materialized,
production preview verified, and canonically closed for ODV Iteration 1 and
Iteration 2.

Production verification record:

```text
docs/architecture/DURABLE_GENERATED_PROPOSAL_PREVIEW_PRODUCTION_VERIFICATION.md
```

Closeout record:

```text
docs/architecture/DURABLE_GENERATED_PROPOSAL_PREVIEW_CLOSEOUT.md
```

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

Production ODV bundle materialization was performed in P0-VERIFY with explicit
operator approval for only the two ODV `generated_proposal_bundle` writes under
site version `09dce7ea-d860-4f60-a1eb-26c3335b302e`.

Materialization command:

```text
set -a
source apps/platform/.env.production
set +a
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json apps/platform/gnr8/architecture/generated-proposal-bundle-odv.cli.ts
```

Persisted bundle records:

```text
Iteration 1: generated_proposal_bundle_eb95bc58e327d009f2282cf6908dfdd4
Iteration 2: generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075
```

The retry reused the same IDs and kept bundle count at `2`. Production
previews now render the generated websites from durable persisted bundle
storage instead of returning `PREVIEW_UNAVAILABLE`.

The production no-write-beyond-scope hash for all non-bundle provenance
remained unchanged before materialization, after materialization, and after
the idempotency retry:

```text
839a89dba37fd545772e25ba740dd1a95cb5b0cea81301ffc87009b9c7b46010
```

The CLI now closes the existing superadmin DB pool after completion so the
production materialization and idempotency commands exit cleanly. This is a
CLI process cleanup only and does not change persistence behavior.

P0-CLOSEOUT read-only verification confirmed the production bundle count
remains exactly `2`, both bundle IDs remain unchanged, both by-ID and
by-iteration loaders resolve the expected records, filesystem independence
remains documented, and both production previews remain operational. No
materialization command or production write was run in closeout.

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

## VCU-0 Continuity And Thumbnail Audit Relationship

VCU-0 adds
`docs/architecture/SOURCE_CONTENT_VISUAL_CONTINUITY_REALITY_AUDIT.md` as a
documentation-only audit of why the durable generated proposal bundles are
previewable but do not provide card thumbnails or source-site visual
continuity. The audit finds that Iteration 1 and Iteration 2 previews are
durable and immutable, but Workspace cards have no persisted screenshot
thumbnail and generated cards rely on live iframe preview instead.

VCU-0 does not change bundle persistence, preview routes, persisted assets,
Generated Proposal import behavior, observation, compliance, AI, publishing,
deployment, DNS, schema, API, UI, workers, Proposal v3, or generation behavior.
Future thumbnail work should preserve bundle immutability and prefer persisted
screenshot thumbnails with live preview retained for click-through inspection.

## VCU-1 Continuity And Thumbnail Relationship

VCU-1 adds
`docs/architecture/SOURCE_CONTENT_VISUAL_CONTINUITY_PROJECTION_SPECIFICATION.md`
and locks the thumbnail boundary conceptually without implementation. The
preferred generated-iteration thumbnail model is a derived immutable screenshot
child artifact associated with the Generated Proposal Bundle, while the bundle
itself remains the authoritative immutable interactive preview asset set.

Generated Proposal Bundle data is not an input to the source continuity
projection. It may be referenced later by separate thumbnail presentation work
or by generated-output continuity validation, but it must not rewrite source
content, asset, or visual continuity. VCU-1 does not change bundle
persistence, preview routes, persisted assets, Generated Proposal import,
observation, compliance, AI, publishing, deployment, DNS, schema, API, UI,
workers, Proposal v3, thumbnails, or generation behavior.

## VCU-2 Runtime Relationship

VCU-2 keeps Generated Proposal Bundles outside the source continuity input set.
The new continuity projection reports original-source screenshot readiness only.
It does not read bundle assets, generate generated-iteration thumbnails, change
bundle persistence, alter preview routes, import proposals, observe generated
sites, run compliance, regenerate proposals, publish, deploy, or mutate
production state.
# WVT-1 Update

Generated version thumbnails derive from exact durable `generated_proposal_bundle` artifacts and the existing superadmin preview route. The thumbnail artifact stores lineage to the bundle ID and bundle SHA; it does not mutate the bundle or become an authoritative generated proposal artifact.

## WVT-1-VERIFY Update

WVT-1-VERIFY reused the persisted ODV bundle artifacts to render generated
proposal thumbnails. Thumbnail capture did not read
`ODV_GENERATED_PROPOSAL_001/` or `ODV_GENERATED_PROPOSAL_002/`; a filesystem
independence proof temporarily renamed both folders and reproduced the same
thumbnail IDs, byte counts, and hashes from persisted bundle storage.

No bundle writes occurred during WVT-1-VERIFY. The generated thumbnail lineage
remains:

```text
Iteration 1 bundle: generated_proposal_bundle_eb95bc58e327d009f2282cf6908dfdd4
Iteration 1 bundleSha256: c486d84b30f284042454b11ed0306981c8041b25f7b19cdcab43cbe02c06f4aa
Iteration 1 thumbnail: website_version_thumbnail_4fc6a605432164d10b46eb41ad7da639

Iteration 2 bundle: generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075
Iteration 2 bundleSha256: 39307d8d5017ec28fba3cf41531bf381370cd8f065d645026bfd93172203ed03
Iteration 2 thumbnail: website_version_thumbnail_a71501efe316a082c6b6534da699264f
```
