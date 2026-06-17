# First Real-Site Limited Dry Run Operational Test

## Scope

Phase 8B-12 attempted an operational verification of the existing admin-only first limited dry-run diagnostic flow against one real imported site.

This phase was verification only. It did not modify importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence behavior, API trigger behavior, UI behavior, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, or publishing behavior.

No new API routes, UI controls, approval controls, publish controls, edit controls, LLM calls, generated React, GNR8 blocks, CMS bindings, worker jobs, queues, client-user access, tenant-admin access, or publishing behavior were added.

## Selected Site

Selected attempted target:

| Field | Value |
| --- | --- |
| Site | Odv. Cvijanovic |
| Source URL | `https://www.odv-cvijanovic.si/` |
| siteId | `site_aaa6d44109a38b5d083f` |
| siteVersionId | `90b3abf8-7a4c-41b5-af05-244642d1962d` |
| version_no | `1` |
| state | `DRAFT` |
| route count | `1` |
| rationale | Small/static marketing-style imported site; avoids ViroiDoc and Maver complexity. |

Candidate discovery was run read-only against production runtime site versions. Across `14` site versions with non-null `import_provenance_summary`, `0` had `evidenceCaptureBaselineArtifact`, `0` had layout geometry under the baseline artifact, `0` had section evidence under the baseline artifact, `0` had navigation evidence under the baseline artifact, `0` had an accepted `ReconstructionDryRunPackage` location, and `0` qualified for the existing trigger preconditions.

The staging environment was also checked, but its configured database endpoint was not usable from this environment: `tenant/user postgres.dpkdxllcxnlytgjbnmvp not found`.

## Preflight

| Check | Result |
| --- | --- |
| siteVersionId | `90b3abf8-7a4c-41b5-af05-244642d1962d` |
| siteId | `site_aaa6d44109a38b5d083f` |
| source URL | `https://www.odv-cvijanovic.si/` |
| route count | `1` |
| baseline exists | no |
| layout geometry exists | no |
| section evidence exists | no |
| navigation evidence exists | no |
| dryRunPackage exists | no |
| existing `first_limited_dry_run_output` artifacts | `0` |

Top-level `import_provenance_summary` keys present:

`captureEvidence`, `captureJob`, `captureMode`, `computedStyleSampleCount`, `executionIdentity`, `importDiagnosticCodes`, `importFidelityScore`, `importFidelityStatus`, `kind`, `multiPageDiscovery`, `multipageImport`, `renderedCapture`, `renderedCaptureStatus`, `renderedDomQuality`, `screenshotCount`, `semanticImport`, `siteTree`, `sourceMode`, `styleSignals`, `templateFamilies`, `workerHealth`.

Required evidence is missing, so this phase stopped at preflight per the 8B-12 boundary.

## API Response Summary

Not executed.

The existing endpoint `POST /api/gnr8/admin/first-limited-dry-run` requires a site version with an Evidence Capture baseline and a matching `ReconstructionDryRunPackage`. Because preflight failed, no request was sent and no dry-run output was built or persisted.

Expected request shape was not used:

```json
{
  "siteVersionId": "90b3abf8-7a4c-41b5-af05-244642d1962d",
  "dryRunId": "<existing dryRunId>"
}
```

No `force`, `routeScope`, `generatedOutputs`, `reactOutput`, or arbitrary evidence payload was passed.

## Persistence Verification

Not executed beyond read-only preflight.

Confirmed before stopping:

- no existing `firstLimitedDryRunOutputArtifacts` were present for the selected site version
- no `latestFirstLimitedDryRunOutputArtifact` could be verified because no output artifact exists
- no new `first_limited_dry_run_output` artifact was created
- no persistence write was attempted

## Admin Surface Verification

Not executed against a real persisted output.

The read-only admin page depends on a latest persisted `first_limited_dry_run_output` artifact for meaningful Route/Navigation/Section Model details. Since preflight failed and no artifact was created, the real-site admin surface could not be verified for model counts or model details in this phase.

No trigger/rebuild, approve, publish, edit, AI, form, input, textarea, or select control verification was re-run in this operational phase; that absence remains covered by the prior 8B-10 source verification.

## Idempotency

Not executed.

Idempotent reuse requires a successful first trigger and a latest persisted output artifact. Because preflight failed before the first trigger, no second trigger was run and no duplicate active latest output check was applicable.

## Limitations

- Production currently has real imported runtime site versions, but none of the inspected versions contain the current `evidenceCaptureBaselineArtifact` shape required by the existing trigger.
- Production currently has no accepted `ReconstructionDryRunPackage` stored under `latestReconstructionDryRunPackage`, `reconstructionDryRunPackage`, `dryRunPackage`, `reconstructionDryRunPackages`, or `dryRunPackages` for the inspected imported site versions.
- The selected site has rendered/import provenance summary fields, but not the 8A/8B evidence expansion artifact shape needed by the limited dry-run builder.
- This phase did not prove whether the existing limited dry-run chain succeeds on a fully prepared real imported site.

## Result

FAIL at preflight.

Answer to the phase question:

> Does the existing limited dry-run chain work on a real imported site?

Unknown. No qualifying real imported site was available in the checked runtime data, so the chain was not triggered. The operational finding is that the current real-site dataset is not prepared for 8B-12 because required Evidence Capture baseline and dry-run package artifacts are absent.

## Next Recommended Phase

Phase 8B-12F Real-Site Dry Run Failure Analysis.

The next phase should analyze why current real imported site versions do not contain the required `evidenceCaptureBaselineArtifact` and `ReconstructionDryRunPackage` data, then decide whether the correct remedy is candidate discovery/package creation, evidence backfill/re-import, or a constrained admin preparation step. It should still avoid dry-run execution, reconstruction execution, AI generation, React/block generation, approvals, publishing, and UI trigger expansion unless separately authorized.
