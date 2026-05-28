# GNR8 AI Provider Routing Architecture (Canonical Draft)

## Status
- Draft: canonical architecture direction
- Milestone completed: AI Routing Evaluator Preview Model
- Milestone completed: AI Routing Policy Registry Extraction
- Milestone completed: AI Routing Policy Preview / Task-to-Provider Mapping Matrix UI
- Scope: UI/read-model/docs + deterministic preview evaluator contract
- Non-goals: no runtime AI orchestration execution, no live model calls, no API changes, no execution changes

## Purpose
Define the canonical AI provider routing metadata surface in Provider Fleet so future orchestration can be policy-governed, traceable, and multi-model by design.

## Canonical Evaluator Contract
- Canonical doc: `docs/architecture/AI_ROUTING_EVALUATOR_CONTRACT.md`
- Runtime files:
  - `apps/platform/gnr8/runtime/providers/ai-routing-evaluator-preview.ts`
  - `apps/platform/gnr8/runtime/providers/ai-routing-evaluator-preview.test.ts`
- Scope: deterministic preview evaluator request/response contract
- Contract purpose: evaluate routing intent against provider metadata + routing policy sources and return explainable blocked preview result
- Current boundary: deterministic preview only, execution blocked

## Deterministic Preview Evaluator Behavior
- matches `taskType` against `AI_ROUTING_POLICY_PREVIEW_REGISTRY`
- uses preferred/secondary providers from policy when matched
- defaults to `openai` + `anthropic` fallback when unmatched
- resolves `selectedModelFamily` from provider registry metadata
- applies request preferences as constraints
- always includes `execution_blocked` and `preview_only`
- always returns `executionAllowed:false` and `executionBlocked:true`

## Evaluator Input Fields
- `taskType`
- `inputModality`
- `outputModality`
- `sensitivityLevel`
- `latencyPreference`
- `costPreference`
- `contextRequirement`
- `regionPreference`
- `fallbackAllowed`

## Evaluator Output Fields
- `selectedProviderId`
- `selectedModelFamily`
- `routingStrategy`
- `fallbackProviderIds`
- `reason`
- `constraintsApplied`
- `executionAllowed`
- `executionBlocked`
- `diagnostics`

## Preview Diagnostics
- `AI_ROUTING_EVALUATOR_PREVIEW_CREATED`
- `AI_ROUTING_POLICY_MATCHED`
- `AI_ROUTING_POLICY_DEFAULTED`
- `AI_ROUTING_EXECUTION_BLOCKED`
- `AI_ROUTING_PREVIEW_ONLY`

## UI Surface
- Route: `/gnr8/admin/providers`
- Section: `AI Provider Capability Matrix`
- Section: `AI Routing Policy Preview`
- Section: `AI Routing Readiness Advisor`

## AI Provider Capability Matrix
Provider Fleet now exposes read-only AI routing metadata for:
- `OpenAI`
- `Anthropic`
- `Gemini`
- `Groq`
- `Mistral`

Displayed routing metadata:
- `model families`
- `strengths`
- `routing hints`
- `latency class`
- `cost class`
- `context window class`

Provider state visibility in matrix:
- `not_configured`
- `control_plane_only`
- `execution_blocked`

Advisory note:
- AI routing metadata is advisory only. No model calls are performed.

## AI Routing Policy Preview
Provider Fleet now also exposes a strategic task-to-provider mapping matrix from canonical read-model registry data:
- `Site Migration Planning` -> preferred `OpenAI`, secondary `Anthropic`, strategy `reasoning_priority`
- `Long Architecture Review` -> preferred `Anthropic`, secondary `OpenAI`, strategy `context_priority`
- `Layout / Visual Understanding` -> preferred `Gemini`, secondary `OpenAI`, strategy `context_priority`
- `Fast Interactive Generation` -> preferred `Groq`, secondary `OpenAI`, strategy `latency_priority`
- `EU-sensitive Workloads` -> preferred `Mistral`, secondary `OpenAI`, strategy `sovereignty_priority`
- `Structured Tool Orchestration` -> preferred `OpenAI`, secondary `Anthropic`, strategy `orchestration_priority`

Routing policy preview advisory note:
- Routing policy preview is strategic only. No live AI routing is performed.
- Execution state for all policy rows: `preview_only`

## AI Routing Readiness Advisor
Provider Fleet includes a read-only readiness advisor that explains why routing remains non-executable.

Cards:
- `Current State`
- `Current Limitations`
- `Missing Requirements`
- `Recommended Next Step`

Badge mapping:
- `metadata_ready` / `preview_ready` => success
- `missing` / `not_connected` => warning
- `execution_blocked` / `no_runtime_routing` => critical

## Boundary
- UI/read-model only
- deterministic preview evaluator only
- no runtime AI orchestration
- no live model calls
- no API changes
- no execution
- no secrets
- no action buttons/forms
- no credential resolution
- no provider dispatch
- no runtime execution
- no API endpoint yet

## Current Reality (2026-05-28)
- Provider Fleet now visibly includes AI provider routing strategy metadata and task-to-provider policy preview through read-only matrix sections.
- Deterministic preview evaluator implementation now exists and is validated.
- No automatic fallback execution exists.
- No provider invocation orchestration exists.

## Conclusion
GNR8 now has its first deterministic AI routing decision preview. The system can explain which provider would be selected while execution remains fully blocked.

## Recommended Next Milestone
- AI Routing Evaluator Preview UI
