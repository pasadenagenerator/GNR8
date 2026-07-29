# GNR8 Command Center Publish Shadow Surfacing Closeout

PASR-7 implements the first internal Command Center read-only surfacing of publish shadow results.

The surfacing is strictly derived, redacted, shadow-only, non-enforcing, and non-blocking. No publish behavior, active pointer behavior, rollback behavior, DDOM trigger behavior, AAF mutation behavior, Ops Inbox behavior, client portal behavior, provider behavior, SQL migration, commit, push, production Supabase call, staging Supabase call, Vercel call, DNS provider call, Openprovider call, registrar call, Stripe call, or AI provider call was introduced.

## 1. Files Reviewed

- `apps/platform/app/gnr8/command-center/layout.tsx`
- `apps/platform/app/gnr8/command-center/CommandCenterLayout.tsx`
- `apps/platform/app/gnr8/command-center/page.tsx`
- `apps/platform/app/gnr8/command-center/sites/page.tsx`
- `apps/platform/app/gnr8/command-center/hosting/page.tsx`
- `apps/platform/app/gnr8/command-center/hosting/[siteId]/page.tsx`
- `apps/platform/app/gnr8/command-center/hosting/hosting-detail-operations-ui.test.ts`
- `apps/platform/app/gnr8/command-center/migration-batches/page.tsx`
- `apps/platform/app/gnr8/command-center/migration-batches/[batchId]/page.tsx`
- `apps/platform/app/gnr8/command-center/_lib/command-center-view-model.ts`
- `apps/platform/gnr8/command-center/command-center-read-model.ts`
- `apps/platform/gnr8/runtime/hosting-operations/hosting-operations-read-model.ts`
- `apps/platform/src/auth/require-superadmin-user-id.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.test.ts`
- `docs/product/gnr8-publish-shadow-result-read-model-core-closeout.md`
- `docs/product/gnr8-publish-shadow-access-redaction-closeout.md`
- `docs/product/gnr8-publish-shadow-result-redaction-transformer-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 2. Files Created Or Updated

Created:

- `apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.ts`
- `apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.test.ts`
- `docs/product/gnr8-command-center-publish-shadow-surfacing-closeout.md`

Updated:

- `apps/platform/app/gnr8/command-center/hosting/[siteId]/page.tsx`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. Selected Command Center Surfacing Location

Selected location: Command Center hosting site detail, `apps/platform/app/gnr8/command-center/hosting/[siteId]/page.tsx`.

This location is correct because it already hosts active runtime version, publish timestamp, runtime readiness, domain readiness, domain operations, asset diagnostics, and hosting diagnostics. Publish shadow results are publish/readiness diagnostics for a specific site version, so the existing hosting detail page is the smallest natural surface.

No broad new dashboard, route family, API route, server action, or client surface was created.

## 4. Data Adapter/View-Model Strategy

`apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.ts` is a narrow Command Center adapter. It:

- accepts Command Center actor/scope plus site and site-version context;
- calls PASR-4 through `readPublishShadowResult`;
- immediately passes the raw read model through PASR-6 `redactPublishShadowResultForActor`;
- returns redacted projection plus display strings derived only from that projection;
- distinguishes visible, empty, unavailable, forbidden, and not-applicable safe states;
- performs no writes, provider calls, DDOM calls, publish calls, rollback calls, or Ops Inbox calls.

## 5. Redaction Usage

The UI consumes `CommandCenterPublishShadowSurfaceViewModel`, not raw PASR-4 rows. The adapter is the only new code that touches PASR-4, and it returns only the PASR-6 redacted projection plus projection-derived labels.

Raw source refs, evidence refs, audit refs, approval refs, actor ids, correlation ids, idempotency keys, technical diagnostics, and internal refs are displayed only when PASR-6 marks the related link or field as visible for the actor/surface.

## 6. Actor/Role/Scope Strategy

The selected route is already guarded by `requireSuperadminUserIdForPage` in `apps/platform/app/gnr8/command-center/layout.tsx`. The detail page also resolves the superadmin user id so the PASR-6 context has an actor id.

The PASR-7 production path uses:

- role: `platform_superadmin`;
- surface: `command_center`;
- site scope: resolved runtime site id from hosting operations;
- site-version scope: last published site version, falling back to active runtime version;
- runtime artifact scope: last publish artifact, falling back to active artifact;
- intended publish target/stage/environment: production defaults already used by PASR read-model lookup.

If no site version exists, no PASR raw lookup is attempted and the panel shows a safe not-applicable state.

## 7. Displayed Fields

The Command Center panel displays:

- shadow status;
- severity;
- readiness result;
- projection freshness;
- shadow-only and non-blocking labels;
- derived Command Center view label;
- safe recommended next action;
- safe next-action reason;
- DDOM status, readiness state, freshness, and captured timestamp when visible;
- publish target status, environment, and stage when visible;
- launch signoff, publish activation approval, and decision status when visible;
- evidence status and freshness when visible;
- source truth available/missing/stale counts;
- warnings and limitations in summarized form;
- role-safe refs only when PASR-6 marks them full/visible.

## 8. Hidden/Redacted Fields

The first UI intentionally avoids dense raw diagnostics. It does not independently read or reconstruct:

- raw source refs;
- raw evidence refs;
- raw audit refs;
- approval actor details;
- raw correlation ids;
- idempotency keys;
- provider-shaped payloads;
- raw internal diagnostics;
- client-visible shadow diagnostics.

If PASR-6 redacts or hides a field, the UI shows only the redacted summary, hidden message, or no refs.

## 9. Empty/Unavailable Behavior

Empty state:

- `shadow_not_enabled` and `shadow_not_available` are rendered as a safe empty state with copy explaining that shadow is not enabled or no persisted shadow records exist for the site version.

Unavailable state:

- `publish_shadow_read_repository_unavailable` in the redacted projection limitations maps to a safe unavailable state.
- Unexpected adapter failures return a safe unavailable view model without raw error details.

Not applicable:

- if no active or last-published site version is available, the panel explains that PASR lookup cannot run yet.

Forbidden:

- forbidden roles or scope mismatches return the PASR-6 denied projection and no diagnostics.

## 10. Non-Enforcement Labeling

The panel explicitly labels:

- `Shadow-only`;
- `Non-blocking`;
- `Derived Command Center view`;
- `Shadow-only, non-enforcing, non-blocking. Publish was not blocked by this result.`

PASR-6 boundary flags are preserved in the projection:

- `derivedOnly: true`
- `shadowOnly: true`
- `enforcementApplied: false`
- `publishActionBlocked: false`
- `createsDdomSnapshot: false`
- `createsApproval: false`
- `mutatesSourceTruth: false`

## 11. No-Action-Button Confirmation

PASR-7 adds no action buttons, retry controls, refresh controls, DDOM trigger controls, approval controls, publish controls, rollback controls, or Ops Inbox controls. The new Publish Shadow Readiness panel renders recommendation text only.

The hosting detail page still contains its pre-existing domain recheck button outside the PASR panel. PASR-7 did not add or modify it.

## 12. Command Center Derived-Only Boundary

The Command Center panel is a derived read-only surface. It is not source truth and does not persist or resolve PASR, AAF, DDOM, PTT, runtime, provider, or Ops Inbox state.

## 13. Client Visibility Boundary

No client portal, client dashboard, client route, public runtime, preview runtime, or client-facing API was modified. PASR-6 still forbids `client_reviewer` and `client_portal` MVP visibility.

## 14. Ops Inbox Boundary

No Ops Inbox work item model, queue, item creation, item completion, assignment, or route was created or modified. Ops Inbox remains deferred.

## 15. Publish Behavior Non-Change Confirmation

No publish route, publish activation orchestrator, publish enforcement module, publish guard, publish response metadata, activation behavior, active pointer behavior, or rollback behavior was modified.

Publish remains unaffected by PASR-7.

## 16. Provider Non-Call Confirmation

No production Supabase, staging Supabase, remote Supabase, Vercel, DNS provider, Openprovider, registrar, Stripe, AI provider, runtime provider, DDOM manual caller, or DDOM trigger was called.

The only Supabase-related runtime path referenced is the pre-existing Command Center superadmin page authorization helper.

## 17. Mutation Non-Change Confirmation

PASR-7 added no SQL migrations and no data mutation calls. The adapter has no insert, update, delete, upsert, DDOM trigger, AAF writer, approval creator, evidence builder, gate attempt creator, publish, rollback, provider, or Ops Inbox dependency.

## 18. Test Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.test.ts apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.test.ts`
- Result: 33 tests passed.

The first sandboxed `tsx` run failed before tests executed because the sandbox denied local IPC pipe creation. The same command passed after running through the approved escalation path.

## 19. Type/Static Validation Results

Passed focused TypeScript validation with a temporary non-composite config that included:

- `gnr8/aaf/aaf-command-center-publish-shadow-view-model.ts`
- `gnr8/aaf/aaf-command-center-publish-shadow-view-model.test.ts`
- `app/gnr8/command-center/hosting/[siteId]/page.tsx`

Command:

- `pnpm exec tsc -p tmp-pasr7-tsconfig.json --noEmit --pretty false`

The temporary config and generated build-info file were removed after validation.

Full platform typecheck was attempted with:

- `pnpm exec tsc -p tsconfig.json --noEmit --pretty false`

It failed on pre-existing unrelated drift across existing tests and modules, including candidate review tests, first limited dry-run tests, client route tests, migration factory tests, preview/runtime tests, provider tests, and template intake tests. The failure did not identify PASR-7 changed files.

## 20. Guardrail Results

Code guardrails passed.

Static searches on changed code found no forbidden provider calls, DNS calls, Vercel/Openprovider/registrar/Stripe/AI calls, DDOM trigger/caller imports, publish enforcement imports, rollback imports, mutation calls, Ops Inbox imports, client portal imports, public runtime changes, or SQL migration changes.

Expected matches were limited to:

- PASR fixture vocabulary for `activePointer` and runtime active-pointer source truth in tests;
- the UI/test label `Publish Activation Approval`;
- the AAF recommendation label for missing publish activation approval.

Changed-file scope checks confirmed no runtime API, client route, public runtime, migration, Ops Inbox, or `apps/platform/gnr8/command-center` files were changed.

## 21. Issues Found

- The existing hosting detail page has a pre-existing domain recheck button. PASR-7 avoided adding any PASR action controls and documented this distinction.
- Focused ad hoc `tsc` with explicit file arguments does not honor the app alias configuration cleanly; the validated path used a temporary app-local config.
- Full platform typecheck has unrelated existing drift.

## 22. Residual Risks

- The first panel is intentionally concise and does not provide evidence/audit/DDOM drilldowns. Future drilldowns need separate authorization checks on each target surface.
- The production Command Center path currently uses platform-superadmin visibility only. Broader role mapping from app auth roles to PASR redaction roles remains a future integration.
- PASR-4 still reconstructs from persisted evidence/gate/audit/source rows rather than a first-class shadow result table.

## 23. Whether PASR-7 Is Safe To Accept

PASR-7 is safe to accept as a narrow internal Command Center read-only surfacing milestone.

## 24. Whether Ops Inbox Surfacing May Begin

Ops Inbox surfacing may begin only as a separate future milestone that derives from PASR-6 redacted projections, creates no enforcement, and has its own stable item-key and source-owned resolution design.

PASR-7 did not implement Ops Inbox work items.

## 25. Whether Publish Enforcement May Begin

Publish enforcement may not begin. Enforcement remains deferred until a separate enforcement policy, rollout, operator review, acceptance milestone, and publish behavior change review are completed.

## 26. Recommended Next Milestone

Recommended next milestone: design and implement narrowly scoped Ops Inbox read-only derived surfacing for PASR shadow statuses, or add role-safe drilldown links if source-owned target authorization is already available.

Publish enforcement remains later than both.

## 27. Git Status Summary

PASR-7 changed or added:

- `apps/platform/app/gnr8/command-center/hosting/[siteId]/page.tsx`
- `apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.ts`
- `apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.test.ts`
- `docs/product/gnr8-command-center-publish-shadow-surfacing-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No commit or push was performed.

## 28. Commands Run

- `rg --files` and `rg` searches for Command Center, PASR, readiness, hosting, publish, rollback, and docs baseline.
- `sed` reviews of Command Center routes/layouts/view models, PASR-4 read model/repository/tests/closeout, PASR-5 docs/closeout, and PASR-6 transformer/tests/closeout.
- `git status --short`
- `apply_patch` for implementation, tests, closeout, index update, and temporary validation config cleanup.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.test.ts apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.test.ts`
- `pnpm exec tsc -p tsconfig.json --noEmit --pretty false`
- `pnpm exec tsc -p tmp-pasr7-tsconfig.json --noEmit --pretty false`
- `git diff --check`
- `rg -n "[[:blank:]]$" ...changed files...`
- static guardrail `rg` searches on changed code.
- changed-file scope checks with `git diff --name-only`.
- `git status --short apps/platform/supabase/migrations`
- `git status --short`
- generated TypeScript build-info cleanup.

Final validation passed except for the full platform typecheck, which failed on pre-existing unrelated drift as noted above.

## 29. Explicit Runtime Behavior Confirmation

No runtime behavior changed. PASR-7 added an internal Command Center read-only surface and a redacted adapter/view model only. It did not implement Ops Inbox work items, action buttons, DDOM trigger wiring, DDOM snapshots, AAF approvals, AAF evidence packages, AAF gate attempts, publish enforcement, publish blocking, publish activation changes, active pointer changes, rollback changes, publish API metadata, public runtime changes, client-facing visibility, SQL migrations, provider calls, or external calls.
