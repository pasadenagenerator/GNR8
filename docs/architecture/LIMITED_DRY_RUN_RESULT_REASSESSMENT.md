# Limited Dry Run Result Re-Assessment

## Scope

Phase 8B-12M is an audit, scoring, package-boundary decision, and documentation phase only. It reassesses the successful Phase 8B-12L result for `siteVersionId = 09dce7ea-d860-4f60-a1eb-26c3335b302e`, source `https://www.odv-cvijanovic.si/?gnr8_f12=20260617`, and persisted artifact `first_limited_dry_run_output_4e86f6e01f67640ec0fd70bdf9cbf445`.

No import, capture, dry-run execution, output creation, candidate discovery, candidate review, reconstruction, AI, generation, publishing, worker job, migration, schema change, or application behavior change was performed.

## What 8B-12L Proves

- A fresh production import can produce the persisted rendered evidence required by the existing bounded Limited Dry Run chain.
- Persisted layout geometry, section evidence, and navigation evidence can be consumed by the existing deterministic builder without recomputing or inventing evidence.
- The existing builder can produce one Route Model, one Navigation Model, and two Section Models for a real simple site.
- The output contract and validator accept that evidence-only result with zero limitations, zero blockers, and `outputStatus = valid`.
- Existing persistence and latest-output readback preserve the output identity, status, counts, and validation result.
- The existing read-only projection can load the persisted result, and the admin surface exposes the required labels without action controls.
- The bounded chain preserves its safety boundary: no React, GNR8 blocks, CMS bindings, content model, design token model, publishing artifact, or generated output container was present.

## What 8B-12L Does Not Prove

- It does not prove the chain generalizes beyond one simple public site, one route, one viewport capture, or the observed navigation and section shapes.
- It does not prove runtime mutation, lazy-loaded content, client-side route changes, authenticated content, complex widgets, or dynamic navigation handling.
- It does not prove reconstruction-grade style, content, block, media, widget, or design-token coverage; the Evidence Capture baseline remains `baseline_partial`.
- It does not prove candidate discovery or candidate review execution. Neither workflow exists, and no candidate or review artifact was created.
- It does not prove a durable ready ReconstructionDryRunPackage lifecycle. The 8B-12L package was transient and correctly blocked from metadata-only `not_ready` input.
- It does not prove reconstruction, AI reconstruction, React/block generation, CMS binding, approval, mutation, or publishing capability.

## Evidence Quality Summary

Evidence quality is **strong for the bounded static diagnostic claim and insufficient for generalization**. The fresh capture used rendered DOM with strong quality and persisted one layout geometry record containing three regions, two section evidence records, one navigation evidence record, and six navigation items. Paths and evidence were read from persisted capture artifacts, not synthesized for the dry run.

The evidence remains partial at reconstruction scope. Computed style sampling is bounded, the baseline status is partial, runtime mutation evidence is absent, and only one real-site sample has passed. Zero dry-run limitations is a property of this bounded input and model contract; it is not proof that the source site has no reconstruction limitations.

## Dry-Run Output Summary

| Field | Result |
| --- | --- |
| artifact ref | `first_limited_dry_run_output_4e86f6e01f67640ec0fd70bdf9cbf445` |
| validation | `valid` |
| Route Models | `1` |
| Navigation Models | `1` |
| Section Models | `2` |
| limitations | `0` |
| blocker limitations | `0` |
| latest-output readback | passed |
| read-only projection | loaded |

## Validation And Safety Summary

The persisted output passed the existing contract validator with no errors or warnings. Readback returned the same identity and counts. Recursive forbidden-key scanning found no generated or publishing fields. The read-only surface showed the required model labels and no form, button, input, textarea, or select controls.

This validates the current diagnostic chain only. It does not authorize package promotion, candidate work, reconstruction, generation, mutation, or publishing.

## Capability Matrix

| Capability | Status | Notes |
| --- | --- | --- |
| Fresh import rendered capture | PROVEN_ONCE | F12 passed on one fresh public real site with rendered capture available and strong. |
| Evidence baseline persistence | PARTIAL | Baseline, rendered DOM, geometry, section, and navigation evidence persist; overall status remains `baseline_partial`. |
| Layout geometry | PROVEN_ONCE | One persisted evidence record with three regions fed the bounded result. |
| Section evidence | PROVEN_ONCE | Two persisted section records produced two Section Models. |
| Navigation evidence | PROVEN_ONCE | One persisted navigation record with six items produced one Navigation Model. |
| Limited Dry Run builder | PROVEN_ONCE_REAL_SITE | Deterministic Route/Navigation/Section output passed on the first real site. |
| Limited Dry Run persistence | PROVEN_ONCE_REAL_SITE | Output persisted and loaded back with matching identity, counts, and validation. |
| Read-only surface | PROVEN_ONCE_REAL_SITE | Projection loaded and required labels appeared without action controls. |
| Candidate discovery | CONTRACT_ONLY | Contract exists; discovery execution and persistence do not. |
| Candidate review | CONTRACT_ONLY | Contract exists; review execution and persistence do not. |
| Reconstruction package | METADATA_ONLY | Contract/helper exists; the 8B-12L transient package was correctly blocked and was not persisted. |
| AI reconstruction | NOT_IMPLEMENTED | Not exercised or authorized. |
| React/block generation | NOT_IMPLEMENTED | No generated React or GNR8 blocks exist in the output. |
| Publishing | NOT_IMPLEMENTED | No publishing artifact or execution path was exercised or authorized. |

## Remaining Boundaries

- Generalization beyond the first simple real-site sample is unproven.
- Runtime mutation capture remains absent and is required before claiming support for dynamic sites.
- Candidate discovery and review remain contract-only.
- A ready durable ReconstructionDryRunPackage cannot be justified before real candidate/review inputs exist.
- Content, block, design-token, AI, React/GNR8 generation, CMS binding, reconstruction execution, and publishing remain outside the proven boundary.

## Next-Boundary Options

| Option | Value | Risk | Dependency | Why now / why not now |
| --- | --- | --- | --- | --- |
| A. Candidate Discovery implementation | Would begin producing reconstruction candidates from evidence. | High: may encode assumptions fitted to a single source and expands behavior beyond the proven diagnostic chain. | Stable evidence behavior across more than one real site; explicit discovery execution and persistence design. | Not now. One passing site is too narrow a basis for candidate semantics. |
| B. Candidate Review implementation | Would create a human decision boundary for discovered candidates. | High: a review workflow without real discovery output would be contract-driven rather than evidence-driven. | Candidate Discovery implementation and persisted candidate artifacts. | Not now. Its upstream execution dependency does not exist. |
| C. Limited Dry Run package formalization | Would make package identity and lifecycle durable. | Medium: may formalize the artificial transient `not_ready` package used only to enter the evidence-only diagnostic builder. | Clear candidate discovery/review lifecycle and a demonstrated need for durable package state. | Not now. The transient blocked package behaved correctly, and formalization would not increase evidence confidence. |
| D. Runtime Mutation Capture | Would extend evidence to dynamic and client-mutated pages. | Medium-high: expands capture behavior, artifact shape, persistence, and validation surface. | A separately designed capture phase with dynamic-site fixtures and stop conditions. | Valuable later, but too broad for the immediate question of whether the current static chain generalizes. |
| E. Second real-site Limited Dry Run validation | Tests whether the existing unchanged chain works on another simple public site and reveals first-site overfitting. | Low: bounded operational validation using the existing chain, with no new behavior if scoped identically. | A separately authorized simple public target and the existing fresh import/capture/dry-run path. | Now. It provides the highest-confidence next evidence at the lowest architectural expansion risk. |

## Decision

Recommend exactly one next phase: **Phase 8B-12N - Second Real-Site Limited Dry Run Validation**.

Use a second simple public real site and the unchanged bounded Route, Navigation, and Section chain. Require fresh rendered capture, persisted baseline evidence, valid output persistence/readback, read-only projection, and the same forbidden-output checks. Stop after validation and comparison with the first result. Do not implement candidate discovery, candidate review, package formalization, runtime mutation capture, reconstruction, AI, generation, CMS binding, or publishing in that phase.

## Post 8B-12N Portability Result

Phase 8B-12N completed with **PASS** on ViroiDoc using fresh `siteVersionId = e26b0754-988b-45b9-9e24-8e213179b6cf`. The unchanged production path persisted rendered DOM, one layout geometry record with four regions, three section evidence records, and one navigation evidence record with 29 items.

The authoritative latest Limited Dry Run artifact is `first_limited_dry_run_output_f913707d4cfeda4a1d2ab8bdc4a054fc`. It has `outputStatus = valid`, Route/Navigation/Section counts `1 / 1 / 3`, limitations/blockers `18 / 0`, no validation errors or warnings, exact semantic readback, and a present/valid read-only projection. Required route, navigation, and section labels are visible without action controls.

This advances capture, evidence, builder, persistence, and surface portability from proven once to proven on two distinct public real sites. It also shows that richer pages can produce materially more non-blocking limitations and broader navigation extraction than the first sample, so cross-site model quality should be reassessed before Candidate Discovery design or implementation.

Detailed evidence: `docs/architecture/SECOND_REAL_SITE_LIMITED_DRY_RUN_VALIDATION.md`.

Recommended next phase: **Phase 8B-12O - Cross-Site Evidence and Model Quality Re-Assessment**, documentation/read-only only.
