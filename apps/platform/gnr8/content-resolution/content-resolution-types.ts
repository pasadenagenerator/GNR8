import type { FinalSiteModel } from "@/gnr8/merge-engine";
import type { ReactRenderSiteModel } from "@/gnr8/renderer-contract";

export type ContentResolutionStatus = "resolved" | "degraded_resolved" | "unresolved_fallback";

export type ResolvedRenderValueMap = Record<string, ResolvedRenderValue>;

export type ResolvedRenderValue =
  | { kind: "text"; value: string; sourceContentId?: string | null }
  | { kind: "rich_text"; value: string; sourceContentId?: string | null }
  | { kind: "url"; value: string; sourceContentId?: string | null }
  | { kind: "image"; src: string | null; alt: string | null; caption?: string | null; sourceContentId?: string | null }
  | { kind: "items"; items: ResolvedRenderValueMap[]; sourceContentId?: string | null }
  | { kind: "unknown"; value: unknown; sourceContentId?: string | null };

export type ContentResolutionDiagnostic = {
  code: string;
  message: string;
  pageId?: string;
  sectionId?: string;
  componentId?: string;
  slotPath?: string;
  details?: Record<string, unknown>;
};

export type ContentResolutionOptions = {
  includeDiagnostics?: boolean;
};

export type ContentResolutionInput = {
  finalSiteModel: FinalSiteModel | null;
  siteModel: ReactRenderSiteModel;
  options?: ContentResolutionOptions;
};

export type ContentResolutionResult = {
  resolvedSite: ReactRenderSiteModel;
  diagnostics: ContentResolutionDiagnostic[];
  resolvedContentCount: number;
  degradedResolvedContentCount: number;
  unresolvedContentCount: number;
  renderedWithFallback: boolean;
  contentResolutionApplied: boolean;
  contentResolutionDegraded: boolean;
};
