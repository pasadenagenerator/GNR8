# GNR8 Ops Inbox Publish Shadow Surfacing Closeout

PASR-8 implements read-only derived Ops Inbox work item view models for publish shadow result exceptions.

The phase is narrow and internal. It creates no persistent Ops Inbox truth, no Ops Inbox route, no action buttons, no DDOM snapshot creation, no AAF approval/evidence/gate mutation, no publish behavior change, no client visibility, no SQL migration, and no provider call.

## 1. Files Reviewed

- `docs/architecture/gnr8-ops-inbox-work-item-model.md`
- `docs/product/gnr8-command-center-ops-inbox-closeout.md`
- `docs/product/gnr8-publish-shadow-result-read-model-core-closeout.md`
- `docs/product/gnr8-publish-shadow-result-redaction-transformer-closeout.md`
- `docs/product/gnr8-command-center-publish-shadow-surfacing-closeout.md`
- `docs/product/gnr8-command-center-publish-shadow-surfacing-verification-closeout.md`
- `apps/platform/app/gnr8/command-center/page.tsx`
- `apps/platform/app/gnr8/command-center/CommandCenterLayout.tsx`
- `apps/platform/app/gnr8/command-center/_components/command-center-ops-table.tsx`
- `apps/platform/app/gnr8/command-center/_lib/command-center-view-model.ts`
- `apps/platform/gnr8/command-center/command-center-read-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.ts`
- `apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.ts`
- PASR-4, PASR-6, and PASR-7 tests near the files above.

## 2. Files Created Or Updated

Created:

- `apps/platform/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model.test.ts`
- `docs/product/gnr8-ops-inbox-publish-shadow-surfacing-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. Existing Ops Inbox Implementation Status

Ops Inbox currently exists as a documented design and source-of-truth boundary, not as a safe implemented route, read-model, or stable UI surface. The current live internal surfaces are Command Center overview/sites/hosting/agencies/migration-batches plus migration ops tables.

## 4. UI Surfacing Status

UI surfacing is deferred. PASR-8 does not invent a broad Ops Inbox route or page because no safe implemented Ops Inbox surface exists yet.

The implemented deliverable is the derived view-model/helper that a future Ops Inbox UI can consume.

## 5. View-Model Helper Location

Helper:

- `apps/platform/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model.ts`

The helper exposes:

- `getPublishShadowOpsInboxViewModel`
- `buildPublishShadowOpsInboxViewModelFromProjection`
- `mapPublishShadowProjectionToOpsInboxWorkItems`

## 6. Derived Work Item Types Implemented

- `publish_shadow_missing_ddom_snapshot`
- `publish_shadow_stale_ddom_snapshot`
- `publish_shadow_missing_publish_target`
- `publish_shadow_missing_publish_activation_approval`
- `publish_shadow_gate_not_ready`
- `publish_shadow_evaluation_failed`
- `publish_shadow_source_truth_stale`
- `publish_shadow_source_truth_missing`

Ready, disabled, and unavailable shadow statuses create no exception item.

## 7. Stable Key Strategy

Derived keys use:

- PASR-8 derivation policy version;
- derived item type;
- site and site-version identifiers only when PASR-6 exposes them;
- role-safe source anchors such as visible DDOM snapshot ref, publish target ref, approval ref, gate attempt ref, evidence ref, or source-truth category;
- redacted deterministic fallback segments when raw identifiers are not visible.

Keys are deterministic for the same redacted projection. Redacted fallback keys intentionally avoid source-of-truth overclaiming and may be less granular than full-visibility keys.

## 8. Redaction Usage

The mapping helper consumes `PublishShadowRedactedResultProjection`. The adapter path reads PASR-4 through `readPublishShadowResult` and immediately applies PASR-6 `redactPublishShadowResultForActor` with `surface: "ops_inbox"` before deriving items.

No UI or work-item mapping consumes raw PASR-4 fields directly.

## 9. Displayed Fields

Each derived item includes:

- stable derived key;
- derived work item type;
- lifecycle state;
- shadow-only, derived-only, non-enforcing, and non-blocking flags;
- severity;
- safe title;
- safe summary;
- site label or redacted site label;
- site-version summary or redacted site-version summary;
- recommended next-action label;
- recommended owner role;
- PASR-6-visible refs only;
- redacted/summarized ref labels where safe;
- limitations summary;
- freshness summary;
- created and observed timestamps when available;
- source-of-truth boundary label.

## 10. Hidden Or Redacted Fields

The helper does not expose raw identifiers unless PASR-6 marks the field/link as full visibility. It does not independently reveal:

- raw DDOM snapshot ids or refs;
- raw publish target ids or refs;
- raw approval request or decision ids;
- raw evidence package ids;
- raw gate attempt or audit event ids;
- raw source refs;
- actor ids;
- correlation ids;
- idempotency keys;
- provider-shaped diagnostics;
- raw PASR-4 repository rows.

## 11. Empty Or Unavailable Behavior

Empty:

- `shadow_ready`, `shadow_ready_with_warnings`, `shadow_not_enabled`, and `shadow_not_available` produce no exception work items.

Unavailable:

- redacted projections with repository-unavailable limitations produce an unavailable state and no items.

Forbidden:

- forbidden/client projections produce no work items.

Not applicable:

- missing site or site version avoids PASR lookup and returns no items.

## 12. No-Action-Button Confirmation

No UI buttons were added. The derived work item model has `hasActionPayload: false` and `actionButtons: []`. No action payload is present.

Recommended next action is display text only.

## 13. Ops Inbox Derived-Only Boundary

Ops Inbox items are derived view-model entries only. They are not persisted task truth and cannot resolve, dismiss, approve, mutate, enforce, or block anything.

Completion remains source-owned: canonical source state must change, or a separately audited source-owned decision must be recorded outside this PASR-8 helper.

## 14. Command Center Boundary

Command Center PASR-7 surfacing remains unchanged. PASR-8 does not alter hosting detail UI or Command Center read models.

## 15. Client Visibility Boundary

No client portal, client dashboard, public runtime route, preview runtime route, or client-facing API was modified. Client/forbidden projections produce no Ops Inbox work items.

## 16. Publish Behavior Non-Change Confirmation

No publish activation behavior, active pointer behavior, rollback behavior, publish response metadata, publish gate enforcement, runtime serving path, or public runtime behavior was changed.

## 17. Provider Non-Call Confirmation

No production Supabase, staging Supabase, remote Supabase, Vercel, DNS provider, Openprovider, registrar, Stripe, AI provider, DDOM trigger/caller, or external provider was called.

## 18. Mutation Non-Change Confirmation

PASR-8 added no insert, update, delete, upsert, approval creation, evidence creation, gate creation, DDOM snapshot creation, runtime mutation, publish mutation, rollback mutation, queue, worker, scheduled job, or SQL migration.

## 19. Test Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.test.ts apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.test.ts apps/platform/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model.test.ts`
- Result: 48 tests passed.

The first sandboxed PASR-8 test run failed before tests executed because `tsx` could not create its local IPC pipe. The same tests passed outside the sandbox through the approved escalation path.

## 20. Type And Static Validation Results

Passed focused TypeScript validation with a temporary app-local config containing the changed PASR-8 helper/test and directly imported PASR dependencies:

- `pnpm exec tsc -p tmp-pasr8-tsconfig.json --noEmit --pretty false`

The temporary config and emitted `.tsbuildinfo` file were removed.

Passed:

- `git diff --check`
- changed-file trailing whitespace check

## 21. Guardrail Results

Static guardrail searches passed for changed files and repository scope checks. No forbidden provider/runtime/DNS/AI/Stripe/DDOM-trigger/publish-mutation/rollback/client-portal import or call was added.

No SQL migration was created or changed.

No worker, public runtime, client portal, publish route, rollback route, DDOM trigger/caller, provider integration, billing, Stripe, AI, Vercel, DNS, Openprovider, registrar, or external provider code was changed.

## 22. Issues Found

- Ops Inbox has no safe implemented UI/read-model surface yet; it remains documented architecture in the current repository.
- Because the helper must consume redacted projections only, stable keys for roles without full subject/source refs intentionally use redacted fallback segments and are less granular.
- Focused `tsx` tests need local IPC permission outside the sandbox in this environment.

## 23. Residual Risks

- Future UI integration must choose a real Ops Inbox route/read-model owner instead of attaching this helper opportunistically to Command Center pages.
- Redacted fallback keys should be revisited if PASR-6 later provides non-leaking stable subject aliases.
- This phase does not provide drilldown authorization for source-owned workflows; future UI should link only through role-gated destination surfaces.

## 24. Whether PASR-8 Is Safe To Accept

PASR-8 is safe to accept as a narrow internal read-only derived view-model milestone.

## 25. Whether Publish Enforcement May Begin

Publish enforcement may not begin. Enforcement remains deferred until a separate enforcement milestone designs policy, rollout, operator acceptance, audit behavior, source-owned remediation, and publish behavior changes.

## 26. Recommended Next Milestone

Recommended next milestone: implement a first-class internal Ops Inbox read-model/UI shell that consumes derived helpers like PASR-8 without becoming source truth. Publish enforcement should remain later than that milestone.

## 27. Git Status Summary

PASR-8 changed or added:

- `apps/platform/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model.test.ts`
- `docs/product/gnr8-ops-inbox-publish-shadow-surfacing-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No commit or push was performed.

## 28. Commands Run

- `pwd`
- `rg --files | rg '(^|/)(ops|Ops|inbox|Inbox)|aaf-publish-shadow|PASR|pasr|GNR8_CANONICAL_DOC_INDEX|docs/product'`
- `git status --short`
- `rg -n "Ops Inbox|ops inbox|OpsInbox|opsInbox|work item|work-item|derived work|Command Center|command center" apps/platform gnr8 docs/product docs/ai`
- `sed -n ...` over Ops Inbox, Command Center, PASR-4, PASR-6, PASR-7, and canonical index files
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.test.ts apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.test.ts apps/platform/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model.test.ts`
- `pnpm exec tsc -p tmp-pasr8-tsconfig.json --noEmit --pretty false`
- `git diff --check`
- changed-file trailing whitespace checks
- static guardrail `rg` checks for forbidden provider/runtime/DNS/AI/Stripe/DDOM-trigger/publish-mutation/rollback/client-portal patterns
- SQL migration changed-file checks

## 29. Explicit Runtime Behavior Non-Change Confirmation

No runtime behavior changed. PASR-8 adds only a server-only read-model/view-model helper, focused tests, and documentation. It does not enforce publish, block publish, mutate state, create snapshots, create approvals, create evidence, create gate attempts, call providers, expose client views, or change public runtime serving.
