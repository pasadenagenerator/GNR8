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

## MVP-3.1-B Upstream Evidence Gap Finding

MVP-3.1-B analyzed why ODV still lacks canonical offerings, audience, logo,
colors, typography, and complete CGP knowledge in Business Foundation.

Canonical planning record:

```text
docs/architecture/BUSINESS_FOUNDATION_UPSTREAM_EVIDENCE_GAP_PLAN.md
```

The current Business Discovery builder is intentionally narrow. It derives
findings from source URL, route paths, navigation labels, section boundary
types, asset inventory counts, limitations, diagnostics, and optional
Candidate Discovery context. For ODV, richer signals exist in rendered body
text, headings, image `alt`, structured logo metadata, CSS, and font files,
but those signals are not currently Business Discovery inputs.

Therefore ODV offerings and audience are `CAPTURED_NOT_CLASSIFIED`, not
proven absent. Future enrichment should add evidence-backed candidates with
source refs and confidence, then require human confirmation before any DBT
canonical update.

## WU-3 Input Equivalence Finding

WU-3 audits this builder's upstream dependencies and validates whether Source
Website Understanding can replace scattered Business Discovery input assembly.

Canonical equivalence record:

```text
docs/architecture/BUSINESS_DISCOVERY_INPUT_EQUIVALENCE.md
```

Current builder dependencies:

- runtime metadata: `siteVersionId`, `dryRunId`, optional `sourceSiteId`,
  `createdAt`;
- import: source URL/host, route candidates, raw route map, import
  diagnostics;
- Evidence Capture: route paths, navigation labels/hrefs/positions, section
  IDs/region types, asset inventory counts, baseline limitations, fidelity
  limitations;
- Candidate Discovery: artifact ID, candidate count, candidate route paths;
- diagnostics and limitations.

The current builder does not consume Candidate Review, Reconstruction Package,
or StructurePlan directly.

WU-3 validation result:

- ODV and ViroiDoc both reached 89% dependency equivalence.
- Both targets had valid WU projections, zero conflicts, and zero duplicates.
- Covered inputs include source URL, route inventory, navigation labels,
  section region types, asset inventory, diagnostics, Candidate Discovery,
  Candidate Review context, Reconstruction context, and StructurePlan context.
- Partial input: upstream Evidence Capture baseline/fidelity limitations.
- Missing input: first-class `sourceSiteId` projection.

Duplicated logic that becomes obsolete after migration:

- source URL fallback resolution;
- route inventory aggregation;
- navigation signal assembly;
- section region aggregation;
- asset count aggregation;
- import diagnostic and upstream limitation copying once projection
  limitations are complete;
- Candidate Discovery context/count assembly.

WU-3 documents this only. The Business Discovery builder remains unchanged.

## Next Phase

Recommended next phase:

```text
WU-4 - Business Discovery Website Understanding Shadow Adapter
```

WU-4 should add a non-persistent shadow adapter from WU to the current
Business Discovery input shape, fill the two WU-3 projection gaps first, and
compare Business Discovery artifacts before any runtime switch.
## WU-4 Shadow Adapter Note

WU-4 adds a non-authoritative Website Understanding shadow path beside this
runtime builder. The canonical Business Discovery builder remains
`buildBusinessDiscoveryFromSiteEvidence(...)`; WU-4 does not fork it, replace
it, persist shadow outputs, or switch production input assembly.

The shadow path is:

```text
Source Website Understanding Projection
-> buildBusinessDiscoveryInputFromWebsiteUnderstanding(...)
-> buildBusinessDiscoveryFromSiteEvidence(...)
-> in-memory shadow Business Discovery artifact
-> compareBusinessDiscoveryShadow(...)
```

Real-target WU-4 validation produced 100% input dependency coverage for ODV
and ViroiDoc, but cutover was blocked because both shadow artifacts lost at
least one current section-boundary evidence ref on the
`content_theme_observed` finding. WU-5 closes that lineage blocker.

## WU-5 Section Evidence Aggregation Note

WU-5 preserves the current `content_theme_observed` section evidence lineage
through the WU shadow path. The builder now preserves exact upstream
section-boundary refs from `SectionBoundaryEvidence.sourceEvidenceRefs` when
they are present.

Canonical aggregation rule:

- aggregate all source sections that contribute to the content theme finding;
- preserve every exact `evidence:section-boundary:<routePath>:<sectionId>` ref;
- deduplicate exact duplicate refs only;
- keep distinct footer, navigation, content, hero, and other region refs
  separate;
- do not collapse refs with similar labels or semantic types;
- fall back to the legacy deterministic `sectionRef(routePath, sectionId)` only
  when upstream section evidence does not provide stable source refs.

Real-target WU-5 validation shows ODV and ViroiDoc retain all current
`content_theme_observed` refs with no missing or added content-theme refs.
Optional runtime integration is `ready_with_expected_differences`; this builder
still has not been switched to consume WU at runtime.
