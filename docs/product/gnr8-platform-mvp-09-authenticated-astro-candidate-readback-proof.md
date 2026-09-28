# GNR8 Platform MVP 09 — Authenticated Astro Candidate Readback Proof

Date: 2026-09-27

Status: `proof_complete`

## Result

MVP 09 adds an import-safe, read-only service boundary and an unmounted GET-handler factory for persisted Astro preview candidates. The factory uses the existing `requireSuperadminUserId` guard by default, then requires an injected trusted site/version resolver, reads the MVP 08 repository with the exact candidate/site/version identity, and renders only that validated candidate through the existing unified preview selector.

No application route, UI link, database lookup, production storage adapter, migration, deployment, publish, promotion, registration, rebinding, or live-pointer behavior was added. Existing preview defaults remain unchanged.

## Boundary and ordering

The request order is fixed:

1. authenticate with the existing superadmin guard contract;
2. normalize URL selectors;
3. resolve trusted server-owned site/version scope for the authenticated actor;
4. require the resolver to confirm the requested version belongs to the requested site;
5. call the read-only repository dependency with the exact candidate, site, and version identity; and
6. pass the validated candidate to a request-scoped unified-preview loader with explicit Astro selection.

Candidate metadata is never used as authorization evidence. Missing or mismatched trusted scope and repository `missing`/`ownership_mismatch` outcomes all return the same non-enumerating 404. Corrupt, unsupported, storage-boundary, unexpected storage, scope, and rendering failures are sanitized. Unconfigured scope or storage dependencies fail closed.

The renderer now accepts optional request-scoped Astro loader and pool-status functions. Existing process-global defaults remain unchanged for every caller that does not supply them. The authenticated boundary supplies a closure containing only its already validated candidate, so concurrent requests do not mutate shared renderer dependencies.

## Responses

- Authentication failures: 401.
- Authenticated callers outside the existing superadmin policy: 403.
- Unavailable scope, candidate, or ownership mismatch: non-enumerating 404.
- Unconfigured proof composition: 503.
- Sanitized integrity, storage, trusted-lookup, or rendering failure: 500.
- Success and error responses: `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`; the handler does not add or disclose cookie values, paths, stacks, or owner metadata.
- HTML success: sandboxed CSP with `default-src 'none'`, `script-src 'none'`, no network-capable source, inline styles allowed, and data-only image/font/media sources. The unified renderer also disables authored scripts before return.

## Local Request/Response evidence

The explicitly invoked proof command was:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx gnr8/output-adapters/run-authenticated-astro-candidate-readback-proof.ts run
```

The proof created a real synthetic record in an isolated `LocalFilesystemAstroInternalPreviewCandidateRepository`, exposed only its `read` method to the service, and called the GET handler with real `Request`/`Response` objects. Authentication and trusted scope lookup were controlled stubs: they exercise the boundary and ordering but do not represent a real logged-in session or live database authorization.

| Evidence | Result |
| --- | --- |
| Denied request | 401; repository reads before success: 0 |
| Successful request | 200; `astro_internal_preview_candidate`; actual unified renderer |
| Verified content | `Authenticated Astro MVP 09 readback` and inline `--mvp09:#0f766e` |
| Repository activity | 1 read; 0 service writes |
| Stored bytes before/after | `0a06bd5ae04826516980312445b5b1102d1106092daa66d44e4d6a41d17898c6` / identical |
| Persisted storage hash | `049edb12f39e54fbe928899a6b22976705c87f832e8ab198999cecffe1569514` |
| Headers | no-store, nosniff, sandboxed CSP, scripts/network blocked, inline styles allowed |
| Cleanup | proof-owned storage root removed |

## Validation

- Focused authenticated handler suite: 18/18 checks passed.
- Repository, bridge, unified-preview, and handler regression command: 108/108 checks passed.
- Focused TypeScript no-emit validation passed using `apps/platform/next-env.d.ts` and the affected dependency graph.
- The local Request/Response proof passed after tests and cleaned its isolated resources.
- Final whitespace and diff checks are recorded in the session completion report.

Coverage includes unauthenticated and non-admin denial before repository access; valid readback; missing or mismatched scope; candidate ownership mismatch; missing, corrupt, unsupported, and failed storage; sanitized errors; immutable stored bytes; zero service writes; cache/security headers; fail-closed unconfigured composition; and concurrent different-owner isolation.

## Production wiring still required

A future task must provide and review all of the following before mounting this boundary:

- a production-capable immutable read-only candidate repository/storage adapter;
- a stateless server-side trusted scope resolver backed by authoritative site/version ownership data and the applicable access policy;
- an application route that composes those dependencies server-side without accepting identity headers or unsigned tokens;
- an authenticated admin-only link or surface; and
- operational retention, availability, monitoring, and deployment review.

This proof makes no production-authentication, production-storage, deployment, promotion, publish, or tenant-facing access claim.
