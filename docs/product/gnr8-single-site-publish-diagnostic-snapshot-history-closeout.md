# GNR8 MVP-64 Single-Site Publish Diagnostic Snapshot History Design Closeout

Scope: documentation-only architecture and product design for safe persisted diagnostic snapshot history behind the internal single-site publish operator panel.

MVP-64 defines how a future phase may persist sanitized MVP-62 diagnostic snapshots so MVP-63 diffing can compare against prior full snapshots. It does not implement SQL, tables, services, routes, UI, APIs, workers, providers, runtime behavior, persistence, downloadable exports, action buttons, commits, or pushes.

## Files Reviewed

- `docs/product/gnr8-single-site-publish-operator-readonly-diagnostic-snapshot-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-readonly-snapshot-diff-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-action-audit-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-readonly-panel-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-readonly-source-enrichment-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-readonly-drilldown-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-readonly-runbook-closeout.md`
- `docs/architecture/gnr8-single-site-publish-operator-access-control.md`
- `docs/architecture/gnr8-audit-event-write-path-contract.md`
- `docs/architecture/gnr8-audit-approval-foundation-design.md`
- `docs/product/gnr8-audit-approval-persistence-core-closeout.md`
- `docs/product/gnr8-audit-approval-writer-core-closeout.md`
- `docs/architecture/gnr8-single-site-shadow-publish-access-audit-redaction.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-persistence-design.md`
- `docs/architecture/gnr8-publish-shadow-access-redaction-architecture.md`
- `docs/architecture/GNR8 Migration Command Center Spec.md`
- `docs/architecture/gnr8-publish-shadow-result-surfacing-architecture.md`
- `docs/product/gnr8-command-center-publish-shadow-surfacing-closeout.md`
- `docs/product/gnr8-ops-inbox-publish-shadow-surfacing-closeout.md`
- `docs/architecture/gnr8-ops-inbox-derived-work-item-contract.md`
- `docs/product/gnr8-ops-inbox-operator-workflow.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-publish-diagnostic-snapshot-history-architecture.md`
- `docs/architecture/gnr8-single-site-publish-diagnostic-snapshot-redaction-retention-contract.md`
- `docs/product/gnr8-single-site-publish-diagnostic-snapshot-history-operator-workflow.md`
- `docs/product/gnr8-single-site-publish-diagnostic-snapshot-history-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Final Source-Of-Truth Decision

Diagnostic snapshot history is derived-only historical observation. Source systems remain canonical:

- launch readiness for launch readiness truth;
- AAF requests, decisions, evidence, policy evaluations, gate attempts, and audit events for AAF truth;
- MVP-57 operator action audit rows/refs/events for internal dry-run and shadow-publish action audit truth;
- DDOM snapshots and source-owned domain workflows for domain readiness observation;
- publish target truth for target/environment/stage refs;
- runtime active pointer, site version, runtime artifact, and published overrides for production runtime truth;
- migration state/evidence spine for single-site migration truth;
- external provider, DNS, billing, Stripe, and workflow systems for their own external truth.

Persisted snapshots must be labeled historical, read-only, derived-only, current-truth false, approval-truth false, AAF-truth false, audit-truth false, publish-authority false, and enforcement-authority false.

## Future Persistence Tables Recommended

MVP-64 recommends, but does not implement:

- `gnr8_single_site_publish_diagnostic_snapshots`
- `gnr8_single_site_publish_diagnostic_snapshot_refs`
- `gnr8_single_site_publish_diagnostic_snapshot_events`

The proposed shape includes tenant/client/site/migration ids, candidate/artifact/target refs, snapshot version, snapshot watermark, source watermarks, baseline refs, top blocker, next action, severity/source counts, redacted snapshot JSON, redaction version, privacy/retention metadata, actor/correlation/idempotency, and created timestamp.

## Snapshot Redaction Contract

Allowed storage:

- safe ids and safe refs;
- safe status codes;
- safe blocker/warning/limitation/stale/missing/conflict codes;
- watermarks;
- derived summaries and counts;
- source-owned/derived labels;
- redacted JSON preview;
- actor/correlation/idempotency values for internal authorized support/debug.

Forbidden storage:

- raw SQL, raw SQL errors, stack traces, exception dumps, logs, provider payloads, Stripe/payment details, cookies, tokens, session data, secrets, environment variables, private customer billing data, raw AAF payloads, raw resolver payloads, raw orchestrator payloads, raw PASR/DDOM/provider payloads, raw runtime artifacts, unbounded HTML/content blobs, screenshots/images, exported documents, and client-facing diagnostics that have not passed separate redaction review.

## Retention And Privacy Recommendation

Default privacy label: `internal_confidential`.

Default retention class: `short_operational`.

Default retention period: 30 days after capture.

Retention may be upgraded to `mvp_operational` for active migration wave support/debug needs, or to `security`, `compliance_long`, or `legal_hold` only for separately authorized incident, security, compliance, or legal/admin hold. RLS should be enabled with no broad public, anon, authenticated, or client grants by default.

## Idempotency Strategy

Same semantic snapshot plus same idempotency key should reuse the existing snapshot. Semantic watermarking must exclude volatile timestamps and UI render timing.

If the same idempotency key returns semantic drift:

- strict capture modes should conflict and create no row;
- explicit versioning capture modes may create a new version;
- retry-after-timeout should read by idempotency key and compare snapshot watermark before returning.

## Baseline And Diff Strategy

Future MVP-63 diffing should select:

1. previous persisted snapshot for the same tenant/client/site/migration/candidate/target;
2. latest persisted dry-run snapshot;
3. latest persisted shadow-publish snapshot;
4. explicit operator-selected snapshot in a later UI phase;
5. audit-derived summary only when no persisted snapshot exists.

Baselines are comparison context only and must carry capture mode, timestamp, watermark, source watermark, and stale/historical labels.

## Access And UI Boundary

Initial access remains platform-superadmin only through internal Command Center. No client portal, public runtime, preview runtime, Ops Inbox action, downloadable export, broad API metadata, action button, POST route, provider call, AAF write, gate evaluation, DDOM trigger, PASR invocation, publish, rollback, billing, Stripe, domain, DNS, or runtime mutation is approved by MVP-64.

Command Center remains a derived surface. Ops Inbox remains derived-only and cannot resolve or mutate snapshot history.

## Risks And Guardrails

Risks:

- snapshots become accidental source truth;
- stale snapshots are mistaken for current state;
- unsafe raw payloads enter durable storage;
- provider, billing, customer, or secret data leaks;
- persistence creates an export path too early;
- diagnostic history is confused with approval/audit truth;
- broad RLS grants expose cross-tenant diagnostics;
- idempotency drift hides meaningful source changes.

Guardrails:

- persist only redacted snapshot JSON and safe refs;
- keep source ownership explicit in rows and UI labels;
- bound JSON size;
- enable RLS with closed default posture;
- use server-only writers;
- record redaction version, privacy label, retention class, actor, correlation, causation, and idempotency;
- reuse MVP-62 semantic watermarking;
- treat idempotency drift as conflict unless explicit versioning is requested;
- keep refs/events append-only;
- add focused forbidden-field, idempotency, scope, RLS, retention, stale-label, and baseline-selection tests before UI consumption.

## Whether SQL Or Service Implementation May Begin Next

Yes, SQL/service implementation may begin next only as MVP-65 diagnostic snapshot persistence core, with explicit approval for persistence implementation scope.

MVP-65 should remain SQL/service/tests only unless separately expanded. It should not add UI actions, client exposure, downloads, provider calls, route POSTs, publish behavior, runtime behavior, AAF writes, gate evaluation, DDOM trigger, PASR invocation, billing, Stripe, domain, DNS, rollback, commit, or push.

## Recommended Next Milestone

Recommended next milestone: MVP-65 diagnostic snapshot persistence core.

MVP-65 should implement the table family, server-only writer/repository/service, redaction tests, retention metadata tests, idempotency tests, and RLS posture tests. The panel may read persisted snapshots only after the persistence core exists and the read integration is explicitly scoped.

## Validation Results

Passed:

- docs exist and are readable;
- canonical index references all four MVP-64 docs;
- source-of-truth boundary is explicit;
- redaction forbidden list is explicit;
- retention/privacy section exists;
- future persistence tables are described but not implemented;
- implementation boundary says no SQL/service/UI/runtime changes in MVP-64;
- `git diff --check`;
- trailing whitespace search over changed MVP-64 docs and index;
- changed-file scope check confirms docs/index only.

No SQL migration was created. No runtime, service, route, UI, worker, provider, package, billing, domain, publish, rollback, AAF, PASR, DDOM, Command Center implementation, Ops Inbox implementation, or client portal implementation file was changed.

## Boundary Confirmation

MVP-64 changed documentation and the canonical index only. No runtime behavior changed. No commit or push was performed.
