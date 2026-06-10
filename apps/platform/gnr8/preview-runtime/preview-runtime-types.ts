import type { FinalSiteModel } from "@/gnr8/merge-engine";
import type { ReactRenderSiteModel, RenderDiagnostic } from "@/gnr8/renderer-contract";
import type { CanonicalSiteVersionSnapshot } from "@/gnr8/runtime/types";
import type { RealReactRendererInput, RealReactRendererResult } from "@/gnr8/react-renderer";
import type { FamilyRenderMode } from "@/gnr8/renderer-family-mode";
import type { ReactElement } from "react";

export type PreviewRuntimeMode =
  | "react_preview"
  | "react_preview_degraded"
  | "fallback_preview"
  | "semantic_fallback_preview"
  | "raw_template_preview";

export type PreviewRuntimeSummary = {
  previewMode: PreviewRuntimeMode;
  rendererContractAvailable: boolean;
  finalSiteModelAvailable: boolean;
  familyRenderUsed: boolean;
  familyRenderFamilyId: string | null;
  familyRenderMode: FamilyRenderMode | null;
  familyRenderFallbackToPage: boolean;
  familyRenderDiagnosticsCount: number;
  familyRenderDiagnostics: string[];
  renderedWithFallback: boolean;
  matchedPageId: string | null;
  contentResolutionApplied: boolean;
  resolvedContentCount: number;
  unresolvedContentCount: number;
  contentResolutionDegraded: boolean;
  contentResolutionDiagnostics: string[];
  previewDiagnostics: string[];
  semanticSectionCount?: number;
  semanticImageCount?: number;
  semanticCtaCount?: number;
  persistedAssetCount?: number;
  externalFallbackAssetCount?: number;
  rawTemplatePreviewEvidence?: {
    selectedRoutePath: string;
    selectedRawFilePath: string;
    htmlByteLengthBeforeRewrite: number;
    htmlByteLengthAfterRewrite: number;
    rewrittenLinkCount: number;
    rewrittenAssetCount?: number;
    rawPreviewAssetRewriteEvidence?: {
      stylesheetsInspected: number;
      cssUrlReferencesFound: number;
      cssUrlReferencesRewritten: number;
      cssUrlReferencesExternalPreserved: number;
      cssUrlReferencesMissing: number;
      imageReferencesFound: number;
      imageReferencesRewritten: number;
      imageReferencesMissing: number;
      fontStylesheetsFound: number;
      fontStylesheetsPreserved: number;
      fontFilesFound: number;
      fontFilesRewritten: number;
      fontFamilyDongleDetected: boolean;
      rootHeadingDongleEvidence: string[];
      malformedUriDecodeFallbackCount?: number;
      assetReferencesInspected?: number;
      assetReferencesRewritten?: number;
      assetReferencesMissing?: number;
      assetReferencesExternalPreserved?: number;
      assetReferenceEvidence?: Array<{
        originalReference: string;
        normalizedReference: string | null;
        resolvedCandidate: string | null;
        matchedFilePath: string | null;
        servedPreviewUrl: string | null;
        reason: string;
        assetKind: string;
        sourceType: string;
        routePath: string;
        rawFilePath: string;
      }>;
      missingAssetReferences?: Array<{
        originalReference: string;
        normalizedReference: string | null;
        resolvedCandidate: string | null;
        reason: string;
        assetKind: string;
        sourceType: string;
        routePath: string;
        rawFilePath: string;
      }>;
    };
    rawPreviewAssetGraphEvidence?: {
        routePath: string;
        rawFilePath: string;
        cssCascadeOrderBefore: Array<{
          index: number;
          tagName: string;
          reference: string | null;
          rel: string | null;
          as: string | null;
          media: string | null;
          type: string | null;
          sourceType: string;
        }>;
        cssCascadeOrderAfter: Array<{
          index: number;
          tagName: string;
          reference: string | null;
          rel: string | null;
          as: string | null;
          media: string | null;
          type: string | null;
          sourceType: string;
        }>;
        stylesheetRefsFound: Array<{
          originalReference: string;
          matchedFilePath: string | null;
          servedPreviewUrl: string | null;
          reason: string;
          sourceType: string;
        }>;
        stylesheetRefsRewritten: Array<{
          originalReference: string;
          matchedFilePath: string | null;
          servedPreviewUrl: string | null;
          reason: string;
          sourceType: string;
        }>;
        stylesheetRefsPreservedExternal: Array<{
          originalReference: string;
          matchedFilePath: string | null;
          servedPreviewUrl: string | null;
          reason: string;
          sourceType: string;
        }>;
        stylesheetRefsMissing: Array<{
          originalReference: string;
          resolvedCandidate: string | null;
          reason: string;
          sourceType: string;
      }>;
      imageRefsFound: Array<{
        originalReference: string;
        matchedFilePath: string | null;
        servedPreviewUrl: string | null;
        reason: string;
        sourceType: string;
      }>;
      imageRefsRewritten: Array<{
        originalReference: string;
        matchedFilePath: string | null;
        servedPreviewUrl: string | null;
        reason: string;
        sourceType: string;
      }>;
      imageRefsMissing: Array<{
        originalReference: string;
        resolvedCandidate: string | null;
        reason: string;
        sourceType: string;
      }>;
      fontRefsFound: Array<{
        originalReference: string;
        matchedFilePath: string | null;
        servedPreviewUrl: string | null;
        reason: string;
        sourceType: string;
      }>;
      fontRefsRewritten: Array<{
        originalReference: string;
        matchedFilePath: string | null;
        servedPreviewUrl: string | null;
        reason: string;
        sourceType: string;
      }>;
      fontRefsMissing: Array<{
        originalReference: string;
        resolvedCandidate: string | null;
        reason: string;
        sourceType: string;
      }>;
      dongleEvidence: {
        detected: boolean;
        source: string | null;
        ref: string | null;
        };
        primaryCssCandidates: string[];
        topMissingStylesheetRefs: string[];
        topMissingImageRefs: string[];
        stylesheetRefsFoundCount: number;
        stylesheetRefsRewrittenCount: number;
        stylesheetRefsPreservedExternalCount: number;
        stylesheetRefsMissingCount: number;
        inlineStyleBlockCount: number;
        mediaStylesheetCount: number;
        preloadStyleCount: number;
        missingStylesheetRefs: string[];
        cssOrderChanged: boolean;
      };
    rawPreviewScriptPolicyEvidence?: {
      totalScriptsFound: number;
      scriptsPreserved: number;
      scriptsBlocked: number;
      scriptsRewrittenToControlledPreviewAssetUrls: number;
      scriptsExternalPreserved: number;
      scriptsBlockedByReason: Record<string, number>;
      topBlockedRefs: string[];
      galleryCandidateScriptsDetected: boolean;
      mapCandidateScriptsDetected: boolean;
      formCandidateScriptsDetected: boolean;
      lazyloadCandidateScriptsDetected: boolean;
    };
    rawPreviewDuplicateGuardEvidence?: {
      routePath: string;
      duplicateRootBlockDetected: boolean;
      duplicateRootBlockRemovedCount: number;
      fingerprints: string[];
      listingContainerDetected: boolean;
      guardReason: string[];
    };
    rawPreviewEmbedEvidence?: {
      mapEmbedDetected: boolean;
      mapEmbedPreserved: boolean;
      blockedMapRefs: string[];
      externalMapProviders: string[];
    };
    disabledScriptCount?: number;
    dbReadCount?: number;
    dbClientAcquisitionCount?: number;
  };
  transformedAssemblyDiagnostics?: {
    selectedRoutePath: string;
    selectedSourceRawFile: string | null;
    semanticSectionCount: number;
    transformedRouteSectionCountBeforeHydration: number;
    duplicateRemovalCount: number;
    clientHydrationMode: "disabled" | "passive" | "idempotent";
    repeatedSectionFingerprints: Array<{ fingerprint: string; count: number; sectionIds: string[] }>;
    sharedHeaderFooterSectionCount: number;
    listingDetection: { detected: boolean; sectionId: string | null; reason: string | null };
    finalSectionOrder: Array<{ sectionId: string; type: string; order: number }>;
    removedDuplicateSectionIds: string[];
    headingStyleSource: {
      source: string;
      headingFontFamily: string | null;
      bodyFontFamily: string | null;
      routePath: string;
    };
  };
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
  renderedCaptureAvailable?: boolean;
};

export function normalizePreviewRuntimeMode(value: unknown): PreviewRuntimeMode | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "react_preview") return "react_preview";
  if (normalized === "react_preview_degraded") return "react_preview_degraded";
  if (normalized === "fallback_preview") return "fallback_preview";
  if (normalized === "semantic_fallback_preview") return "semantic_fallback_preview";
  if (normalized === "raw_template_preview") return "raw_template_preview";
  return null;
}
