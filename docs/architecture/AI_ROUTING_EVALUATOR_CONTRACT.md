# AI Routing Evaluator Contract (Deterministic Preview Model)

## Status
- Implemented and validated: deterministic preview evaluator
- Milestone completed: AI Routing Evaluator Preview Model
- Scope: documentation + deterministic preview runtime contract
- Non-goals: no live model calls, no AI execution, no API changes, no execution changes

## Purpose
Define the canonical contract for deterministic AI routing decision preview against provider metadata and routing policy registries, while keeping runtime execution fully blocked.

## Safety Boundary
Preview evaluator boundary is explicit:
- no model calls
- no credential resolution
- no runtime execution
- no provider dispatch
- no API endpoint yet

## Runtime Files
- `apps/platform/gnr8/runtime/providers/ai-routing-evaluator-preview.ts`
- `apps/platform/gnr8/runtime/providers/ai-routing-evaluator-preview.test.ts`

## Preview UI Surface
- `apps/platform/app/gnr8/admin/providers/ai-routing-evaluator-preview.tsx`
- `apps/platform/app/gnr8/admin/providers/ai-routing-evaluator-preview.test.ts`
- mounted in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`
- selector-backed deterministic task preview only; no API endpoint required
- supported preview tasks:
  - `site_migration_planning`
  - `long_architecture_review`
  - `layout_visual_understanding`
  - `fast_interactive_generation`
  - `eu_sensitive_workloads`
  - `structured_tool_orchestration`
- execution state is always visibly blocked (`executionAllowed:false`, `executionBlocked:true`)
- advisory note: routing evaluator preview is deterministic and non-executable; no AI providers are called

## Policy and Metadata Sources
The deterministic preview evaluator reads from:
- `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts`
- `apps/platform/gnr8/runtime/providers/ai-routing-policy-registry.ts`

## Evaluator Input Contract
- `taskType`
- `inputModality`
- `outputModality`
- `sensitivityLevel`
- `latencyPreference`
- `costPreference`
- `contextRequirement`
- `regionPreference`
- `fallbackAllowed`

## Evaluator Output Contract
- `selectedProviderId`
- `selectedModelFamily`
- `routingStrategy`
- `fallbackProviderIds`
- `reason`
- `constraintsApplied`
- `executionAllowed`
- `executionBlocked`
- `diagnostics`

## Deterministic Preview Behavior
- matches `taskType` against `AI_ROUTING_POLICY_PREVIEW_REGISTRY`
- uses preferred/secondary providers from policy when matched
- defaults to `openai` with `anthropic` fallback when unmatched
- resolves `selectedModelFamily` from provider registry metadata
- applies preferences as constraints
- always includes `execution_blocked` and `preview_only`
- always returns `executionAllowed: false` and `executionBlocked: true`

## Diagnostics Contract
- `AI_ROUTING_EVALUATOR_PREVIEW_CREATED`
- `AI_ROUTING_POLICY_MATCHED`
- `AI_ROUTING_POLICY_DEFAULTED`
- `AI_ROUTING_EXECUTION_BLOCKED`
- `AI_ROUTING_PREVIEW_ONLY`

## Validation
- preview evaluator tests passed
- next build passed

## Example Preview Result
Input:
- `taskType: site_migration_planning`

Output:
- `selectedProviderId: openai`
- `fallbackProviderIds: [anthropic]`
- `routingStrategy: reasoning_priority`
- `executionAllowed: false`
- `executionBlocked: true`
- `diagnostics: [AI_ROUTING_EVALUATOR_PREVIEW_CREATED, AI_ROUTING_POLICY_MATCHED, AI_ROUTING_EXECUTION_BLOCKED, AI_ROUTING_PREVIEW_ONLY]`

## Canonical Outcome
GNR8 now has its first deterministic AI routing decision preview contract and runtime implementation. The system can explain which AI provider would be selected for a task while keeping execution fully blocked.

## Recommended Next Milestone
- AI Routing Evaluator Preview UI
