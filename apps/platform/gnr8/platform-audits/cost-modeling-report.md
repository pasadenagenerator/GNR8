# Cost Modeling Report

## 1. Cost Model Constants

Defined in `apps/platform/gnr8/billing/cost-model.ts`:

- AI
  - `INPUT_PER_1M = 0.20`
  - `OUTPUT_PER_1M = 0.80`
- Runtime
  - `PER_REQUEST = 0.00001`
  - `PER_MB = 0.0001`

## 2. AI Cost Formula

For each new AI usage event:

- `input_cost = (prompt_tokens / 1_000_000) * INPUT_PER_1M`
- `output_cost = (completion_tokens / 1_000_000) * OUTPUT_PER_1M`
- `estimated_cost = round_6(input_cost + output_cost)`

Fallback behavior:

- If token counts are missing or zero, `estimated_cost = 0`.

## 3. Runtime Cost Formula

For each new runtime usage event:

- `request_cost = request_count * PER_REQUEST`
- `bandwidth_cost = (bandwidth_bytes / (1024 * 1024)) * PER_MB`
- `estimated_cost = round_6(request_cost + bandwidth_cost)`

Fallback behavior:

- Missing `request_count` or `bandwidth_bytes` is treated as `0`.

## 4. Assumptions

- Costs are estimation-only and not used for customer billing.
- Runtime compute milliseconds are captured but not currently priced.
- Event schemas and aggregation behavior remain unchanged.
- Existing unified aggregation remains valid because it already sums `estimated_cost`.

## 5. Known Inaccuracies

- AI model/provider-specific rates are not applied yet.
- Tokenization and provider-side discounts/rounding are not represented.
- Runtime infrastructure costs are approximated with only request and bandwidth proxies.
- Per-region, cache hit/miss, and egress tier differences are not modeled.

## 6. Validation Results

- Type check (`pnpm exec tsc --noEmit`): passed.
- Tests (targeted runtime/billing tests): passed.
  - `gnr8/billing/cost-model.test.ts`
  - `gnr8/runtime/runtime-usage-event-logger.test.ts`
  - `gnr8/runtime/runtime-usage-flusher.test.ts`
- Build (`pnpm exec next build` in `apps/platform`): passed.
- Live event verification:
  - Triggered 3 AI events and 3 runtime events via existing logging services using production-connected env (`set -a; source .env.production; set +a; ...`).
  - Query output sample (`order by created_at desc limit 5`):
    - AI rows: `estimated_cost` values included `0.000300`, `0.000540`, `0.000480`.
    - Runtime rows: `estimated_cost` values included `0.000016`, `0.000021`, `0.000018`.
- Unified cost verification:
  - Site `91fb0854-9b84-4c4b-aff4-777043ab6451` returned:
    - `ai_estimated_cost_sum = 0.00264`
    - `runtime_estimated_cost_sum = 0.00011`
    - `total_estimated_cost = 0.00275`
  - Result confirms unified totals are now non-zero.

## 7. Next Improvement Ideas

- Add provider/model lookup table for AI rates with explicit fallback defaults.
- Add optional runtime compute cost (`PER_COMPUTE_MS`) once baseline infra cost data is calibrated.
- Add a lightweight calibration script to compare estimated totals against actual provider invoices.
- Add monitoring alerts when rolling 7-day estimated cost diverges sharply from expected ranges.
