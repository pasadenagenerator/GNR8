# First Real Generation Contract Compliance

## Phase And Boundary

MVP-2.0-D performed the first real Generation Contract Compliance evaluation
for ODV.

This phase compared the persisted ODV `WebsiteGenerationPackageArtifact`
against the persisted ODV `ObservedWebsiteModelArtifact` and persisted the
first real `GenerationContractComplianceArtifact`.

This phase did not create a Compliance Report, create Business Approval,
publish, deploy, call providers, execute AI, regenerate the website, modify
the Website Generation Package, modify the Observed Website Model, modify
canonical business artifacts, or add UI, API, schema, or workers.

## Target

- Business target: ODV
- SiteVersionId: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- WebsiteGenerationPackageArtifact:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`
- ObservedWebsiteModelArtifact:
  `observed_website_model_35499a9cb91a15740910532d451a739a`

## Source Verification

- WGP by-ID load passed.
- WGP latest reload returned
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`.
- WGP source status: `partial`.
- OWM by-ID load passed.
- OWM latest reload returned
  `observed_website_model_35499a9cb91a15740910532d451a739a`.
- OWM source status: `observable`.
- Both source artifacts share the same siteVersion.
- Both source artifacts share the same dryRun lineage.
- OWM lineage points to the source WGP.
- No broken lineage was found.

## Builder

The compliance artifact was built only with:

```text
buildGenerationContractCompliance(...)
```

No AI, provider call, heuristic outside the implemented builder, subjective
judgement, generated website regeneration, or upstream artifact mutation was
performed.

## Persisted Artifact

- GenerationContractCompliance artifact ID:
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`
- GenerationContractCompliance ID:
  `generation-contract-compliance:fd7dd1d0cac76047d7e322bf9a7b15dc`
- Status: `non_compliant`
- Overall compliance: `non_compliant`
- Category count: `10`
- Finding count: `149`
- Deviation count: `145`
- Evidence count: `12`
- Limitation count: `268`

## Category Summary

Compared categories:

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

Compliant categories: `0`.

Partial categories: `2`.

- `accessibility_expectations_observable`
- `seo_expectations_observable`

Non-compliant categories: `8`.

- `asset_presence`
- `constraints_preserved`
- `message_coverage`
- `navigation_obligations`
- `objectives_represented`
- `page_obligations`
- `section_obligations`
- `trust_signal_presence`

Blocked categories: `0`.

Incomplete categories: `0`.

## Evidence Model

Every finding references compliance evidence from observable OWM inventory or
OWM inventory evidence for observed absence.

Missing observations became limitations. Compliance was not inferred.

The evaluation did not judge visual quality, CSS, design taste,
implementation elegance, React quality, provider identity, or generated-code
quality.

## Persistence Validation

- Latest reload returned
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`.
- By-ID reload returned
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`.
- Idempotent retry reused
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`.

## Safety Verification

Verified:

- no Compliance Report;
- no Business Approval;
- no publishing;
- no deployment;
- no provider execution result;
- no AI execution diagnostic path;
- no runtime mutation outside compliance persistence;
- no WGP mutation;
- no OWM mutation;
- no canonical business artifact mutation.

The persisted artifact diagnostics include:

- `GENERATION_CONTRACT_COMPLIANCE_COMPARE_ONLY`
- `GENERATION_CONTRACT_COMPLIANCE_NO_PROVIDER_OR_AI_EXECUTION`
- `GENERATION_CONTRACT_COMPLIANCE_NO_REPORT_APPROVAL_OR_PUBLISHING`
- `GENERATION_CONTRACT_COMPLIANCE_NO_RUNTIME_MUTATION`
- `GENERATION_CONTRACT_COMPLIANCE_RUNTIME_VERSION:MVP-1K-4`
- `GENERATION_CONTRACT_COMPLIANCE_STATUS:non_compliant`

## Validation

Required validation for this phase:

```bash
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/generation-contract-compliance-*.test.ts
cd apps/platform && pnpm run vercel-build
git diff --check
```

## Next Boundary

MVP-2.0-D stops after the first real Generation Contract Compliance artifact.

The next safe phase is MVP-2.0-E - First Real Generation Contract Compliance
Report for ODV. That phase may consume the persisted compliance artifact and
create the human-readable Compliance Report. It must still stop before
Business Approval, publishing, deployment, provider execution, and AI
execution.
