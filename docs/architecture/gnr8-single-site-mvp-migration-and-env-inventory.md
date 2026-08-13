# GNR8 Single-Site MVP Migration And Env Inventory

Phase: MVP-CUTLINE-4
Scope: deployment readiness inventory for the first one-site rehearsal.

## Migration Inventory

All listed migrations are committed in `apps/platform/supabase/migrations`. No uncommitted SQL migrations were present during this review.

| Filename | Phase | Tables / constraints affected | Required before one-site rehearsal | Required before online deploy | Notes / risks |
| --- | --- | --- | --- | --- | --- |
| `20260722120000_aaf_persistence_core.sql` | AAF-3 prerequisite | Creates AAF approval requests, decisions, policies, evidence links, subject refs, audit events, evidence packages/items/source refs/freshness/redaction/supersession/audit links, gate attempts; enables RLS. | Yes | Yes | Foundation for implementation/content/client/launch/publish activation approvals and gate attempts. Missing migration makes activation metadata and gate truth unavailable. |
| `20260727120000_ddom_readiness_snapshot_persistence_core.sql` | DDOM readiness prerequisite | Creates DDOM readiness snapshot persistence used by publish activation evidence source reading. | Yes | Yes | Required when launch readiness / publish activation evidence expects domain/readiness snapshot truth. Missing data may be an explicit rehearsal exception only. |
| `20260727130000_publish_target_source_truth_persistence_core.sql` | PTT-1 prerequisite | Creates `gnr8_publish_targets`, indexes, RLS; seeds the `production` publish target. | Yes | Yes | Publish wrapper expects an exact publish target ref. Shadow target support may need explicit data/exception if only the seeded production target exists. |
| `20260729120000_single_site_state_evidence_spine.sql` | MVP-5 | Creates `gnr8_single_site_migrations`, state events, migration refs, stage summaries, blockers, closeouts, source evidence reviews, review refs/items; state/stage/ref/status/actor/privacy/retention/json constraints; indexes, RLS, append-only triggers. | Yes | Yes | Core identity and state spine. Missing migration blocks orchestration status and source-evidence truth. |
| `20260730120000_single_site_clone_review_core.sql` | MVP-14 | Creates clone reviews, refs, items, events; review status/decision/proposal-allowed/retry/limitation constraints; indexes, RLS, append-only refs/events. | Yes | Yes | Required to prove clone acceptance before proposal/improvement. Seeding clone review means route rehearsal only, not acceptance. |
| `20260730143000_single_site_improvement_proposal_planning_core.sql` | MVP-16 | Creates improvement proposal plans, refs, recommendations, findings, events, supersessions; approval boundary, recommendation status/priority/risk, counters/watermarks; RLS/triggers. | Yes | Yes | Required for approved improvement scope. Missing plan truth blocks implementation authorization. |
| `20260730170000_aaf_single_site_implementation_authorization_scope.sql` | MVP-17 | Extends AAF scope checks on scope definitions, requests, policy evaluations, gate attempts, evidence package types for implementation authorization. | Yes | Yes | Required for AAF `single_site_implementation_authorization`. Constraint mismatch blocks writes/evaluation. |
| `20260731100000_aaf_granted_with_limitations_status.sql` | MVP-21 | Extends `gnr8_aaf_approval_decisions.status` to include granted-with-limitations vocabulary. | Yes | Yes | Required where accepted-with-limitations remains eligible but warning-bearing. Missing vocabulary can reject valid decisions. |
| `20260731120000_single_site_improvement_execution_core.sql` | MVP-22 | Extends migration ref role constraint; creates improvement execution attempts, refs, items, events; mode/status/output-boundary/non-approval constraints; RLS/triggers. | Yes | Yes | Required to persist improved candidate creation/execution truth. Missing migration blocks candidate lineage and refs. |
| `20260731143000_single_site_improved_version_review_core.sql` | MVP-25 | Extends single-site state/ref constraints for improved review states/refs; creates improved version reviews, refs, items, events, supersessions; readiness/non-approval constraints; RLS/triggers. | Yes | Yes | Required to accept the improved candidate before content approval. Missing constraints can block state transitions. |
| `20260803120000_aaf_single_site_content_approval_scope.sql` | MVP-27 | Extends AAF scope/evidence package constraints for `single_site_content_approval`; adds contract constraints for subject/evidence/gate shape. | Yes | Yes | Required before content approval AAF writes/evaluation. Missing migration blocks content approval source truth. |
| `20260803143000_single_site_content_approval_core.sql` | MVP-28 | Creates content approvals, refs, items, events, supersessions; status/review/decision/AAF scope/ready/limited/non-runtime constraints; RLS/triggers. | Yes | Yes | Required before client and launch approval. Missing content truth blocks launch readiness. |
| `20260803170000_aaf_single_site_client_launch_approval_scopes.sql` | MVP-31 | Extends AAF scope/evidence package constraints for client approval and launch approval; adds contract constraints for subject/evidence/gate shape. | Yes | Yes | Required before client/launch approvals. Constraint drift can make approval records invalid. |
| `20260803190000_single_site_client_approval_core.sql` | MVP-32 | Extends single-site state/ref constraints; creates client approvals, refs, items, events, supersessions; content-status/decision/AAF scope/ready/limited/non-runtime constraints; RLS/triggers. | Yes | Yes | Required before launch approval and readiness. Missing client approval truth should stop rehearsal unless explicitly bypassed. |
| `20260803210000_single_site_launch_approval_core.sql` | MVP-34 | Extends migration ref constraints; creates launch approvals, refs, items, events, supersessions; content/client status, readiness refs, AAF scope, ready/limited/non-runtime constraints; RLS/triggers. | Yes | Yes | Required before launch readiness and publish activation. Missing launch truth should stop or be an explicit exception. |
| `20260804120000_single_site_launch_readiness_core.sql` | MVP-37 | Creates launch readiness records, dimensions, refs, blockers, events, closeouts; status/freshness/dimension/severity/category constraints; indexes, RLS, append-only refs/events/closeouts. | Yes | Yes | Required for source-owned readiness evidence. Missing/stale readiness is a stop condition unless explicitly excepted. |
| `20260804143000_aaf_single_site_launch_readiness_evidence_type.sql` | MVP-40 | Extends AAF evidence package type and scope definition required evidence type checks for launch readiness evidence. | Yes | Yes | Required for publish activation evidence package construction. Missing evidence type blocks evidence builder/gate path. |
| `20260806120000_single_site_publish_operator_action_audit.sql` | MVP-57 | Creates publish operator actions, refs, events; mode/status/ref role/actor/privacy/retention/json/nonempty constraints; indexes, RLS, append-only refs/events. | Yes | Yes | Required for MVP-54/MVP-56 audit. Missing migration makes action routes fail safely or leaves panel without audit truth. |

## Environment Flag Inventory

| Flag | Default behavior | Safe value for rehearsal | Risk if enabled | May move active pointer |
| --- | --- | --- | --- | --- |
| `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` | Disabled unless value is `1`, `true`, `enabled`, `on`, or `shadow_publish`. Used by MVP-56 route and MVP-CUTLINE-3 facade. | Disabled for status/preflight/dry-run. Enable only for approved shadow-publish rehearsal. | Allows internal superadmin shadow-publish route/facade execution. Shadow-publish calls the wrapper execute path and may publish through the existing orchestrator. | Yes, indirectly through existing publish orchestrator when shadow-publish succeeds. |
| `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW` | Disabled unless value is `1`, `true`, `enabled`, `on`, or `shadow`. Used by publish activation orchestrator enforcement shadow observation. | `enabled` for approved publish/shadow-publish observation. | Enables read-only enforcement guard diagnostics during publish. It does not block publish, but can be confused with blocking enforcement if mislabeled. | No by itself. It only observes inside a publish path that may move the pointer. |
| `GNR8_PUBLISH_ACTIVATION_SHADOW_GATE` | Disabled unless value matches `1`, `true`, `enabled`, `on`, or `shadow`. Used by older AAF publish activation shadow observer. | Disabled unless intentionally testing the older source-read/evidence-build/gate-dry-run observer. | Can create/reuse evidence/gate dry-run records depending on observer dependencies and may confuse rehearsal results with the MVP-46/47/50 enforcement shadow guard. | No by itself. |

Feature flags discovered in the wrapper/guard/orchestrator:

- `SINGLE_SITE_PUBLISH_WRAPPER_FLAGS`: compile-time result flags showing wrapper-only, shadow-only, no AAF/gate/PASR/provider creation by the wrapper, and publishing only through the existing orchestrator.
- `SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_FLAGS`: compile-time result flags proving dry-run is non-publishing and non-mutating.
- `SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_FLAGS`: compile-time result flags proving no blocking enforcement/AAF/gate/PASR/provider/billing/domain/rollback/client/Ops behavior is added by the caller, while `shadowPublish: true` and `dryRun: false`.
- `PUBLISH_ACTIVATION_ENFORCEMENT_GUARD_FLAGS`: compile-time flags showing guard evaluation is read-only and enforcement is not applied.

Only the three environment variables above are runtime toggles relevant to this rehearsal.

Non-flag deployment env/secrets still need review before online rehearsal:

- `DATABASE_URL`: required by server-side read/write repositories for state, AAF, publish target, runtime, and audit data.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: required by auth helpers.
- `SUPABASE_SERVICE_ROLE_KEY`: required only where the target deployment already uses server-side Supabase service-role access.
- `SUPERADMIN_EMAILS`: must include the internal operator account so superadmin route/page auth can pass.

## Route And Panel Inventory

| Surface | Path | Auth requirement | Expected input | Expected output | Safe rehearsal usage | Mutation risk |
| --- | --- | --- | --- | --- | --- | --- |
| Command Center single-site publish panel | `GET /gnr8/command-center/single-site-publish` | `requireSuperadminUserIdForPage()` | Optional query params: `migrationId`, `siteId`, `candidateSiteVersionRef`. | Read-only panel projection over publish/operator readiness, latest audit attempts, blockers, warnings, limitations, snapshot/diff/runbook details. | Use first to inspect selected site state. Confirm no action buttons. | Intended read-only. Risk is unexpected exposure if auth fails or panel is linked publicly. |
| MVP-CUTLINE-3 status route | `GET /api/gnr8/admin/single-site-mvp/status` | `requireSuperadminUserId()` | Query params: `tenantId`, `clientId`, `siteId`; optional `migrationId`, `candidateVersionRef`, `runtimeArtifactRef`, `publishTargetRef`, `correlationId`. | Redacted `SingleSiteMvpOperatorActionOutput` with `allowed: true`, `reasonCode: status_read_allowed`, orchestration status, next operation, blockers/warnings/limitations, mutation flags all false. | Use after panel load to capture machine-readable orchestration status. | Intended read-only. No source-truth mutation. |
| MVP-CUTLINE-3 action/preflight route | `POST /api/gnr8/admin/single-site-mvp/action` | `requireSuperadminUserId()` | JSON body with `actionMode: preflight` or `execute`; identity fields; `requestedOperationKey`; refs/watermarks/confirmation for executable operations. Actor overrides are forbidden. | Preflight or execution result from facade. Manual/not-implemented operations return blocked/manual responses. Only `run_operator_dry_run` and `run_shadow_publish` can execute. | Use `actionMode: preflight` before any execute. Use execute for dry-run only unless shadow-publish is explicitly approved and flagged. | Dry-run execute is non-mutating. Shadow-publish execute may call existing publish orchestrator and move active pointer. |
| MVP-54 dry-run route | `POST /api/gnr8/admin/single-site-publish/dry-run` | `requireSuperadminUserId()` | Strict JSON body with `mode: dry_run`, tenant/client/site/migration, candidate/runtime/publish target refs, stage/environment, launch readiness evidence ref, publish activation request/decision/gate refs, handoff/gate watermarks, idempotency/correlation, and confirmation proving dry-run-only. | Redacted safe result with `dryRun: true`, `publishes: false`, `runtimeMutation: false`, wrapper/resolver status, blockers/warnings/limitations, audit persisted. | Safe direct route for publish metadata validation. Prefer after facade preflight. | Intended non-mutating. Audit writes occur. |
| MVP-56 shadow-publish route | `POST /api/gnr8/admin/single-site-publish/shadow-publish` | Feature flag plus `requireSuperadminUserId()` | Strict JSON body with `mode: shadow_publish`, same refs as dry-run, and confirmation proving `publishMayExecute: true`, `runtimeMutationMayOccur: true`, `blockingEnforcementApplied: false`, `noAutomaticRollback: true`. | Redacted safe result with route/wrapper/resolver/orchestrator status, safe pointer before/after, guard diagnostics, audit persisted. 403 if flag disabled. | Use only after explicit approval and dry-run success/expected blocker review. | High: may publish through existing orchestrator and move active pointer. No automatic rollback. |

## Data Production Vs Seeding

Must be produced through the real flow for a rehearsal that can count toward MVP validation:

- source capture evidence;
- clone version/artifact refs;
- improved candidate version/artifact refs;
- publish target ref;
- operator id from superadmin auth;
- dry-run/shadow-publish audit records.

Can be seeded for the first route/deployment rehearsal only, with explicit exception:

- migration state spine row and state events;
- accepted source evidence review;
- accepted clone review;
- proposal approval;
- implementation authorization AAF records;
- improved version/content/client/launch approval records;
- launch readiness record/evidence;
- publish activation request/decision/gate result.

May be bypassed only with explicit MVP exception policy:

- launch readiness dimensions that are not yet source-owned;
- DDOM readiness truth for a non-domain rehearsal;
- client or launch approval if the selected site is internal-only;
- shadow publish if the team decides dry-run is enough for deployment readiness.

Bypassed/seeded data must be labeled in closeout and prevents the site from counting as final 20-site validation unless later replayed through the real flow.
