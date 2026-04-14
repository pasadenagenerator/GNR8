import assert from "node:assert/strict";
import test from "node:test";

import { PREVIEW_RUNTIME_DIAGNOSTIC } from "@/gnr8/preview-runtime/preview-runtime-diagnostics";
import { selectPreviewRuntimeMode } from "@/gnr8/preview-runtime/preview-mode-selector";
import { resolveSiteWorkspacePreview } from "@/gnr8/site/site-preview-contract";
import type { PreviewRuntimeSummary } from "@/gnr8/preview-runtime/preview-runtime-types";

function summaryFromSelection(input: {
  mode: PreviewRuntimeSummary["previewMode"];
  diagnostics: string[];
  renderedWithFallback?: boolean;
  matchedPageId?: string | null;
}): PreviewRuntimeSummary {
  return {
    previewMode: input.mode,
    rendererContractAvailable: input.mode !== "fallback_preview",
    finalSiteModelAvailable: input.mode !== "fallback_preview",
    renderedWithFallback: Boolean(input.renderedWithFallback),
    matchedPageId: input.matchedPageId ?? (input.mode === "fallback_preview" ? null : "page-home"),
    previewDiagnostics: [...new Set([...input.diagnostics, PREVIEW_RUNTIME_DIAGNOSTIC.MODE_PERSISTED])].sort((a, b) => a.localeCompare(b)),
  };
}

test("full truth -> react_preview", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: true,
    rendererMatchedPage: true,
    hasMeaningfulRenderableStructure: true,
    rendererUsedFallback: false,
    rendererRuntimeFailed: false,
  });
  assert.equal(selected.mode, "react_preview");
});

test("partial truth -> react_preview_degraded", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: true,
    rendererMatchedPage: true,
    hasMeaningfulRenderableStructure: true,
    rendererUsedFallback: true,
    rendererRuntimeFailed: false,
  });
  assert.equal(selected.mode, "react_preview_degraded");
});

test("insufficient truth -> fallback_preview", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: false,
    rendererContractAvailable: false,
    rendererSucceeded: false,
    rendererMatchedPage: false,
    hasMeaningfulRenderableStructure: false,
    rendererUsedFallback: false,
    rendererRuntimeFailed: false,
  });
  assert.equal(selected.mode, "fallback_preview");
});

test("renderer contract unavailable -> fallback", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: false,
    rendererSucceeded: false,
    rendererMatchedPage: false,
    hasMeaningfulRenderableStructure: false,
    rendererUsedFallback: false,
    rendererRuntimeFailed: false,
  });
  assert.equal(selected.mode, "fallback_preview");
  assert.ok(selected.diagnostics.includes(PREVIEW_RUNTIME_DIAGNOSTIC.RENDERER_CONTRACT_UNAVAILABLE));
});

test("renderer runtime failure -> fallback with diagnostics", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: false,
    rendererMatchedPage: false,
    hasMeaningfulRenderableStructure: false,
    rendererUsedFallback: false,
    rendererRuntimeFailed: true,
  });
  assert.equal(selected.mode, "fallback_preview");
  assert.ok(selected.diagnostics.includes(PREVIEW_RUNTIME_DIAGNOSTIC.RENDERER_RUNTIME_FAILED));
});

test("renderer generic fallback counts as degraded React preview, not total fallback", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: true,
    rendererMatchedPage: true,
    hasMeaningfulRenderableStructure: true,
    rendererUsedFallback: true,
    rendererRuntimeFailed: false,
  });
  assert.equal(selected.mode, "react_preview_degraded");
});

test("persisted preview summary reflects chosen mode", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: true,
    rendererMatchedPage: true,
    hasMeaningfulRenderableStructure: true,
    rendererUsedFallback: false,
    rendererRuntimeFailed: false,
  });
  const summary = summaryFromSelection({
    mode: selected.mode,
    diagnostics: selected.diagnostics,
    renderedWithFallback: false,
    matchedPageId: "page-home",
  });

  assert.equal(summary.previewMode, "react_preview");
  assert.ok(summary.previewDiagnostics.includes(PREVIEW_RUNTIME_DIAGNOSTIC.MODE_PERSISTED));
});

test("read-model/shell selection prefers latest truthful preview mode", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: true,
    rendererMatchedPage: true,
    hasMeaningfulRenderableStructure: true,
    rendererUsedFallback: true,
    rendererRuntimeFailed: false,
  });
  const summary = summaryFromSelection({
    mode: selected.mode,
    diagnostics: selected.diagnostics,
    renderedWithFallback: true,
    matchedPageId: "page-home",
  });
  const resolved = resolveSiteWorkspacePreview({
    siteVersionId: "site-version-1",
    transformedPreviewAvailable: true,
    debugPreviewAvailable: true,
    importCaptured: true,
    previewRuntimeSummary: summary,
  });

  assert.equal(resolved.previewMode, "react_preview_degraded");
  assert.equal(resolved.previewRuntimeSummary?.previewMode, "react_preview_degraded");
});

test("repeated identical input yields identical preview mode/diagnostics", () => {
  const input = {
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: true,
    rendererMatchedPage: true,
    hasMeaningfulRenderableStructure: true,
    rendererUsedFallback: false,
    rendererRuntimeFailed: false,
  } as const;
  const first = selectPreviewRuntimeMode(input);
  const second = selectPreviewRuntimeMode(input);

  assert.equal(first.mode, second.mode);
  assert.deepEqual(first.diagnostics, second.diagnostics);
});
