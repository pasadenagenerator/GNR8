# Margin & Profitability Layer Report

## 1. Pricing assumptions

Internal-only pricing model lives at `apps/platform/gnr8/billing/pricing-model.ts`:

- `SITE_MONTHLY_PRICE = 20`
- `INCLUDED_AI_COST = 1`
- `INCLUDED_RUNTIME_COST = 1`

This model is intentionally simple and editable. It is not customer billing.

## 2. Margin formulas

Per site:

- `simulated_revenue = SITE_MONTHLY_PRICE`
- `total_estimated_cost = ai_cost + runtime_cost + migration_cost`
- `margin = simulated_revenue - total_estimated_cost`
- `margin_percentage = margin / simulated_revenue`

Per client and agency:

- `simulated_revenue = site_count * SITE_MONTHLY_PRICE`
- `margin = simulated_revenue - total_estimated_cost`
- `margin_percentage = margin / simulated_revenue`

## 3. What is simulated vs real

Simulated:

- Revenue (`SITE_MONTHLY_PRICE`) and included usage thresholds.

Real (estimated):

- Cost data sourced from unified cost view (`ai_usage_events`, `runtime_usage_events`, `migration_cost_events` aggregation through unified service).

Not included:

- Stripe lifecycle, invoices, payment status, taxation, collections, discounts.

## 4. Sample outputs

Example site result:

```json
{
  "site_id": "...",
  "total_estimated_cost": 3.12,
  "simulated_revenue": 20,
  "margin": 16.88,
  "margin_percentage": 0.844,
  "flags": {
    "is_profitable": true,
    "cost_exceeds_included": true,
    "is_high_cost": false,
    "is_loss_making": false
  }
}
```

Example loss-making site:

```json
{
  "total_estimated_cost": 24.5,
  "simulated_revenue": 20,
  "margin": -4.5,
  "margin_percentage": -0.225,
  "flags": {
    "is_profitable": false,
    "is_high_cost": true,
    "is_loss_making": true
  }
}
```

## 5. Limitations

- Revenue is a fixed simulation, not contract-aware.
- Client and agency rollups depend on ownership linkage quality (`agency_id`, client org type).
- Cost is estimated from telemetry; it is not an accounting ledger.
- No historical price versioning.

## 6. Next steps

- Introduce configurable pricing tiers (still internal-only) for scenario simulation.
- Add month-over-month trend snapshots for margin drift detection.
- Add internal dashboard widgets for top loss-making clients/sites.
