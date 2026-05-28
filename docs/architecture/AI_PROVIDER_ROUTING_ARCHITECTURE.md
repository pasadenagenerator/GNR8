# GNR8 AI Provider Routing Architecture (Canonical Draft)

## Status
- Draft: canonical architecture direction
- Milestone completed: AI Routing Policy Registry Extraction
- Milestone completed: AI Routing Policy Preview / Task-to-Provider Mapping Matrix UI
- Scope: UI/read-model/docs only
- Non-goals: no runtime AI orchestration, no live model calls, no API changes, no execution changes

## Purpose
Define the canonical AI provider routing metadata surface in Provider Fleet so future orchestration can be policy-governed, traceable, and multi-model by design.

## UI Surface
- Route: `/gnr8/admin/providers`
- Section: `AI Provider Capability Matrix`
- Section: `AI Routing Policy Preview`

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

## Boundary
- UI/read-model only
- no runtime AI orchestration
- no live model calls
- no API changes
- no execution
- no secrets
- no action buttons/forms

## Current Reality (2026-05-28)
- Provider Fleet now visibly includes AI provider routing strategy metadata and task-to-provider policy preview through read-only matrix sections.
- No runtime router exists.
- No automatic fallback execution exists.
- No provider invocation orchestration exists.

## Conclusion
AI routing strategy is now represented as canonical read-model data, preparing future runtime routing without implementing execution.

## Recommended Next Milestone
- Task-based AI orchestration contract wiring (still read-model first)
