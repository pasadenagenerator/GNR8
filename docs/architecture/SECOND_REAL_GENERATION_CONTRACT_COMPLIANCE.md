# Second Real Generation Contract Compliance

## Phase And Boundary

MVP-2.0-L performed the second real Generation Contract Compliance evaluation
for ODV.

This phase compared only the persisted ODV `WebsiteGenerationPackageArtifact`
against the persisted ODV `ObservedWebsiteModelArtifact` v2 and persisted the
second real `GenerationContractComplianceArtifact`.

This phase did not compare Iteration 1 against Iteration 2. Iteration
comparison is intentionally deferred to a later dedicated phase.

This phase did not create Compliance Report v2, create Generation Improvement
Plan v2, regenerate, create Provider Payload v3, execute providers, execute
AI, create Business Approval, publish, deploy, mutate DNS, mutate production,
modify the Website Generation Package, modify either Observed Website Model,
modify canonical business artifacts, or add UI, API, schema, or workers.

## Target

- Business target: ODV
- SiteVersionId: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- WebsiteGenerationPackageArtifact:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`
- ObservedWebsiteModelArtifact v2:
  `observed_website_model_0d5e829f546745b1433557978c875626`
- Historical Iteration 1 compliance:
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`

## Source Verification

- WGP by-ID load passed:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`.
- OWM v2 by-ID load passed:
  `observed_website_model_0d5e829f546745b1433557978c875626`.
- OWM v2 latest reload returned
  `observed_website_model_0d5e829f546745b1433557978c875626`.
- SiteVersionId: `09dce7ea-d860-4f60-a1eb-26c3335b302e`.
- Dry run ID: `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`.
- WGP ID:
  `website-generation-package:0bb33dd388323a443bf36be58bf2d9a1`.
- OWM v2 ID:
  `observed-website-model:d76d4b923e49b8584f790f385e9a637c`.
- Source proposal v2 artifact was preserved:
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`.
- Source proposal v2 ID was preserved:
  `generated-website-proposal:0428d911ceda6f91099ce6fbec2cd8e4`.
- Source Provider Payload v2 artifact was preserved:
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`.
- Source Provider Payload v2 ID was preserved:
  `provider-generation-payload:b895ddac5096c22630157fd609803efe`.
- Compliance lineage preserved `20` upstream artifact refs.
- Iteration 1 compliance remained reloadable by ID.

## Builder

The compliance artifact was built only with:

```text
buildGenerationContractCompliance(...)
```

No AI, provider call, heuristic outside the implemented builder, subjective
judgement, generated website regeneration, or upstream artifact mutation was
performed.

The builder compared exactly the canonical MVP categories:

- `objectives_represented`
- `navigation_obligations`
- `page_obligations`
- `section_obligations`
- `message_coverage`
- `asset_presence`
- `trust_signal_presence`
- `constraints_preserved`
- `accessibility_expectations_observable`
- `seo_expectations_observable`

## Persisted Artifact

- GenerationContractCompliance artifact ID:
  `generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b`
- GenerationContractCompliance ID:
  `generation-contract-compliance:9dfd62661c7bb2b88ed147b9538f831c`
- Status: `non_compliant`
- Overall compliance: `non_compliant`
- Category count: `10`
- Finding count: `149`
- Deviation count: `132`
- Evidence count: `25`
- Limitation count: `252`
- Confidence: `MEDIUM`

## Category Summary

| Category | Status | Findings | Deviations | Limitations | Confidence |
| --- | --- | ---: | ---: | ---: | --- |
| `objectives_represented` | `non_compliant` | `2` | `2` | `2` | `MEDIUM` |
| `navigation_obligations` | `non_compliant` | `4` | `4` | `4` | `MEDIUM` |
| `page_obligations` | `non_compliant` | `4` | `4` | `4` | `MEDIUM` |
| `section_obligations` | `non_compliant` | `14` | `14` | `14` | `MEDIUM` |
| `message_coverage` | `compliant` | `5` | `0` | `0` | `HIGH` |
| `asset_presence` | `non_compliant` | `1` | `1` | `1` | `MEDIUM` |
| `trust_signal_presence` | `compliant` | `3` | `0` | `0` | `HIGH` |
| `constraints_preserved` | `non_compliant` | `114` | `107` | `107` | `MEDIUM` |
| `accessibility_expectations_observable` | `partial` | `1` | `0` | `1` | `LOW` |
| `seo_expectations_observable` | `partial` | `1` | `0` | `1` | `LOW` |

Category status counts:

- `non_compliant`: `6`
- `compliant`: `2`
- `partial`: `2`

## Evidence Model

Every finding references compliance evidence from observable OWM inventory or
OWM inventory evidence for observed absence.

Missing observations remain limitations. Compliance was not inferred.

The evaluation did not judge visual quality, CSS, design taste,
implementation elegance, React quality, provider identity, generated-code
quality, or Iteration 1 vs Iteration 2 quality.

## Persistence Validation

- Compliance artifact count increased exactly once across MVP-2.0-L, from the
  single Iteration 1 compliance record to `2` total compliance records.
- Final verification found exactly `1` compliance record for OWM v2.
- Latest reload returned
  `generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b`.
- By-ID reload returned
  `generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b`.
- Idempotent retry reused
  `generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b`.
- Retry kept the total compliance artifact count at `2`.
- Previous Iteration 1 compliance remained reloadable before and after v2
  persistence:
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`.

## Iteration Preservation

Iteration 1 compliance:

- `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`

Iteration 2 compliance:

- `generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b`

Both compliance artifacts belong to the same ODV Generation Cycle,
`odv-generation-cycle-002`, through the existing ODV artifact lineage and
Iteration 2 source metadata.

Iteration 2 is now the latest Generation Contract Compliance artifact.
Iteration 1 remains immutable and reloadable by ID. No historical overwrite
occurred.

No comparison between Iteration 1 and Iteration 2 has been performed.

## Safety Verification

Verified:

- no Compliance Report v2;
- no iteration comparison;
- no statistics across iterations;
- no Generation Improvement Plan v2;
- no Provider Payload v3;
- no regeneration;
- no provider execution;
- no AI execution;
- no Business Approval;
- no publishing;
- no deployment;
- no DNS mutation;
- no production mutation;
- no WGP mutation;
- no OWM v1 mutation;
- no OWM v2 mutation;
- no canonical business mutation;
- no runtime mutation outside compliance persistence.

The persisted artifact diagnostics include:

- `GENERATION_CONTRACT_COMPLIANCE_COMPARE_ONLY`
- `GENERATION_CONTRACT_COMPLIANCE_NO_PROVIDER_OR_AI_EXECUTION`
- `GENERATION_CONTRACT_COMPLIANCE_NO_REPORT_APPROVAL_OR_PUBLISHING`
- `GENERATION_CONTRACT_COMPLIANCE_NO_RUNTIME_MUTATION`
- `GENERATION_CONTRACT_COMPLIANCE_RUNTIME_VERSION:MVP-1K-4`
- `GENERATION_CONTRACT_COMPLIANCE_STATUS:non_compliant`

## Validation

MVP-2.0-L validation:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test
  apps/platform/gnr8/architecture/generation-contract-compliance-*.test.ts`
  passed `22 / 22`.
- `cd apps/platform && pnpm run vercel-build` passed. The build emitted
  pre-existing lint warnings for hook dependencies and `<img>` usage.
- `git diff --check` passed.

## Next Boundary

MVP-2.0-L stops after the second real Generation Contract Compliance
artifact.

The next safe phase is MVP-2.0-M - Compliance Report v2 for ODV. That phase
may consume the persisted Iteration 2 compliance artifact and create the
human-readable Compliance Report v2. It must still stop before iteration
comparison, Business Approval, publishing, deployment, provider execution, AI
execution, Provider Payload v3, regeneration, UI, API, schema, and workers.
