# Generated Website Proposal Import Runtime Foundation

## Phase And Boundary

Phase MVP-1K-1 creates the first runtime foundation for importing manually
generated Codex output bundle metadata as a quarantined Generated Website
Proposal.

Generated Website Proposal is not trusted.

It is an implementation proposal only.

MVP-1K-1 implements no website observation, compliance execution, compliance
report, Business Approval, publishing, provider calls, AI execution, automatic
generation, UI, API routes, schema migrations, deployment, DNS mutation,
production mutation, or runtime mutation.

## Runtime Files

MVP-1K-1 adds:

- `apps/platform/gnr8/architecture/generated-website-proposal-contract.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-import.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-persistence.ts`

Focused tests:

- `apps/platform/gnr8/architecture/generated-website-proposal-contract.test.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-import.test.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-persistence.test.ts`

Artifact kind:

```text
generated_website_proposal
```

Contract version:

```text
MVP-1K-1
```

## Contract Shape

`GeneratedWebsiteProposalArtifact` contains:

- `generatedWebsiteProposalId`
- `status`
- `siteVersionId`
- `dryRunId`
- `sourceProviderGenerationPayloadId`
- `sourceWebsiteGenerationPackageId`
- `createdAt`
- `contractVersion`
- `lineage`
- `source`
- `outputBundle`
- `providerNotes`
- `implementationAssumptions`
- `knownLimitations`
- `operatorAttestation`
- `safety`
- `validationReadiness`
- `limitations`
- `diagnostics`

Allowed statuses:

- `received`
- `quarantined`
- `invalid`
- `blocked`
- `superseded`
- `compliance_ready`

The normal successful manual-output intake status is `quarantined`.

## Import Behavior

`buildGeneratedWebsiteProposalFromManualOutput(...)` consumes:

- source `ProviderGenerationPayload`
- source ProviderGenerationPayload artifact ID
- source `WebsiteGenerationPackageArtifact`
- source Website Generation Package artifact ID
- operator-provided output bundle metadata
- provider notes
- implementation assumptions
- known limitations
- operator attestation

The builder is deterministic. Proposal identity is derived from source payload
identity, source payload artifact ID, source WGP artifact ID, output bundle ID,
output bundle storage/content hash metadata, operator attestation ID, and the
contract version.

The builder performs no provider call, no AI execution, no code execution, no
publishing, no deployment, no DNS mutation, no production mutation, no runtime
mutation, and no persistence. It only returns a proposal artifact that can be
validated and persisted by the explicit persistence boundary.

Generated output content may be referenced through bundle metadata. It is not
executed or trusted by this phase.

## Safety Validation

`validateGeneratedWebsiteProposal(...)` validates:

- allowed status;
- source lineage;
- source ProviderGenerationPayload reference;
- source WGP reference;
- output bundle metadata;
- operator attestation;
- quarantine safety;
- validation readiness;
- forbidden field absence.

The import rejects missing attestation, missing output bundle metadata, source
lineage mismatch, unsafe output-bundle artifact flags, and operator claims that
GNR8 executed the provider call or AI execution.

Forbidden fields are rejected recursively:

- `businessDiscovery`
- `digitalBusinessTwin`
- `businessUnderstandingReport`
- `businessAlignment`
- `websiteDesignBrief`
- `websiteGenerationPackage`
- `providerGenerationPayload`
- `complianceReport`
- `businessApproval`
- `publishingArtifact`
- `deploymentArtifact`
- `dnsMutation`
- `productionMutation`
- `runtimeMutation`
- `autoPublish`
- `providerResultTrusted`
- `canonicalTruthUpdate`

## Validation Readiness

`GeneratedWebsiteProposalValidationReadiness` records whether the quarantined
proposal has enough lineage, source metadata, output bundle metadata, operator
attestation, and safety checks to become input to a future compliance
boundary.

Validation readiness is not compliance.

`compliance_ready` is accepted only when readiness is `ready`,
`readyForCompliance` is true, and blockers are empty. This status still does
not mean compliance passed, Business Approval happened, or publishing is
authorized.

## Persistence Behavior

`persistGeneratedWebsiteProposal(...)` stores validated artifacts inside the
existing site-version `importProvenanceSummary` boundary.

Persistence adds:

- append-only `generatedWebsiteProposalArtifacts`;
- `latestGeneratedWebsiteProposalArtifact`;
- equivalent latest reuse;
- changed append;
- latest load;
- by-ID load.

Persistence rejects `invalid`.

Persistence accepts `blocked` and `quarantined`.

Persistence accepts `compliance_ready` only when validation readiness allows
it.

`superseded` artifacts remain loadable by ID.

No database schema migration is introduced.

## Non-Ownership Rules

Generated Website Proposal import cannot update:

- Digital Business Twin
- Business Understanding Report
- Business Alignment
- Website Design Brief
- Website Generation Package
- ProviderGenerationPayload
- Compliance
- Business Approval
- Publishing

It cannot publish, deploy, mutate DNS, mutate production, execute generated
code, call a provider, send prompts, run AI, observe a website, run compliance,
or approve anything.

## Real ODV Proposal Imports

Iteration 1 was imported as a quarantined Generated Website Proposal from:

```text
ODV_GENERATED_PROPOSAL_001/
```

Persisted artifact:

```text
generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3
```

Iteration 1 remains loadable by ID and was not overwritten by later work.

MVP-2.0-J imported Iteration 2 from:

```text
ODV_GENERATED_PROPOSAL_002/
```

Persisted artifact:

```text
generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e
```

Iteration 2 source lineage:

```text
WebsiteGenerationPackage
  ↓
GenerationContractCompliance
  ↓
ComplianceReport
  ↓
GenerationImprovementPlan
  ↓
ProviderGenerationPayload v2
  ↓
GeneratedWebsiteProposal v2
```

Verified artifact chain:

- WGP:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`;
- compliance:
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`;
- compliance report:
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`;
- improvement plan:
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`;
- Provider Payload v2:
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`.

Iteration 2 became the latest generated proposal for ODV. Latest reload and
by-ID reload both returned
`generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`; idempotent
retry reused the same artifact; the proposal count increased from `1` to `2`
exactly once.

Iteration metadata (`2`) and generation cycle metadata
(`odv-generation-cycle-002`) are preserved in source diagnostics and operator
attestation. No existing canonical artifact contracts were changed solely to
add cycle fields.

Canonical MVP-2.0-J document:

```text
docs/architecture/SECOND_GENERATED_WEBSITE_PROPOSAL_IMPORT.md
```

## Validation

Focused tests:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/generated-website-proposal-*.test.ts
```

The command initially hit the known sandbox `tsx` IPC `listen EPERM` failure.
The same command passed outside the sandbox:

```text
16 / 16 tests passed
```

## Completion Definition

MVP-1K-1 is complete when GNR8 can accept metadata for a manually generated
Codex output bundle and persist it as a quarantined Generated Website Proposal
with complete lineage, operator attestation, quarantine safety validation,
latest/by-ID reload, idempotent reuse, and append-on-change behavior.

## Recommended Next Phase

Historical foundation next phase, now complete:

MVP-1K-2 Generated Website Proposal Observation Boundary Design:

`docs/architecture/GENERATED_WEBSITE_PROPOSAL_OBSERVATION_BOUNDARY_DESIGN.md`.

It defines the narrow observation boundary for proposal material without
implementing observation runtime, compliance, compliance report, Business
Approval, publishing, provider calls, automatic generation, UI, API routes,
schema migrations, deployment, DNS mutation, production mutation, or runtime
mutation.

Historical foundation runtime, now complete:

MVP-1K-3 Observed Website Model Runtime Foundation.

Current live next phase after MVP-2.0-J:

MVP-2.0-K - Observed Website Model v2 for ODV, limited to observing latest
Generated Website Proposal v2
`generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e` if explicitly
authorized. It must still stop before compliance v2, iteration comparison,
Compliance Report v2, Business Approval, publishing, deployment, DNS
mutation, production mutation, provider execution, AI execution, UI, API,
schema, or workers.
