# GNR8 Platform MVP 16 — Default-Off Authenticated Astro Candidate Preview Route

Date: 2026-09-28

Status: `implementation_complete_local_injected_validation_only`

## Result

MVP 16 mounts a Node.js, force-dynamic, superadmin-only GET route at:

```text
/api/gnr8/admin/astro-candidates/[siteVersionId]/[candidateId]/preview
```

The route is default-off. Its server-only feature gate is
`GNR8_ADMIN_ASTRO_CANDIDATE_PREVIEW_ENABLED`, and the only enabled value is the
exact string `1`. This task documents that value but does not set it in any
environment or enable the route.

After the existing `requireSuperadminUserId` policy succeeds, the route checks
the gate, validates the exact URL selectors and root-only path, resolves current
ownership from `siteVersionId` through the MVP 14 authoritative resolver, reads
the exact enabled v2 candidate through the gateway-backed repository, and
renders it through a request-scoped loader containing only that validated
candidate. Missing `path` means `/`; duplicate, non-root, or additional query
selectors return the same non-enumerating 404.

No POST/write route, list page, Workspace link, access toggle, automatic/latest
selection, preview rebinding, registration call, or default-artifact fallback
was added.

## Ordering and failure boundary

The request order is fixed:

1. authenticate with `requireSuperadminUserId`;
2. check the default-off feature gate;
3. validate canonical `siteVersionId`, `candidateId`, and root path;
4. lazily construct server-owned resolver/repository/renderer dependencies;
5. resolve authoritative runtime-site, first-class site, organization, and
   agency scope from `siteVersionId`;
6. read and fully validate the exact enabled v2 record and its hashes, size,
   versions, lifecycle, access state, and complete ownership;
7. render with one request-scoped production-v2 candidate loader; and
8. require source `astro_internal_preview_candidate`, `fallbackUsed=false`, and
   exact candidate/runtime-site/site-version/path agreement.

Authentication failures are sanitized 401/403 responses. Invalid selectors,
missing or incomplete ownership, missing/disabled candidates, and ownership
mismatches are indistinguishable 404 responses. A disabled gate or explicitly
unavailable composition returns 503. Corrupt, oversized, unsupported,
transport, schema, resolver, or renderer failures return sanitized 500
responses. Payload HTML, SQL, filesystem paths, credentials, stacks, and other
owners' metadata are never included in an error response.

All responses use `no-store`, `nosniff`, `no-referrer`, a restrictive
Permissions-Policy, and same-origin resource policy. Successful HTML retains
the MVP 09 sandbox CSP: scripts, network connections, forms, frames, objects,
base overrides, and embedding ancestors are blocked; required inline CSS and
data-only image/font/media sources remain allowed.

## V2 renderer integration and preserved behavior

The unified renderer now has an explicit request-level candidate contract:
`proof_v1` remains the default, while this route alone requests
`production_v2`. The v2 mode runs the production candidate validator, including
the exact durable Supabase lifecycle and compatibility allowlists. It does not
relabel a production record as a proof record, widen the proof validator, or
accept an unknown lifecycle.

Existing preview routes, proof readers, MVP 09 authenticated proof readback,
process-global loader defaults, transformed/default artifact selection, and the
`html-static-artifact` fallback remain unchanged. Invalid explicit v2
selections never fall through to those defaults.

## Changed files

- `apps/platform/app/api/gnr8/admin/astro-candidates/[siteVersionId]/[candidateId]/preview/route.ts`
- `apps/platform/app/api/gnr8/admin/astro-candidates/[siteVersionId]/[candidateId]/preview/astro-candidate-preview-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/astro-candidates/[siteVersionId]/[candidateId]/preview/astro-candidate-preview-route-handlers.test.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-preview-feature-gate.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-preview-composition.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-record.ts`
- `apps/platform/gnr8/runtime/unified-render-preview.ts`
- this report

## Validation

All route tests use injected authentication, gate, ownership, repository, and
rendering dependencies; no network fallback is available in the test
composition. The successful case uses a real validated synthetic v2 record and
the actual unified renderer. These tests are not evidence of a real logged-in
session, hosted Supabase, applied migration, PostgREST/RPC behavior, or a
deployed route.

- Focused MVP 16 route suite: 30/30 assertions passed.
- V1/v2 record/repository, Supabase gateway, authoritative resolver, bridge,
  authenticated readback, and unified-preview regressions: 158/158 assertions
  passed.
- Focused TypeScript no-emit validation passed with `next-env.d.ts`, the route,
  test, composition, renderer, and imported dependency graph.
- Next.js route-export validation passed with 194 route files scanned.
- Final diff/whitespace checks are recorded in the session completion report.

Coverage includes absent/invalid/disabled gate values, authentication ordering,
zero downstream reads on denial, real v2 rendering, wrong/missing/incomplete
ownership, disabled/missing/corrupt/unsupported/oversized/unavailable
candidates, malformed identities, duplicate/unsupported paths and query
selectors, unavailable composition, renderer mismatch, unknown lifecycle,
security headers, no mounted writes/registration/access toggle, and concurrent
distinct-candidate isolation.

## Product behavior and boundaries

Product behavior changed: a new default-off authenticated GET route exists.
Existing previews and their defaults remain unchanged.

No feature enablement, environment-file/value change, credential inspection,
hosted authentication or Supabase execution, migration application, candidate
registration/write, producer execution, provider/DNS/billing/Airship call,
publish, shadow publish, rollback, deployment, or customer-data access occurred.

## Remaining hosted verification

Before enabling the gate, a separately authorized hosted verification must
confirm:

- the candidate-registry migration is applied and the expected RPCs are exposed
  through hosted PostgREST with the reviewed RLS/grants;
- deployed service-role and authentication configuration is present without
  disclosing credential values;
- a real logged-in allowlisted superadmin receives access while unauthenticated
  and non-superadmin callers are denied before ownership/candidate reads;
- real runtime-version, runtime-site, first-class site, organization, and agency
  links resolve consistently for the selected record;
- a real enabled v2 row passes hosted access-state, size, version, lifecycle,
  content-hash, storage-hash, and full-ownership validation;
- deployed responses preserve the documented no-store/security headers and
  sandbox CSP; and
- concurrent deployed requests remain isolated and produce zero writes.

The next bounded task is a superadmin metadata list with explicit Workspace
candidate links, gated by the same still-disabled feature. It must not introduce
automatic selection or preview rebinding.
