Status: `airship_adapter_one_session_chs_operator_flow_recorded`

# GNR8 Airship One-Session CHS Operator Flow

ADAPTER 16 wires the local/proof-only Airship process ownership spike into the CHS proof workflow only.

Scope:

- CHS migration: `682a09fd-8fd5-4f73-93b8-54f5d4067c63`
- local/proof-only
- superadmin-only route path
- no ARIS parity in this adapter

## Operator Flow

1. Prepare the CHS Airship session in GNR8.
2. Start an owned local Airship session from the proof panel.
3. Open the Airship editor only after the owned session has a healthy URL.
4. Edit CHS text in Airship.
5. Return to the same GNR8 tab.
6. Prefer stopping the owned Airship session before capture.
7. Capture local workspace changes.
8. Map captured edits.
9. Confirm and apply safe exact mappings to the saved draft.
10. Generate an internal preview from the applied draft.
11. Open the corrected internal preview.

## Sidecar Modes

Manual command-only mode remains the prepared-session readback: GNR8 shows the local static runner and Airship CLI command without owning those processes.

Fixture sidecar mode is the default owned path for automated tests and local dry runs. It starts an owned static target and an Airship-like local HTTP fixture so start, health, stop, and cleanup behavior can be verified without invoking `pnpm dlx`.

Real Airship CLI sidecar mode requires an explicit `startRealAirshipCli: true` request and local server opt-in through `GNR8_AIRSHIP_PROOF_REAL_CLI_ENABLED=1`. The public/deployed UI must not auto-launch the real CLI.

## Cleanup

Stop only targets child processes spawned by the ADAPTER 15 manager instance. It does not kill by port. If the submitted record is manual, stale, or not owned by the manager, the route reports `not-owned` and returns manual cleanup instructions.

After an owned stop, the manager reports stopped health for both the static target URL and the Airship session URL.

## Boundaries

This flow does not publish, mutate the live pointer, mutate GNR8 demo or preview-host bindings, touch DNS/provider/billing/env/source-capture/customer-domain/rollback/dry-run/shadow-publish paths, apply mappings automatically, or generate previews automatically.

ARIS is deferred because ADAPTER 16 is intentionally a one-session CHS operator flow. Non-CHS migrations get disabled/readback copy explaining that the adapter is CHS-only.
