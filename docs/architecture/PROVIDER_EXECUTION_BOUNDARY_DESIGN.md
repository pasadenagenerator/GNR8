# Provider Execution Boundary Design

## Phase And Boundary

Phase MVP-1I defines the governed boundary between an export-ready
ProviderGenerationPayload and any future external provider execution.

This phase is documentation and contract design only. It adds no
implementation, TypeScript, schema, persistence, API, UI, workers, provider
calls, prompts sent, AI execution, generated website, compliance execution,
Business Approval, publishing behavior, deployment behavior, DNS mutation,
production mutation, or runtime state.

Provider Execution is the moment where GNR8 allows an external AI system to
produce an implementation proposal.

The Provider Execution responsibility is:

```text
ProviderGenerationPayload
-> External AI Execution
-> Generated Website Proposal
```

## Canonical Definition

"A governed execution boundary that takes an explicitly authorized
ProviderGenerationPayload, permits one external AI execution attempt, and
returns a quarantined Generated Website Proposal for later compliance review."

Provider Execution is not a business reasoning layer.

Provider Execution is not a publishing layer.

Provider Execution is not a compliance layer.

Provider Execution is not an approval layer.

Provider Execution is an authorized proposal-generation boundary.

## Source And Output

### Source

The source is:

```text
ProviderGenerationPayload
```

The ProviderGenerationPayload is downstream of the Website Generation Package.
It is a provider-shaped serialization of the canonical generation contract.
It must preserve the source WGP lineage, constraints, validation expectations,
limitations, confidence, diagnostics, and safety classification.

The ProviderGenerationPayload is not business truth. It is an execution input
derived from the Website Generation Package.

MVP-2.0-G introduced a second-generation ProviderGenerationPayload for the
future regeneration cycle. It is still persisted as `provider_generation_payload`
and still stops before execution. The v2 payload preserves the original Website
Generation Package and adds business-level regeneration guidance from the
Generation Improvement Plan. It does not execute a provider, execute AI,
regenerate a website, create a Generated Website Proposal v2, publish, deploy,
mutate DNS, mutate production, or create Business Approval.

### Execution

The execution step is:

```text
External AI Execution
```

External AI Execution is the future moment when an authorized provider,
operator, or execution system submits the ProviderGenerationPayload to an
external AI system.

MVP-1I defines the boundary only. It does not execute the step.

### Output

The output is:

```text
Generated Website Proposal
```

The Generated Website Proposal is a quarantined implementation proposal. It is
not accepted, compliant, approved, published, deployed, or treated as business
truth merely because a provider generated it.

## Execution Is Not

Provider Execution is not:

- publishing;
- deployment;
- DNS mutation;
- production mutation;
- compliance approval;
- business approval;
- source of business truth.

Provider Execution may produce a proposal only. Every downstream decision must
remain governed by GNR8 artifacts, compliance review, Business Approval, and
publish authorization.

## Future Execution Artifact Concepts

MVP-1I defines these artifact concepts only. No TypeScript is introduced.

### ProviderExecutionRequest

Conceptual purpose:
- records the operator-authorized request to execute one
  ProviderGenerationPayload;
- references the exact source provider payload artifact;
- preserves source WGP lineage and safety classification;
- records authorization evidence, operator identity, execution mode, and
  no-publishing permissions;
- records unresolved blockers or confirms that no execution blockers remain.

The request authorizes a proposal-generation attempt. It does not authorize
publish, deployment, DNS changes, production mutation, compliance approval, or
Business Approval.

### ProviderExecutionRun

Conceptual purpose:
- records one attempted external AI execution;
- references the ProviderExecutionRequest;
- records provider, execution mode, timestamp, diagnostics, status, and
  failure classification;
- records whether a provider response was received;
- confirms quarantine and no-production-mutation handling.

The run is operational history. It is not the source of business truth and it
does not prove contractual fulfillment.

### ProviderExecutionResult

Conceptual purpose:
- records the immediate result of a ProviderExecutionRun;
- distinguishes success, partial success, provider failure, operator abort,
  blocked execution, and unsafe output;
- references any quarantined generated output;
- records diagnostics, limitations, and safety observations.

The result records what happened. It does not approve, publish, or accept the
generated output.

### GeneratedWebsiteProposal

Conceptual purpose:
- stores or references the quarantined implementation proposal produced by the
  external AI system;
- preserves source ProviderGenerationPayload, source WGP, and upstream lineage;
- records generated files, content, structure, assets, notes, and limitations
  only as proposal material;
- remains pending compliance and Business Approval.

The GeneratedWebsiteProposal is implementation proposal material. It is not
truth, not compliance, not approval, and not a publishable production state.

## Execution Prerequisites

Future provider execution requires all of the following:

- a valid or explicitly export-ready ProviderGenerationPayload;
- preserved source Website Generation Package lineage;
- preserved source provider payload lineage;
- safety classification recorded before execution;
- explicit operator authorization for this execution attempt;
- no unresolved execution blockers;
- no publishing permissions in the execution request;
- no deployment permissions in the execution request;
- no DNS mutation permissions in the execution request;
- no production mutation permissions in the execution request.

If any prerequisite is missing, execution must fail closed before a provider is
called or a prompt is sent.

## Execution Safety Rules

Provider execution safety rules:

- provider may generate proposal only;
- generated output is quarantined;
- generated output is not automatically persisted as an accepted website;
- generated output is not production state;
- no production mutation;
- no deployment;
- no DNS mutation;
- no publishing;
- no automatic acceptance;
- no automatic compliance pass;
- no automatic Business Approval;
- compliance must run after generation;
- Business Approval must happen before publish;
- publish authorization must remain separate from execution authorization.

The execution boundary must make it impossible to confuse "provider produced
an implementation" with "GNR8 approved this implementation."

## First Execution Mode Recommendation

Recommended first execution mode:

```text
Manual Codex execution outside GNR8
```

This is the shortest safe path because GNR8 can keep its runtime boundary at
export-ready ProviderGenerationPayload while a human operator performs the
first Codex execution outside GNR8. The external execution does not become a
GNR8 provider integration, does not require credentials or provider-call
plumbing, and does not mutate production state.

The recommended follow-up is future controlled import of manually generated
output as quarantined GeneratedWebsiteProposal material.

Deferred execution modes:

- Controlled local import of manually generated output;
- Direct Codex execution;
- API-based provider execution.

Only Manual Codex execution outside GNR8 is recommended as the first execution
mode.

## Generated Output Boundary

Generated output must be treated as an implementation proposal, not truth.

Generated output may contain code, files, copy, design structure, components,
assets, implementation notes, or provider explanations. Those materials are
not authoritative business knowledge and do not update the Digital Business
Twin, Business Understanding Report, Business Alignment, Website Design Brief,
Website Generation Package, or ProviderGenerationPayload.

Generated output can only become useful inside GNR8 after it is quarantined,
associated with lineage, and evaluated against the Website Generation Package
by Generation Contract Compliance.

Business Approval must happen after compliance and before publish.

## Boundary Confirmation

MVP-1I ends with this governed conceptual boundary:

```text
export-ready ProviderGenerationPayload
-> explicitly authorized external AI execution
-> quarantined Generated Website Proposal
-> later Generation Contract Compliance
-> later Business Approval
-> later Publish
```

MVP-1I does not call a provider, send a prompt, execute AI, generate a
website, import generated output, run compliance, create Business Approval,
publish, deploy, mutate DNS, mutate production, add UI, add API routes, add
schema, add workers, or add TypeScript.

Completed follow-up phase:

- MVP-1J Manual Codex Execution Runbook and Generated Proposal Import Boundary

Later completed regeneration-planning phase:

- MVP-2.0-G Provider Payload v2 Runtime Foundation persisted
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7` from
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d` plus
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`, with no
  provider execution or AI execution.
  Design.

## MVP-1J Manual Codex Execution And Import Boundary

Canonical documents:

- `docs/architecture/MANUAL_CODEX_EXECUTION_RUNBOOK.md`
- `docs/architecture/GENERATED_WEBSITE_PROPOSAL_IMPORT_BOUNDARY.md`

MVP-1J defines the safe manual operator process for executing an export-ready
Codex task ProviderGenerationPayload outside GNR8. The runbook requires exact
source ProviderGenerationPayload and WGP artifact recording, copied payload
integrity, no hidden prompt edits, no business reinterpretation, no production
mutation, no deployment, no publishing, no DNS mutation, expected
proposal-only Codex output, external output bundle storage, provider notes,
implementation assumptions, known limitations, execution timestamp, operator
reference, and operator attestation.

MVP-1J also defines the future import boundary for quarantined
GeneratedWebsiteProposal material. Future concepts are
GeneratedWebsiteProposal, GeneratedWebsiteProposalLineage,
GeneratedWebsiteProposalStatus, GeneratedWebsiteProposalSource,
GeneratedWebsiteProposalSafety, and
GeneratedWebsiteProposalValidationReadiness. Conceptual status values are
`received`, `quarantined`, `invalid`, `blocked`, `superseded`, and
`compliance_ready`.

Generated Website Proposal material is not trusted. It cannot publish, update
DBT, update WDB, update WGP, update ProviderGenerationPayload, become a
compliance result by itself, become Business Approval by itself, or mutate
production. It must first be checked by Generation Contract Compliance.

MVP-1J adds no provider call from GNR8, prompt sent by GNR8, automated AI
execution, generated website import implementation, compliance execution,
Business Approval, publishing, deployment, DNS mutation, production mutation,
UI, API, schema, workers, or TypeScript.

Recommended next phase:

- MVP-1K Generated Website Proposal Import Runtime Foundation, limited to
  quarantined import/storage of a manually generated output bundle with
  lineage, metadata, operator attestation, and fail-closed safety validation.
  Stop before compliance execution, Business Approval, publishing, deployment,
  DNS mutation, production mutation, UI, API, schema, or workers unless
  explicitly authorized.
