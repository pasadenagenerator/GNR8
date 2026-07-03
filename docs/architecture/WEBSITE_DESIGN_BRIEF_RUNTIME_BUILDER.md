# Website Design Brief Runtime Builder

## Phase And Boundary

Phase MVP-1E implements the first deterministic Website Design Brief runtime.

Website Design Brief is NOT a design document.

Website Design Brief is the first Experience Projection of an Aligned Digital
Business Twin.

Website Design Brief is produced ONLY from an Aligned Digital Business Twin and
Business Alignment lineage.

Website Design Brief contains website intent.

Website Design Brief never contains implementation.

This phase does not implement Website Generation Package, provider adapters,
external AI, generation, compliance, Business Approval, publishing, UI, API, or
schema migrations.

## Runtime Files

- `apps/platform/gnr8/architecture/website-design-brief-contract.ts`
- `apps/platform/gnr8/architecture/website-design-brief-builder.ts`
- `apps/platform/gnr8/architecture/website-design-brief-persistence.ts`

Test files:

- `apps/platform/gnr8/architecture/website-design-brief-contract.test.ts`
- `apps/platform/gnr8/architecture/website-design-brief-builder.test.ts`
- `apps/platform/gnr8/architecture/website-design-brief-persistence.test.ts`

Artifact kind:

- `website_design_brief`

Contract version:

- `MVP-1E`

## Canonical Definition

The Website Design Brief answers:

```text
What kind of website should represent this business?
```

It transforms aligned business understanding into website experience intent.
It does not select technology, produce code, serialize provider requests,
generate a website, approve a website, or publish a website.

## Inputs

MVP-1E consumes only:

- the aligned `DigitalBusinessTwinArtifact`;
- the `BusinessAlignmentArtifact` lineage that produced or authorized that
  aligned DBT.

It never consumes:

- HTML;
- reconstruction artifacts;
- Business Discovery directly;
- prompts;
- providers;
- generated websites.

## Canonical Sections

The first runtime builder emits exactly these canonical sections:

1. Executive Summary
2. Website Purpose
3. Website Objectives
4. Target Audience
5. Core Messages
6. Brand Expression
7. Information Priorities
8. Website Journey
9. Trust Strategy
10. Accessibility Goals
11. SEO Intent
12. Experience Constraints
13. Missing Knowledge
14. Recommendations
15. Confidence
16. Limitations
17. Diagnostics

Each section has a stable section ID, title, intent, structured intent items,
source knowledge IDs, source missing-knowledge IDs, evidence refs, confidence,
limitations, and diagnostics.

## Transformation Rules

The builder is deterministic and local. It performs no AI calls and no external
service calls.

MVP-1E transformations:

- Business Goals -> Website Objectives
- Audience -> Audience Experience
- Offerings -> Information Priorities
- Brand -> Brand Expression
- Trust -> Trust Strategy
- Digital Presence -> Experience Recommendations
- Missing knowledge -> Missing Knowledge section

The builder never invents business information. If aligned DBT knowledge is
missing, the brief records the limitation and keeps the missing knowledge
visible.

## Status Behavior

Allowed Website Design Brief statuses:

- `draft`
- `partial`
- `valid`
- `blocked`
- `invalid`
- `stale`

Builder status behavior:

- aligned or confirmed DBT with no missing knowledge -> `valid`;
- aligned or confirmed DBT with missing knowledge -> `partial`;
- Business-Alignment-output DBT with status `partial` -> `partial`, preserving
  missing knowledge instead of inventing facts;
- blocked DBT or blocked Business Alignment -> `blocked`;
- invalid source -> `invalid`;
- stale source -> `stale`.

Persistence rejects `invalid` and `stale` artifacts. `blocked` is allowed so
the runtime can persist a fail-closed artifact when the upstream business
artifact is blocked.

## Validation

`validateWebsiteDesignBrief(...)` validates:

- top-level lineage;
- source DBT and Business Alignment references;
- canonical section IDs;
- unique section IDs;
- complete canonical section coverage;
- structured section items;
- confidence, limitations, diagnostics, and evidence refs;
- source DBT statuses `partial`, `aligned`, `confirmed`, or `blocked`, with
  Business Alignment lineage required to output the source DBT;
- recursive forbidden downstream fields;
- absence of implementation instructions.

Recursive forbidden fields:

- `providerPayload`
- `prompt`
- `generatedWebsite`
- `generatedHTML`
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

- `websiteDesignBriefArtifacts`
- `latestWebsiteDesignBriefArtifact`

Persistence behavior:

- validate before write;
- reject `invalid` and `stale`;
- allow `draft`, `partial`, `valid`, and `blocked`;
- reuse equivalent latest artifact by semantic fingerprint;
- append changed artifacts;
- load latest by site version and optional dry run;
- load by persisted artifact ID.

## Validation Result

Focused MVP-1E tests:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/website-design-brief-*.test.ts
```

Result:

```text
17 / 17 passing
```

Initial sandbox execution hit the known `tsx` IPC pipe permission issue. The
same focused command passed outside the sandbox.

## Boundary Confirmation

MVP-1E created no Website Generation Package, provider adapter, external AI
call, generation output, compliance artifact, Business Approval artifact,
publishing behavior, UI route, API route, worker behavior, or schema migration.

Recommended next phase:

- MVP-1E-R Website Design Brief Real-Target Validation is complete.
- Next recommended phase: MVP-1F Website Generation Package Runtime Builder.
