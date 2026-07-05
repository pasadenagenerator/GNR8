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

MVP-1K-2 Generated Website Proposal Observation Boundary Design is complete:
`docs/architecture/GENERATED_WEBSITE_PROPOSAL_OBSERVATION_BOUNDARY_DESIGN.md`.

It defines the narrow observation boundary for proposal material without
implementing observation runtime, compliance, compliance report, Business
Approval, publishing, provider calls, automatic generation, UI, API routes,
schema migrations, deployment, DNS mutation, production mutation, or runtime
mutation.

The next safe phase is MVP-1K-3 Observed Website Model Runtime Foundation,
limited to the first bounded observation model runtime only if explicitly
authorized.
