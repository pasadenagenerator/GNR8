# Business Discovery Runtime Builder

## Phase And Boundary

Phase MVP-1A implements the first runtime Business Discovery artifact from
existing imported website evidence.

Business Discovery answers:

```text
What does the imported website evidence suggest about the business?
```

It does not create the Digital Business Twin. It is the deterministic
interpretation layer between raw website evidence and the future DBT builder.

## Implemented Runtime Modules

- `apps/platform/gnr8/architecture/business-discovery-contract.ts`
- `apps/platform/gnr8/architecture/business-discovery-builder.ts`
- `apps/platform/gnr8/architecture/business-discovery-persistence.ts`

The artifact kind is:

```text
business_discovery
```

The contract version is:

```text
MVP-1A
```

The builder version is:

```text
MVP-1A
```

## Artifact Shape

`BusinessDiscoveryArtifact` includes:

- `businessDiscoveryId`
- `status`
- `siteVersionId`
- `dryRunId`
- `sourceSiteId` when available
- `sourceUrl` when available
- `createdAt`
- `contractVersion`
- `lineage`
- `domainSummaries`
- `findings`
- `confidence`
- `limitations`
- `diagnostics`

Allowed artifact statuses are:

- `observed`
- `partial`
- `valid`
- `invalid`
- `blocked`
- `stale`

Persistence accepts only current valid contract records with statuses
`observed`, `partial`, `valid`, or `blocked`. `invalid` and `stale` fail
closed at persistence time.

## MVP Domains

MVP-1A includes only website-derived Business Discovery domains:

- `business_identity`
- `offerings`
- `audience`
- `brand`
- `digital_presence`
- `goals`
- `trust`
- `content`
- `constraints`

CRM, ERP, commerce, support, and future connector domains are intentionally
not implemented.

## Builder Behavior

`buildBusinessDiscoveryFromSiteEvidence(...)` is deterministic and uses only
provided imported-site evidence. It does not call external services, AI
systems, provider adapters, API routes, workers, generation systems, approval
systems, or publishing systems.

The first extraction slice derives conservative findings from:

- imported source URL and source host
- observed route paths
- captured navigation labels and hrefs
- captured section boundary region types
- asset inventory counts when available
- upstream evidence limitations and diagnostics
- optional persisted Candidate Discovery context when explicitly provided

The builder creates findings such as:

- `company_identity_observed`
- `source_site_observed`
- `route_inventory_observed`
- `primary_navigation_observed`
- `offering_candidate_observed`
- `contact_path_observed`
- `goal_candidate_observed`
- `trust_signal_observed`
- `content_theme_observed`
- `asset_signal_observed`
- `evidence_constraint_observed`

If a signal is missing, the builder records a limitation instead of guessing.
For example, missing audience, logo, offering, trust, or content signals become
domain limitations until better evidence or Business Owner confirmation exists.

## Validation

`validateBusinessDiscoveryArtifact(...)` validates:

- required IDs and timestamps
- allowed status values
- required lineage
- allowed MVP domains
- unique finding IDs
- finding evidence refs
- domain summary references to existing findings
- confidence objects
- limitations and diagnostics
- recursive forbidden fields

The forbidden field guard rejects:

- `generatedContent`
- `generatedHtml`
- `generatedReact`
- `generatedComponents`
- `generatedBlocks`
- `providerPayload`
- `prompt`
- `aiOutput`
- `websiteDesignBrief`
- `websiteGenerationPackage`
- `publishingArtifact`
- `deploymentArtifact`
- `executionArtifact`

## Persistence

Business Discovery persistence uses the existing site-version provenance
artifact boundary. It adds no schema migration.

`persistBusinessDiscoveryArtifact(...)` stores immutable
`businessDiscoveryArtifacts` and advances `latestBusinessDiscoveryArtifact`
inside `importProvenanceSummary`.

Persistence behavior:

- equivalent latest artifact reuses the existing artifact record
- changed current artifact appends a new record
- latest load returns the latest valid current artifact
- by-ID load returns the exact persisted artifact record
- malformed legacy entries are ignored for readback and latest selection
- `invalid` and `stale` artifacts are rejected
- explicitly `blocked` artifacts are accepted as valid fail-closed records

## Difference From Digital Business Twin

Business Discovery is not the Digital Business Twin.

Business Discovery is an interpretation artifact. It records conservative,
evidence-backed suggestions from website evidence: identity signals, offering
candidates, audience hints, brand signals, digital presence, goals, trust
signals, content themes, constraints, confidence, limitations, and lineage.

The Digital Business Twin is the future governed operational understanding of
the business. It will integrate Business Discovery into canonical Business
Domains, governance state, versioning, knowledge, understanding, and
Business Owner confirmation.

Business Discovery prepares DBT input by giving the DBT builder a deterministic
runtime artifact with:

- stable lineage
- website-derived domain summaries
- evidence-backed findings
- confidence and limitations
- explicit missing-signal records
- no generated content
- no provider payloads
- no publishing behavior

## Explicitly Not Implemented

MVP-1A does not implement:

- Digital Business Twin runtime
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

## Tests

Focused tests cover:

- valid discovery artifact
- blocked and partial discovery artifacts
- deterministic findings
- missing evidence creates limitations, not guesses
- forbidden fields rejected
- idempotent persistence reuse
- append on changed discovery
- load latest
- load by ID
- stale and invalid persistence rejection

## Real-Target Validation

MVP-1A-R validated the builder and persistence helpers against current ODV
and ViroiDoc imported website evidence.

Persisted Business Discovery artifacts:

- ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e`:
  `business_discovery_7b37413651d79de0d109e31690a34b62`
- ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf`:
  `business_discovery_360fa099cbcede288c2d0e04f2ec7986`

Both artifacts are `partial`, validate without errors or warnings, reload by
latest and by exact ID, and reuse the same artifact ID on idempotent retry.
The validation created no DBT, Business Understanding Report, Business
Alignment, Website Design Brief, Website Generation Package, provider payload,
prompt, AI output, generated content, or publishing artifact.

Canonical evidence:

```text
docs/architecture/BUSINESS_DISCOVERY_REAL_TARGET_VALIDATION.md
```

## Next Phase

Recommended next phase:

```text
MVP-1B Digital Business Twin Runtime Builder
```

MVP-1B should consume persisted Business Discovery artifacts as canonical DBT
input and stop before Business Understanding Report, Business Alignment,
Website Design Brief, Website Generation Package, provider adapters, external
AI, generation, compliance, Business Approval, or publishing.
