# Generated Website Proposal Import Boundary

## Phase And Boundary

Phase MVP-1J defined the future import boundary for generated output produced
by manual Codex execution outside GNR8.

Phase MVP-1K-1 implements the first bounded runtime foundation for this
boundary: quarantined import/storage of manually generated Codex output bundle
metadata as `generated_website_proposal`.

MVP-1K-1 adds TypeScript contract, import builder, provenance persistence, and
focused tests only. It adds no schema, UI, API, workers, provider calls from
GNR8, prompts sent by GNR8, automated AI execution, website observation,
compliance execution, compliance report, Business Approval, publishing,
deployment, DNS mutation, production mutation, or runtime mutation.

The import boundary defines how a generated output bundle becomes a
quarantined Generated Website Proposal candidate without becoming trusted.

## Canonical Import Boundary

Import responsibility:

```text
manual Codex output bundle
-> GeneratedWebsiteProposal import candidate
-> quarantine
-> later Generation Contract Compliance
```

The import boundary does not trust generated output.

The import boundary does not accept generated output.

The import boundary does not publish generated output.

The import boundary does not create compliance results.

The import boundary does not update upstream business artifacts.

## Runtime Concept: GeneratedWebsiteProposal

GeneratedWebsiteProposal is a quarantined implementation proposal imported
from an external generated output bundle.

Runtime responsibilities:

- reference the source ProviderGenerationPayload artifact ID;
- reference the source Website Generation Package artifact ID;
- preserve source lineage;
- reference or contain the generated output bundle;
- preserve provider notes, implementation assumptions, and known limitations;
- preserve operator attestation;
- preserve safety observations;
- expose proposal status;
- remain blocked from publish until downstream governance allows it.

GeneratedWebsiteProposal is not business truth, not compliance, not Business
Approval, not deployment state, and not production state.

## Runtime Concept: GeneratedWebsiteProposalLineage

GeneratedWebsiteProposalLineage records where the proposal came from.

Required runtime lineage:

- generated proposal ID;
- source ProviderGenerationPayload artifact ID;
- source ProviderGenerationPayload status;
- source ProviderGenerationPayload contract version;
- source provider type and payload kind;
- source Website Generation Package artifact ID;
- source Website Generation Package ID;
- source Website Generation Package contract version;
- source Website Design Brief reference;
- upstream Business Alignment reference;
- upstream Digital Business Twin reference;
- source site version ID;
- source dry run ID where present;
- execution provider name;
- execution timestamp;
- operator reference;
- import timestamp;
- source latest-check result or accepted-stale reason;
- generated output bundle reference;
- operator attestation reference.

Lineage must prove that the proposal is derived from a specific source payload
and does not authorize new business meaning.

## Runtime Concept: GeneratedWebsiteProposalStatus

GeneratedWebsiteProposalStatus describes the quarantine/import state.

Runtime status values:

- `received`
- `quarantined`
- `invalid`
- `blocked`
- `superseded`
- `compliance_ready`

### received

The generated output bundle has been presented for import but has not yet
passed minimum quarantine intake checks.

`received` is not publishable, compliant, approved, or trusted.

### quarantined

The proposal has enough lineage and metadata to be stored as proposal material
but remains untrusted and unavailable for publish.

`quarantined` is the normal successful intake state.

### invalid

The proposal cannot be imported or retained as a valid candidate because
required structure, lineage, source references, output bundle, or attestation
is missing or contradictory.

### blocked

The proposal may be structurally present but cannot proceed because safety,
lineage, latest-source, hidden-instruction, manual-alteration, or
publish/deploy/DNS-production concerns remain unresolved.

### superseded

The proposal remains historical proposal material but has been replaced by a
newer proposal from the same or later source lineage.

### compliance_ready

The proposal has passed future import safety checks and is ready to be
submitted to Generation Contract Compliance.

`compliance_ready` is not a compliance pass. It only means the proposal may be
evaluated by the compliance boundary.

## Runtime Concept: GeneratedWebsiteProposalSource

GeneratedWebsiteProposalSource records the import input.

Required runtime source fields:

- source ProviderGenerationPayload artifact ID;
- source Website Generation Package artifact ID;
- provider execution metadata;
- generated output bundle reference;
- source payload copy or reference;
- provider notes;
- implementation assumptions;
- known limitations;
- execution timestamp;
- operator reference;
- operator attestation;
- source latest-check result;
- explicit accepted-stale reason when source payload is not latest.

The source must not include publishing artifacts, deployment artifacts, DNS
mutation artifacts, runtime mutation artifacts, compliance results, or
Business Approval artifacts.

## Runtime Concept: GeneratedWebsiteProposalSafety

GeneratedWebsiteProposalSafety records quarantine and no-production guarantees.

Required runtime safety checks:

- source lineage matches the source ProviderGenerationPayload and WGP;
- source payload is latest or explicitly accepted;
- output contains no publish artifact;
- output contains no deployment artifact;
- output contains no DNS mutation artifact;
- output contains no runtime mutation artifact;
- output contains no hidden provider instructions;
- output is implementation proposal only;
- output has not been manually altered without attestation;
- operator attests no production mutation occurred;
- operator attests no compliance execution occurred;
- operator attests no Business Approval occurred.

Any failed safety check must keep the proposal in `blocked` or `invalid`.

## Runtime Concept: GeneratedWebsiteProposalValidationReadiness

GeneratedWebsiteProposalValidationReadiness records whether the proposal can
move from quarantine toward Generation Contract Compliance.

Runtime readiness outcomes:

- not ready when source lineage is missing;
- not ready when the generated output bundle is missing;
- not ready when operator attestation is missing;
- not ready when publish/deploy/DNS/runtime mutation artifacts are present;
- not ready when hidden provider instructions are detected;
- not ready when manual alteration lacks attestation;
- ready only when lineage, source, safety, metadata, and bundle checks pass.

Validation readiness is not compliance. It is only permission for a future
compliance evaluator to inspect the proposal against the WGP.

## Import Prerequisites

Runtime import requires all of the following:

- source ProviderGenerationPayload artifact ID;
- source WGP artifact ID;
- provider execution metadata;
- generated output bundle;
- no publishing artifacts;
- no deployment artifacts;
- no runtime mutation artifacts;
- no DNS mutation artifacts;
- operator attestation.

If any prerequisite is missing, runtime import must fail closed.

## Expected Generated Output Package Shape

The generated output package should conceptually include:

- generated files or source bundle;
- provider notes;
- implementation assumptions;
- known limitations;
- source payload reference;
- execution timestamp;
- operator reference.

The package may contain source code, static files, assets, components,
configuration files, and implementation notes as proposal material.

The package must not contain artifacts that prove or request publish,
deployment, DNS mutation, runtime mutation, compliance completion, Business
Approval, or production acceptance.

## Quarantine Rules

Generated Website Proposal is not trusted.

It cannot publish.

It cannot update DBT.

It cannot update WDB.

It cannot update WGP.

It cannot update ProviderGenerationPayload.

It cannot become a compliance result by itself.

It cannot become Business Approval by itself.

It cannot mutate production.

It must first be checked by Generation Contract Compliance before any later
approval or publish path can consider it.

## Safety Checks Before Runtime Import

Runtime import must check:

- source lineage matches;
- source payload is latest or explicitly accepted;
- output contains no publish, deploy, DNS, or runtime mutation artifacts;
- output contains no hidden provider instructions;
- output is implementation proposal only;
- output has not been manually altered without attestation;
- source payload reference matches the copied payload used for execution;
- provider execution metadata is present;
- generated output bundle is present;
- operator attestation is present.

Failure should produce `invalid` when the proposal cannot be structurally
accepted, or `blocked` when the proposal exists but cannot safely proceed.

## Boundary With Generation Contract Compliance

GeneratedWebsiteProposal import only makes proposal material available for
future review.

Generation Contract Compliance is the first boundary that may evaluate whether
the generated proposal fulfills the Website Generation Package. Compliance
must compare the proposal against the WGP and produce its own governed result.

The imported proposal cannot mark itself compliant and cannot substitute for a
Generation Contract Compliance Report.

## Boundary With Business Approval And Publish

GeneratedWebsiteProposal import does not create Business Approval.

Business Approval must happen after compliance and before publish.

Publish authorization must remain separate from import, compliance, provider
execution, and manual operator attestation.

No Generated Website Proposal status is publishable by itself.

## MVP-1K-1 Runtime Foundation

Canonical runtime document:

```text
docs/architecture/GENERATED_WEBSITE_PROPOSAL_IMPORT_RUNTIME_FOUNDATION.md
```

Runtime files:

- `apps/platform/gnr8/architecture/generated-website-proposal-contract.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-import.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-persistence.ts`

Test files:

- `apps/platform/gnr8/architecture/generated-website-proposal-contract.test.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-import.test.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-persistence.test.ts`

MVP-1K-1 implements:

- `GeneratedWebsiteProposalArtifact`;
- `GeneratedWebsiteProposalLineage`;
- `GeneratedWebsiteProposalSource`;
- `GeneratedWebsiteProposalSafety`;
- `GeneratedWebsiteProposalValidationReadiness`;
- `GeneratedWebsiteProposalOperatorAttestation`;
- `GeneratedWebsiteProposalStatus`;
- `GeneratedWebsiteProposalValidationResult`;
- `buildGeneratedWebsiteProposalFromManualOutput(...)`;
- `validateGeneratedWebsiteProposal(...)`;
- `persistGeneratedWebsiteProposal(...)`;
- `loadLatestGeneratedWebsiteProposal(...)`;
- `loadGeneratedWebsiteProposalById(...)`.

Artifact kind:

```text
generated_website_proposal
```

Persistence uses the existing site-version `importProvenanceSummary` boundary
with append-only proposal history, latest pointer, equivalent latest reuse,
changed append, latest load, and by-ID load.

Persistence rejects `invalid`, accepts `blocked` and `quarantined`, accepts
`compliance_ready` only when validation readiness allows it, and keeps
`superseded` artifacts loadable.

## Boundary Confirmation

MVP-1J defined the Generated Website Proposal import boundary only.

MVP-1K-1 implements quarantined Generated Website Proposal import/storage only.
It does not observe websites, run compliance, create a Compliance Report,
create Business Approval, publish, deploy, mutate DNS, mutate production, add
UI, add API routes, add schema, add workers, call providers, execute AI, or
execute generated output.

Recommended next phase:

- MVP-1K-2 Generated Website Proposal Observation Boundary Design, limited to
  defining how future observation may inspect quarantined proposal material.
  Stop before compliance execution, Compliance Report, Business Approval,
  publishing, deployment, DNS mutation, production mutation, UI, API, schema,
  workers, provider calls, automatic generation, or runtime mutation unless
  explicitly authorized.
