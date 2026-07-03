# Website Generation Package Runtime Builder

## Phase And Boundary

Phase MVP-1F implements the first deterministic Website Generation Package
runtime.

The Website Generation Package answers:

```text
What must an external generation system create?
```

It is not a prompt, provider payload, HTML, React, component tree, generated
website, implementation plan, publishing artifact, UI, API, worker, or schema
behavior.

This phase consumes only a persisted `WebsiteDesignBriefArtifact` and lineage
already present in that Website Design Brief.

This phase does not implement provider adapters, external AI, generation,
compliance execution, Business Approval, publishing, UI, API, schema
migrations, or workers.

## Runtime Files

- `apps/platform/gnr8/architecture/website-generation-package-contract.ts`
- `apps/platform/gnr8/architecture/website-generation-package-builder.ts`
- `apps/platform/gnr8/architecture/website-generation-package-persistence.ts`

Test files:

- `apps/platform/gnr8/architecture/website-generation-package-contract.test.ts`
- `apps/platform/gnr8/architecture/website-generation-package-builder.test.ts`
- `apps/platform/gnr8/architecture/website-generation-package-persistence.test.ts`

Artifact kind:

- `website_generation_package`

Contract version:

- `MVP-1F`

## Contract Shape

`WebsiteGenerationPackageArtifact` contains:

- `websiteGenerationPackageId`
- `status`
- `siteVersionId`
- `dryRunId`
- `sourceWebsiteDesignBriefId`
- `createdAt`
- `contractVersion`
- `lineage`
- `businessContext`
- `generationObjectives`
- `audience`
- `messages`
- `navigationContract`
- `pageContracts`
- `sectionContracts`
- `contentRequirements`
- `constraints`
- `validationContract`
- `confidence`
- `limitations`
- `diagnostics`

Allowed statuses:

- `draft`
- `partial`
- `valid`
- `blocked`
- `invalid`
- `stale`

## Builder Behavior

`buildWebsiteGenerationPackage(...)` is deterministic and local. It performs no
AI calls, provider calls, generation, provider serialization, publishing, or
implementation planning.

Transformation behavior:

- WDB objectives become generation objectives.
- WDB audience experience becomes audience requirements.
- WDB messages become required messaging.
- WDB journey becomes navigation, page, and section intent where available.
- WDB information, trust, accessibility, SEO, constraints, missing knowledge,
  and limitations become content requirements and constraints.
- WDB confidence propagates.
- WDB limitations propagate.
- Missing knowledge stays explicit and is never filled by inference.

## Generation Contract

The generated package defines provider-neutral obligations:

- business context that must be preserved;
- generation objectives that must be visibly supported;
- audience requirements, including explicit uncertainty when audience knowledge
  is missing;
- required core, supporting, trust, and brand messages;
- navigation intent from the WDB journey;
- page and section contracts that describe experience obligations only;
- content requirements that must be covered or preserved as limitations;
- constraints that must not be contradicted.

The package does not contain provider-specific formatting, prompts, generated
content, generated HTML, generated React, component contracts, route
implementation, framework choice, deployment metadata, or publishing metadata.

## Validation Contract

Every WGP contains validation expectations for:

- business positioning;
- audience representation;
- message coverage;
- brand consistency;
- navigation completeness;
- journey completeness;
- trust signal coverage;
- accessibility expectations;
- SEO intent;
- constraint preservation.

These expectations are contract checks for downstream review. MVP-1F does not
implement a compliance evaluator or generate a compliance report.

## Validation

`validateWebsiteGenerationPackage(...)` validates:

- lineage;
- source Website Design Brief references;
- allowed status;
- required contract sections;
- unique IDs;
- confidence, limitations, diagnostics, and evidence refs;
- recursive forbidden provider/downstream fields;
- absence of implementation instructions;
- validation contract presence and complete validation-area coverage.

Recursive forbidden fields:

- `providerPayload`
- `prompt`
- `openAiPrompt`
- `claudePrompt`
- `geminiPrompt`
- `aiOutput`
- `generatedWebsite`
- `generatedContent`
- `generatedHtml`
- `generatedReact`
- `generatedComponents`
- `generatedBlocks`
- `code`
- `framework`
- `library`
- `deploymentArtifact`
- `publishingArtifact`
- `executionArtifact`

## Persistence

Persistence uses the existing site-version `importProvenanceSummary` boundary.

It adds no schema table.

Stored provenance keys:

- `websiteGenerationPackageArtifacts`
- `latestWebsiteGenerationPackageArtifact`

Persistence behavior:

- validate before write;
- reject `invalid` and `stale`;
- allow `draft`, `partial`, `valid`, and `blocked`;
- reuse equivalent latest artifact by semantic fingerprint;
- append changed artifacts;
- load latest by site version and optional dry run;
- load by persisted artifact ID.

## Validation Result

Focused MVP-1F tests:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/website-generation-package-*.test.ts
```

Result:

```text
18 / 18 passing
```

Initial sandbox execution hit the known `tsx` IPC pipe permission issue. The
same focused command passed outside the sandbox.

## Boundary Confirmation

MVP-1F created no provider adapter, external AI call, generated website,
compliance evaluator, Compliance Report, Business Approval artifact, publishing
behavior, UI route, API route, worker behavior, or schema migration.

Recommended next phase:

- MVP-1F-R Website Generation Package Real-Target Validation.
