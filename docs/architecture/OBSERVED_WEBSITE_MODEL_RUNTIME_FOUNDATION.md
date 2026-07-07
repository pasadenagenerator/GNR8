# Observed Website Model Runtime Foundation

## Phase And Boundary

Phase MVP-1K-3 creates the first deterministic Observed Website Model runtime
foundation from a quarantined Generated Website Proposal.

Observation records what exists.

Observation does not compare against the Website Generation Package.

Observation does not judge compliance.

This phase adds no Generation Contract Compliance, Compliance Report, Business
Approval, publishing, provider calls, AI execution, automatic generation, UI,
API, schema migration, workers, deployment, DNS mutation, production mutation,
or runtime mutation.

## Runtime Files

- `apps/platform/gnr8/architecture/observed-website-model-contract.ts`
- `apps/platform/gnr8/architecture/observed-website-model-builder.ts`
- `apps/platform/gnr8/architecture/observed-website-model-persistence.ts`

Focused tests:

- `apps/platform/gnr8/architecture/observed-website-model-contract.test.ts`
- `apps/platform/gnr8/architecture/observed-website-model-builder.test.ts`
- `apps/platform/gnr8/architecture/observed-website-model-persistence.test.ts`

Artifact kind:

```text
observed_website_model
```

## Contract Shape

The contract defines:

- `ObservedWebsiteModelArtifact`
- `ObservedWebsiteLineage`
- `ObservedPage`
- `ObservedNavigation`
- `ObservedSection`
- `ObservedMessage`
- `ObservedAsset`
- `ObservedConstraint`
- `ObservedTechnicalSignal`
- `ObservedEvidence`
- `ObservedLimitation`
- `ObservedWebsiteReadiness`
- `ObservedWebsiteValidationResult`
- `ObservedWebsiteStatus`

Allowed statuses:

- `not_observable`
- `partially_observable`
- `observable`
- `blocked`
- `invalid`
- `stale`

Artifact content includes `observedWebsiteModelId`, `status`,
`siteVersionId`, `dryRunId`, `sourceGeneratedWebsiteProposalId`,
`sourceProviderGenerationPayloadId`, `sourceWebsiteGenerationPackageId`,
`createdAt`, `contractVersion`, `lineage`, `pages`, `navigation`,
`sections`, `messages`, `assets`, `constraints`, `technicalSignals`,
`evidence`, `readiness`, `limitations`, and `diagnostics`.

## Builder Behavior

`buildObservedWebsiteModel(...)` consumes a
`GeneratedWebsiteProposalArtifact`, optional source Generated Website Proposal
artifact ID, generated output bundle metadata, route/file metadata when
available, and provider/operator notes already present on the quarantined
proposal.

The builder is deterministic. It performs no AI, provider call, generated code
execution, rendering, WGP comparison, compliance judgment, approval,
publishing, deployment, worker execution, UI, API, schema, DNS mutation,
production mutation, or runtime mutation.

The builder may derive these observations when explicitly available:

- route/page inventory;
- file inventory and declared assets;
- declared navigation;
- declared sections;
- declared message/content summaries;
- provider/operator note summaries;
- technical signals such as framework or build notes;
- missing observation limitations.

If data is absent, the builder records a limitation instead of guessing.

## Readiness And Status

`observable` means the proposal metadata exposed at least route/page inventory
and file or asset inventory.

`partially_observable` means some website reality was available but the model
is missing important observation categories.

`not_observable` means the proposal is preserved with lineage and evidence,
but no route, file, navigation, section, message, asset, or technical signal
metadata was available.

`blocked` preserves a blocked source proposal without upgrading it to
approval, compliance, or publishing state.

`invalid` and `stale` are allowed contract statuses for validation and
diagnostics, but persistence rejects them.

## Safety Guard

`validateObservedWebsiteModel(...)` validates required lineage, allowed
status, required arrays, unique observed IDs, readiness consistency, source
proposal consistency when provided, and recursive absence of downstream or
compliance fields.

The recursive forbidden guard rejects:

- `complianceReport`
- `complianceScore`
- `complianceResult`
- `businessApproval`
- `publishingArtifact`
- `deploymentArtifact`
- `dnsMutation`
- `productionMutation`
- `runtimeMutation`
- `providerPayloadMutation`
- `canonicalTruthUpdate`
- `websiteGenerationPackageMutation`
- `digitalBusinessTwinMutation`

## Persistence

`persistObservedWebsiteModel(...)`, `loadLatestObservedWebsiteModel(...)`, and
`loadObservedWebsiteModelById(...)` use the existing site-version
`importProvenanceSummary` boundary.

Persistence stores append-only `observedWebsiteModelArtifacts`, maintains
`latestObservedWebsiteModelArtifact`, reuses the latest equivalent semantic
artifact, appends changed artifacts, loads latest records, and loads records
by artifact ID.

Persistence rejects `invalid` and `stale`.

Persistence accepts `blocked`, `not_observable`, `partially_observable`, and
`observable`.

No new table or schema migration is required.

## Real-Target Validation

MVP-1K-3-R validated the OWM runtime boundary against real ODV and ViroiDoc
site versions.

Canonical validation document:

- `docs/architecture/OBSERVED_WEBSITE_MODEL_REAL_TARGET_VALIDATION.md`

Result:

- ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e` is blocked because no latest
  persisted `GeneratedWebsiteProposalArtifact` exists.
- ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf` is blocked because no
  latest persisted `GeneratedWebsiteProposalArtifact` exists.
- No Observed Website Model artifact was built or persisted.
- Latest reload equality, by-ID reload equality, and idempotent retry reuse
  were not exercised because the prerequisite proposal artifacts are missing.
- No Generation Contract Compliance, Compliance Report, Business Approval,
  publishing, provider call, AI execution, generated content mutation, UI,
  API, schema, or worker behavior was added.

Required recovery step: import the manually generated ODV and ViroiDoc output
bundles as quarantined Generated Website Proposal artifacts, then rerun
MVP-1K-3-R.

## Next Boundary

MVP-1K-4 now implements Generation Contract Compliance as the next runtime
boundary after Observed Website Model. It compares an Observed Website Model
against the Website Generation Package and persists a
`generation_contract_compliance` artifact.

MVP-1K-3 itself stops before that comparison.

The next safe phase after MVP-1K-3-R is the required manual Generated Website
Proposal import step for ODV and ViroiDoc, followed by a rerun of MVP-1K-3-R.
Only after real OWM artifacts exist should MVP-1K-4-R and MVP-1K-5-R be
rerun.
