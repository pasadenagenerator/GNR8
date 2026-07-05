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

MVP-1K-4-R attempted real-target validation for ODV
`09dce7ea-d860-4f60-a1eb-26c3335b302e` with source WGP
`website_generation_package_c2c555025f186178f27c44c7cd272d4d`, and ViroiDoc
`e26b0754-988b-45b9-9e24-8e213179b6cf` with source WGP
`website_generation_package_3e34393aef612a2c597042917dc45085`.

The validation is blocked before compliance build or persistence because both
targets are missing a latest persisted `ObservedWebsiteModelArtifact`.

No `GenerationContractComplianceArtifact` was persisted for either target.

Canonical validation record:
`docs/architecture/GENERATION_CONTRACT_COMPLIANCE_REAL_TARGET_VALIDATION.md`.

## Next Boundary

The next safe phase is MVP-1K-3-R Observed Website Model Real-Target
Validation.

After ODV and ViroiDoc have latest persisted Observed Website Model inputs,
rerun MVP-1K-4-R. Only after MVP-1K-4-R persists real compliance artifacts
should MVP-1K-5-R rerun before Business Approval.

MVP-1K-4 and MVP-1K-4-R stop before the report.
