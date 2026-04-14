import type { PreviewRuntimeMode } from "@/gnr8/preview-runtime/preview-runtime-types";
import { PREVIEW_RUNTIME_DIAGNOSTIC } from "@/gnr8/preview-runtime/preview-runtime-diagnostics";

type PreviewModeSelectorInput = {
  finalSiteModelAvailable: boolean;
  rendererContractAvailable: boolean;
  rendererSucceeded: boolean;
  rendererMatchedPage: boolean;
  hasMeaningfulRenderableStructure: boolean;
  rendererUsedFallback: boolean;
  rendererRuntimeFailed: boolean;
};

export function selectPreviewRuntimeMode(input: PreviewModeSelectorInput): {
  mode: PreviewRuntimeMode;
  diagnostics: string[];
} {
  const diagnostics: string[] = [];

  if (!input.finalSiteModelAvailable) {
    diagnostics.push(PREVIEW_RUNTIME_DIAGNOSTIC.FINAL_SITE_MODEL_UNAVAILABLE);
    diagnostics.push(PREVIEW_RUNTIME_DIAGNOSTIC.FALLBACK_RENDER_SELECTED);
    return {
      mode: "fallback_preview",
      diagnostics,
    };
  }

  if (!input.rendererContractAvailable) {
    diagnostics.push(PREVIEW_RUNTIME_DIAGNOSTIC.RENDERER_CONTRACT_UNAVAILABLE);
    diagnostics.push(PREVIEW_RUNTIME_DIAGNOSTIC.FALLBACK_RENDER_SELECTED);
    return {
      mode: "fallback_preview",
      diagnostics,
    };
  }

  if (input.rendererRuntimeFailed) {
    diagnostics.push(PREVIEW_RUNTIME_DIAGNOSTIC.RENDERER_RUNTIME_FAILED);
    diagnostics.push(PREVIEW_RUNTIME_DIAGNOSTIC.FALLBACK_RENDER_SELECTED);
    return {
      mode: "fallback_preview",
      diagnostics,
    };
  }

  if (!input.rendererSucceeded || !input.rendererMatchedPage || !input.hasMeaningfulRenderableStructure) {
    diagnostics.push(PREVIEW_RUNTIME_DIAGNOSTIC.FALLBACK_RENDER_SELECTED);
    return {
      mode: "fallback_preview",
      diagnostics,
    };
  }

  if (input.rendererUsedFallback) {
    diagnostics.push(PREVIEW_RUNTIME_DIAGNOSTIC.REAL_REACT_RENDER_DEGRADED);
    return {
      mode: "react_preview_degraded",
      diagnostics,
    };
  }

  diagnostics.push(PREVIEW_RUNTIME_DIAGNOSTIC.REAL_REACT_RENDER_SELECTED);
  return {
    mode: "react_preview",
    diagnostics,
  };
}
