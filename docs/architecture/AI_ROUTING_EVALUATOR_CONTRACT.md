# AI Routing Evaluator Contract (Canonical Draft)

## Status
- Draft: canonical future evaluator contract
- Milestone type: docs/read-model architecture only
- Non-goals: no runtime routing, no live model calls, no AI execution, no API changes

## Purpose
Define the future contract for evaluating an AI routing request against canonical provider metadata and routing policy registries before any runtime evaluator is implemented.

## Safety Boundary
Current evaluator contract is design-only:
- no model calls
- no credential resolution
- no runtime execution
- no provider dispatch

## Policy Sources
The future evaluator is expected to read from:
- `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts`
- `apps/platform/gnr8/runtime/providers/ai-routing-policy-registry.ts`
- future credential/readiness registry
- future governance settings

## Future Evaluator Input Contract
- `taskType`
- `inputModality`
- `outputModality`
- `sensitivityLevel`
- `latencyPreference`
- `costPreference`
- `contextRequirement`
- `regionPreference`
- `fallbackAllowed`

## Future Evaluator Output Contract
- `selectedProviderId`
- `selectedModelFamily`
- `routingStrategy`
- `fallbackProviderIds`
- `reason`
- `constraintsApplied`
- `executionAllowed`
- `executionBlocked`

## Example (Design-Time Only)
Input:
- `taskType: site_migration_planning`

Output:
- `selectedProviderId: openai`
- `fallbackProviderIds: [anthropic]`
- `routingStrategy: reasoning_priority`
- `executionAllowed: false`
- `executionBlocked: true`

This example is advisory and non-executable under current boundaries.

## Future Governance Extensions
- cost ceilings
- model allowlist/denylist
- tenant policy
- audit trail
- operator approval
- failover rules

## Canonical Outcome
GNR8 now has a canonical contract for future AI routing evaluation, with explicit non-execution boundaries, before any runtime evaluator implementation.
