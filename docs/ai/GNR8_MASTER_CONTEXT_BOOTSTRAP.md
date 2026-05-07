# GNR8 MASTER CONTEXT BOOTSTRAP

## 1) What GNR8 Is
GNR8 je inteligenten sistem za transformacijo spletnih strani v deterministican, reproducibilen runtime.
GNR8 ni klasicen website builder in ni klasicen CMS.
Primarni cilj je zanesljiv pipeline: import -> analiza -> priprava -> render -> preview -> publish.
Dolgorocna vizija vkljucuje avtonomni reasoning sloj, zgrajen na stabilni deterministcni osnovi.

## 2) Core Principles
- Deterministic-first: isti vhod mora dati isti izhod.
- No hidden magic: brez skritih heuristik brez evidence.
- Diagnostics everywhere: vsak pomemben korak mora imeti diagnosticni izpis.
- Typed contracts: meje med komponentami so strogo definirane.
- Reproducible outputs: izhod mora biti ponovljiv.
- Linear pipelines: jasni stage-i, brez nevidnih side-effectov.
- Explicit evidence: odlocitve morajo imeti sledljive dokaze.
- No silent fallbacks: fallback je dovoljen samo, ce je eksplicitno logiran.

## 3) System Architecture Backbone
- Import layer: ingest vhodnih virov in normalizacija.
- Code layer: struktura kode, mapiranje, priprava runtime artefaktov.
- Content layer: vsebinski model, binding, validacija.
- Editing layer: kontrolirane spremembe z jasnimi pravili.
- Publish layer: preverjen izvoz in objava z evidence trail.

## 4) Implemented Pipeline Model
Trenutni logicni pipeline:
1. import_intake
2. structure_preparation
3. layout_preparation
4. render_preparation
5. preview_generation

Vsak stage mora:
- sprejeti definiran input contract,
- oddati definiran output contract,
- zapisati stage-scoped diagnostics.

## 5) Runtime Model
Runtime temelji na:
- artifacts (immutable enote)
- runtime snapshots
- preview assets
- file_map
- diagnostics
- persisted evidence

Vse komponente morajo biti medsebojno sledljive z deterministcnimi ID-ji.

## 6) Database Principles
- Immutable artifacts kot osnovna enota.
- Deterministic IDs kjer je mogoce.
- Append-only diagnostics.
- Evidence-first persistence (najprej dokaz, potem interpretacija).

## 7) Diagnostics Philosophy
Naming konvencije:
- RAW_IMPORT_*
- PIPELINE_*
- PREVIEW_*
- RUNTIME_*

Pravila:
- deterministic
- machine-readable
- attributable (jasen izvor)
- stage-scoped (vezano na pipeline korak)

## 8) Codex Collaboration Workflow
- Naloge so podane v strukturiranih TXT blokih.
- Brez arhitekturnega drifta brez eksplicitne odlocitve.
- Brez spekulativnih refaktorjev.
- Vsaka sprememba mora imeti:
  - success criteria,
  - seznam datotek,
  - diagnostics additions,
  - validation evidence.

## 9) Architecture Safety Rules
- Ne spreminjaj osnovne arhitekture brez ADR.
- Ne uvajaj implicitnega fallback vedenja.
- Ne krsi obstojecih contractov brez migracijskega plana.
- Ne odstranjuj diagnostike brez enakovredne izboljsave.

## 10) ADR Policy
Arhitekturne odlocitve se zapisujejo v `docs/ai/decisions/` kot ADR zapisi.
Primeri:
- ADR-001-deterministic-pipeline.md
- ADR-002-preview-assets-architecture.md
- ADR-003-runtime-artifact-model.md
