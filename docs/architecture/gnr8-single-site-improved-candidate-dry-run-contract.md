# GNR8 Single-Site Improved Candidate Dry-Run Contract

Phase: MVP-22
Scope: Design-only dry-run fixture contract for future improved candidate adapter validation.

This document does not implement a dry-run adapter, runtime mutation, SQL, TypeScript, services, routes, UI, AI calls, provider calls, content edits, publish, rollback, commit, or push behavior.

## Purpose

The dry-run fixture proves that the future improved candidate adapter can resolve the exact governed inputs, inspect the accepted clone baseline, map selected recommendations into a deterministic planned change set, produce watermarks and output placeholders, and prove that no runtime mutation occurred.

Dry-run is not execution approval. Dry-run is not implementation authorization. Dry-run is not content approval, client approval, launch approval, or publish approval.

## Timing

Dry-run must run after MVP-20 execution-time AAF validation succeeds. It must use the same input contract as future execute mode. It must be compatible with MVP-21 execution attempt refs/items/events, but it must not mark a completed execution that implies runtime mutation.

## Required Inputs

The dry-run input is the adapter input defined in `docs/architecture/gnr8-single-site-improved-candidate-adapter-design.md`.

Dry-run must fail closed when any of these are missing:

- tenant/client/site/migration identity;
- execution attempt ref;
- successful MVP-20 validation result;
- implementation authorization refs and limitations;
- proposal plan ref and proposal approval refs;
- selected recommendation refs;
- proposal limitations;
- clone review ref;
- source evidence review ref;
- clone site version ref;
- clone runtime artifact ref;
- implementation scope summary;
- non-goals;
- actor;
- correlation id;
- idempotency key;
- semantic input watermark.

## Read-Only Inspection

Dry-run may inspect:

- clone runtime site version via read-only runtime-store functions;
- clone runtime artifact via read-only runtime-store functions;
- selected recommendations from already persisted proposal planning rows;
- MVP-21 execution attempt refs/items in read-only or append-only fixture form;
- WU/VCU/CGP/source evidence refs as evidence/advisory inputs;
- Generated Proposal Bundle refs as advisory evidence only.

Dry-run must not:

- create runtime site versions;
- create artifacts;
- bind artifacts;
- mutate site version provenance;
- mutate page versions;
- mutate content overrides;
- publish;
- switch active pointer;
- rollback;
- call AI providers;
- call external providers;
- create Generated Proposal Bundles.

## Planned Change Set

Dry-run must compute a `plannedChangeSet`:

- `changeSetId`, deterministic from semantic input;
- `sourceCloneSiteVersionRef`;
- `sourceCloneArtifactRef`;
- `targetCandidateSiteVersionPlaceholder`;
- `targetArtifactPlaceholder`;
- `selectedRecommendationsApplied`;
- `selectedRecommendationsNotApplied`;
- `plannedPageChanges`;
- `plannedMetadataChanges`;
- `plannedAssetChanges`;
- `plannedStyleTokenChanges`;
- `limitationsCarriedForward`;
- `warnings`;
- `unsupportedRecommendationCount`;
- `manualOperatorInputRequiredCount`.

Each planned change must include:

- stable change id;
- recommendation ref;
- category;
- target page/path/section/field/asset/token identity where available;
- current source hash or watermark;
- planned value hash or deterministic placeholder hash;
- evidence refs;
- limitation refs;
- execution support status: `deterministic_supported`, `operator_input_required`, `advisory_only`, `unsupported`, or `deferred_manual`;
- no-write proof entry.

## Deterministic Placeholder Refs

Dry-run must compute expected output refs without writing:

- `expectedImprovedCandidateSiteVersionRef`: `dry-run:gnr8_runtime_site_versions:<deterministic-id>`;
- `expectedImprovedRuntimeArtifactRef`: `dry-run:gnr8_runtime_artifacts:<deterministic-id>`;
- `expectedArtifactBundleSha256`: deterministic digest over clone snapshot plus supported planned changes;
- `expectedSemanticOutputWatermark`: deterministic digest over semantic input, planned change set, expected artifact bundle hash, carried limitations, and unsupported recommendations.

The deterministic ids should be stable for identical inputs and must change on semantic drift.

## Watermarks

Dry-run must compute:

- semantic input watermark;
- proposal plan watermark;
- selected recommendations watermark;
- implementation authorization evidence watermark;
- execution-time validation watermark;
- clone site version watermark;
- clone runtime artifact watermark;
- WU/VCU/CGP evidence watermarks where available;
- planned change set watermark;
- semantic output watermark;
- limitations watermark;
- no-write proof watermark.

## No-Write Proof

Dry-run must return explicit proof fields:

- `runtimeWritePerformed: false`;
- `siteVersionCreated: false`;
- `artifactCreated: false`;
- `artifactBound: false`;
- `contentOverrideMutated: false`;
- `activePointerChanged: false`;
- `published: false`;
- `rolledBack: false`;
- `generatedProposalBundleCreated: false`;
- `aiProviderCalled: false`;
- `externalProviderCalled: false`;
- `contentApproved: false`;
- `clientApproved: false`;
- `launchApproved: false`;
- `publishApproved: false`.

Where feasible in MVP-23, dry-run should include pre/post read counts or sentinel reads for runtime site versions, runtime artifacts, active pointers, content overrides, and Generated Proposal Bundle provenance. These read proofs must be local/test-only and must not require production or external providers.

## Result Envelope

Dry-run result:

- `mode: "dry_run"`;
- `status`: `planned`, `planned_with_limitations`, or `blocked`;
- `executionAttemptRef`;
- `inputRefs`;
- `plannedChangeSet`;
- `dryRunSummary`;
- `expectedOutputRefs`;
- `selectedRecommendationRefsApplied`;
- `recommendationsNotApplied`;
- `limitationsCarriedForward`;
- `warnings`;
- `evidenceRefs`;
- `watermarks`;
- `noWriteProof`;
- `idempotency`: `new_plan`, `reused_existing_plan`, or `semantic_drift_blocked`;
- non-approval boundary flags all false.

Dry-run should be recordable as MVP-21 execution items/refs:

- `validation_ref` for the MVP-20 validation;
- `input_ref` for proposal, clone, source evidence, WU/VCU/CGP refs;
- `selected_recommendation` items;
- `limitation` items;
- `warning` items;
- `output_ref` items for deterministic placeholders only, marked `dry_run_placeholder`;
- `manual_note` item for operator review.

## Attempt Semantics

Dry-run can move an attempt to `ready` only when MVP-20 validation allows start and the dry-run plan is coherent. It should not mark `completed` unless MVP-21 explicitly supports a future-boundary fixture that cannot be mistaken for runtime mutation. The safer MVP-23 behavior is to record refs/items and leave the attempt ready for future execute review.

Execute mode in MVP-24 should require either:

- a successful dry-run result with matching semantic input watermark; or
- an explicitly equivalent validation path that recomputes the same input/output watermarks immediately before mutation.

## Failure And Repair

Dry-run must block with structured reasons for:

- missing or stale AAF validation;
- selected recommendation drift;
- proposal scope drift;
- clone/source evidence drift;
- clone runtime version/artifact missing;
- unsupported recommendation without explicit deferral;
- missing operator-authored replacement value for deterministic change;
- missing asset evidence or licensing/source authorization;
- attempted substitution of content/client/launch/publish approval;
- attempted Generated Proposal Bundle truth substitution;
- idempotency semantic drift.

Failures should be repairable by updating selected recommendation refs, adding operator-authored mappings, refreshing validation, or deferring unsupported recommendations.
