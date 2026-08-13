# GNR8 Single-Site Publish Diagnostic Snapshot History Operator Workflow

Phase: MVP-64
Scope: Documentation and product workflow only.

This workflow describes how internal operators should use future persisted diagnostic snapshot history after a separate persistence milestone exists. MVP-64 does not implement persistence, SQL, services, routes, UI, APIs, downloads, action buttons, workers, provider calls, runtime behavior, commits, or pushes.

## Product Position

Diagnostic snapshot history is an internal read-only memory of what the single-site publish operator panel showed at safe capture moments. It helps operators compare, debug, review, and hand off work.

It is not source truth, approval truth, AAF truth, audit truth, publish authority, enforcement authority, client-facing export, or an action queue.

## Operator Workflow

1. Operator opens the internal single-site publish operator panel in Command Center.
2. Operator confirms the panel labels the current projection as read-only, derived, internal-only, non-enforcing, and no-action.
3. After a dry-run, shadow-publish, shadow-publish failure, or explicit read-only capture, future persistence may store a sanitized diagnostic snapshot.
4. Operator reviews the current snapshot and sees whether a persisted baseline exists for the same migration, candidate, and target.
5. Operator compares the current snapshot to the selected baseline through MVP-63 diff semantics.
6. Operator uses the diff to identify blocker changes, warning changes, stale/missing source changes, next-action changes, source watermark drift, safe ref changes, top regression, and top improvement.
7. Operator routes follow-up to the source-owned workflow: launch readiness, AAF approval, gate/evidence, DDOM, publish target, runtime, migration, or operator action audit.
8. Operator hands off the safe snapshot watermark, source watermarks, top blocker, next action, and safe refs to another internal operator when needed.
9. Operator never treats a snapshot or diff as permission to publish, approve, enforce, resolve, retry, refresh, rollback, mutate providers, or close Ops Inbox items.

## Capture Moments

Future snapshots may be captured:

- after dry-run completion;
- after shadow-publish completion;
- after shadow-publish failure;
- on explicit internal read-only capture by an authorized operator;
- after source-read enrichment when the projection has refreshed source-owned read state.

Future snapshots should not be captured:

- from client portal;
- from public or preview runtime;
- from Ops Inbox actions;
- during provider execution;
- inside AAF approval/decision creation;
- inside gate evaluation as a side effect;
- inside PASR/DDOM source creation as a side effect;
- before actor authorization and scope checks;
- as a replacement for source-owned persistence.

## Baseline Selection

Future diffing should select a baseline in this order:

1. previous persisted snapshot for the same tenant/client/site/migration/candidate/target;
2. latest persisted dry-run snapshot for the same scope;
3. latest persisted shadow-publish snapshot for the same scope;
4. explicit operator-selected snapshot in a later UI phase;
5. audit-derived summary only when no persisted snapshot exists.

The baseline label must include capture mode, captured timestamp, snapshot watermark, source watermarks, and stale/historical status. An older baseline is comparison context only.

## Reading The Diff

Operators should treat improvements and regressions as clues, not truth transitions.

Examples:

| Diff signal | Operator interpretation | Source-owned follow-up |
| --- | --- | --- |
| Blocker removed | The current projection no longer reports that blocker. | Verify source-owned record or evidence freshness. |
| Blocker added | A new diagnostic blocker appeared. | Inspect the owning source family and runbook entry. |
| Source watermark changed | Underlying source-owned data likely changed. | Re-read source-owned surface before acting. |
| Next action changed | The derived recommendation changed. | Confirm source state and approval/gate boundary. |
| Safe ref changed | The observed source ref changed. | Verify scope, candidate, artifact, and target alignment. |
| Baseline unavailable | No persisted snapshot exists. | Use audit-derived summary as limited comparison context. |

## Stale Snapshot Handling

A stale snapshot should be labeled as stale, superseded, older than current projection, or source-unavailable for recheck. Operators may compare against it, but must not:

- use it as live source truth;
- use it as approval or AAF truth;
- use it to satisfy freshness;
- use it as publish readiness;
- hide current blockers because an older snapshot looked clean.

The correct follow-up is always source-owned verification or a new read-only capture after source state changes.

## Handoff Workflow

Safe handoff may include:

- snapshot id;
- snapshot watermark;
- capture mode;
- captured timestamp;
- source watermarks;
- current baseline label;
- top blocker code;
- next action code;
- severity/source counts;
- safe refs;
- redacted JSON preview.

Handoff must not include raw logs, SQL, stack traces, provider payloads, billing details, cookies, tokens, sessions, secrets, environment variables, raw AAF payloads, raw resolver payloads, raw orchestrator payloads, or HTML/content blobs.

## Access And UI Boundary

Initial workflow:

- platform superadmin only;
- internal Command Center only;
- no client portal;
- no public or preview runtime exposure;
- no Ops Inbox actions;
- no action buttons;
- no downloads;
- no mutation links;
- no route POST created by MVP-64;
- no mutation authority from snapshot history.

Command Center may show persisted history only after a persistence milestone exists. Ops Inbox may derive display-only items from source-owned helpers in other milestones, but snapshot history must not create or resolve Ops Inbox items.

## What Operators Must Not Infer

Operators must not infer that:

- a clean snapshot means publish is approved;
- a clean diff means source truth is current;
- a prior shadow-publish snapshot means the current candidate can publish;
- launch readiness equals publish activation approval;
- DDOM/domain readiness equals publish activation approval;
- a diagnostic next action is an executable action;
- a historical snapshot can close an audit gap;
- snapshot history can replace AAF/operator action audit.

## Recommended Next Milestone

MVP-65 should implement diagnostic snapshot persistence core with SQL, a server-only writer/repository/service, redaction tests, retention metadata tests, idempotency tests, RLS posture tests, and no UI action. A route POST, Command Center read integration, export/download flow, or client-safe summary should require separate approval.
