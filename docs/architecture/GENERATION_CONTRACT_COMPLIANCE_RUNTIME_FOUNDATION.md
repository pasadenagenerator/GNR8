# Generation Contract Compliance Runtime Foundation

## Phase And Boundary

Phase MVP-1K-4 creates the first deterministic Generation Contract Compliance
runtime foundation.

Generation Contract Compliance compares an Observed Website Model against the
Website Generation Package.

Compliance evaluates contractual fulfillment.

Compliance does not publish.

Compliance does not approve.

Compliance does not modify business truth.

This phase adds no Compliance Report, Business Approval, publishing, provider
calls, AI execution, automatic generation, UI, API, schema migration, workers,
deployment, DNS mutation, production mutation, runtime mutation, or upstream
business artifact mutation.

## Runtime Files

- `apps/platform/gnr8/architecture/generation-contract-compliance-contract.ts`
- `apps/platform/gnr8/architecture/generation-contract-compliance-builder.ts`
- `apps/platform/gnr8/architecture/generation-contract-compliance-persistence.ts`

Focused tests:

- `apps/platform/gnr8/architecture/generation-contract-compliance-contract.test.ts`
- `apps/platform/gnr8/architecture/generation-contract-compliance-builder.test.ts`
- `apps/platform/gnr8/architecture/generation-contract-compliance-persistence.test.ts`

Artifact kind:

```text
generation_contract_compliance
```

## Contract Shape

The contract defines:

- `GenerationContractComplianceArtifact`
- `ComplianceCategory`
- `ComplianceEvidence`
- `ComplianceFinding`
- `ComplianceDeviation`
- `ComplianceLimitation`
- `ComplianceConfidence`
- `ComplianceValidationResult`
- `GenerationContractComplianceStatus`

Allowed statuses:

- `incomplete`
- `partial`
- `compliant`
- `non_compliant`
- `blocked`
- `invalid`
- `stale`

Artifact content includes `generationContractComplianceId`, `status`,
`siteVersionId`, `dryRunId`, `sourceWebsiteGenerationPackageId`,
`sourceObservedWebsiteModelId`, `createdAt`, `contractVersion`, `lineage`,
`categoryResults`, `findings`, `deviations`, `evidence`, `limitations`,
`confidence`, and `diagnostics`.

## Comparison Scope

`buildGenerationContractCompliance(...)` consumes only:

- `WebsiteGenerationPackageArtifact`
- `ObservedWebsiteModelArtifact`

The builder compares only:

- objectives represented;
- navigation obligations;
- page obligations;
- section obligations;
- message coverage;
- asset presence;
- trust signal presence;
- constraints preserved;
- accessibility expectations observable;
- SEO expectations observable.

The builder is deterministic. It performs no AI, provider call, generation,
automatic execution, publishing, approval, report generation, UI, API, schema,
worker behavior, or runtime mutation.

If a requirement cannot be observed from the Observed Website Model, the
artifact records a limitation and does not invent compliance.

## Evidence Model

Every finding references `ComplianceEvidence`.

Compliance evidence is derived from observable OWM inventory: observed pages,
navigation, sections, messages, assets, constraints, technical signals, or
the OWM inventory itself when the observed absence is the evidence.

The runtime does not score HTML quality, design taste, provider identity,
implementation style, or visual polish.

## Validation And Safety

`validateGenerationContractCompliance(...)` validates source lineage, allowed
statuses, required evidence, unique finding IDs, category coverage, source
WGP/OWM consistency when supplied, and recursive absence of forbidden
downstream fields.

The recursive forbidden guard rejects:

- `businessApproval`
- `publishingArtifact`
- `deploymentArtifact`
- `dnsMutation`
- `productionMutation`
- `runtimeMutation`
- `providerExecutionResult`
- `canonicalTruthUpdate`
- `digitalBusinessTwinMutation`
- `websiteGenerationPackageMutation`

## Persistence

`persistGenerationContractCompliance(...)`,
`loadLatestGenerationContractCompliance(...)`, and
`loadGenerationContractComplianceById(...)` use the existing site-version
`importProvenanceSummary` boundary.

Persistence stores append-only `generationContractComplianceArtifacts`,
maintains `latestGenerationContractComplianceArtifact`, reuses the latest
equivalent semantic artifact, appends changed artifacts, loads latest records,
and loads records by artifact ID.

Persistence rejects `invalid` and `stale`.

Persistence accepts `blocked`, `incomplete`, `partial`, `compliant`, and
`non_compliant`.

No new table or schema migration is required.

## Real-Target Validation

MVP-1K-4-R originally attempted real-target validation for ODV
`09dce7ea-d860-4f60-a1eb-26c3335b302e` with source WGP
`website_generation_package_c2c555025f186178f27c44c7cd272d4d`, and ViroiDoc
`e26b0754-988b-45b9-9e24-8e213179b6cf` with source WGP
`website_generation_package_3e34393aef612a2c597042917dc45085`.

That earlier validation was blocked because both targets were missing latest
persisted `ObservedWebsiteModelArtifact` inputs.

MVP-2.0-C unblocked ODV by persisting latest OWM artifact
`observed_website_model_35499a9cb91a15740910532d451a739a`.

MVP-2.0-D then performed the first real Generation Contract Compliance
evaluation for ODV. It compared WGP
`website_generation_package_c2c555025f186178f27c44c7cd272d4d` against OWM
`observed_website_model_35499a9cb91a15740910532d451a739a` using only
`buildGenerationContractCompliance(...)` and persisted
`generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`.

The persisted ODV compliance status is `non_compliant`. The artifact contains
10 category results, 149 findings, 145 deviations, 12 evidence records, and
268 limitations. Latest reload, by-ID reload, and idempotent retry all
returned the same artifact ID.

Canonical validation record:
`docs/architecture/FIRST_REAL_GENERATION_CONTRACT_COMPLIANCE.md`.

MVP-2.0-L then performed the second real Generation Contract Compliance
evaluation for ODV. It compared the same WGP
`website_generation_package_c2c555025f186178f27c44c7cd272d4d` against OWM v2
`observed_website_model_0d5e829f546745b1433557978c875626` using only
`buildGenerationContractCompliance(...)` and persisted
`generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b`.

The persisted ODV compliance v2 status is `non_compliant`. The artifact
contains 10 category results, 149 findings, 132 deviations, 25 evidence
records, 252 limitations, and `MEDIUM` confidence. Latest reload, by-ID
reload, and idempotent retry all returned the same artifact ID. The previous
Iteration 1 compliance artifact remained reloadable, and the compliance
artifact count ended at `2` with exactly `1` record for OWM v2.

Canonical validation record:
`docs/architecture/SECOND_REAL_GENERATION_CONTRACT_COMPLIANCE.md`.

No Iteration 1 vs Iteration 2 comparison has been performed by the compliance
runtime. Compliance v1 and compliance v2 belong to the same ODV Generation
Cycle through existing artifact lineage and iteration source metadata.

The earlier blocked validation record remains:
`docs/architecture/GENERATION_CONTRACT_COMPLIANCE_REAL_TARGET_VALIDATION.md`.

## Next Boundary

The next safe phase is MVP-2.0-M - Compliance Report v2 for ODV.

MVP-2.0-L stops before Compliance Report v2, iteration comparison, Generation
Improvement Plan v2, Provider Payload v3, regeneration, Business Approval,
publishing, deployment, provider execution, AI execution, UI, API, schema, and
workers.
