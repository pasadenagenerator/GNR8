# First Observed Website Model

## Phase And Boundary

MVP-2.0-C created the first real `ObservedWebsiteModelArtifact` from the
first real persisted `GeneratedWebsiteProposalArtifact`.

This phase observes the generated website proposal only.

It does not compare against the Website Generation Package, perform Generation
Contract Compliance, create a Compliance Report, create Business Approval,
publish, deploy, call providers, execute AI, regenerate the website, modify
the Generated Website Proposal, mutate canonical business artifacts, or add
UI, API, schema, or worker surfaces.

## Target And Source

Target:

- ODV
- `siteVersionId`: `09dce7ea-d860-4f60-a1eb-26c3335b302e`

Source:

- `GeneratedWebsiteProposalArtifact`:
  `generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3`
- `generatedWebsiteProposalId`:
  `generated-website-proposal:e8211d1e619e960c6e6703cd07992121`
- output bundle: `manual_codex_output_bundle:ODV_GENERATED_PROPOSAL_001`
- storage reference: `repo://ODV_GENERATED_PROPOSAL_001`
- entrypoint: `source/index.html`

The source proposal loaded as latest and by ID. It was valid, quarantined,
classified as `implementation_proposal_only`, untrusted, and ready for
observation.

## Persisted Artifact

Latest persisted Observed Website Model:

- artifact ID: `observed_website_model_35499a9cb91a15740910532d451a739a`
- observed model ID:
  `observed-website-model:5a5f47881a29bb1c272360b50a3128f3`
- status: `observable`
- readiness: `observable`
- dry run ID: `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`

The final latest artifact was built through `buildObservedWebsiteModel(...)`
with parsed static HTML observation metadata from the quarantined proposal
bundle. A preliminary metadata-only OWM was also persisted earlier in the
same phase; the richer static-HTML OWM above is the latest artifact and the
cold retry reused it without appending another record.

## Observation Summary

Counts:

| Observation | Count |
| --- | ---: |
| pages | `1` |
| routes | `1` |
| navigation / links | `11` |
| nav-menu links | `6` |
| sections | `7` |
| headings | `14` |
| CTA links | `3` |
| messages | `53` |
| assets | `6` |
| constraints | `9` |
| technical signals | `12` |
| evidence refs | `17` |
| limitations | `127` |

Observable technical signals:

- `html_lang = en`
- `meta:robots = noindex, nofollow`
- `meta:proposal-status = quarantined-generated-website-proposal`
- `meta:source-export-id = odv-export-25b18a7102ed29c2`
- `meta:source-wgp-id =
  website-generation-package:0bb33dd388323a443bf36be58bf2d9a1`
- `stylesheet_link_count = 1`
- `script_src_count = 1`
- output bundle file count `11`
- output bundle byte size `28574`
- output bundle content hash
  `sha256:beb53a4c0365b2ab73dd0a6bf0bd30afdc3963b1b9016ad77158c409cc3d6dad`

Missing observations:

- No rendered browser observation was executed.
- No live deployment, public preview, DNS, production host, or runtime route
  was inspected.
- Image semantics remain limited to source/file observations; no visual image
  inspection was performed.
- Contact details, audience knowledge, offering knowledge, business identity
  strength, brand semantics, testimonials, certifications, guarantees,
  pricing, legal claims, and geographic scope remain unresolved unless already
  visible in the generated proposal.

Limitations:

- The proposal remains quarantined and untrusted.
- The source WGP lineage remains partial and low-confidence.
- Business/audience/offering limitations are preserved as limitations, not
  resolved by observation.
- The generated output is referenced and statically parsed only; it was not
  executed or rendered.

## Reload And Idempotency

Latest reload:

- `loadLatestObservedWebsiteModel(...)` returned
  `observed_website_model_35499a9cb91a15740910532d451a739a`.

By-ID reload:

- `loadObservedWebsiteModelById(...)` returned
  `observed_website_model_35499a9cb91a15740910532d451a739a`.

Idempotent retry:

- Immediate retry reused
  `observed_website_model_35499a9cb91a15740910532d451a739a`.
- Cold retry reused
  `observed_website_model_35499a9cb91a15740910532d451a739a`.
- Cold retry artifact counters stayed unchanged:
  generated proposals `1 -> 1`, OWMs `2 -> 2`, compliance `0 -> 0`,
  compliance reports `0 -> 0`, Business Approval `0 -> 0`, publishing
  `0 -> 0`, provider payloads `1 -> 1`.

## Safety Verification

Verified:

- no Generation Contract Compliance artifact was created;
- no Compliance Report artifact was created;
- no Business Approval artifact was created;
- no publishing artifact was created;
- no deploy, DNS, production, or runtime publish mutation occurred;
- no provider execution occurred;
- no AI execution occurred;
- no Generated Website Proposal mutation occurred;
- no canonical business artifact mutation occurred;
- no UI, API, schema, or worker surface was added;
- only existing OWM persistence changed runtime state.

The final OWM diagnostics include:

- `OBSERVED_WEBSITE_MODEL_NO_WGP_COMPARISON`
- `OBSERVED_WEBSITE_MODEL_NO_COMPLIANCE_JUDGMENT`
- `OBSERVED_WEBSITE_MODEL_NO_PROVIDER_CALL`
- `OBSERVED_WEBSITE_MODEL_NO_AI_EXECUTION`
- `OBSERVED_WEBSITE_MODEL_NO_RENDERING`
- `OBSERVED_WEBSITE_MODEL_NO_PUBLISHING_OR_RUNTIME_MUTATION`
- `OBSERVED_STATIC_HTML_WITH_PARSE5`

## Validation

MVP-2.0-C validation:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test
  apps/platform/gnr8/architecture/observed-website-model-*.test.ts` passed
  `13 / 13`. The first sandboxed attempt hit the known local `tsx` IPC pipe
  `EPERM` before test execution; rerunning the same command outside the
  restricted sandbox passed.
- `cd apps/platform && pnpm run vercel-build` passed. The build emitted
  existing unrelated lint warnings for React hook dependencies and `<img>`
  usage, then completed successfully.
- `git diff --check` passed.

## Recommended Next Phase

Recommended next phase: MVP-2.0-D - First Real Generation Contract Compliance
for ODV.

That next phase may compare the persisted ODV Observed Website Model against
the ODV Website Generation Package. MVP-2.0-C stops before that comparison.
