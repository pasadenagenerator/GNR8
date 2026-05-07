# ADR-001: Deterministic Pipeline

## Status
Accepted

## Date
2026-05-07

## Context
GNR8 gradi transformacijski sistem, kjer morajo biti outputi reproducibilni. Heuristicni in implicitni prehodi otezujejo validacijo, diagnostiko in zaupanje v runtime rezultat.

## Decision
Sistem privzame deterministic-first pipeline kot primarno arhitekturno nacelo.

To pomeni:
- stage-i imajo eksplicitne input/output contracte,
- isti input pod istimi pogoji mora vrniti isti output,
- fallback mehanizmi morajo biti eksplicitno diagnosticirani,
- brez skritih side-effectov med stage-i.

## Consequences
Pozitivno:
- visja reproducibilnost,
- lazja root-cause analiza,
- boljsa avtomatizirana validacija.

Negativno/trade-off:
- vecja inicialna strogost pri implementaciji,
- vecji strosek discipline pri diagnostics in contract modeliranju.

## Guardrails
- Vsak stage mora zapisati stage-scoped diagnostics.
- Spremembe contractov zahtevajo migracijski plan.
- Silent fallbacki niso dovoljeni.
