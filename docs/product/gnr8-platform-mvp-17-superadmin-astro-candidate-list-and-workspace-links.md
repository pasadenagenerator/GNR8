# GNR8 Platform MVP 17 — Superadmin Astro Candidate List And Workspace Links

Date: 2026-09-29

Status: `implementation_complete_local_injected_validation_only`

## Result

MVP 17 adds a force-dynamic, read-only superadmin page at:

```text
/gnr8/admin/astro-candidates/[siteVersionId]
```

The existing Workspace supporting-inspection area now adds one `Astro Candidates`
link for the current site version only when the existing
`GNR8_ADMIN_ASTRO_CANDIDATE_PREVIEW_ENABLED` gate is exactly `1`. The same gate
controls the list page. This task did not set or change that value.

The page authenticates with `requireSuperadminUserIdForPage()` before checking
the gate, awaiting route/search selectors, constructing storage dependencies,
resolving ownership, or listing metadata. A disabled gate returns an explicit
disabled state with zero ownership or repository reads. The Workspace gate check
does not fetch candidate metadata merely to decide whether to show its link.

## Read model and list behavior

The server-only composition creates one request-owned authoritative ownership
resolver and gateway-backed candidate repository. It exposes only
`resolveOwnership` and `listCandidateMetadata`; it does not expose or call full
candidate reads, registration, access mutation, producer, renderer, or payload
operations.

For enabled requests, the read model:

1. validates the canonical `siteVersionId` after auth and gate checks;
2. resolves current runtime-site, first-class site, organization, and agency
   ownership through the MVP 14 resolver;
3. validates an optional bounded cursor against that full current scope;
4. lists at most 25 payload-free metadata rows through the existing RPC and
   repository contract; and
5. emits a continuation cursor bound to the full resolved ownership scope and
   the existing `storedAt DESC, candidateId ASC` boundary.

Malformed cursors, extra selectors, and cursors from a changed ownership scope
do not reach metadata listing. No request-level result or metadata is stored in
a shared cache. The page exports `force-dynamic`, `revalidate = 0`, and
`fetchCache = "force-no-store"`.

The metadata gateway now preserves bounded, structurally valid future version
strings for list diagnostics. Full-record readback remains strict and continues
to reject unsupported records. This lets an unsupported metadata row be shown
without certifying or loading its payload.

## Visible states and links

The page uses responsive cards so long IDs and operational refs wrap without a
fixed-width table or horizontal page overflow. It displays:

- candidate ID;
- candidate creation and storage timestamps;
- producer kind, version, and ref;
- schema, record-kind, adapter, conversion, export-manifest, and renderer
  compatibility values;
- content and storage hash prefixes;
- payload byte size; and
- access state and safe reason code.

Enabled, supported rows receive exactly one explicit link to:

```text
/api/gnr8/admin/astro-candidates/[siteVersionId]/[candidateId]/preview?path=%2F
```

It opens in a separate top-level tab with `rel="noopener noreferrer"`. Disabled
or unsupported rows receive no active preview link. The list states explicitly
that metadata listing does not certify payload integrity and that the MVP 16
route revalidates the complete record.

Visible page states cover feature disabled, invalid selector/cursor, access
denied or unresolved ownership, unavailable configuration/storage, empty scope,
and ready metadata. Existing page-auth conventions still redirect unauthenticated
users to `/login` and forbidden non-superadmins to `/superadmin`.

## Changed files

- `apps/platform/app/gnr8/admin/astro-candidates/[siteVersionId]/page.tsx`
- `apps/platform/app/gnr8/admin/astro-candidates/[siteVersionId]/astro-candidate-list-components.tsx`
- `apps/platform/app/gnr8/admin/astro-candidate-list-page.test.tsx`
- `apps/platform/app/gnr8/admin/workspace/[siteVersionId]/page.tsx`
- `apps/platform/app/gnr8/admin/workspace/[siteVersionId]/knowledge-workspace-components.tsx`
- `apps/platform/app/gnr8/admin/knowledge-workspace-page.test.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-list-composition.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-list-read-model.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-list-read-model.test.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-repository.ts`
- `apps/platform/gnr8/output-adapters/astro-production-candidate-supabase-gateway.test.ts`
- this report

## Validation

All storage/auth behavior was exercised with injected local synthetic data and
fake clients only.

- Read-model, repository, gateway, and ownership-resolver focused regressions:
  49 assertions passed.
- Existing MVP 16 authenticated preview route regression: 30 assertions passed.
- Synthetic candidate-list rendering and Workspace UI regressions: 22 assertions
  passed.
- Focused TypeScript no-emit validation passed with `next-env.d.ts`, the new
  page/read model/composition/tests, Workspace files, and imported dependency
  graph.
- Next.js route-export validation passed with 194 `route.ts` files scanned.
- `git diff --check` and the changed-file trailing-whitespace scan passed.

Coverage includes auth-first ordering for unauthenticated and forbidden users,
gate-disabled zero downstream reads, exact authoritative scope, metadata-only
access, stable pagination, malformed and cross-scope cursors, empty/error/access
states, concurrent scope isolation, exact eligible-row links, disabled and
unsupported no-link rows, Workspace gate behavior without metadata fetch,
payload/write/access-mutation/registration/producer traps, and MVP 16 preview
behavior remaining unchanged.

Synthetic server-rendered markup verified desktop/mobile-responsive structure,
long-ID wrapping, link security attributes, and all visible states. No real
authenticated browser screenshot was taken because loading the actual page
would depend on configured authentication and Supabase state; production guards
were not weakened for visual verification.

## Product behavior and hosted boundary

Product behavior changed: a new default-off gated superadmin metadata surface
and one gated Workspace supporting link now exist. Existing primary preview
actions, default previews, preview bindings, and the MVP 16 preview route remain
unchanged.

No usable hosted candidate link or feature enablement was demonstrated. No
environment value, credential, hosted authentication, Supabase/PostgREST RPC,
customer data, migration, registration, access state, producer, provider, DNS,
billing, Airship, source-capture, publish, shadow-publish, rollback, deployment,
or live pointer was read, changed, or executed.

Remaining hosted prerequisites are the MVP 16 prerequisites plus verification
that the deployed metadata-list RPC is present, correctly granted and scoped,
returns payload-free rows, preserves cursor ordering, and remains isolated under
concurrent authenticated requests. A separately authorized browser verification
would still be needed for the real auth/session and final deployed desktop/mobile
appearance.

The next bounded task is an audited candidate-access disable/re-enable service,
without enabling the preview feature or executing any deployed mutation.
