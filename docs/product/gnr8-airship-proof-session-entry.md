# GNR8 Airship Proof Session Entry

Date: 2026-09-21
Status: `airship_adapter_proof_session_entry_recorded`

## Summary

ADAPTER 06 adds a proof-only GNR8 Airship session entry around the new `AirshipSidecarBuilderAdapter` skeleton.

The entry prepares a disposable source-backed workspace from the current known-good polished CHS Airship demo artifact, returns manual local runner and Airship CLI commands, records initial file hashes, and captures local file diffs after a manual Airship edit.

It does not launch Airship, replace the current GNR8 Airship editor, mutate live pointers, publish, promote, rollback, dry-run, shadow-publish, run source capture/import, change DNS/domains/billing/providers/env, call external AI providers, or map captured HTML into GNR8 draft persistence.

## Code Entry Points

- Service: `apps/platform/gnr8/airship/proof-session/airship-proof-session-entry.ts`
- Tests: `apps/platform/gnr8/airship/proof-session/airship-proof-session-entry.test.ts`
- Adapter skeleton: `apps/platform/gnr8/airship/adapter/builder-adapter.ts`

## Prepare A Session

Call:

```ts
await prepareAirshipProofSessionEntry({
  migrationId: "682a09fd-8fd5-4f73-93b8-54f5d4067c63",
  targetPort: 4178,
  sessionPort: 4179,
});
```

The first supported artifact selector is `chs-polished-demo`. The service validates the generated CHS HTML against the Airship artifact validity/completeness checks before writing the workspace.

The returned readback includes:

- `workspacePath`
- `targetUrl`, usually `http://127.0.0.1:4178/`
- `expectedAirshipSessionUrl`, usually `http://127.0.0.1:4179/`
- `localRunnerCommand`
- `manualAirshipCommand`
- `initialHashes`
- proof-only safety flags

## Workspace Location

By default workspaces are created under:

```text
/tmp/gnr8-airship-proof-sessions/
```

Each workspace contains:

- `index.html`
- `package.json`
- `gnr8-airship-proof-session.json`
- `.gnr8-airship-builder-session.json`

The workspace is disposable local source. It is not a GNR8 runtime artifact and is not connected to a live pointer.

## Run The Local Target Manually

The service returns a runner command like:

```bash
python3 -m http.server 4178 --bind 127.0.0.1 --directory /tmp/gnr8-airship-proof-sessions/<workspace>
```

Start this yourself in a terminal. Production route code must not start persistent local processes.

## Run Airship Manually

The service returns a manual Airship command like:

```bash
pnpm dlx @airshiplabs/cli --target 4178 --port 4179 --host 127.0.0.1 --agent codex --safe --cwd /tmp/gnr8-airship-proof-sessions/<workspace> --mode canvas
```

Expected Airship session URL:

```text
http://127.0.0.1:4179/
```

Make a simple manual visual edit in Airship. The expected useful proof result is a change to local `index.html`.

## Capture Changes

Call:

```ts
await captureAirshipProofSessionChanges({
  preparedSession,
  sampleEditedString: "Airship Adapter 06 manual edit proof.",
});
```

The capture readback includes:

- changed files
- current hashes
- unified diff summaries
- `indexHtmlChanged`
- optional sample-string detection

Captured changes are review-only. The service does not map them into GNR8 draft edits yet.

## Safety Boundaries

The readback explicitly records:

- `proofOnlyGuard: true`
- `noAutoLaunch: true`
- `noLivePointerMutation: true`
- `noPublishMutation: true`
- `noDnsMutation: true`
- `noProviderMutation: true`
- `noSourceCaptureImport: true`
- `noDraftPersistence: true`

This is local/manual proof infrastructure only.

## Not Implemented Yet

- Admin UI panel/action
- Production route
- Managed static server lifecycle
- Managed Airship process lifecycle
- Session registry or cleanup scheduler
- Mapping captured `index.html` diffs into GNR8 draft edits
- Conflict handling for multiple manual sessions
- ARIS artifact selector

## Next Step

ADAPTER 07 should map reviewed captured HTML diffs into draft-only GNR8 edit proposals, still without live/publish mutation.
