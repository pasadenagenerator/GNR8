# Manual Codex Execution Runbook

## Phase And Boundary

Phase MVP-1J defines the safe manual process for taking an export-ready Codex
task ProviderGenerationPayload, executing it outside GNR8, and preserving the
generated result for later controlled import as a quarantined Generated Website
Proposal.

This phase is documentation and contract design only. It adds no
implementation, provider call from GNR8, prompt sent by GNR8, automated AI
execution, generated website import implementation, compliance execution,
Business Approval, publishing, deployment, DNS mutation, production mutation,
UI, API, schema, or workers.

Manual Codex execution outside GNR8 is an operator action, not a GNR8 runtime
capability.

## Canonical Runbook Definition

"A human-operated, auditable procedure for copying one export-ready
ProviderGenerationPayload into Codex outside GNR8, preserving the source
payload and resulting output without hidden edits, and saving the generated
material for later quarantined import."

The manual runbook is not a provider integration.

The manual runbook is not prompt automation.

The manual runbook is not generated website acceptance.

The manual runbook is not compliance, approval, deployment, DNS, or publish.

## Source Payload Requirement

The only valid source is an export-ready Codex task ProviderGenerationPayload.

Required source conditions:

- provider type is `codex`;
- payload kind is `codex_task`;
- safety classification is `export_only_no_execution`;
- source ProviderGenerationPayload artifact ID is recorded;
- source Website Generation Package artifact ID is recorded;
- source WGP lineage is preserved;
- payload status is valid for export or explicitly accepted as export-ready by
  an operator;
- payload includes objective, source package summary, required website
  outcomes, navigation/page/section requirements, content requirements,
  constraints, validation expectations, forbidden actions, expected output
  shape, and stop conditions;
- payload has no generated website, generated output, provider result,
  publishing artifact, deployment artifact, DNS mutation artifact, compliance
  result, Business Approval, or runtime mutation artifact.

If the source payload is missing, stale without explicit acceptance, altered,
incomplete, or not traceable to a source WGP artifact, the manual run must not
start.

## Operator Responsibilities

The operator is responsible for:

- selecting exactly one source ProviderGenerationPayload artifact;
- confirming the source payload artifact ID;
- confirming the source WGP artifact ID;
- confirming whether the source payload is latest or explicitly accepted even
  if not latest;
- copying the payload content exactly as exported;
- preserving the payload content used for execution;
- recording all execution metadata;
- recording any provider-visible notes;
- saving the generated output outside GNR8;
- attesting whether the payload or generated output was manually altered;
- preventing deployment, publishing, DNS mutation, and production mutation;
- preventing business reinterpretation outside the source payload;
- preserving all provider notes, assumptions, limitations, and diagnostics.

The operator must not use the manual run to complete missing business
knowledge, invent business facts, weaken constraints, bypass compliance, or
approve generated material.

## Source Artifact Recording

Before execution, the operator must record:

- source ProviderGenerationPayload artifact ID;
- source ProviderGenerationPayload status;
- source ProviderGenerationPayload created timestamp;
- source provider type and payload kind;
- source payload contract version;
- source adapter ID and adapter version when present;
- source Website Generation Package artifact ID;
- source Website Generation Package ID;
- source Website Generation Package contract version;
- source Website Design Brief reference;
- upstream Business Alignment reference;
- upstream Digital Business Twin reference;
- site version ID;
- dry run ID where present;
- latest-source check result;
- explicit stale-source acceptance reason if the payload is not latest;
- operator identity or stable operator reference;
- manual execution timestamp;
- external Codex environment or session reference, without secrets.

This metadata must be kept with the generated output bundle so future import
can prove lineage without trusting memory or chat history.

## Copied Payload Integrity

The copied payload must match the export-ready ProviderGenerationPayload.

Required integrity practices:

- preserve the complete copied payload text or file used for Codex execution;
- preserve a local checksum or stable fingerprint when available;
- record whether the payload was copied from latest, by-ID, or another
  explicit export surface;
- record any copy/export tool or manual process used;
- record copy timestamp;
- record operator attestation that no hidden prompt edits were made;
- record any visible, intentional wrapper text added outside the payload;
- fail closed if the operator cannot prove which payload was used.

Hidden prompt edits are prohibited. If the operator adds visible operational
context outside the source payload, it must be recorded as an operator note and
must not reinterpret business meaning.

## No Hidden Prompt Edits

The operator must not:

- silently rewrite the source payload;
- add hidden instructions;
- delete forbidden actions;
- soften stop conditions;
- remove limitations;
- remove low-confidence signals;
- add missing audience, offering, brand, trust, or business knowledge;
- ask Codex to optimize for a business goal not present in the payload;
- ask Codex to deploy, publish, mutate DNS, or mutate production;
- ask Codex to generate compliance findings or Business Approval.

Any visible framing added outside the payload must be mechanical and must not
change the generation contract. Example allowed framing is identifying the
task as "implementation proposal only" when that already matches the payload.

## No Business Reinterpretation

Manual execution must not reinterpret business meaning.

The operator may ask Codex to implement the source payload. The operator may
not ask Codex to decide a better business position, invent missing facts,
change the intended audience, alter the offer, change trust claims, revise the
Website Design Brief, revise the WGP, or substitute a different business
strategy.

If Codex output contains business reinterpretation, the output must be saved
with that limitation and treated as unsafe or blocked for future import until
reviewed.

## Production Safety Rules

Manual execution outside GNR8 must not create production effects.

Forbidden actions:

- no production mutation;
- no deployment;
- no publishing;
- no DNS mutation;
- no domain or registrar action;
- no hosting configuration change;
- no CMS write;
- no database migration;
- no runtime state mutation;
- no GNR8 artifact update;
- no DBT update;
- no WDB update;
- no WGP update;
- no compliance result creation;
- no Business Approval creation.

Generated output is proposal material only.

## Expected Codex Output

Expected output from Codex is an implementation proposal only.

Expected output may include:

- generated files or source bundle;
- code files;
- static assets or asset references;
- component structure;
- styling;
- copy placed into the implementation;
- provider notes;
- implementation assumptions;
- known limitations;
- source payload reference;
- execution timestamp;
- operator reference.

Expected output must not include:

- publishing artifacts;
- deployment artifacts;
- DNS mutation artifacts;
- runtime mutation artifacts;
- compliance results;
- Business Approval;
- claims that the result is accepted, approved, compliant, deployed, or
  publishable.

If Codex produces deployment instructions, publish instructions, DNS
instructions, compliance claims, or approval claims, preserve them as part of
the raw output but mark the run as unsafe for direct import.

## Saving Generated Output Outside GNR8

Until GNR8 has a controlled Generated Website Proposal import implementation,
the generated output must be saved outside GNR8.

Recommended external package shape:

```text
generated-website-proposal/
  metadata/
    source-provider-generation-payload.json
    manual-execution-metadata.json
    operator-attestation.md
    provider-notes.md
    assumptions.md
    limitations.md
  generated-output/
    source-or-files/
  checks/
    copied-payload-integrity.md
    safety-observations.md
```

The exact folder names are conceptual in MVP-1J. The important rule is that
the generated files, source payload reference, provider notes, assumptions,
limitations, execution timestamp, and operator attestation remain together as
one import candidate.

Do not save the generated output into GNR8 runtime artifact storage during
MVP-1J.

## Required Metadata To Preserve

The external generated output package must preserve:

- source ProviderGenerationPayload artifact ID;
- source Website Generation Package artifact ID;
- source site version ID;
- source dry run ID where present;
- source payload status;
- source payload contract version;
- source payload provider type and payload kind;
- source payload latest-check result or explicit accepted-stale reason;
- copied payload content or reference;
- copied payload checksum or fingerprint when available;
- execution provider name;
- execution provider environment or session reference;
- execution timestamp;
- operator reference;
- operator attestation;
- generated output bundle reference;
- provider notes;
- implementation assumptions;
- known limitations;
- safety observations;
- statement that no deployment, publishing, DNS mutation, production mutation,
  compliance execution, or Business Approval occurred.

This metadata is the minimum future import boundary. Missing metadata should
block or invalidate future import.

## Operator Attestation

The operator attestation must answer:

- Which ProviderGenerationPayload artifact was used?
- Which WGP artifact was the source?
- Was the source payload latest at execution time?
- If not latest, why was this source explicitly accepted?
- Was the payload copied exactly?
- Were any visible wrapper instructions added?
- Were any hidden instructions or prompt edits added?
- Was the generated output manually altered after Codex produced it?
- If altered, what changed, when, and by whom?
- Did any deployment, publishing, DNS mutation, production mutation,
  compliance execution, or Business Approval occur?
- Where is the generated output bundle stored outside GNR8?

Future import must treat missing attestation as a blocker.

## Failure And Block Conditions

The manual run must be blocked or marked unsafe when:

- source ProviderGenerationPayload artifact ID is missing;
- source WGP artifact ID is missing;
- source lineage cannot be proven;
- source payload cannot be reproduced or inspected;
- copied payload integrity cannot be attested;
- hidden prompt edits occurred;
- business reinterpretation was requested;
- generated output was manually altered without attestation;
- output contains publish, deployment, DNS, or production mutation artifacts;
- output claims compliance or Business Approval;
- output cannot be packaged with metadata and operator attestation.

Blocked manual runs may be retained as audit evidence, but they must not become
Generated Website Proposal import candidates without explicit future review.

## Boundary Confirmation

MVP-1J defines the manual Codex execution runbook only. It does not execute
Codex from GNR8, send prompts from GNR8, automate provider execution, import
generated websites, run compliance, create Business Approval, publish, deploy,
mutate DNS, mutate production, add UI, add API routes, add schema, add
workers, or add TypeScript.

Recommended next phase:

- MVP-1K Generated Website Proposal Import Runtime Foundation, limited to
  quarantined import/storage of a manually generated output bundle with
  lineage, metadata, operator attestation, and fail-closed safety validation.
  Stop before compliance execution, Business Approval, publishing, deployment,
  DNS mutation, production mutation, UI, API, schema, or workers unless
  explicitly authorized.
