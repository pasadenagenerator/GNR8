# Content Recovery Rendering Integration Report

## Scope
Implemented an output-layer enhancement that restores legacy-style visible content for degraded imports while preserving the canonical scoped import pipeline, persistence model, contracts, and source selection logic.

## Trigger Logic
`content_recovery` mode activates deterministically when any of:
- import fidelity is not `high_fidelity_import`
- rendered capture status is not `available`
- majority section confidence is below `0.5`
- detected section count is `<= 2`
- rendered DOM is empty (`nodeCount === 0`) or DOM quality is not `strong`

Decision path now resolves one internal page render mode:
- `canonical`
- `fallback_visible`
- `content_recovery`

## Renderer Behavior
Added `apps/platform/gnr8/runtime/preview-content-recovery-renderer.ts`.

Output structure:
- `<main data-gnr8-render-mode="content-recovery">`
- mandatory hero reconstruction from best available title/h1/meta/derived text
- recovered text sections (headings + paragraphs)
- recovered links section
- recovered images section
- original section JSON payloads preserved in embedded hidden section scripts (`data-gnr8-section-props`) to keep preview contract compatibility

Safety behavior:
- unsafe/remote image sources are rendered as placeholders with source URL reference
- local/safe image sources are rendered as `<img>`

## Artifact/Diagnostics Integration
Updated `apps/platform/gnr8/runtime/artifact-builder.ts` to:
- resolve per-page render mode via deterministic trigger decision
- route `content_recovery` pages through the new renderer
- persist recovery metadata in artifact manifest:
  - `pageRenderModes`
  - `pageRecoveryReasons`
  - `recoveryDiagnostics`
  - `provenanceSummaryFlags.contentRecoveryModeActive`

Diagnostic codes now surfaced in artifact metadata:
- `CONTENT_RECOVERY_MODE_ACTIVE`
- `CONTENT_RECOVERY_HERO_SYNTHESIZED`
- `CONTENT_RECOVERY_TEXT_SURFACED`
- `CONTENT_RECOVERY_LINKS_SURFACED`
- `CONTENT_RECOVERY_IMAGES_SURFACED`

## Workspace UI Signal
Updated `SiteWorkspacePage.tsx` preview tab to show:
- `Preview mode: content recovery` when triggers are active
- explicit reasons list (`degraded import`, `weak structure`, `missing rendered capture`, `weak dom quality` as applicable)

## Before vs After
Before:
- degraded imports could show minimal/empty-looking previews when structure was weak.

After:
- degraded imports render content-rich recovery output with hero/text/links/images, while still preserving canonical section payload scripts and pipeline contracts.

## Impact
- improves degraded import visibility and operator confidence
- no import acquisition/rendered capture/section consolidation/style extraction logic changed
- no persistence model changes required; manifest metadata extended in a backward-compatible way
