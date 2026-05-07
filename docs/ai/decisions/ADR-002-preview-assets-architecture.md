# ADR-002: Preview Assets Architecture

## Status
Accepted

## Date
2026-05-07

## Context
Preview je kljucna validacijska povrsina GNR8 pipeline-a. Nepopolna sledljivost assetov (zlasti slik) povzroci neujemanje med importiranim stanjem in dejanskim preview izrisom.

## Decision
Preview assets arhitektura mora biti evidence-first in deterministic.

To pomeni:
- vsak preview asset mora imeti sledljiv lineage do izvornega artefakta,
- file_map mora biti ekspliciten in strojno preverljiv,
- image discovery, binding in resolution koraki morajo imeti locene diagnostics evente,
- preview resolution ne sme uvajati skritih runtime-only popravkov.

## Consequences
Pozitivno:
- hitrejsa detekcija image rendering napak,
- manj regresij med import in preview,
- jasna sledljivost za debugging.

Negativno/trade-off:
- vec diagnostike in vec payload discipline,
- potreben dosleden contract management med stage-i.

## Guardrails
- Vsaka image resolution napaka mora imeti reason code.
- Preview sloj ne sme prikrivati napak z netransparentnimi fallbacki.
- Validation mora potrditi prisotnost in resolvability assetov.
