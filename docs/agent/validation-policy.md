# GNR8 Validation Policy

## Default

Use focused validation while implementing. Match checks to changed files and risk.

- Choose checks that exercise the actual changed contract and user path, rather than accumulating passing test counts.
- Reuse successful results for unchanged inputs/code. Repeat or broaden checks only for new changes, failures, unresolved material risk, or mandatory project gates.
- Prefer one targeted integration check plus necessary regressions to repeated proof suites. Do not create a deployment merely to repeat evidence already established locally.
- For stalled checks, follow the workflow-policy decision checkpoint; never report an interrupted check as passed.

## Documentation-Only Changes

- Run markdown/diff sanity checks when available.
- No product test is required if no runtime, config, schema, or script behavior changed.
- Explicitly report: `Product behavior changed: no`.

## Code Changes

- Run nearby unit tests or the smallest relevant test command.
- Run typecheck/build only when the touched area, shared contract, or failure risk justifies it.
- For app routes, run route/export checks if route shape changed.
- For worker or provider-adjacent code, run local dry-run tests only; do not execute providers.

## Integration And Import Acceptance

- Exercise the actual changed producer-to-consumer path with representative retained input before another hosted run when feasible. Passing isolated helper tests does not establish that the deployed Worker imports the helper or that its output is accepted by the next stage.
- For CSS/assets, check the affected dependency closure, including nested imports, extensionless stylesheet URLs, relative URLs, existing URL-to-file mappings, and version-scoped references where relevant. Test the complete reproduced failure, not every imaginable variant.
- For site imports, verify representative desktop/mobile renderings against the captured source: header/footer variants, computed typography, backgrounds, images/icons/SVGs, and essential interactions. Route counts, hashes, and HTTP 200 responses alone do not prove visual or functional fidelity.
- Treat source drift separately from importer regressions. Verify explicit removals do not remove unrelated content or leave blocking overlays, scroll locks, or inert controls.
- Exact user-approved values must be checked in the final artifact or request, not merely in a fixture. Do not update expectations just to match incorrect output.
- Respect the Integration Loop Control checkpoint in workflow-policy.md. Reuse valid checks and prefer one consolidated Preview build over redundant local and hosted builds unless they test materially different requirements.

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
