# ChaiBuilder Dependency Inventory & Decoupling Map

## 1. Executive Summary
- ChaiBuilder is **still runtime-critical** because public request handling can fall back to builder-backed data (`public.builder_pages`) when artifact resolution misses.
- ChaiBuilder package code (`@chaibuilder/next`, `@gnr8/chai-renderer`, `packages/chai-renderer/*`) appears **editor/legacy-oriented and currently not imported by runtime code paths**.
- Safe removal is **not near-term ready** without first removing runtime fallback to `builder_pages` and validating no live dependency on builder API routes.
- Biggest blockers:
  - Production default mode currently enables `artifact-with-builder-fallback`.
  - Runtime fallback queries `public.builder_pages`.
  - Builder API routes still expose read/write access to `public.builder_pages` and may be externally consumed.

## 2. Package-Level Dependency Inventory

| Package | Declared In | Likely Purpose | Classification |
|---|---|---|---|
| `@chaibuilder/next` | `apps/platform/package.json` | ChaiBuilder runtime/types dependency for renderer package compatibility | UNKNOWN_REVIEW_REQUIRED |
| `@gnr8/chai-renderer` | `apps/platform/package.json` | Local workspace adapter/registry package around ChaiBuilder blocks/fonts/page types | LEGACY_UNUSED |
| `@chaibuilder/next` (peer) | `packages/chai-renderer/package.json` | Peer required by `@gnr8/chai-renderer` implementation | LEGACY_UNUSED |
| `next`, `react`, `react-dom` (peers/dev in `packages/chai-renderer`) | `packages/chai-renderer/package.json` | Build/runtime peer surface for chai-renderer package | SHARED_UTILITY |

Notes:
- No direct imports of `@gnr8/chai-renderer` were found in app/runtime code.
- Lockfile contains `@chaibuilder/next` entries, but lockfile alone is not runtime evidence.

## 3. Direct Code Reference Inventory

### Runtime/Public Serving
- `apps/platform/src/public-site/public-runtime-render.tsx`
  - `Gnr8PublicRuntimeMode = "artifact-only" | "artifact-with-builder-fallback"`
  - `renderBuilderFallback(...)` dynamically imports `@/src/public-site/public-pages`
  - classification: `RUNTIME_CRITICAL`
- `apps/platform/src/public-site/public-pages.ts`
  - SQL query from `public.builder_pages`
  - classification: `RUNTIME_CRITICAL`
- `apps/platform/app/route.ts`
  - uses `renderPublicPathResponse` for root public request handling
  - classification: `RUNTIME_CRITICAL`
- `apps/platform/app/(public)/[[...slug]]/route.ts`
  - uses `renderPublicPathResponse` for catch-all public routes
  - classification: `RUNTIME_CRITICAL`

### Builder API Surface
- `apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts`
  - reads/writes `public.builder_pages`, uses `BUILDER_INTERNAL_API_KEY`
  - classification: `UNKNOWN_REVIEW_REQUIRED`
- `apps/platform/app/api/builder/orgs/[orgId]/pages/[slug]/route.ts`
  - reads `public.builder_pages`, uses `BUILDER_INTERNAL_API_KEY`
  - classification: `UNKNOWN_REVIEW_REQUIRED`

### Chai Package Implementation
- `packages/chai-renderer/index.ts`
- `packages/chai-renderer/blocks/index.ts`
- `packages/chai-renderer/blocks/hello-world.tsx`
- `packages/chai-renderer/fonts/index.ts`
- `packages/chai-renderer/page-types/index.ts`
- `packages/chai-renderer/page-types/blog.ts`
  - imports from `@chaibuilder/next/runtime` and `@chaibuilder/next/types`
  - classification: `LEGACY_UNUSED` (no importers found)

### Shared/Ambiguous Coupling Traces
- `apps/platform/middleware.ts`
  - allows CORS origin `https://builder.pasadenagenerator.com`
  - classification: `SHARED_UTILITY`
- `apps/platform/src/auth/require-actor-user-id.ts`
  - shared cookie domain comments/reference for `builder.*`
  - classification: `SHARED_UTILITY`
- `apps/platform/src/supabase/browser.ts`
  - shared cookie domain comment/reference for `builder.*`
  - classification: `SHARED_UTILITY`
- `apps/platform/gnr8/runtime/internal-ingress-smoke.cli.ts`
  - forbidden builder marker defaults (`@chaibuilder`, `data-chai-`, etc.)
  - classification: `SHARED_UTILITY`

## 4. Runtime Dependency Map

| Dependency | Exact Files | Why Runtime-Critical / Not | Replacement Status | Removal Difficulty |
|---|---|---|---|---|
| Builder fallback mode + execution | `apps/platform/src/public-site/public-runtime-render.tsx` | Public runtime can serve builder fallback HTML when artifact misses; production default currently enables fallback | Partial replacement exists (`artifact-only` mode + artifact runtime), but fallback still active by default in production | HIGH |
| Builder page data source | `apps/platform/src/public-site/public-pages.ts` | Fallback reads `public.builder_pages`; removing breaks fallback responses | Artifact-first store exists for canonical runtime, but fallback still depends on builder table | HIGH |
| Public route wiring to fallback-capable renderer | `apps/platform/app/route.ts`, `apps/platform/app/(public)/[[...slug]]/route.ts` | All public GET traffic goes through renderer that can invoke builder fallback | Same renderer can run artifact-only, but route wiring currently includes fallback path | HIGH |
| Builder-specific ingress smoke marker checks | `apps/platform/gnr8/runtime/internal-ingress-smoke.cli.ts` | Not serving traffic itself; test/diagnostic only | Already optional diagnostic | LOW |

## 5. Editor / Preview Dependency Map

| Area | Files | Evidence | Classification |
|---|---|---|---|
| Builder org pages API | `apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts`, `apps/platform/app/api/builder/orgs/[orgId]/pages/[slug]/route.ts` | Explicit builder namespace routes + internal key + builder table reads/writes | EDITOR_ONLY (with external-use uncertainty) |
| Chai renderer package internals | `packages/chai-renderer/*` | Chai block/font/page-type registration utilities | EDITOR_ONLY / LEGACY_UNUSED |
| Validation preview system | `apps/platform/app/validation/*`, `apps/platform/gnr8/migration/temporary-preview-hosting.ts` and related | Preview exists, but it is migration/validation preview and not ChaiBuilder-specific | SHARED_UTILITY |

Note:
- No direct import of `@gnr8/chai-renderer` was found in `apps/platform` runtime/editor code.

## 6. Publish / Build Dependency Map

| Path | Files | ChaiBuilder Coupling | Classification |
|---|---|---|---|
| Runtime publish activation | `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts` | No ChaiBuilder imports; artifact build + governance path is canonical runtime | SHARED_UTILITY |
| Artifact build | `apps/platform/gnr8/runtime/artifact-builder.ts` | No ChaiBuilder imports; deterministic artifact generation | SHARED_UTILITY |
| Runtime version preview | `apps/platform/gnr8/runtime/unified-render-preview.ts`, `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/preview/route.ts` | No ChaiBuilder imports; preview from deterministic artifact bundle | SHARED_UTILITY |
| Legacy page publish API (non-runtime-canonical) | `apps/platform/app/api/gnr8/pages/publish/route.ts`, `apps/platform/gnr8/core/page-storage.ts` | No direct ChaiBuilder package dependency, but separate page store path exists | UNKNOWN_REVIEW_REQUIRED |

Conclusion for publish/build:
- Current artifact-first publish/build path is largely decoupled from ChaiBuilder packages.
- Main remaining coupling is in **public serving fallback**, not artifact publish machinery.

## 7. Shared Utility / Ambiguous Dependency Map

| File | Why Ambiguous/Shared | Classification |
|---|---|---|
| `apps/platform/middleware.ts` | Builder origin appears in API CORS allowlist; may still be required for cross-subdomain ops | UNKNOWN_REVIEW_REQUIRED |
| `apps/platform/src/auth/require-actor-user-id.ts` | Shared cookie-domain behavior references `builder.*`; could be generic multi-subdomain auth | SHARED_UTILITY |
| `apps/platform/src/supabase/browser.ts` | Same cookie-domain sharing for `app.*` and `builder.*` | SHARED_UTILITY |
| `apps/platform/gnr8/runtime/internal-ingress-smoke.cli.ts` | Builder marker denylist is a safety assertion, not functional dependency | SHARED_UTILITY |
| `apps/platform/app/api/pages/route.ts` | Placeholder comments mention builder/internal action; endpoint currently 501 stub | LEGACY_UNUSED |

## 8. Dead / Legacy Candidate Map

Candidates below are **not removed**, only flagged for follow-up:

1. `packages/chai-renderer/*`
- Evidence: no importers found for `@gnr8/chai-renderer`; package appears isolated.
- classification: `LEGACY_UNUSED`

2. `apps/platform/package.json` dependency `@gnr8/chai-renderer`
- Evidence: workspace dependency present, no code imports found.
- classification: `LEGACY_UNUSED`

3. `apps/platform/app/api/pages/route.ts`
- Evidence: placeholder 501 route with comments referencing builder-era wiring.
- classification: `LEGACY_UNUSED`

4. `apps/platform/gnr8/runtime/internal-ingress-smoke.cli.ts` builder marker defaults
- Evidence: diagnostic-only string checks, not runtime serving path.
- classification: `LEGACY_UNUSED` (low-impact cleanup candidate later)

## 9. Blockers to Removal

1. Public runtime still includes builder fallback behavior.
- `apps/platform/src/public-site/public-runtime-render.tsx`
- Production default path resolves to `artifact-with-builder-fallback` unless env overrides.

2. Runtime fallback data still depends on builder table.
- `apps/platform/src/public-site/public-pages.ts`
- Direct query to `public.builder_pages`.

3. Builder API endpoints still exist and mutate/read builder table.
- `apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts`
- `apps/platform/app/api/builder/orgs/[orgId]/pages/[slug]/route.ts`
- Potential external caller dependency remains unknown.

4. Package-level Chai dependency still declared.
- `apps/platform/package.json` (`@chaibuilder/next`, `@gnr8/chai-renderer`)
- `packages/chai-renderer/package.json` peer dependency on `@chaibuilder/next`.

## 10. Recommended Decoupling Sequence

### Stage 1 — Inventory Lock + Usage Telemetry Freeze
- Freeze this inventory as source-of-truth.
- Add/verify runtime metrics around fallback-hit rate before code removal.

### Stage 2 — Runtime Fallback Decoupling (Critical Path)
- Switch serving to deterministic `artifact-only` path in controlled rollout.
- Remove dependence on `public.builder_pages` for public request handling.

### Stage 3 — Builder API Isolation
- Determine if `/api/builder/orgs/...` is externally consumed.
- If consumed, gate/deprecate; if not consumed, mark for removal.

### Stage 4 — Package Decoupling
- Remove `@gnr8/chai-renderer` usage/declaration after confirming no dynamic consumers.
- Remove `@chaibuilder/next` once chai-renderer package and any implicit consumers are gone.

### Stage 5 — Shared Surface Cleanup
- Clean builder-specific CORS/auth naming only after runtime/editor decoupling complete.
- Keep shared cookie behavior if still needed for non-builder subdomain sharing.

### Stage 6 — Legacy Purge
- Remove dead package/files/routes validated in earlier stages.
- Regenerate lockfile and run full runtime + publish + preview validation suite.

## 11. Safe First Removal Candidates

(For future cleanup tasks; not executed now)

1. `apps/platform/app/api/pages/route.ts`
- 501 placeholder route, not wired to active functionality.
- Risk: LOW.

2. `apps/platform/package.json` -> `@gnr8/chai-renderer`
- No importers found in repo; candidate once final confirmation is done.
- Risk: LOW.

3. `packages/chai-renderer/*`
- Isolated package with no in-repo import chain.
- Risk: LOW to MEDIUM (depends on external consumer verification).

4. Builder marker list in `apps/platform/gnr8/runtime/internal-ingress-smoke.cli.ts`
- Diagnostic only; can be adjusted late without affecting serving behavior.
- Risk: LOW.

## 12. High-Risk Removal Zones

1. `apps/platform/src/public-site/public-runtime-render.tsx`
- Directly in public request serving path; incorrect edits cause immediate traffic impact.

2. `apps/platform/src/public-site/public-pages.ts`
- Current fallback data source; removal before fallback cutover breaks fallback serving.

3. `apps/platform/app/route.ts` and `apps/platform/app/(public)/[[...slug]]/route.ts`
- Entry points for public runtime request handling.

4. `apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts` and `[slug]/route.ts`
- Potentially externally consumed by builder workflows; unknown blast radius.

5. Any package/dependency removal before Stage 2 fallback cutover
- Can create hidden runtime regressions if undeclared implicit usage remains.

## 13. Final Recommendation

**Primary next move: runtime decoupling next**.

Rationale:
- Artifact-first publish/build is already mostly independent.
- The major hard blocker is still the public runtime fallback into builder data.
- Removing packages before runtime fallback removal is higher-risk and lower-value.

---

## Appendix A — Search Commands Used

```bash
rg --files -g '**/package.json'
rg -n -S --glob '!**/.next/**' --glob '!**/node_modules/**' --glob '!**/tsconfig.tsbuildinfo' "@chaibuilder/next|@gnr8/chai-renderer|chai-renderer|chaibuilder|data-chai|data-builder|builder_pages|artifact-with-builder-fallback|api/builder|BUILDER_INTERNAL_API_KEY|NEXT_PUBLIC_DEFAULT_ORG_ID|builder\.pasadenagenerator" apps/platform packages
rg -n -S "builder_pages" apps/platform packages
rg -n -S --glob '!**/.next/**' --glob '!**/node_modules/**' "GNR8_PUBLIC_RUNTIME_MODE|artifact-with-builder-fallback|artifact-only" apps/platform
rg -n -S "registerChai|ChaiPageType|registerChaiBlock|registerChaiFont|@chaibuilder/next/runtime|@chaibuilder/next/types" apps/platform packages
```

## Appendix B — Classification Legend
- `RUNTIME_CRITICAL`: Affects active public/runtime serving behavior.
- `EDITOR_ONLY`: Related to builder/editor APIs and workflows, not public serving.
- `SHARED_UTILITY`: Generic/shared infra that may mention builder but is not builder-exclusive.
- `LEGACY_UNUSED`: No active importer/usage evidence found in repo.
- `UNKNOWN_REVIEW_REQUIRED`: Potential dependency exists, but usage context needs validation.
