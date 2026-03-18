# BETA_MIGRATION_DRY_RUN_PROTOCOL

## Purpose
This protocol defines a deterministic dry-run procedure for the first real beta landing-page migration using the existing phase-1 migration spine. It is operational discipline only. It does not change migration engine runtime behavior.

## Scope Guardrails
- No pipeline changes.
- No importer runtime changes.
- No renderer/export runtime changes.
- No UI additions.
- No persistence additions.
- No network side effects beyond the already-supported operator flow.

## A) Pre-Migration Checklist
Before running migration:

1. URL availability
- Confirm the source URL returns HTTP 200 in a normal browser session.
- Confirm no transient outage at time of run.

2. Public accessibility
- Page must be publicly accessible.
- No IP allowlist/VPN-only origin for the dry-run.

3. No auth
- No login wall, cookie gate requiring auth, or protected route.
- If auth is required, stop and classify as `HARD_BLOCKER`.

4. Single entry page assumption
- This protocol assumes one landing-page entry URL.
- Secondary pages are out of scope for phase-1 beta dry-run.

5. Snapshot expectations
- Operator must capture deterministic artifacts:
  - URL import simulation result
  - validation summary
  - materialize result
  - preview URL
  - static output bundle location

6. Asset type expectations
- Expected best-effort support: local images, local CSS, local JS references.
- Known degraded scenarios: remote fonts, remote scripts, dynamic runtime content.

7. JS execution limitations
- Phase-1 is static-oriented and does not guarantee full client-side app execution parity.
- JS-dependent personalization/animation may degrade.

8. Expected degraded scenarios
- Font substitution.
- Missing favicon.
- Hero/background media fallback.
- Reduced animation fidelity.

## B) Migration Execution Steps
Execute in this exact order:

1. Run URL import in simulation mode
- Use the existing URL import operator path configured for simulation only.

2. Inspect validation summary
- Confirm summary exists and is structurally complete.
- Record warning and blocking codes.

3. Run materialize
- Execute existing materialization flow without custom patches.

4. Verify preview hosting
- Open generated preview URL.
- Confirm page loads and core structure is visible.

5. Verify static bundle output
- Confirm static output directory exists.
- Confirm `index.html` and referenced local assets are present.

## C) Visual Parity Evaluation Method
Evaluate source vs migrated output using deterministic manual checks:

1. Layout structure parity
- Same major sections in same top-level order.

2. Typography parity
- Heading/body hierarchy preserved even if exact fonts differ.

3. Spacing parity (coarse)
- Relative spacing consistency (tight/normal/wide) at section level.

4. Imagery presence parity
- Critical imagery present (hero/product/supporting).

5. CTA presence parity
- Primary CTA and at least one secondary CTA preserved where present in source.

6. Navigation structure parity
- Main nav items and CTA nav action preserved.

7. Responsive sanity check
- Basic desktop and mobile viewport checks:
  - No catastrophic overlap
  - No hidden primary CTA
  - No broken first-screen composition

Phase-1 parity statement:
- Pixel-perfect parity is **not** a phase-1 goal.

## D) Export Quality Scoring Model (0-5)
Each axis is scored as an integer `0..5`:
- `0`: unusable
- `1`: severe degradation
- `2`: major degradation
- `3`: acceptable with visible degradation
- `4`: good minor degradation
- `5`: strong parity for phase-1 expectations

Axes:
- Structural fidelity (weight `0.30`)
- Visual coherence (weight `0.25`)
- Asset integrity (weight `0.20`)
- Content completeness (weight `0.15`)
- Layout semantic correctness (weight `0.10`)

Deterministic formula:
- `overall = round2(sum(axisScore * weight))`
- `normalizedPercent = round((overall / 5) * 100)`

Where:
- `round2(x) = Math.round(x * 100) / 100`

## E) Failure Classification Framework
Run-level classes:
- `HARD_BLOCKER`
- `DEGRADED_UNACCEPTABLE`
- `DEGRADED_ACCEPTABLE`
- `COSMETIC_ONLY`

Deterministic issue mapping examples:

| Issue Example | Class |
| --- | --- |
| broken layout grid | `HARD_BLOCKER` |
| missing hero image | `DEGRADED_UNACCEPTABLE` |
| font mismatch | `DEGRADED_ACCEPTABLE` |
| missing favicon | `COSMETIC_ONLY` |

Run-level classification rule:
1. If any finding maps to `HARD_BLOCKER` -> run class is `HARD_BLOCKER`.
2. Else if any finding maps to `DEGRADED_UNACCEPTABLE` -> run class is `DEGRADED_UNACCEPTABLE`.
3. Else if any finding maps to `DEGRADED_ACCEPTABLE` -> run class is `DEGRADED_ACCEPTABLE`.
4. Else -> run class is `COSMETIC_ONLY`.

## F) Post-Run Decision Matrix
Default proceed threshold:
- `PROCEED_WITH_MANUAL_POLISH_SCORE_THRESHOLD = 3.5`

Deterministic decision:
1. If classification is `HARD_BLOCKER` -> `stop_beta_migration`.
2. Else if classification is `DEGRADED_UNACCEPTABLE` -> `engine_improvement_required`.
3. Else if `overallScore >= 3.5` -> `proceed_with_manual_polish`.
4. Else -> `engine_improvement_required`.

## Dry-Run Report Requirement
Every run must produce one structured report artifact with:
- source URL and snapshot ID
- validation summary
- parity findings
- degradation findings
- scored export quality
- run classification
- operator decision
- optional timestamp (ignorable for deterministic comparisons)
