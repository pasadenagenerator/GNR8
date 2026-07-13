# Digital Business Twin Runtime Builder

## Phase And Boundary

Phase MVP-1B implements the first runtime Digital Business Twin artifact from
persisted Business Discovery artifacts.

DBT v1 answers:

```text
What does GNR8 currently understand about this business?
```

MVP-1B preserves uncertainty and missing knowledge. It does not create a
Business Understanding Report, Business Alignment, Website Design Brief,
Website Generation Package, provider payload, generated output, approval, or
publishing artifact.

## Implemented Runtime Modules

- `apps/platform/gnr8/architecture/digital-business-twin-contract.ts`
- `apps/platform/gnr8/architecture/digital-business-twin-builder.ts`
- `apps/platform/gnr8/architecture/digital-business-twin-persistence.ts`

The artifact kind is:

```text
digital_business_twin
```

The contract version is:

```text
MVP-1B
```

The builder version is:

```text
MVP-1B
```

## Artifact Shape

`DigitalBusinessTwinArtifact` includes:

- `digitalBusinessTwinId`
- `status`
- `siteVersionId`
- `dryRunId`
- `sourceBusinessDiscoveryArtifactId`
- `createdAt`
- `contractVersion`
- `lineage`
- `domains`
- `knowledgeItems`
- `confidence`
- `missingKnowledge`
- `limitations`
- `diagnostics`

Allowed artifact statuses are:

- `observed`
- `partial`
- `aligned`
- `confirmed`
- `invalid`
- `blocked`
- `stale`

MVP-1B builder output can be `observed`, `partial`, `blocked`, `invalid`, or
`stale`. `aligned` and `confirmed` are valid contract states reserved for
later Business Alignment and Business Owner confirmation phases.

Persistence accepts only current records with statuses `observed`, `partial`,
`aligned`, `confirmed`, or `blocked`. `invalid` and `stale` fail closed at
persistence time.

## MVP Domains

MVP-1B includes only domains available from Business Discovery:

- `business_identity`
- `offerings`
- `audience`
- `brand`
- `digital_presence`
- `goals`
- `trust`
- `content`
- `constraints`

CRM, ERP, commerce, support, connector, and future operational domains are not
implemented.

## Knowledge Model

Business Discovery findings become DBT knowledge items.

Each `DigitalBusinessTwinKnowledgeItem` records:

- stable `knowledgeItemId`
- domain
- status
- kind
- statement
- source Business Discovery finding IDs
- evidence refs
- confidence
- limitations
- diagnostics

Knowledge item IDs are deterministic from the source finding ID, kind, and
summary. Reordering Business Discovery findings does not change DBT knowledge
item IDs or item order.

## Missing Knowledge

Missing Business Discovery domains become `missingKnowledge` records.

Each missing knowledge record includes:

- stable `missingKnowledgeId`
- domain
- reason
- source Business Discovery domain status when available
- source limitation IDs
- diagnostics

The DBT validator requires every domain with no knowledge items to have a
matching missing-knowledge record unless the artifact itself is `invalid` or
`stale`.

## Builder Behavior

`buildDigitalBusinessTwinFromBusinessDiscovery(...)` is deterministic and uses
only the supplied Business Discovery artifact. It does not call external
services, AI systems, provider adapters, API routes, workers, generation
systems, approval systems, or publishing systems.

Builder behavior:

- valid Business Discovery findings become DBT knowledge items
- missing Business Discovery domains become missing knowledge
- partial Business Discovery produces partial DBT when uncertainty remains
- blocked Business Discovery produces a blocked fail-closed DBT with no usable
  knowledge items
- invalid Business Discovery produces an invalid DBT
- stale Business Discovery produces a stale DBT

MVP-1B does not merge multiple Business Discovery artifacts and does not apply
Business Owner confirmation. It records what GNR8 currently understands from
the selected persisted Business Discovery source.

## Validation

`validateDigitalBusinessTwinArtifact(...)` validates:

- required IDs and timestamps
- allowed status values
- required lineage
- allowed MVP domains
- unique knowledge item IDs
- domain references to existing knowledge items
- missing-knowledge references and consistency
- confidence objects
- limitations and diagnostics
- recursive forbidden fields

The forbidden field guard rejects:

- `businessUnderstandingReport`
- `businessAlignment`
- `websiteDesignBrief`
- `websiteGenerationPackage`
- `providerPayload`
- `prompt`
- `aiOutput`
- `generatedContent`
- `generatedHtml`
- `generatedReact`
- `publishingArtifact`
- `deploymentArtifact`
- `executionArtifact`

## Persistence

Digital Business Twin persistence uses the existing site-version provenance
artifact boundary. It adds no schema migration.

`persistDigitalBusinessTwinArtifact(...)` stores immutable
`digitalBusinessTwinArtifacts` and advances `latestDigitalBusinessTwinArtifact`
inside `importProvenanceSummary`.

Persistence behavior:

- equivalent latest artifact reuses the existing artifact record
- changed current artifact appends a new record
- latest load returns the latest valid current artifact
- by-ID load returns the exact persisted artifact record
- malformed legacy entries are ignored for readback and latest selection
- `invalid` and `stale` artifacts are rejected
- explicitly `blocked` artifacts are accepted as valid fail-closed records

## Difference From Later Artifacts

The Digital Business Twin is not the Business Understanding Report.

DBT v1 is the machine-readable current business understanding artifact. It
preserves evidence, confidence, missing knowledge, limitations, and lineage.
It does not produce a narrative report, alignment decision, design brief,
generation contract, prompt, generated website, compliance result, approval,
deployment, or publishing action.

Business Understanding Report will be a later human-readable projection from a
current DBT version. Business Alignment will be a later governance and
correction layer above DBT understanding. Website Design Brief and Website
Generation Package remain downstream artifacts and are not created by MVP-1B.

## Explicitly Not Implemented

MVP-1B does not implement:

- Business Understanding Report
- Business Alignment
- Website Design Brief
- Website Generation Package
- provider adapters
- external AI integration
- generation
- compliance
- Business Approval
- publishing changes
- UI
- API routes
- schema migrations
- CRM, ERP, commerce, support, or connector domains

## Validation Result

Focused Digital Business Twin tests pass `17 / 17`:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/digital-business-twin-contract.test.ts apps/platform/gnr8/architecture/digital-business-twin-builder.test.ts apps/platform/gnr8/architecture/digital-business-twin-persistence.test.ts
```

Platform Vercel build and `git diff --check` are part of the MVP-1B closure
validation.

## MVP-1B-R Real-Target Validation

MVP-1B-R validated the DBT builder, persistence, lineage, reload helpers, and
idempotent persistence behavior against the real ODV and ViroiDoc Business
Discovery artifacts.

Canonical validation document:

```text
docs/architecture/DIGITAL_BUSINESS_TWIN_REAL_TARGET_VALIDATION.md
```

Persisted real-target DBT artifacts:

- ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e`:
  `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f`
- ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf`:
  `digital_business_twin_4eb9e9260ba45b9efee236ec18769e92`

Both DBTs are `partial`, valid, persisted, reloadable by latest pointer and by
exact artifact ID, and idempotent retry reuses the same artifact record.

ODV has 12 DBT knowledge items and 2 missing knowledge records:
`offerings` and `audience`.

ViroiDoc has 17 DBT knowledge items and 1 missing knowledge record:
`audience`.

Blocked Business Discovery was verified to produce a blocked DBT with 0 usable
knowledge items and 9 missing knowledge records. Recursive safety scans found
no Business Understanding Report, Business Alignment, Website Design Brief,
Website Generation Package, provider payload, prompt, AI output, generated
HTML, generated React, generated components, generated blocks, publishing,
deployment, or execution artifact fields.

## MVP-3.1-B Upstream Evidence Gap Finding

MVP-3.1-B confirms that ODV's missing DBT offerings and audience records are
not proof that the source website lacks those signals. They mean the current
Business Discovery artifact did not classify deterministic knowledge for those
domains.

Canonical planning record:

```text
docs/architecture/BUSINESS_FOUNDATION_UPSTREAM_EVIDENCE_GAP_PLAN.md
```

The source HTML contains candidate legal-service, customer-type,
differentiator, trust, logo, color, and typography evidence. DBT must continue
to preserve missing knowledge until a governed upstream candidate path and
human confirmation provide canonical updates. Raw extraction, deterministic
classification, or AI analysis must not silently write DBT truth.

## Next Step

MVP-1C-R should retry Business Understanding Report real-target validation
from the newly persisted ODV and ViroiDoc DBT artifacts and stop before
Business Alignment, Website Design Brief, Website Generation Package, provider
adapters, external AI, generation, compliance, Business Approval, or
publishing.
