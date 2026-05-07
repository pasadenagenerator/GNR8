# GNR8 CURRENT STATE SNAPSHOT

## Snapshot Date
2026-05-07

## Current Phase
Pipeline hardening (import/render consistency + preview reliability).

## Latest Completed Milestone
- Implementirani so bili popravki pod sklopom "Fix imported image discovery".
- Diagnostics sled za import image discovery je bila nadgrajena.
- Validacijski koraki so bili izvedeni, vendar funkcionalni rezultat ni dosegel cilja.

## Current Blocker
- Blocker: Uvozne slike se v preview/runtime se vedno ne prikazujejo pravilno.
- Impact: Preview ni vizualno zanesljiv in blokira potrjevanje kakovosti outputa.
- Temporary workaround: Rocno preverjanje posameznih asset poti in mapiranj.
- Required decision/owner: Nadaljnja root-cause analiza import -> file_map -> preview asset binding poti.

## Next Milestone
- Cilj: Odpraviti neprikazovanje importiranih slik v preview/runtime.
- Success criteria: Importirane slike so reproducibilno vidne po celotnem pipeline-u in v preview.
- Predvidene spremembe: Asset discovery, file_map povezave, preview asset resolution in dodatna diagnostika.
- Required diagnostics: Stage-scoped eventi za image discovery, image binding in preview resolution.

## Pending Codex Tasks
1. Locirati root cause za neprikazovanje slik po "Fix imported image discovery" popravkih.
2. Uvesti deterministic image asset resolution contract cez import/render/previews.
3. Dodati manjkajoco diagnostiko za image binding failure tocke.

## Active Runtime Architecture
- Artifacts model: aktiven, immutable pristop.
- Snapshot strategy: aktivna, vezana na reproducibilen runtime state.
- Preview asset flow: delno stabilen, z odprtim image rendering gap-om.
- File map status: funkcionalen, vendar mogoc mismatch pri image poti/vezavi.
- Runtime diagnostics coverage: dobra osnova, potrebna dodatna granularnost za image path resolution.

## Import Pipeline State
- import_intake: yellow
- structure_preparation: yellow
- layout_preparation: yellow
- render_preparation: yellow
- preview_generation: red

Za vsak stage:
- status: kot oznaceno zgoraj
- known risk: image path/binding inconsistency
- next action: razsirjena diagnostika + contract-level verifikacija image toka

## Database/Schema State
- Aktivne sheme/tabele: brez sprememb v tem snapshotu.
- Kljucna razmerja: artifacts <-> snapshots <-> preview evidence.
- Migracijski status: brez nove migracije v tem snapshotu.
- Schema risks: mozna nezadostna eksplicitnost evidence za image asset lineage.

## Diagnostics Conventions (Current)
- Naming: RAW_IMPORT_*, PIPELINE_*, PREVIEW_*, RUNTIME_*
- Required fields: stage, artifact/snapshot reference, reason code, deterministic correlation key
- Correlation strategy: stage-scoped povezovanje cez pipeline evidence
- Gaps: image-specific binding/resolution failure reason codes

## Deploy/Validation Endpoints
- Preview URL(s): definirano v operativnem okolju projekta
- Validation URL(s): definirano v operativnem okolju projekta
- Last verified: 2026-05-07
- Verification evidence: slike se se vedno ne prikazejo kljub zadnjim popravkom

## Worker/Runtime Status
- Worker queue health: brez potrjenega kriticnega izpada
- Runtime job health: delno degradirano pri image preview rezultatu
- Retry behavior: aktivno
- Failure patterns: ponavljajoce image non-rendering stanje po importu

## Open Decisions (Needs ADR)
- Ali image resolution contract ostane centraliziran v render_preparation ali se razdeli po stage-ih.
- Kako strogo formalizirati image lineage evidence v diagnostics payload-u.

## Known Risks
- Vizualna nezanesljivost preview-ja lahko prikrije druge regressione.
- Brez image-lineage evidence je root-cause analiza pocasnejsa.

## Notes for New Thread Bootstrap
Pri zacetku novega chata vedno prilepi:
1. GNR8_MASTER_CONTEXT_BOOTSTRAP.md
2. GNR8_CURRENT_STATE.md
3. GNR8_TASK_EXECUTION_PROTOCOL.md
