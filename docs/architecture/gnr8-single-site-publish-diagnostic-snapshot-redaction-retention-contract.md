# GNR8 Single-Site Publish Diagnostic Snapshot Redaction And Retention Contract

Phase: MVP-64
Scope: Documentation and architecture only.

This contract defines what a future persisted single-site publish diagnostic snapshot history may store, what it must never store, and how privacy, retention, purge, access, and auditability should work. It does not implement SQL, persistence, services, routes, UI, APIs, workers, exports, runtime behavior, providers, commits, or pushes.

## Contract Position

Persisted diagnostic snapshots are derived historical observations of the internal operator panel projection. They are not source truth, approval truth, AAF truth, audit truth, publish authority, enforcement authority, or customer-facing export material.

The storage contract should be stricter than the MVP-62 export-safe preview because persistence creates durable risk. If a field is not explicitly allowed, future persistence should omit it, summarize it, or store a redacted marker.

## Allowed Stored Data

Future persistence may store only bounded, sanitized, internal diagnostic data:

- safe tenant, client, site, migration, candidate, runtime artifact, and publish target ids/refs;
- source-owned safe refs such as launch readiness evidence ref, publish activation request ref, publish activation decision ref, gate result ref, DDOM snapshot ref, publish target ref, dry-run audit ref, and shadow-publish audit ref;
- safe status codes from source-owned read models;
- safe blocker, warning, limitation, stale, missing, and conflict codes;
- deterministic snapshot watermark and source watermarks;
- snapshot schema version and redaction version;
- source-owned versus derived-only labels;
- capture mode, freshness label, historical observation label, and stale/superseded labels;
- top blocker code;
- derived next action code, explicitly display-only;
- severity/source/blocker/warning/limitation counts;
- bounded derived summaries;
- role-safe ref summaries;
- safe actor type, role, and internal actor id for authorized internal diagnostics;
- correlation id, causation id, and idempotency key for internal support/debug use;
- privacy label, retention class, retention expiry, and legal/admin hold marker;
- redacted JSON preview produced from the sanitized MVP-62 diagnostic snapshot shape.

## Forbidden Stored Data

Future persistence must never store:

- raw SQL;
- raw SQL errors;
- stack traces;
- exception dumps;
- logs or console output blobs;
- provider payloads;
- Vercel, Openprovider, registrar, DNS provider, SSL provider, AI provider, Supabase, or external provider raw responses;
- Stripe payment details;
- payment method data;
- card, bank, invoice, tax, subscription, entitlement, price, margin, or private customer billing data;
- cookies;
- tokens;
- sessions;
- API keys;
- OAuth tokens;
- bearer tokens;
- credentials;
- secrets;
- environment variables;
- `.env` values;
- service-role keys;
- database connection strings;
- raw AAF payloads;
- raw approval request or decision payloads;
- raw AAF evidence package payloads;
- raw gate/policy evaluator payloads;
- raw resolver payloads;
- raw PASR source-reader payloads;
- raw DDOM provider/source payloads;
- raw orchestrator payloads;
- raw publish wrapper inputs or outputs beyond safe result categories and refs;
- raw runtime artifact blobs;
- unbounded HTML/content blobs;
- customer-provided private content excerpts;
- source-site crawl HTML;
- generated page HTML;
- screenshot/image binary data;
- exported documents;
- provider account identifiers that are not already safe scoped refs;
- client-facing diagnostic text that has not passed a separate client-safe redaction review.

## Redaction Mechanics

Future persistence should use a recursive sanitizer before any insert:

- deny unsafe keys by name and path;
- deny unsafe string values by pattern for secrets, tokens, credentials, SQL, stack traces, provider payload markers, raw payload markers, Stripe/payment/billing markers, and known environment variable names;
- replace unsafe scalars with a stable redaction marker such as `"[redacted]"`;
- omit unsafe objects/arrays when the structure itself is raw payload-shaped;
- bound string lengths;
- bound array lengths;
- bound object depth;
- preserve safe codes, statuses, refs, watermarks, booleans, counts, and labels;
- record `redaction_version`;
- record a safe redaction summary event without embedding removed values.

Future tests must include negative fixtures with SQL, stack traces, provider payloads, Stripe/payment data, raw AAF/resolver/orchestrator data, cookies, tokens, sessions, secrets, environment variables, and long HTML/content blobs.

## Privacy Class

Recommended default privacy label: `internal_confidential`.

Rationale:

- snapshots contain cross-source operational diagnostics, source refs, actor/correlation/idempotency linkage, approval/gate status, and internal next-action interpretation;
- even when sanitized, they are not client-safe by default;
- they may reveal internal operating process, policy readiness, provider/source limitations, or support/debug state.

Client/public visibility is forbidden in MVP. A later client-safe summary would need a separate product, security, legal/privacy, redaction, and copy review.

## Retention Recommendation

Recommended default retention class: `short_operational`.

Recommended default retention period: 30 days after capture.

Reasons:

- snapshots are operational diagnostics, not canonical audit or approval records;
- source systems and MVP-57/AAF audit records retain the durable source/audit truth;
- shorter retention lowers risk from accidental overcollection;
- operators still get enough history for dry-run/shadow-publish comparison, support/debug trace, handoff, and post-run review.

Allowed retention upgrades:

- `mvp_operational` for active migration waves, unresolved support incidents, or explicit project review windows;
- `security`, `compliance_long`, or `legal_hold` only when a separately authorized incident, security, compliance, or legal/admin hold requires preserving diagnostic context.

Retention must not be upgraded automatically merely because a snapshot mentions approval, audit, provider, billing, or runtime records. The source-owned records carry their own retention obligations.

## Purge And Deletion Principles

Future implementation should support controlled purge/deletion semantics without weakening source truth:

- expired `short_operational` snapshots may be purged by maintenance process after retention expiry;
- manual purge may be requested for privacy, tenant cleanup, incorrect capture, or admin/legal instruction;
- purge must not delete source-owned launch readiness, AAF, DDOM, PTT, runtime, migration, provider, billing, or MVP-57 audit records;
- purge should remove or tombstone diagnostic snapshot rows, refs, and events according to the approved retention design;
- purge activity should be auditable through safe event/audit records that do not re-embed the purged payload;
- legal/admin hold must suspend purge until released by authorized process;
- deletion must not rewrite historical AAF/operator-action audit truth.

If the future DB implementation uses append-only snapshot events, the purge event should carry only safe metadata: snapshot id, scope, purge reason code, actor, retention class, redaction version, and timestamp.

## Access Boundary

Initial read access:

- platform superadmin only;
- internal Command Center only;
- server-side reads only;
- no client portal;
- no public route;
- no preview/public runtime exposure;
- no Ops Inbox actions;
- no broad API metadata;
- no downloadable exports.

Future roles such as technical operator, read-only auditor, support/debug, agency admin, or migration operator require separate role/scope/field redaction review. Client reviewer visibility remains forbidden for MVP.

## RLS Expectations

Future tables should enable RLS with no broad grants or policies by default.

Recommended first posture:

- no `PUBLIC`, `anon`, or broad `authenticated` access;
- insert through trusted server-only writer/service role only;
- read through server-only superadmin path only;
- update/delete disallowed except reviewed retention/purge maintenance path;
- refs/events append-only unless the retention design chooses physical purge with audited metadata;
- tenant/client/site/migration scope columns duplicated where useful for purge and scoped reads;
- no client-scoped policy until a separate client-safe redaction milestone exists.

## Auditability Expectations

Future capture should record:

- actor type, id, and role;
- tenant/client/site/migration/candidate/target scope;
- capture mode;
- correlation id;
- causation id when tied to an MVP-57 action, AAF event, or prior snapshot;
- idempotency key;
- snapshot schema version;
- redaction version;
- snapshot watermark;
- source watermarks;
- privacy label;
- retention class and expiry;
- redaction applied event;
- conflict/reuse event for idempotent calls.

This auditability is for the diagnostic snapshot history lifecycle only. It does not replace MVP-57 operator action audit or AAF audit truth.

## Export Boundary

No downloadable exports should be added with persistence. The MVP-62 JSON preview remains a UI preview of safe data, not an approval for file export.

Future export requires a separate milestone defining:

- user role/scope;
- export purpose;
- redaction version;
- file format;
- retention and deletion for exported artifacts;
- audit event;
- client/public visibility decision;
- maximum payload size;
- copy that labels the artifact as historical, derived-only, internal-only, non-authoritative, and non-enforcing.

## Guardrail Summary

Future implementation must reject the capture if redaction cannot prove the payload is safe. It is better to persist a partial safe snapshot with `redaction_failed_partial` and safe counts than to store an unsafe full snapshot.

Every persisted snapshot must carry these boundary facts:

- `historicalObservation: true`;
- `derivedOnly: true`;
- `readOnly: true`;
- `currentTruth: false`;
- `approvalTruth: false`;
- `aafTruth: false`;
- `auditTruth: false`;
- `publishAuthority: false`;
- `enforcementAuthority: false`;
- `clientVisible: false`;
- `actionAvailable: false`;
- `mutatesSourceTruth: false`.
