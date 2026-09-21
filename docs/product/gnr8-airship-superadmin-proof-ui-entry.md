# GNR8 Airship Superadmin Proof UI Entry

Status: `airship_adapter_superadmin_proof_ui_entry_recorded`

## Purpose

The Airship single-site editor now includes a superadmin-only proof panel for the real Airship sidecar adapter workflow. It exposes the ADAPTER 09 proof orchestration path without replacing the existing editor route or changing publish/preview behavior.

The panel is proof-only, local/manual, and operator-driven. It prepares a local workspace, shows the manual static target command and manual Airship CLI command, captures local workspace changes, maps safe text edits, and applies only confirmed exact safe mappings to the saved Airship draft.

## How To Use

1. Open the existing superadmin Airship single-site page.
2. Use `Prepare Airship session` in the `Real Airship sidecar proof` panel.
3. Copy/run the local static target command manually.
4. Copy/run the manual Airship CLI command manually.
5. Make edits in the local Airship sidecar session.
6. Use `Capture changes` / `Map captured edits` to read local workspace changes and produce mapping readback.
7. Review exact/safe and skipped/unsupported mapping counts.
8. Check the explicit confirmation checkbox.
9. Use `Apply safe mappings to draft`.
10. Continue manually with `Apply / generate preview` when ready.

## Safety Boundaries

- Superadmin-only page and route access.
- Proof-only workflow.
- Local/manual sidecar operation only.
- Airship is not auto-launched.
- Preview is not regenerated.
- Artifacts are not regenerated.
- Live site and active pointers are not changed.
- No publish, dry-run publish, shadow publish, rollback, DNS, provider, billing, external customer domain, or source-capture/import path is invoked.
- Current editor route remains available and is not replaced.
- Confirmed apply mutates only saved Airship draft text fields that mapped as exact safe candidates.
- Stale draft versions fail closed and require re-map against the current draft.

## Readback

The panel shows:

- workflow status
- workspace path
- static local target URL/session URL
- manual commands
- initial/final hash summary
- exact/safe mapping count
- skipped/unsupported mapping count
- apply confirmation state
- applied/skipped counts
- draft version before/after
- `Captured edits saved to draft`
- `Preview not regenerated yet`
- next action: `Apply / generate preview`

## What Remains Manual

- Starting the local static target.
- Launching/running Airship CLI.
- Performing sidecar edits.
- Reviewing mapped safe edits before confirmation.
- Triggering any later preview generation.

## Known Limitations

- The proof session is ephemeral browser/server readback state; refreshing the page loses the prepared/mapped workflow state.
- The current proof artifact path is the known CHS Airship proof artifact.
- Mapping applies only supported exact safe text mappings.
- Style, structure, attribute, CSS, script, unsupported, or ambiguous edits remain readback-only.
- A saved draft must exist before confirmed apply can succeed.

## Next Step

Next work should harden preview generation orchestration and the sidecar session lifecycle: durable proof session records, workspace expiry/cleanup, richer operator review of mapped entries, and a separate explicit preview-generation step after draft save.
