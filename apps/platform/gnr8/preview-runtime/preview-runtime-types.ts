import type { FinalSiteModel } from "@/gnr8/merge-engine";
import type { ReactRenderSiteModel, RenderDiagnostic } from "@/gnr8/renderer-contract";
import type { CanonicalSiteVersionSnapshot } from "@/gnr8/runtime/types";
import type { RealReactRendererInput, RealReactRendererResult } from "@/gnr8/react-renderer";
import type { ReactElement } from "react";

export type PreviewRuntimeMode = "react_preview" | "react_preview_degraded" | "fallback_preview";

export type PreviewRuntimeSummary = {
  previewMode: PreviewRuntimeMode;
  rendererContractAvailable: boolean;
  finalSiteModelAvailable: boolean;
  renderedWithFallback: boolean;
  matchedPageId: string | null;
  previewDiagnostics: string[];
};

export type PreviewRuntimePreparationResult = {
  mode: PreviewRuntimeMode;
  siteVersionId: string;
  routePath: string;
  finalSiteModel: FinalSiteModel | null;
  reactRenderSiteModel: ReactRenderSiteModel | null;
  rendererInput: RealReactRendererInput | null;
  rendererResult: RealReactRendererResult | null;
  renderedSiteElement: ReactElement | null;
  rendererDiagnostics: RenderDiagnostic[];
  diagnostics: string[];
  summary: PreviewRuntimeSummary;
};

export type PreviewRuntimePreparationInput = {
  siteVersion: CanonicalSiteVersionSnapshot;
  routePath: string;
  simulateRendererContractUnavailable?: boolean;
  simulateRendererRuntimeFailure?: boolean;
};

export function normalizePreviewRuntimeMode(value: unknown): PreviewRuntimeMode | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "react_preview") return "react_preview";
  if (normalized === "react_preview_degraded") return "react_preview_degraded";
  if (normalized === "fallback_preview") return "fallback_preview";
  return null;
}
