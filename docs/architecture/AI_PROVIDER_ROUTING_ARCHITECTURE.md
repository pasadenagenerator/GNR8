# GNR8 AI Provider Routing Architecture (Canonical Draft)

## Status
- Draft: canonical architecture direction
- Scope: architecture/read-model/docs only
- Non-goals: no runtime orchestration, no execution layer, no live routing implementation

## Purpose
Define the first canonical AI provider routing architecture for GNR8 so future orchestration can be policy-governed, traceable, and multi-model by design.

## Canonical AI Provider Metadata Contract
AI providers in the registry expose routing metadata as read-model signals:
- `modelFamilies`
- `strengths`
- `routingHints`
- `latencyClass`
- `costClass`
- `contextWindowClass`

Current AI providers with placeholder metadata:
- `OpenAI`
- `Anthropic`
- `Gemini`
- `Groq`
- `Mistral`

Boundary:
- providers remain `not_configured`
- readiness remains `control_plane_only`
- boundaries remain `execution_blocked` + `read_only`

## Provider Strength Profiles (Routing Intent Only)
- OpenAI:
  - transformation planning
  - tool orchestration
  - structured reasoning
- Anthropic:
  - long-context analysis
  - architecture review
  - safety-sensitive reasoning
- Gemini:
  - multimodal/context fusion
  - layout understanding
- Groq:
  - ultra-fast inference
  - low-latency execution
- Mistral:
  - EU-hosted/open-weight flexibility

## Future Routing Concepts
- task-based routing
- fallback routing
- multi-provider orchestration
- cost-aware routing
- latency-aware routing
- capability-aware routing
- reasoning vs generation specialization

## Future Routing Task Classes
- site migration planning
- design reasoning
- code generation
- provider analysis
- orchestration planning
- content transformation
- diagnostics interpretation

## Future Governance Model
- routing policy
- provider failover
- cost ceilings
- execution approval
- auditability
- model traceability

## Reference Routing Flow (Future)
1. Classify task intent and required capabilities.
2. Score candidate providers by capability fit, cost class, and latency class.
3. Apply policy constraints (cost ceilings, approved providers, boundary checks).
4. Select primary provider plus failover chain.
5. Emit routing decision artifact for traceability.
6. Require explicit execution approval before any runtime execution path.

## Current Reality (2026-05-28)
- AI routing metadata exists only as placeholder contract data in the provider registry.
- No runtime router exists.
- No automatic fallback execution exists.
- No provider invocation orchestration exists.

## Conclusion
GNR8 AI providers are evolving toward a multi-model orchestration architecture instead of single-provider dependency.
