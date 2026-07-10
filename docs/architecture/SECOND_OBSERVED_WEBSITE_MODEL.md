# Second Observed Website Model

## Phase And Boundary

MVP-2.0-K created the second real `ObservedWebsiteModelArtifact` for ODV from
the second persisted `GeneratedWebsiteProposalArtifact`.

This phase observes the Iteration 2 generated website proposal only.

It does not compare Iteration 2 against Iteration 1, compare against the
Website Generation Package, perform Generation Contract Compliance v2, create
a Compliance Report v2, create a Generation Improvement Plan v2, create
Business Approval, publish, deploy, mutate DNS, mutate production, call
providers, execute AI, regenerate the website, mutate either Generated Website
Proposal, mutate the Website Generation Package, mutate canonical business
artifacts, or add UI, API, schema, or worker surfaces.

## Target And Source

Target:

- ODV
- `siteVersionId`: `09dce7ea-d860-4f60-a1eb-26c3335b302e`

Source:

- `GeneratedWebsiteProposalArtifact`:
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`
- `generatedWebsiteProposalId`:
  `generated-website-proposal:0428d911ceda6f91099ce6fbec2cd8e4`
- output bundle: `ODV_GENERATED_PROPOSAL_002`
- storage reference: `repo://ODV_GENERATED_PROPOSAL_002`
- entrypoint: `source/index.html`
- source Provider Payload v2:
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`
- source Website Generation Package:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`

The source proposal loaded as latest and by ID. It was valid, quarantined,
classified as `implementation_proposal_only`, fail-closed, and ready for
observation with `readyForCompliance: true`.

## Persisted Artifact

Latest persisted Observed Website Model v2:

- artifact ID: `observed_website_model_0d5e829f546745b1433557978c875626`
- observed model ID:
  `observed-website-model:d76d4b923e49b8584f790f385e9a637c`
- status: `observable`
- readiness: `observable`
- dry run ID: `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`

The artifact was built through `buildObservedWebsiteModel(...)` with parsed
static HTML observation metadata from the quarantined Iteration 2 source
bundle under `ODV_GENERATED_PROPOSAL_002/source/`, then persisted through
`persistObservedWebsiteModel(...)`.

## Iteration Preservation

Iteration 1:

- Generated Website Proposal v1:
  `generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3`
- Observed Website Model v1:
  `observed_website_model_35499a9cb91a15740910532d451a739a`

Iteration 2:

- Generated Website Proposal v2:
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`
- Observed Website Model v2:
  `observed_website_model_0d5e829f546745b1433557978c875626`

Both OWM artifacts remain immutable and reloadable by ID. OWM v2 is now the
latest observation. No Iteration 1 vs Iteration 2 comparison has been
performed.

Iteration and generation-cycle context remains represented through existing
lineage, diagnostics, source bundle metadata, and attestation. No new contract
fields were added solely for iteration metadata.

## Observation Summary

Counts:

| Observation | Count |
| --- | ---: |
| pages | `1` |
| routes | `1` |
| navigation / links | `11` |
| nav-menu links | `7` |
| sections | `7` |
| headings | `17` |
| CTA links | `3` |
| messages | `70` |
| assets | `14` |
| constraints | `53` |
| technical signals | `18` |
| evidence refs | `18` |
| limitations | `121` |

Observable technical signals include `html_lang = en`,
`meta:proposal-iteration = 2`, `meta:source-export-id =
odv-regeneration-export-002`, `meta:source-wgp-id =
website-generation-package:0bb33dd388323a443bf36be58bf2d9a1`, stylesheet and
script source counts, source file count, source file total bytes, and source
bundle generation-cycle metadata.

Missing observations and limitations remain limitations. No missing fact was
inferred and no contractual fulfillment was evaluated.

## Reload And Idempotency

Latest reload:

- `loadLatestObservedWebsiteModel(...)` returned
  `observed_website_model_0d5e829f546745b1433557978c875626`.

By-ID reload:

- `loadObservedWebsiteModelById(...)` returned
  `observed_website_model_0d5e829f546745b1433557978c875626`.

Idempotent retry:

- Immediate retry reused
  `observed_website_model_0d5e829f546745b1433557978c875626`.
- Cold retry reused
  `observed_website_model_0d5e829f546745b1433557978c875626`.
- OWM count moved from `2` to `3` exactly once during persistence, then stayed
  `3 -> 3` on cold retry.

## Safety Verification

Verified:

- no WGP comparison;
- no Generation Contract Compliance v2;
- no Compliance Report v2;
- no Generation Improvement Plan v2;
- no Iteration 1 vs Iteration 2 quality comparison;
- no Business Approval;
- no publishing;
- no deployment;
- no DNS mutation;
- no production mutation;
- no provider execution;
- no AI execution;
- no proposal mutation;
- no canonical business mutation;
- no runtime mutation outside OWM persistence.

The final OWM diagnostics include:

- `OBSERVED_STATIC_HTML_WITH_PARSE5`
- `OBSERVED_ITERATION_2_SOURCE_BUNDLE`
- `OBSERVED_SOURCE_DIRECTORY:ODV_GENERATED_PROPOSAL_002/source`
- `OBSERVED_WEBSITE_MODEL_NO_WGP_COMPARISON`
- `OBSERVED_WEBSITE_MODEL_NO_COMPLIANCE_JUDGMENT`
- `OBSERVED_WEBSITE_MODEL_NO_PROVIDER_CALL`
- `OBSERVED_WEBSITE_MODEL_NO_AI_EXECUTION`
- `OBSERVED_WEBSITE_MODEL_NO_RENDERING`
- `OBSERVED_WEBSITE_MODEL_NO_PUBLISHING_OR_RUNTIME_MUTATION`

## Validation

MVP-2.0-K validation:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test
  apps/platform/gnr8/architecture/observed-website-model-*.test.ts` passed
  `13 / 13`.
- `cd apps/platform && pnpm run vercel-build` was attempted. It started
  `next build`, then remained silent for roughly ten minutes with the child
  process still alive but barely active; the stuck validation process was
  terminated. Build result is therefore inconclusive for this phase.
- `git diff --check` passed.

## Recommended Next Phase

Recommended next phase: MVP-2.0-L - Generation Contract Compliance v2 for
ODV.

That next phase may compare the persisted ODV Observed Website Model v2
against the ODV Website Generation Package. MVP-2.0-K stops before that
comparison and performs no iteration comparison.
