# Maver Runtime Governance Denial Audit

## 1. Executive Summary

`https://maver.app.pasadenagenerator.com/` returns `403` because the public runtime resolver returns `reasonCode: artifact_stage_denied`, which is mapped directly to the deterministic governance 403 response.

The deny originates in runtime serving eligibility evaluation (`evaluateRuntimeArtifactServingEligibility`) invoked by `resolveActiveArtifactForHostAndPathWithDiagnostics`.

The active Maver artifact/pointer and host binding are present and correct, but the active artifact has empty governance metadata (`artifactGovernance: {}`), and the active site version has no page-level `migration_governance` payload. In this state, serving eligibility fails closed as `artifact_missing_governance_metadata`, and runtime-store converts that to `artifact_stage_denied`.

Conclusion: the 403 is expected under current fail-closed governance logic, but operationally erroneous for Maver if the intent is shadow serving. The smallest correct next fix is to republish Maver through the current publish pipeline from a site version that includes migration governance (so artifact governance metadata is populated).

## 2. Request Path Audit

Request entry and path extraction:
- `app/route.ts` sends `/` requests to `renderPublicPathResponse({ path: "/", host })`.
- `app/(public)/[[...slug]]/route.ts` builds path from slug and also sends to `renderPublicPathResponse({ path, host })`.
- Host is extracted via `resolveRequestHost` from `x-forwarded-host` or `host` header.

Public runtime serving and deny mapping:
- `renderPublicPathResponse` calls `resolveActiveArtifactForHostAndPathWithDiagnostics`.
- On `artifact_miss`, it maps `reasonCode === "artifact_stage_denied"` to HTTP `403`; all other misses map to `404`.
- The exact 403 HTML body is the deterministic string: `This request is denied by runtime governance.`

Exact denial code path:
1. public route -> `renderPublicPathResponse`
2. runtime-store -> `resolveActiveArtifactForHostAndPathWithDiagnostics`
3. eligibility check fails (`!servingEligibility.allow`)
4. resolver returns `reasonCode: artifact_stage_denied`
5. public runtime maps this reason to HTTP 403

## 3. Host Binding Audit

Live resolver evidence (`2026-03-25T15:40:29Z` and `2026-03-25T15:41:47Z`):
- host: `maver.app.pasadenagenerator.com`
- siteId: `site_a978f53fa5aadbb51fdf`
- hostBindingId: `437a7167-8823-4fda-a3f1-a5dd42b38c5c`
- hostBindingKind: `shadow`
- hostBindingStatus: `ACTIVE`
- siteResolution: `host_match`

Assessment:
- Host binding exists and resolves to expected site.
- Runtime is interpreting this host as shadow stage (binding kind -> serving stage mapping).
- No host-binding mismatch evidence for this denial.

## 4. Artifact Resolution Audit

Live resolver evidence (`2026-03-25`):
- `activeSiteVersionId`: `66c816c5-53dd-4615-8b98-8db3b544d2b8`
- `artifactId`: `ed8b6973-34d3-40a6-8d70-220f2c82c8fe`
- `outcome`: `artifact_miss`
- `reasonCode`: `artifact_stage_denied`

Coverage audit for same host shows:
- active pointer exists
- active artifact exists
- root path covered (`/` present)
- no path coverage gaps

Therefore 403 occurs **after** successful site/pointer/artifact resolution and **before** HTML path serving, specifically at governance eligibility gate.

## 5. Migration Gate / Rollout Policy / Enforcement Audit

Runtime eligibility logic:
- `evaluateRuntimeArtifactServingEligibility` denies immediately when `artifact.artifactGovernance` is missing required structure (`!siteEnforcementState`).
- For Maver active artifact, live snapshot shows:
  - `publishStage: "production"`
  - `artifactGovernance: {}` (empty)

Active site version governance source state (`2026-03-25T15:44:33Z`):
- site version is `PUBLISHED`
- `pageCount: 1`
- `pagesWithMigrationGovernance: 0`
- page gate/rollout/enforcement fields are null

This means runtime cannot evaluate stage-specific allow/deny and fails closed.

Exact deny condition causing 403:
- Effective internal reason: `artifact_missing_governance_metadata` in serving eligibility
- Mapped runtime miss reason: `artifact_stage_denied`
- Mapped HTTP status: `403`

## 6. Runtime Diagnostics Evidence

Live HTTPS probe (`2026-03-25 15:43 UTC`):
- `HTTP/2 403`
- body title: `403: Access denied.`
- body message: `This request is denied by runtime governance.`

Live resolver snapshot (`2026-03-25T15:41:47Z`):
- `runtimeResolutionMode`: artifact-only path (from code path)
- `outcome`: `artifact_miss`
- `siteResolution`: `host_match`
- `hostBindingKind`: `shadow`
- `reasonCode`: `artifact_stage_denied`
- `activeSiteVersionId` and `artifactId` present

Live artifact snapshot for active artifact:
- `publishStage: production`
- `artifactGovernance: {}`

Live site version snapshot:
- page migration governance absent on all pages

## 7. Expected vs Actual Behavior

Expected:
- For an active shadow host binding with a valid artifact/pointer, runtime should serve artifact HTML if artifact governance permits shadow (ALLOW/REVIEW_ONLY) and governance metadata exists.

Actual:
- Runtime resolves host/site/pointer/artifact correctly but denies at governance eligibility due missing governance metadata, producing `artifact_stage_denied` -> HTTP 403.

Mismatch:
- Data/state mismatch: artifact/pointer readiness is present, but governance metadata required by serving enforcement is absent. Artifact readiness and governance readiness are out of sync.

## 8. Root Cause Assessment

Primary root cause category: `ENFORCEMENT_STATE_MISMATCH`

Why:
- Enforcer expects artifact governance state (`siteEnforcementState` etc.).
- Active Maver artifact has none (`{}`), and active site version also lacks page migration governance source fields.
- Runtime therefore denies by policy (fail-closed), even though host binding and artifact path coverage are valid.

## 9. Minimal Fix Recommendation

Single primary next fix:
- Recreate and republish Maver from a site version that contains migration governance, using the current publish pipeline so `artifact_governance` is populated (and then validate shadow-serving eligibility).

Rationale:
- This is the smallest corrective action that aligns runtime data with current governance enforcement contract.
- No governance rule relaxation, no host-binding patch, no runtime behavior rewrite required.

## 10. Follow-Up Validation Plan

After applying the fix, validate:
1. URL test
- `https://maver.app.pasadenagenerator.com/` should return `200`.

2. Runtime diagnostics
- resolver outcome should be `artifact_hit`
- `reasonCode` should be null (or fallback marker only if applicable)
- `hostBindingKind` should remain `shadow`

3. Governance fields
- active artifact must have non-empty `artifact_governance`
- `artifact_governance.siteEnforcementState.shadow` should be `ALLOW` or `REVIEW_ONLY`
- active site version pages should have non-null `migration_governance`

4. No regression checks
- root path remains present in artifact
- no fallback_latest_site dependency for bound host

## 11. Appendix: exact commands / files inspected / evidence sources

Commands executed:
- `rg --files apps/platform | rg 'public-runtime-render|app/route.ts|\(public\)/\[\[\.\.\.slug\]\]/route.ts|runtime|governance|enforcement|rollout|migration|host|binding|audit|maver'`
- `rg -n "artifact_stage_denied|governanceDenied|statusCode|\b403\b|enforcement|rollout|migration gate|maver|hostBinding|runtimeResolutionMode|reasonCode|artifactHit|artifactMiss|pathResolved|governance" apps/platform`
- `sed -n` and `nl -ba` on key files listed below
- Production DB/runtime snapshots:
  - `cd apps/platform && set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' node --import tsx /tmp/maver-host-resolution-snapshot.ts`
  - `cd apps/platform && set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' node --import tsx /tmp/maver-artifact-governance-snapshot.ts`
  - `cd apps/platform && set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' node --import tsx /tmp/maver-siteversion-governance-check.ts`
- Live HTTP checks:
  - `curl -s -D - 'http://maver.app.pasadenagenerator.com/' -o /tmp/maver-http-current.txt`
  - `curl -s -D - 'https://maver.app.pasadenagenerator.com/' -o /tmp/maver-https-current.txt`

Key files inspected:
- `apps/platform/src/public-site/public-runtime-render.tsx`
- `apps/platform/app/route.ts`
- `apps/platform/app/(public)/[[...slug]]/route.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/gnr8/runtime/artifact-coverage-audit.ts`
- `apps/platform/gnr8/runtime/genesis-records/maver-shadow-genesis.json`
- `apps/platform/src/public-site/public-runtime-render.test.ts`

Important evidence sources used:
- live resolver snapshots (2026-03-25)
- live HTTPS 403 response body (2026-03-25)
- genesis record snapshot (2026-03-24) for historical comparison

Limitations / unknowns:
- This audit did not modify state or rerun migration/publish on production.
- Historical transition point when Maver moved from serving to deny is inferred from available snapshots (2026-03-24 served, 2026-03-25 denied).
