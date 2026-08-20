# GNR8 Single-Site MVP-CUTLINE-39 MVP-20 Semantic Replay Reconciliation

Date: 2026-08-20
Site: `chs.si`
Scope: local MVP-20 implementation authorization semantic replay contract, tests, and docs only

## Result

MVP-20 semantic replay was made deterministic for future implementation authorization requests. The bridge now persists a versioned `implementationAuthorizationSemanticReplay` contract in the AAF evidence package JSON, and execution-time validation uses that stored replay contract to reproduce the original implementation authorization semantic input instead of reconstructing volatile pieces from execution-time placeholders.

No improvement execution was run.

## Root Cause

CUTLINE-38 failed because the original implementation authorization semantic input was not durably echoed in the AAF rows created at CUTLINE-35. The evidence package stored the final source watermark plus some human-readable scope/non-goal fields, but not the canonical semantic input used to compute that watermark.

At MVP-20 execution-time validation, the validator rebuilt the semantic input from current execution-time arguments. That reconstruction drifted in these roles:

- `implementation_target`
- `implementation_attempt_placeholder`
- `implementation_scope_summary`
- `implementation_non_goals`
- `operator_notes`
- `freshness_check`

The attached AAF evidence package watermark was `single-site-implementation-authorization:d5339d4f0df08b75858506161f5584be83da934a1147865423a243f6b40fe321`, while the best reconstructable execution-time semantic input produced `single-site-implementation-authorization:1949f45661be2cae6bf32419177ac7d658192eb198fbb97551e90458b130749b`.

## Fix Chosen

The canonical replay contract is stored in existing AAF evidence package JSON under `limitations_json.implementationAuthorizationSemanticReplay`. No SQL migration is required.

The stored replay contract includes:

- contract name/version;
- canonical semantic watermark;
- full original `ImplementationAuthorizationSemanticInput`;
- computed `implementation_target` and `implementation_attempt_placeholder` refs;
- original `implementationScopeSummary`;
- original `implementationNonGoals`;
- original `operatorNotes`;
- original freshness policy/version/current-watermark tuple.

Execution-time validation now:

- requires the stored replay contract;
- validates the replay contract version and required fields;
- recomputes the stored semantic input watermark and requires it to equal the persisted evidence watermark;
- validates request, decision, evidence, refs, freshness, expiry, revocation, supersession, and scope using the stored authorization semantic input and policy version;
- still blocks proposal/recommendation/scope drift against execution-time source truth;
- preserves proposal-event approval refs as evidence only.

## Fail-Closed Behavior

Validation blocks if replay data is missing, malformed, incomplete, or mismatched. Validation also continues to block stale, revoked, superseded, expired, wrong-scope, wrong-subject, and wrong-evidence decisions.

The fix does not bypass `evidence_stale` or `policy_version_mismatch`. Instead, policy-version checks are made against the stored authorization policy version from the original request, and freshness rows must match the stored replay freshness policy/version tuple.

## Existing Production Rows

Existing production AAF request `c27957ac-2fdd-4e5f-809f-e5a16e9a8f83`, decision `12adb404-b9f6-4961-aa7a-63e24e023b12`, and evidence package `042a8233-5f36-4b9d-a9ee-6ca218b7c9e3` do not contain the new stored replay contract. They cannot be safely repaired locally without mutating production AAF rows or inventing missing operator-note/replay inputs after the fact.

Therefore, the existing production AAF request/decision cannot be reused for a future MVP-20 retry under the fixed contract.

## Required Retry Path

After this local fix is deployed through the normal release path, CUTLINE-40 must create a fresh exact-scope implementation authorization request/evidence package using the fixed bridge, then obtain a fresh human AAF implementation authorization decision for that new request before retrying MVP-20 improvement execution validation.

No production AAF rows were created or mutated in CUTLINE-39.

## Validation

Passed locally:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/implementation-authorization-bridge.test.ts apps/platform/gnr8/single-site/improvement-execution-aaf-validator.test.ts`
- `pnpm exec tsc --noEmit --pretty false --skipLibCheck --target es2022 --moduleResolution bundler --module esnext apps/platform/gnr8/single-site/implementation-authorization-bridge.ts apps/platform/gnr8/single-site/improvement-execution-aaf-validator.ts apps/platform/gnr8/single-site/implementation-authorization-bridge.test.ts apps/platform/gnr8/single-site/improvement-execution-aaf-validator.test.ts`

Covered by focused tests:

- original authorization request semantic input replays exactly;
- proposal-event approval evidence remains evidence only;
- missing stored replay data blocks;
- missing stored operator notes, scope summary, and non-goal fields block;
- mismatched stored replay data blocks;
- granted valid decision passes;
- wrong scope still fails;
- validation tests create no improvement execution attempt.

## Boundary

No production execution retry, improvement execution attempt, improved candidate, content/client/launch approval, launch readiness, publish activation request/decision/gate, publish dry-run, shadow-publish, runtime publish, active pointer mutation, provider/DNS/domain/billing mutation, deployment, production migration, env mutation, commit, or push occurred.

## Recommended Next Milestone

Deploy the fixed replay contract through the normal release process, then run MVP-CUTLINE-40 to create a fresh implementation authorization request/decision using the fixed contract before retrying MVP-20 validation.
