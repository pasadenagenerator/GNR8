# Candidate Review Action UI Design

## Phase And Boundary

Phase 8D-12 designed the first superadmin controls for applying the existing
Candidate Review Action contract through the existing Candidate Review admin
surface. Phase 8D-15 implements those controls against the Phase 8D-14 Admin
API.

The implementation adds only single-candidate action UI and its same-origin
transport. It adds no new endpoint, action application, persistence behavior,
schema, migration, worker, AI call, reconstruction, generated output, or
publishing behavior. It does not change Candidate Discovery, Evidence Capture,
or Limited Dry Run.

## UI Purpose

The action UI lets an authenticated, authorized superadmin apply exactly one
human decision to exactly one candidate:

- **Approve** maps to `approve` and the latest decision `approved`.
- **Reject** maps to `reject` and the latest decision `rejected`.
- **Defer** maps to `defer` and the latest decision `deferred`.

Approval records review eligibility only. The UI must not reconstruct, create
React or blocks, publish, edit candidate content, call AI, or imply that any of
those operations occurred.

## Recommended UI Location

### Options Assessed

**A. Existing Candidate Review admin page.** Adds controls next to the exact
candidate context, current decision, package artifact, and immutable history
already being inspected.

**B. Candidate Discovery page.** Would mix deterministic discovery evidence
with attributed human governance and would modify the Discovery UI boundary.

**C. New Candidate Review Action page.** Would duplicate package, candidate,
lineage, decision, and history context and create a second review surface.

### Recommendation

Recommend exactly one location: **A. the existing Candidate Review admin
page**, `/gnr8/admin/candidate-review/[siteVersionId]`.

The future implementation should add a narrowly owned action panel to each
candidate row or detail section while retaining the existing projection as the
authoritative display source. Controls are enabled only when the displayed
package is valid, authoritative latest, linked to the displayed Discovery
artifact, and the viewer is an authorized superadmin. Historical, stale,
missing, or invalid snapshots remain inspection-only.

## Control Design

Each actionable candidate shows three explicit controls: **Approve**,
**Reject**, and **Defer**. There is no implicit default and no decision is
submitted by opening the panel. Selecting an action presents a confirmation
containing the candidate ID and type, selected decision, current decision if
one exists, and package artifact ID being acted against.

One optional free-text rationale field is shared by the three actions. It is
cleared after a successful action and retained after a recoverable submission
failure so the reviewer can inspect and retry. The UI must not optimistically
move a candidate or invent an event while a request is pending. Disable only
the submitting candidate's controls during that submission and prevent double
submission of the same intent.

Changing an existing decision is allowed through the same controls. The
confirmation must state that this creates a new immutable event superseding
the current decision; it never edits or deletes history.

## Rationale Policy

Rationale is **optional for the reviewer in the first UI**. This keeps the
smallest single-candidate workflow usable while still allowing useful context.

The implemented action contract requires a non-empty `rationale`. Therefore a
future transport adapter must normalize a blank or whitespace-only UI field to
the explicit audit value `No rationale provided by reviewer.` before invoking
the contract. A supplied rationale is trimmed and preserved without semantic
rewriting. This is transport shaping only: Phase 8D-12 does not change the
contract, and the fallback must never claim that the reviewer supplied text.

## Submission Contract

Phase 8D-13 selects one same-origin superadmin Admin API route as the initial
transport. The browser submits only this untrusted intent payload:

```ts
type CandidateReviewActionClientPayload = {
  siteVersionId: string;
  candidateId: string;
  actionType: "approve" | "reject" | "defer";
  rationale?: string;
  candidateDiscoveryArtifactId: string;
  candidateReviewPackageArtifactId: string;
};
```

The browser supplies the selected `actionType`, the exact candidate and
artifact target rendered by the page, and the optional rationale input. It must
not submit `actionId`, actor identity or role, `requestedAt`, `dryRunId`, a
supersession target, package/candidate bodies, or generated/execution fields.
The server resolves actor context, trusted time, dry-run lineage, current head,
and canonical action identity, and normalizes blank rationale as above.

`candidateReviewPackageArtifactId` is the package-wide optimistic concurrency
token. The server derives a deterministic `actionId` from the normalized intent,
authenticated actor, and exact base artifact. Exact network retries therefore
retain one identity; a changed action, target, rationale, actor, or reviewed base
derives a different identity.

The full transport, replay timestamp, validation, response, error, and security
rules are defined in `CANDIDATE_REVIEW_ACTION_API_DESIGN.md` without weakening
the existing action contract or application semantics.

## Submission Flow

```text
latest valid Candidate Review page projection
  -> choose one candidate action and optional rationale
  -> confirm exact candidate, decision, and base artifact
  -> authenticated server boundary shapes canonical payload
  -> existing action application boundary
  -> accepted result, exact replay, stale conflict, or other failure
  -> canonical latest-package reload when required
```

The UI should distinguish pending, succeeded, exact-replay succeeded, stale,
idempotency conflict, unauthorized, validation failure, and unexpected failure.
It must not treat a locally completed HTTP request as proof until the canonical
latest package projection confirms the authoritative state.

## Concurrency UX

When the package is stale, the UI must:

1. show an explicit stale-package error explaining that another action changed
   the Review Package;
2. reload the latest `CandidateReviewPackage` through the canonical loader;
3. show the refreshed current decision and history; and
4. require the reviewer to inspect the new state and deliberately submit a new
   action with a new `actionId` and latest package artifact ID.

The UI must not auto-rebase, auto-resubmit, preserve an old confirmation as
current, or silently convert stale intent into a superseding decision.

## Idempotency UX

An exact retry with the same `actionId` and identical semantics is a successful
safe replay. The UI displays the original accepted outcome, then reloads the
canonical latest package; it does not show or count a second event.

Reuse of an `actionId` with different semantics is an idempotency conflict.
The UI shows a non-success error, performs no automatic retry, and does not
generate a replacement ID for the conflicting intent behind the reviewer's
back. A deliberate corrected submission begins only after review and receives
a new action ID.

## Post-Action UX

After a successful application or exact replay, the UI must reload the latest
Candidate Review Package and its linked projection from the canonical loader.
The reloaded projection, not local optimistic state, must:

- update the latest decision and derived counts;
- move the candidate into the approved, rejected, or deferred group;
- keep unreviewed grouping accurate;
- show the new current event and any supersession relationship; and
- preserve every earlier event in visible immutable history.

The success message may identify the accepted action and resulting package
artifact. If refresh fails, show that the action response was received but the
authoritative display could not be refreshed; do not guess the resulting
decision or offer reconstruction/publishing handoff.

## Safety Constraints

The first action UI must expose no:

- reconstruction, Structure Planning, or reconstruction handoff control;
- AI prompt, AI action, or model control;
- publish or deployment control;
- generated output, React, block, CMS binding, or content-generation control;
- candidate content edit, inline correction, or mutation control;
- batch, select-all, bulk decision, or multi-candidate submission control;
- tenant-admin, agency, customer, or public access; or
- hidden action triggered by page load, grouping, filtering, or refresh.

Approval remains a review decision only. The UI must not label it as built,
generated, reconstructed, deployed, or published.

## First Implementation Scope

The smallest safe future implementation is:

- superadmin-only authorization using the existing server-side guard;
- controls on the existing Candidate Review admin page;
- one action for one exact candidate per submission;
- Approve, Reject, and Defer only;
- optional reviewer rationale with the explicit contract-compatible fallback;
- canonical action identity, exact target lineage, and package CAS token;
- explicit stale and idempotency-conflict states;
- canonical latest-package refresh after success, replay, or stale conflict;
- preserved immutable history visibility;
- no batch action;
- no tenant, agency, customer, or public access; and
- no reconstruction handoff, AI, generated output, or publishing control.

## Phase 8D-12 Exit State

Phase 8D-12 defines where and how the first Candidate Review Action controls
should appear, the payload they must produce, and the required stale, replay,
conflict, refresh, audit, and safety behavior. Phase 8D-13 now defines the
server-side Admin API boundary that will receive that payload. Neither phase
implements the UI or transport.

Recommend exactly one next boundary: **Phase 8D-14 - Candidate Review Action
API/Server Action Implementation**, limited to the designed Admin API route,
its adapter, and focused tests.

## Phase 8D-15 Exit State

Phase 8D-15 adds Approve, Reject, and Defer controls with an optional rationale
to every reviewed and unreviewed candidate card on the existing superadmin
Candidate Review page. Each submission targets exactly one candidate and sends
only `siteVersionId`, `candidateId`, `actionType`, `rationale`,
`candidateDiscoveryArtifactId`, and `candidateReviewPackageArtifactId` to the
existing Admin API.

Success displays action result metadata and refreshes the canonical server
projection so counts and candidate groups update. A stale-package response
shows an explicit stale message and refreshes the latest package without
rebasing or resubmitting the old intent. Other failures display only the safe
error metadata returned by the API.

Focused UI and transport tests pass `10 / 10`, and the platform Vercel build
passes. The UI adds no batch, tenant/customer, edit, AI, reconstruction,
generated-output, or publishing controls.

Recommend exactly one next boundary: **Phase 8D-16 - Candidate Review Action
End-to-End Verification**, limited to verifying the implemented single-action
UI and canonical package refresh behavior.

## Phase 8D-16 Verification

Phase 8D-16 verified the implemented action and canonical refresh path against
the real ODV and ViroiDoc targets. Each projection now contains one approved
route, one deferred navigation candidate, one rejected section candidate, and
the correct remaining unreviewed candidates (`1` ODV, `2` ViroiDoc). Both
projections are valid, `ready`, and point to the authoritative latest package.

The six actions created six immutable events and six new immutable package
snapshots. Prior snapshots remain unchanged and loadable. Detailed evidence is
in `CANDIDATE_REVIEW_ACTION_E2E_VERIFICATION.md`.

Recommend exactly one next boundary: **Phase 8D-17 - Post-Review Action
Boundary Reassessment**, documentation and read-only analysis only.

## Phase 8D-17 Operator UI Simplification

Phase 8D-17 keeps the implemented single-candidate action transport and
behavior unchanged while simplifying the surrounding page presentation. The
default operator view shows review progress, four decision counts, four
candidate groups, readable candidate names, current decision, reviewed
rationale, optional rationale, and Approve/Reject/Defer controls.

Raw candidate IDs, package and Discovery artifact refs, event IDs, validation
details, diagnostics, raw lineage, and supersession internals remain available
inside collapsed `Technical details` disclosures. Successful action feedback
uses operator language and relies on canonical refresh for the updated state;
event and package IDs remain audit details rather than prominent success copy.

The payload remains exactly the existing six-field payload, and success,
stale-package, error, and refresh behavior are unchanged. The UI remains
superadmin-only and one-candidate-at-a-time, with no AI, reconstruction,
publishing, batch, tenant/customer, edit, or generated-output controls.

Recommend exactly one next boundary: **Phase 8D-18 - Candidate Review Operator
UI End-to-End Verification**, limited to authenticated visual and interaction
verification of the simplified page against the existing real review data.
