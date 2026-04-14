# GNR8 External Design Adapter Contract Spec

## 1) Problem statement
GNR8 now has canonical truth layers for structure, content, and style/CGP. External AI-native design systems (for example Stitch and MagicPath) do not accept raw DOM or raw CSS as their optimal input. They require curated intent, hierarchy, content context, and explicit constraints. Without an adapter boundary, each integration would encode one-off mapping logic, drift from canonical contracts, and produce non-deterministic merge behavior.

## 2) Why adapter layer is required
The adapter layer is the system boundary that translates:
- canonical model -> vendor-neutral design request
- vendor-neutral design request -> vendor payload
- vendor response -> normalized canonical-compatible result

This separation protects canonical contracts from vendor volatility and allows GNR8 to plug in multiple providers without changing merge semantics.

## 3) Canonical -> design transformation pipeline
Pipeline:
1. Input acceptance: `DesignAdapterInput` (canonical structure/content/style + goals/constraints/context).
2. Canonical projection: summarize canonical layers into a compact `ExternalDesignRequest`.
3. Prompt/context shaping: build layered instruction text and context blocks.
4. Vendor mapping: selected vendor adapter produces provider payload.
5. Vendor execution boundary: external system execution is outside this task scope.
6. Raw response capture: `VendorDesignResponse` preserves raw payload for traceability.
7. Deterministic normalization: response is mapped into `NormalizedDesignResult`.
8. Merge preparation: result includes mapping confidence, diagnostics, unresolved warnings.

## 4) Prompt construction strategy
Prompt is layered, deterministic, and human-readable.

Layer order:
1. Intent layer: design goals and desired product tone.
2. Structure layer: page map, section hierarchy, and role ordering.
3. Content layer: constrained content snippets and CTA/media references.
4. Style layer: palette/typography/surface/component style hints.
5. Constraints layer: accessibility, density, brand preservation, lock policies.

Rules:
- Prompt must NOT be a raw dump of the canonical model.
- Prompt must be curated, compressed, and context-aware.
- Large inventories are summarized with explicit truncation diagnostics.
- Canonical IDs are preserved in compact references to enable deterministic mapping.

## 5) Vendor abstraction strategy
Design principles:
- Vendor-neutral core owns canonical projection, prompt strategy, normalization policy, diagnostics.
- Vendor adapters are pluggable modules implementing `VendorAdapterContract`.
- Vendor adapters only map request/response shapes; they do not own merge policy.
- No vendor-specific naming leaks into canonical contracts.

## 6) Vendor adapter examples (Stitch, MagicPath)
Stitch adapter example:
- Input: layered prompt + context blocks + optional design system hint.
- Output mapping: interprets composition/layout/token hints and normalizes them.

MagicPath adapter example:
- Input: structured object plus concise prompt for generation intent.
- Output mapping: interprets JSON/Figma-like structures and token suggestions.

Both adapters conform to the same contract:
- `buildVendorRequest(request, prompt)`
- `normalizeVendorResponse(response, request, diagnostics)`

## 7) Response normalization strategy
The normalizer accepts heterogeneous response forms:
- HTML/CSS
- JSON layout trees
- token dictionaries
- Figma-like node graphs

Normalization mapping:
- page -> `GeneratedPage`
- section -> `GeneratedSection`
- component -> `GeneratedComponent`
- tokens -> canonical-compatible token patch collection
- layout decisions -> structure overrides (proposed, not applied)

Deterministic normalization rules:
- Stable key generation from canonical IDs + section order.
- Safe parsing with explicit fallback paths.
- Missing or unknown nodes become warnings, not silent drops.
- Unknown component types map to `custom` with diagnostic metadata.

## 8) Failure handling
Handled edge cases:
- Partial design response: preserve successful pages/sections, emit partial warnings.
- Missing sections: insert unresolved placeholders with required merge review flags.
- Hallucinated components: keep as non-authoritative candidates with low confidence.
- Style drift from brand: run token drift checks and emit severity-tagged diagnostics.
- Inconsistent layout: downgrade confidence and retain canonical structure references.
- Invalid structure: fail-safe to empty generated set with structured diagnostics.

## 9) Merge preparation boundary
Adapter output is merge-ready but not merged.

Adapter responsibilities:
- emit normalized generated pages/sections/components
- emit token override candidates with confidence
- emit diagnostics and explainability metadata
- emit structure mapping references

Non-responsibilities (explicitly out of scope):
- merge execution
- authority conflict resolution application
- persistence updates
- runtime rendering changes

## 10) Determinism strategy
Determinism guarantees are best-effort across probabilistic vendors:
- same canonical input -> same vendor-neutral request projection
- same projection -> stable prompt text and context ordering
- normalization uses deterministic sort, keying, and fallback rules
- confidence scoring uses explicit weighted formulas

Idempotency guardrails:
- deterministic request fingerprint
- stable field ordering
- warning codes as machine-readable enums
- repeated normalization of unchanged vendor payload yields equivalent normalized output

## 11) Explainability & diagnostics
Every run returns diagnostics with:
- what was sent (projected counts, prompt blocks, truncations)
- what was inferred (heuristics used, fallback paths)
- what was missing (unmapped sections, unknown components, absent tokens)

Diagnostic model supports:
- severity (`info` | `warning` | `error`)
- machine-readable code
- target references (`pageId`, `sectionId`, `componentId`)
- optional remediation hints

## 12) Module structure
Implementation modules:
- `apps/platform/gnr8/design-adapter/types/adapter-types.ts`
- `apps/platform/gnr8/design-adapter/core/prompt-builder.ts`
- `apps/platform/gnr8/design-adapter/core/response-normalizer.ts`
- `apps/platform/gnr8/design-adapter/core/design-adapter.ts`
- `apps/platform/gnr8/design-adapter/vendors/stitch-adapter.ts`
- `apps/platform/gnr8/design-adapter/vendors/magicpath-adapter.ts`
- `apps/platform/gnr8/design-adapter/index.ts`

## 13) Phased rollout plan
Phase 1 (this task):
- contracts, prompt builder, vendor adapters, deterministic normalizer, diagnostics.

Phase 2:
- wire adapters into orchestration layer with mocked vendor transport.

Phase 3:
- run replay suites for determinism and drift monitoring.

Phase 4:
- integrate merge engine boundary and policy gating.

Phase 5:
- production hardening with telemetry, SLAs, and regression baselines.

## 14) Risks / open questions
- Vendor outputs may vary significantly for the same prompt despite deterministic input.
- Over-compression may hide semantically important content cues.
- Token mapping confidence thresholds require calibration with real datasets.
- Cross-page navigation intent may be under-specified in early prompts.
- Need long-term policy for auto-rejection thresholds on style drift.

## 15) Recommendation
Adopt the vendor-neutral adapter core immediately, keep vendor payload mapping isolated in per-vendor modules, and treat normalization output as merge-prepared proposals with explicit diagnostics and confidence. This keeps canonical truth stable while allowing rapid experimentation with Stitch, MagicPath, and future providers.
