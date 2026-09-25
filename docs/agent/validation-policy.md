# GNR8 Validation Policy

## Default

Use focused validation while implementing. Match checks to changed files and risk.

## Documentation-Only Changes

- Run markdown/diff sanity checks when available.
- No product test is required if no runtime, config, schema, or script behavior changed.
- Explicitly report: `Product behavior changed: no`.

## Code Changes

- Run nearby unit tests or the smallest relevant test command.
- Run typecheck/build only when the touched area, shared contract, or failure risk justifies it.
- For app routes, run route/export checks if route shape changed.
- For worker or provider-adjacent code, run local dry-run tests only; do not execute providers.

## Broad Checks

Run full `make check`, broad builds, or large test suites only when:
- preparing a release or milestone finalization;
- changing shared contracts, schema, auth, billing, tenancy, or provider boundaries;
- the task explicitly asks for final verification;
- focused validation passes but risk remains materially broad.

## Failure Handling

- If a focused check fails, fix failures caused by the task and rerun that check.
- If a broad check exposes unrelated existing failures, report them separately and do not hide them.
- Keep evidence concise: command, pass/fail, and the important failing lines only.
