# Candidate Context Review UI End-to-End Verification

## Phase

Phase 8D-25 - Candidate Context Review UI End-to-End Verification.

Date: 2026-06-22.

## Boundary

Verification was limited to the existing authenticated superadmin Candidate
Review pages for ODV and ViroiDoc. The only implementation change fixes the
blocking screenshot-delivery defect found during verification. No endpoint,
persistence, schema, worker, capture, reconstruction, AI, publishing, batch,
tenant, or customer behavior was added.

## Targets

| Target | Site version | Final review counts |
| --- | --- | --- |
| ODV | `09dce7ea-d860-4f60-a1eb-26c3335b302e` | `1 approved / 1 rejected / 1 deferred / 1 needs review` |
| ViroiDoc | `e26b0754-988b-45b9-9e24-8e213179b6cf` | `1 approved / 1 rejected / 1 deferred / 2 needs review` |

## Default Card Result

Both real pages rendered understandable candidate cards by default. Each card
led with a readable candidate name, type, route, confidence, current decision,
and rationale where present. Candidates were grouped under Approved, Rejected,
Deferred, and Needs review. All `View Context` and `Technical details`
disclosures were closed on initial load; no raw IDs or diagnostics interrupted
the default reading flow.

## Context Observations

ODV Route showed route `/`, `MEDIUM` confidence, a route summary of one
Navigation and two Section candidates, compact evidence counts, and no known
limitations. ODV Navigation showed `HIGH` confidence, six ordered labels, and
no known limitations. ODV Section showed `MEDIUM` confidence, structural label
`Navigation section`, and no known limitations.

ViroiDoc Route showed route `/`, `MEDIUM` confidence, a route summary of one
Navigation and three Section candidates, and the 18 preserved out-of-scope
navigation warnings. ViroiDoc Navigation showed `MEDIUM` confidence, item count
`29`, ordered labels, and the same preserved warnings. Some ViroiDoc labels
retain source HTML/image markup; the useful navigation labels remain present,
but this is presentation noise worth carrying forward. ViroiDoc Section showed
`MEDIUM` confidence, structural label `Navigation section`, and no known
limitations. Candidate `Technical details` remained collapsed in every check.

## Blocking Defect And Fix

The authenticated production deployment could not display the projected image
for Route, Navigation, or Section on either target. Every expanded panel showed
`Visual evidence unavailable`; image count and overlay count were both zero.
The projection itself was ready. The page attempted to read an import-machine
absolute screenshot path from the deployment filesystem.

The exact PNG bytes were already present in the existing raw-import artifact at
the matching persisted suffix `rendered/screenshots/fullpage.png`. The narrow
fix keeps the direct local-file read, then falls back fail-closed to the existing
read-only raw-artifact helpers. It requires one unique suffix match and
`image/png`; it creates no file, screenshot, persistence, or endpoint.

Read-only checks against both real artifacts resolved valid PNG data URIs:

| Target | Persisted PNG bytes | Data URI result |
| --- | ---: | --- |
| ODV | `954241` | valid `image/png`; encoded length `1272346` |
| ViroiDoc | `708953` | valid `image/png`; encoded length `945294` |

The focused render contract still proves Route emits no overlay and Navigation
and Section emit their projection-supplied CSS overlays. The current production
deployment predates the fix, so deployed screenshot and overlay presentation
must be re-verified after deployment; Phase 8D-25 does not claim that missing
visual proof as a pass.

## Action Verification

Approve, Reject, and Defer were submitted through the live controls on both
targets with explicit Phase 8D-25 rationales. Every submission showed its
corresponding `Decision saved` status and refreshed the canonical page. The
latest decisions stayed approved for Route, rejected for the selected Section,
and deferred for Navigation, so both targets retained their prior decision
counts while appending the new review decisions.

## Forbidden Controls

The interactive-control audit found no AI, reconstruction, publishing, batch,
tenant, or customer controls on either page. Actions remained single-candidate
Approve, Reject, and Defer plus optional rationale only.

## Screenshot Evidence

These captures document the authenticated deployed state observed before the
fix is deployed:

- ODV default: `phase-8d-25-odv-default.png`
- ODV Route unavailable state: `phase-8d-25-odv-route-context.png`
- ODV Navigation unavailable state and labels: `phase-8d-25-odv-navigation-context.png`
- ODV Section unavailable state: `phase-8d-25-odv-section-context.png`
- ODV action confirmations: `phase-8d-25-odv-actions-confirmed.png`
- ViroiDoc default: `phase-8d-25-viroi-default.png`
- ViroiDoc expanded contexts and limitations: `phase-8d-25-viroi-contexts.png`
- ViroiDoc action confirmations: `phase-8d-25-viroi-actions-confirmed.png`

## Validation

- Focused Candidate Context, Candidate Review page, and action-client tests:
  `27 / 27` pass.
- Real-artifact fallback checks: both targets resolve the exact persisted PNG.
- `cd apps/platform && pnpm run vercel-build`: pass, with existing lint warnings.
- `git diff --check`: pass.

## Exit And Next Boundary

Phase 8D-25 is complete as an end-to-end verification and blocking-defect fix,
with the production visual result explicitly unresolved until deployment.

Recommend exactly one next phase: **Phase 8D-26 - Candidate Context Review UI
Production Re-Verification**, limited to deploying the accepted screenshot
delivery fix and verifying Route without overlay plus Navigation and Section
with overlays on ODV and ViroiDoc. No new behavior.
