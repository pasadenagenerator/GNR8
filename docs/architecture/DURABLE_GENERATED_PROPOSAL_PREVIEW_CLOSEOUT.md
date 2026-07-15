# Durable Generated Proposal Preview Closeout

## Milestone Purpose

Durable Generated Proposal Preview closes the preview reliability gap for
quarantined ODV generated proposal iterations.

The milestone makes the existing superadmin preview URLs reconstruct generated
proposal pages from immutable persisted `generated_proposal_bundle` artifacts
instead of relying on local repository folders at request time.

## Initial Production Problem

Before P0, the Generation Evolution and Knowledge Workspace preview links could
only render when the local generated proposal folders were available to the
runtime filesystem:

```text
ODV_GENERATED_PROPOSAL_001/
ODV_GENERATED_PROPOSAL_002/
```

That made production previews fragile and caused `PREVIEW_UNAVAILABLE` even
when the canonical GeneratedWebsiteProposal artifacts existed.

## Final Architecture

The final preview path is:

```text
GeneratedWebsiteProposal
-> generated_proposal_bundle
-> persisted immutable bundle bytes
-> superadmin read-only preview route
-> Knowledge Workspace and Generation Evolution links
```

The preview route remains:

```text
/gnr8/admin/evolution/[siteVersionId]/iterations/[iteration]/preview/
```

The route now resolves the current `siteVersionId` and allowlisted iteration to
the persisted bundle artifact, then serves `source/index.html` and relative
assets from stored bytes. It does not read local proposal folders during
preview.

## Implementation Summary

Implemented P0 capabilities:

- `generated_proposal_bundle` runtime contract
- immutable file, byte, and SHA-256 persistence
- by-ID retrieval
- by-iteration retrieval
- persisted asset resolution
- preview route integration
- ODV materialization CLI
- focused persistence, projection, preview, and security tests
- canonical runtime and production verification documentation

P0 did not add publishing, deployment, hosting, Business Approval, provider
execution, AI execution, schema expansion outside the bundle boundary,
regeneration, Proposal v3, DNS mutation, workers, or mutation UI.

## Iteration 1 Bundle Identity

```text
siteVersionId: 09dce7ea-d860-4f60-a1eb-26c3335b302e
iteration: 1
bundleId: generated_proposal_bundle_eb95bc58e327d009f2282cf6908dfdd4
source proposal: ODV_GENERATED_PROPOSAL_001
GeneratedWebsiteProposal: generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3
files: 11
bytes: 28574
SHA-256: c486d84b30f284042454b11ed0306981c8041b25f7b19cdcab43cbe02c06f4aa
validation: valid
```

Read-only closeout verification confirmed the bundle loads by ID and by
`siteVersionId + iteration`, and both paths resolve the same record.

## Iteration 2 Bundle Identity

```text
siteVersionId: 09dce7ea-d860-4f60-a1eb-26c3335b302e
iteration: 2
bundleId: generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075
source proposal: ODV_GENERATED_PROPOSAL_002
GeneratedWebsiteProposal: generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e
files: 17
bytes: 39875
SHA-256: 39307d8d5017ec28fba3cf41531bf381370cd8f065d645026bfd93172203ed03
validation: valid
```

Read-only closeout verification confirmed the bundle loads by ID and by
`siteVersionId + iteration`, and both paths resolve the same record.

## Production Verification

Closeout read-only production verification on 2026-07-15 confirmed:

- bundle count is exactly `2`
- both bundle IDs are unchanged
- latest bundle pointer is Iteration 2
- by-ID retrieval works for both bundles
- by-iteration retrieval works for both bundles
- entry, CSS, and JavaScript asset retrieval works for both bundles
- representative Iteration 2 SVG retrieval works
- bundle byte counts and SHA-256 values match the production verification
  record
- non-bundle provenance hash remains unchanged:
  `839a89dba37fd545772e25ba740dd1a95cb5b0cea81301ffc87009b9c7b46010`

Authenticated production browser verification confirmed:

- Iteration 1 preview renders `ODV Generated Website Proposal 001`
- Iteration 2 preview renders `ODV Generated Website Proposal 002`
- `PREVIEW_UNAVAILABLE` is absent from both previews
- CSS rules load for both previews
- JavaScript is served as a static browser asset for both previews
- Iteration 2 SVG assets resolve in page-level loading
- both previews show quarantined and not-authorized publishing language
- Workspace includes Iteration 1 and Iteration 2 preview links and iframe
  sources
- Evolution includes Iteration 1 and Iteration 2 preview links
- historical access remains available
- compliance and evolution state remains unchanged

## Filesystem Independence Proof

The production verification record documents that both local proposal folders
were temporarily renamed:

```text
ODV_GENERATED_PROPOSAL_001 -> ODV_GENERATED_PROPOSAL_001.__p0_verify_tmp
ODV_GENERATED_PROPOSAL_002 -> ODV_GENERATED_PROPOSAL_002.__p0_verify_tmp
```

While those folders were unavailable, persisted retrieval still passed and both
preview entries resolved from durable storage. The folders were restored after
verification.

P0-CLOSEOUT did not repeat the rename because the existing record was
consistent and read-only production verification confirmed the durable records
remain present.

## Security Summary

Verified security properties:

- superadmin-only route boundary
- unauthenticated production request returns `401 UNAUTHORIZED`
- unknown iteration fails closed
- missing file fails closed
- traversal and encoded traversal fail closed
- absolute and outside-bundle paths fail closed
- no arbitrary filesystem access
- `cache-control: no-store`
- `x-content-type-options: nosniff`
- restrictive CSP with `default-src 'none'`, `connect-src 'none'`, and
  `form-action 'none'`
- generated JavaScript is served as static bytes only and is not executed
  server-side
- no write behavior was added

Focused tests continue to cover the route and asset failure cases.

## Approved Production Mutation Summary

Only these approved production writes occurred in P0-VERIFY:

```text
generated_proposal_bundle_eb95bc58e327d009f2282cf6908dfdd4
generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075
```

They were appended under the existing site version import provenance summary
using the approved bundle persistence boundary. The idempotency retry reused
the same IDs and kept bundle count at `2`.

## No-Write-Beyond-Scope Result

P0-CLOSEOUT performed read-only production verification only. It did not run a
materialization command and did not create bundle records.

The non-bundle provenance hash remains:

```text
839a89dba37fd545772e25ba740dd1a95cb5b0cea81301ffc87009b9c7b46010
```

No GeneratedWebsiteProposal, ProviderGenerationPayload, WGP, OWM, compliance,
Business Approval, publishing, deployment, DNS, schema, worker, provider, or AI
state was changed.

## Known Limitations

- previews are quarantined generated proposals
- previews are not approved or published websites
- direct top-level browser navigation to some nested asset URLs may be limited
  by browser or client behavior, while page-level loading works
- neither proposal bundle contains local font files
- Iteration 1 contains no image or icon assets
- no screenshot or thumbnail generation exists
- no public or non-superadmin preview sharing exists
- no publishing boundary is implemented

## Milestone Status

```text
COMPLETE
```

Durable Generated Proposal Preview is implemented, production materialized for
ODV Iteration 1 and Iteration 2, read-only verified, filesystem-independent,
fail-closed, quarantined, and documented.

## Recommended Next Track

Return to product UX review.

The next track may review Workspace and Evolution product experience using the
now-durable preview foundation. It should remain separate from publishing,
deployment, Business Approval, provider execution, AI execution, DNS, Proposal
v3, schema, worker, and production website activation work unless a new phase
explicitly authorizes that scope.
