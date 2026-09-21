# GNR8 Airship Proof Workflow Orchestrator

Date: 2026-09-21
Status: `airship_adapter_proof_workflow_orchestrator_recorded`

## Summary

ADAPTER 09 adds a proof-only workflow orchestrator for the Airship adapter sidecar path.

The orchestrator connects the existing proof services into one controlled sequence:

1. prepare a disposable local proof workspace
2. let the operator run the local server and Airship CLI manually
3. capture local `index.html` changes
4. map captured HTML diffs into draft edit candidates
5. apply only confirmed safe mappings to the saved GNR8 Airship draft

It does not auto-launch Airship, auto-regenerate a preview, publish, promote, rollback, shadow-publish, mutate active/live pointers, change DNS/provider/customer-domain state, run source capture/import, call external AI providers, or replace the current editor route.

## Code Entry Points

- Orchestrator: `apps/platform/gnr8/airship/proof-session/airship-proof-workflow-orchestrator.ts`
- Tests: `apps/platform/gnr8/airship/proof-session/airship-proof-workflow-orchestrator.test.ts`
- Session entry: `apps/platform/gnr8/airship/proof-session/airship-proof-session-entry.ts`
- Captured diff mapper: `apps/platform/gnr8/airship/proof-session/airship-captured-diff-to-draft-mapper.ts`
- Safe apply service: `apps/platform/gnr8/airship/proof-session/airship-apply-captured-mappings-to-draft.ts`

## Workflow Steps

Prepare:

```ts
const prepared = await prepareAirshipProofWorkflow({
  migrationId: "682a09fd-8fd5-4f73-93b8-54f5d4067c63",
  targetPort: 4178,
  sessionPort: 4179,
});
```

This returns the workspace path, manual local runner command, manual Airship CLI command, initial hashes, and safety readback.

Capture:

```ts
const captured = await captureAirshipProofWorkflowChanges({
  preparedWorkflow: prepared,
  sampleEditedString: "Captured workflow hero headline",
});
```

This compares local files against the prepared baseline and reports changed files, final hashes, and whether `index.html` changed.

Map:

```ts
const mapped = await mapAirshipProofWorkflowChanges({
  preparedWorkflow: captured,
  expectedDraft: { id: "draft-id", version: 3 },
});
```

This delegates to the ADAPTER 07 mapper and returns a mapping summary. Exact supported mappings are safe candidates; probable and unsupported mappings remain readback-only.

Apply:

```ts
const applied = await applyAirshipProofWorkflowMappings({
  mappedWorkflow: mapped,
  migrationId,
  draftSeed,
  expectedDraft: { id: "draft-id", version: 3 },
  confirmed: true,
  actor,
});
```

This delegates to ADAPTER 08. It requires `confirmed: true`, verifies stale draft protection, and writes only safe exact text mappings to existing draft edit rows.

## Operator Sequence

1. Call prepare and inspect the returned workspace and command descriptors.
2. Start the returned local static runner command manually.
3. Run the returned Airship CLI command manually.
4. Make the proof edit in Airship.
5. Capture changes.
6. Map captured changes.
7. Review exact/probable/unsupported mapping readback.
8. Apply only after explicit operator confirmation.
9. Regenerate preview later through a separate apply/generate-preview workflow.

## Readback States

The orchestrator exposes these statuses:

- `prepared`: workspace and manual commands are ready
- `captured`: local file changes have been read back
- `mapped`: captured diffs have been converted to dry-run draft mapping candidates
- `applied_to_draft`: confirmed safe mappings were processed by the draft apply service
- `blocked`: confirmation, stale mapping, stale draft, migration mismatch, or safety validation prevented mutation
- `failed`: reserved for future route wrappers that convert unexpected exceptions into structured readback

Each readback includes:

- workspace path
- manual Airship command
- initial hashes
- final hashes when available
- mapping summary when available
- applied/skipped counts
- draft id/version before and after when available
- next recommended action
- proof-only safety flags
- mutation flags

After a successful apply, the readback says:

- `Captured edits saved to draft`
- `Preview not regenerated yet`
- next recommended action: `Apply / generate preview`

## Safety Boundaries

Every workflow readback exposes proof-only boundaries:

- proof-only/manual/local
- no auto-launch
- no preview regeneration
- no artifact regeneration
- no publish mutation
- no live pointer mutation
- no DNS mutation
- no provider mutation
- no source capture/import
- no external AI provider call
- no customer domain mutation
- no production replacement UI
- current editor route not replaced

Draft data may mutate only in the apply step, only with `confirmed: true`, only for safe exact mappings, and only when draft id/version checks pass.

## Stale Protection

The mapper can record the draft id/version that the operator reviewed. The apply step fails closed if the supplied apply draft reference does not match that mapped draft reference.

ADAPTER 08 still performs the authoritative current-draft stale check before writing. If the saved draft version has changed, no safe mapping is applied and the operator must refresh the mapping/readback.

## What Remains Manual

The operator still manually:

- starts the local static server
- launches the Airship CLI
- edits in Airship
- reviews mapping readback
- confirms apply
- triggers preview generation later through a separate workflow

## Next Step

The next useful step is either:

- an admin UI entry that calls this orchestrator and displays the readbacks, while preserving all proof-only boundaries
- apply-to-preview orchestration that takes a saved draft and deliberately regenerates a preview artifact after a separate explicit operator action
