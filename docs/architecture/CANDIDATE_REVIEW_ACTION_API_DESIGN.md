# Candidate Review Action API Design

## Phase And Boundary

Phase 8D-13 designed the official server-side boundary between the future
Candidate Review action UI and the existing
`applyCandidateReviewAction(...)` application helper. Phase 8D-14 implements
that design as one server-side Admin API endpoint and focused route tests.

The implementation is limited to the API adapter, authentication,
same-origin JSON request validation, authoritative artifact resolution,
existing-helper application and immutable persistence, canonical reload, and
metadata-only responses. It adds no Server Action, UI control, reconstruction,
AI, generated output, publishing, schema, migration, or worker behavior.

## Decision

Use **B. one Admin API route** as the initial boundary.

The implemented route is a same-origin JSON `POST` under the existing GNR8
admin namespace:

```text
POST /api/gnr8/admin/candidate-review/actions
```

The exact source path is an 8D-14 implementation detail. There must be one
transport path, not an API route plus a Server Action wrapper.

### Options Assessed

| Option | Security and session behavior | Testability and auditability | UI and repository fit | Decision |
|---|---|---|---|---|
| A. Next.js Server Action | Same-origin and framework-integrated, but still requires explicit superadmin authorization, strict input parsing, and trusted server fields. Its transport is coupled to the page and framework action protocol. | Unit testing is possible, but HTTP status/error contracts and independent route-level tests are less explicit. | Convenient for a colocated form, but less reusable for an action panel that needs structured stale/replay responses. | Not initial. |
| B. Admin API route | Reuses the existing authenticated admin route pattern. Cookie session plus explicit origin checks, JSON-only POST, and the superadmin guard provide a clear fail-closed boundary. | Supports direct handler tests, explicit status/error mapping, structured diagnostics, and clear request/audit logging without UI coupling. | Matches existing `/api/gnr8/admin/**` mutation patterns and can be called by the future Candidate Review page. | **Recommended.** |
| C. Both | Creates two public application entrypoints that must remain behaviorally and security equivalent. | Duplicates authorization, validation, error mapping, CSRF, and audit coverage or introduces a wrapper whose value is unclear. | Adds unnecessary integration surface for one admin UI. | Rejected initially. |

An API route does not make cookie authentication automatically CSRF-safe. The
future implementation must require a same-origin `Origin` matching the trusted
request host, reject missing or mismatched browser origins, accept only
`application/json`, rely on secure `SameSite` session cookies, and perform no
mutation on `GET`. Authorization is always re-established server-side.

## Minimal Client Payload

The browser submits only the review intent and the immutable identities it
rendered:

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

All keys are required except `rationale`. A blank or whitespace-only rationale
is normalized to `No rationale provided by reviewer.`; supplied text is
trimmed but not semantically rewritten. The transport must enforce a bounded
length selected in 8D-14 before invoking the existing non-empty contract.

The parser is exact and rejects unknown keys recursively. In particular, the
client must not submit `actionId`, `actor`, `actorRef`, `actorRole`,
`requestedAt`, `dryRunId`, decision timestamps, supersession IDs, package
bodies, candidate bodies, evidence, generated output, execution,
reconstruction, AI, worker, or publishing fields.

### Dry Run Identity

`dryRunId` is **server-resolved**, not client-sent. The exact Review Package
and linked Candidate Discovery result already carry it. The server requires
those values to agree and copies the validated value into the application
request. This removes a redundant caller-selected lineage field without
weakening the exact Discovery and package artifact binding.

## Server-Resolved Fields

The server resolves and trusts only server-side values for:

| Field | Resolution |
|---|---|
| `actorRef` | Stable user ID returned by the existing superadmin session guard. Never email, display name, or request input. |
| `actorRole` | Literal `superadmin` after successful authorization. |
| `requestedAt` | Trusted server clock on first receipt; the original stored trusted time on exact replay. |
| `actionId` | Deterministic server-generated idempotency identity described below. |
| `dryRunId` | Matching value from the validated latest Review Package and linked Discovery result. |
| latest Review Package | Canonical latest loader for the submitted site version and exact Discovery artifact; no client package body is accepted. |
| linked Discovery result | Exact immutable artifact named by `candidateDiscoveryArtifactId`, loaded from persisted site-version provenance. |
| `decision` | Existing contract mapping from `approve`, `reject`, or `defer`. |
| supersession head and counts | Derived by the existing application helper from authoritative immutable history. |

`siteVersionId`, `candidateId`, and the two artifact IDs remain untrusted
selectors and concurrency claims. Loading them does not establish authority;
every relationship is validated before application.

## Action ID And Idempotency

Choose **B. a deterministic idempotency key from the submitted intent**, but
generate it on the server. Do not accept a client-provided `actionId`.

The future adapter should canonicalize a versioned fingerprint containing:

```text
contract version
+ authenticated actorRef
+ siteVersionId
+ candidateDiscoveryArtifactId
+ candidateReviewPackageArtifactId
+ candidateId
+ actionType
+ normalized rationale
```

It then hashes the length-delimited canonical encoding with SHA-256 and derives
an opaque action ID such as `candidate-review-action:v1:<digest>`. Do not hash
ad hoc joined strings. `actorRole` is fixed by authorization. `requestedAt`
and server-loaded package content are excluded so network retries derive the
same identity.

On the first accepted attempt, `requestedAt` comes from the trusted server
clock. If immutable history already contains the derived event ID, the adapter
recovers that event's trusted `decidedAt` and uses it as `requestedAt` when
reconstructing the canonical request for the existing helper. This preserves
the helper's exact semantic replay check. Matching semantics return the
original event and resulting artifact without a write. A collision or any
semantic disagreement returns `IDEMPOTENCY_CONFLICT`.

The expected Review Package artifact participates in the fingerprint. After a
successful action advances latest, a deliberate action based on the refreshed
package receives a different action ID. Two concurrent identical submissions
from the same rendered package are one intent; differing action, rationale,
candidate, actor, or base package is a different intent.

Random server UUIDs would make transport retries indistinguishable from new
submissions. Client-provided IDs would expose a trusted audit identity to
caller choice. Both are rejected for the initial boundary.

## Validation And Application Flow

The future route must perform this ordered fail-closed flow:

1. Require an authenticated session. Return `UNAUTHORIZED` without disclosing
   review state when no valid subject exists.
2. Require the existing superadmin authorization. Return `FORBIDDEN` for an
   authenticated subject outside that role; tenant, agency, customer, and
   public users are never eligible.
3. Enforce same-origin JSON POST and strictly parse the exact client payload.
   Reject unknown or forbidden fields before any artifact load or write.
4. Validate basic IDs, `actionType`, and rationale shape. Normalize rationale
   only according to the documented fallback and length rule.
5. Load the exact linked Candidate Discovery artifact for `siteVersionId` and
   `candidateDiscoveryArtifactId`; validate its contract and confirm the exact
   `candidateId` exists.
6. Load the authoritative latest valid `CandidateReviewPackage` for that
   Discovery artifact. Never accept a package body from the client.
7. Validate package/Discovery lineage, including matching site version,
   Discovery artifact, and server-resolved `dryRunId`.
8. Resolve actor context and deterministic `actionId`. If immutable history
   already contains that event identity, recover its original trusted time so
   the application helper can classify exact replay versus conflict. Otherwise
   resolve `requestedAt` from the trusted server clock.
9. Unless immutable history contains a potentially exact replay, compare the
   submitted `candidateReviewPackageArtifactId` with the authoritative latest
   pointer. If it differs, fail `STALE_REVIEW_PACKAGE`; do not auto-rebase or
   silently retry against the new package.
10. Build the canonical `CandidateReviewActionRequest` using client intent plus
    only server-resolved trusted fields.
11. Validate the request with the existing action contract against the loaded
    package and linked Discovery result.
12. Invoke only `applyCandidateReviewAction(...)`, with the existing contract
    version and persistence boundary. Do not reproduce event creation, count
    derivation, append, replay, or compare-and-set logic in the route.
13. Map application diagnostics to the closed transport error-code set. A
    concurrent compare-and-set loss is `STALE_REVIEW_PACKAGE`; no auto-rebase.
14. Reload the canonical latest Review Package. On success or exact replay,
    confirm the resulting artifact is authoritative and derive response counts
    from that validated package.
15. Return a metadata-only success or error envelope. Never return package
    bodies, Discovery candidates, evidence, generated output, secrets, session
    data, stack traces, database details, or publishing/execution material.

No failure may create an authoritative event or partially advance the latest
pointer. Logging may record action ID, actor ID, target IDs, result code, and
resulting artifact ID, but must not log cookies, tokens, secrets, full package
bodies, or rationale text by default.

## Response Contract

### Success

HTTP `200` returns:

```ts
type CandidateReviewActionSuccessResponse = {
  ok: true;
  actionId: string;
  candidateId: string;
  decision: "approved" | "rejected" | "deferred";
  reviewEventId: string;
  candidateReviewPackageArtifactId: string;
  counts: {
    reviewedCandidateCount: number;
    approvedCount: number;
    rejectedCount: number;
    deferredCount: number;
  };
  diagnostics: string[];
};
```

An exact replay returns the same action, event, resulting artifact, and counts.
A stable diagnostic may identify the replay, but no extra package data is
returned. The UI reloads the canonical page projection after success.

### Error

Errors return:

```ts
type CandidateReviewActionErrorResponse = {
  ok: false;
  errorCode:
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "INVALID_ACTION_TYPE"
    | "MISSING_CANDIDATE"
    | "STALE_REVIEW_PACKAGE"
    | "INVALID_LINEAGE"
    | "VALIDATION_FAILED"
    | "IDEMPOTENCY_CONFLICT"
    | "PERSISTENCE_FAILED"
    | "UNKNOWN_ERROR";
  message: string;
  diagnostics: string[];
};
```

Messages are safe operator summaries, not raw exceptions. Diagnostics use
stable, non-secret classifications. Unauthorized and forbidden responses do
not confirm whether a site version, artifact, package, or candidate exists.

## Error Classification

| Error code | Typical HTTP status | Meaning |
|---|---:|---|
| `UNAUTHORIZED` | 401 | No valid authenticated session. |
| `FORBIDDEN` | 403 | Authenticated subject is not an authorized superadmin, or the origin/content boundary is forbidden. |
| `INVALID_ACTION_TYPE` | 400 | Action is not exactly `approve`, `reject`, or `defer`. |
| `MISSING_CANDIDATE` | 404 | Exact candidate is absent from the exact linked Discovery artifact. |
| `STALE_REVIEW_PACKAGE` | 409 | Submitted package artifact is not latest, including a concurrent CAS loss. |
| `INVALID_LINEAGE` | 409 | Site version, Discovery artifact, Review Package, dry run, or event lineage disagrees. |
| `VALIDATION_FAILED` | 422 | Exact payload, contract, package, or derived-package validation failed, including forbidden fields. |
| `IDEMPOTENCY_CONFLICT` | 409 | Derived action/event identity exists but canonical semantics do not match. |
| `PERSISTENCE_FAILED` | 500 | The existing persistence boundary could not establish the append and latest-pointer result. |
| `UNKNOWN_ERROR` | 500 | Unclassified failure after safe server-side logging. |

The implementation may internally distinguish missing artifacts from invalid
artifacts, but it must map them into this closed public set without leaking
unauthorized state. `UNKNOWN_ERROR` is a last resort, not a substitute for
mapping known application diagnostics.

## Stale Package Behavior

The submitted `candidateReviewPackageArtifactId` is the package-wide compare
token. Any mismatch with the latest pointer fails before a new application. A
compare-and-set loss during persistence fails identically.

There is no automatic rebase, merge, last-writer-wins application, or retry
against the new package. The error response contains no replacement package
body. The UI reloads the latest canonical package, displays current decision
and immutable history, and requires a fresh deliberate submission based on the
new artifact.

The sole exception to stale classification is an already-committed action with
the same deterministic identity. The existing helper compares its complete
canonical semantics against immutable history: an exact replay returns the
original result without a write, while any disagreement is
`IDEMPOTENCY_CONFLICT` rather than a rebase.

## Security Constraints

The initial boundary is constrained to:

- authenticated superadmin only through the existing server-side guard;
- actor identity and role from session authorization only;
- trusted first-receipt timestamp from the server clock only;
- deterministic action identity generated by the server only;
- same-origin, JSON-only POST with strict content type and origin validation;
- exact allowlisted payload keys, bounded strings, and request-size limits;
- exact immutable artifact lineage and package-level optimistic concurrency;
- the existing action contract, application helper, and persistence helper as
  the only mutation path;
- metadata-only responses and redacted operational logging;
- no tenant, agency, customer, or public access;
- no AI, reconstruction, generated output, worker, execution, publishing,
  deployment, CMS, evidence mutation, or source-content fields or behavior.

The boundary must reject forbidden fields rather than ignore or sanitize them.
Approval remains a review decision only and grants no direct execution or
publishing authority.

## Implementation Tests

Phase 8D-14 adds focused handler tests for:

- unauthenticated submission returns `UNAUTHORIZED` and leaks no review state;
- authenticated non-superadmin submission returns `FORBIDDEN`;
- approve succeeds with server actor/time/ID and correct metadata;
- reject succeeds and maps to `rejected`;
- defer succeeds and maps to `deferred`;
- stale package is rejected without write or automatic rebase;
- invalid or missing candidate is rejected without write;
- invalid Discovery/package/dry-run lineage is rejected;
- exact deterministic replay returns the original event and artifact without a
  second package snapshot;
- conflicting deterministic identity use returns `IDEMPOTENCY_CONFLICT`;
- actor, timestamp, action ID, dry run, supersession, generated, execution,
  reconstruction, AI, and publishing fields are rejected when client-sent;
- concurrent latest-pointer change maps to `STALE_REVIEW_PACKAGE`;
- persistence failure does not claim success;
- success and error responses contain no package body, Discovery result,
  evidence, generated output, secrets, or raw exception details;
- missing/mismatched origin and wrong content type are rejected; and
- canonical latest reload supplies the returned artifact and counts.

## Phase 8D-13 Exit State

Phase 8D-13 defines one official initial transport: a same-origin,
superadmin-only Admin API POST with a minimal strict client payload,
server-resolved actor/time/action identity/dry-run lineage, deterministic exact
replay, fail-closed package freshness, existing-helper-only application, and a
metadata-only response.

Phase 8D-13 changes documentation only. It implements no route, Server Action,
UI action, review execution, persistence behavior, Candidate Discovery or
Candidate Review behavior, Evidence Capture, Limited Dry Run, reconstruction,
AI, generated output, publishing, schema, migration, or worker behavior.

Recommend exactly one next boundary: **Phase 8D-14 - Candidate Review Action
API/Server Action Implementation**, limited to the designed Admin API route,
its adapter, and focused tests.

## Phase 8D-14 Exit State

Phase 8D-14 implements `POST /api/gnr8/admin/candidate-review/actions` with the
existing superadmin session guard, strict origin/content/payload validation,
server-derived actor/role/time/action identity/dry-run lineage, exact Discovery
and latest Review Package resolution, stale-package rejection, deterministic
replay, the existing action application and immutable persistence helper, and
a canonical latest-package reload before returning metadata-only results.

Focused route tests cover anonymous and non-superadmin access; approve, reject,
and defer success; stale package; missing candidate; invalid lineage;
deterministic replay; idempotency conflict; forbidden fields; invalid action;
origin; and content type. No UI, reconstruction, AI, generated output,
publishing, schema, migration, or worker behavior is added.

Recommend exactly one next boundary: **Phase 8D-15 - Candidate Review Action UI
Implementation**, limited to integrating the approved controls with this API.
