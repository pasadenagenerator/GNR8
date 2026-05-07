# ADR-003: Runtime Artifact Model

## Status
Accepted

## Date
2026-05-07

## Context
GNR8 potrebuje model, ki podpira stabilen runtime, auditabilnost in primerjavo med izvedbami pipeline-a.

## Decision
Runtime temelji na immutable artifacts + snapshots + diagnostics evidence modelu.

To pomeni:
- artifacts so immutable gradniki,
- runtime snapshot predstavlja deterministcno stanje v tocki izvedbe,
- diagnostics so append-only in attributable,
- runtime interpretacija mora biti vezana na persisted evidence.

## Consequences
Pozitivno:
- boljsa auditabilnost,
- enostavnejsa primerjava med izvedbami,
- manj nepojasnjenih runtime odstopanj.

Negativno/trade-off:
- vec podatkovnega volumna,
- vec discipline pri versioniranju snapshotov in evidenc.

## Guardrails
- Mutable overwrite artefaktov ni dovoljen.
- Snapshot mora referencirati uporabljene artifacts.
- Vsak kriticen runtime dogodek mora imeti diagnosticni zapis.
