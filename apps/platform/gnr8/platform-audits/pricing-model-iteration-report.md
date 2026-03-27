# Pricing Model Iteration Report

## 1. Plan Definitions

Defined in `apps/platform/gnr8/billing/pricing-model.ts`:

- `STARTER`
  - `price = 20`
  - `included_ai_cost = 1`
  - `included_runtime_cost = 1`
  - `ai_overage_multiplier = 1.2`
  - `runtime_overage_multiplier = 1.2`
- `GROWTH`
  - `price = 50`
  - `included_ai_cost = 5`
  - `included_runtime_cost = 5`
  - `ai_overage_multiplier = 1.1`
  - `runtime_overage_multiplier = 1.1`
- `MANAGED`
  - `price = 150`
  - `included_ai_cost = 20`
  - `included_runtime_cost = 20`
  - `ai_overage_multiplier = 1.05`
  - `runtime_overage_multiplier = 1.05`

## 2. Pricing Formulas

For a site:

- `ai_overage = max(0, ai_cost - included_ai_cost)`
- `runtime_overage = max(0, runtime_cost - included_runtime_cost)`
- `total_revenue = base_price + ai_overage * ai_overage_multiplier + runtime_overage * runtime_overage_multiplier`
- `margin = total_revenue - total_estimated_cost`
- `margin_percentage = margin / total_revenue` (safe `0` when revenue is `0`)

Flags:

- `is_overage_heavy`: overage exceeds included usage envelope (`overage / included > 1`)
- `is_plan_fit_good`: profitable with low overage pressure (`overage / included <= 0.5`)
- `is_plan_loss_making`: `margin < 0`

## 3. Sample Outputs

Example (from service-level deterministic simulation test):

- Input cost: `ai_cost=6.5`, `runtime_cost=3`, `total_estimated_cost=10.25`
- `GROWTH`
  - `ai_overage=1.5`
  - `runtime_overage=0`
  - `total_revenue=51.65`
  - `margin=41.4`
  - `margin_percentage=0.801549`

Real-site output is available via:

- `GET /api/gnr8/debug/pricing?siteId=<uuid>`

Live validation snapshot (2026-03-27):

- `site_id = 91fb0854-9b84-4c4b-aff4-777043ab6451`
- `domain = maver.app.pasadenagenerator.com`
- `ai_cost = 0.00264`
- `runtime_cost = 0.000332`
- Ranked by margin:
  - `MANAGED`: `total_revenue=150`, `margin=149.997028`, `ai_overage=0`, `runtime_overage=0`
  - `GROWTH`: `total_revenue=50`, `margin=49.997028`, `ai_overage=0`, `runtime_overage=0`
  - `STARTER`: `total_revenue=20`, `margin=19.997028`, `ai_overage=0`, `runtime_overage=0`

## 4. Comparison Insights

- Low base plans show higher overage sensitivity.
- Higher base plans can reduce overage pressure but may lower margin on low-usage sites.
- Plan ranking can be switched between best `margin` or best `revenue` using `sortBy`.

## 5. Limitations

- Internal simulation only; no contract lifecycle or invoicing.
- Uses estimated costs from unified cost view; quality depends on upstream event completeness.
- No custom per-client discounts or negotiated terms.
- Client-level comparison is limited to `limit` sites for debug safety.

## 6. Next Steps

- Add historical snapshots for month-over-month plan fitness trends.
- Add optional per-client plan constraints for managed-service scenarios.
- Add scenario presets for stress testing usage spikes.
