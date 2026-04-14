import type { ReactElement } from "react";

import type {
  ReactRenderComponent,
  ReactRenderPage,
  ReactRenderSection,
  ReactRenderSiteModel,
  RenderDiagnostic,
} from "@/gnr8/renderer-contract";
import type { FinalSiteModel } from "@/gnr8/merge-engine";

export type RealReactRendererOptions = {
  diagnosticsMode?: "silent" | "comments" | "visible";
  fallbackMode?: "safe" | "strict";
  includeProvenance?: boolean;
};

export type RealReactRendererInput = {
  siteModel: ReactRenderSiteModel;
  finalSiteModel?: FinalSiteModel | null;
  routePath: string;
  options?: RealReactRendererOptions;
};

export type RealReactRendererResult = {
  matchedPageId: string | null;
  diagnostics: RenderDiagnostic[];
  renderedWithFallback: boolean;
  contentResolutionApplied: boolean;
  resolvedContentCount: number;
  degradedResolvedContentCount: number;
  unresolvedContentCount: number;
  contentResolutionDegraded: boolean;
  contentResolutionDiagnostics: string[];
};

export type RealReactRendererOutput = {
  renderedSite: ReactElement;
  result: RealReactRendererResult;
};

export type ResolvedRoutePage = {
  matchedRoutePath: string | null;
  matchedPageId: string | null;
  matchedPage: ReactRenderPage | null;
};

export type RenderComponentImplementationProps = {
  component: ReactRenderComponent;
  section: ReactRenderSection;
  page: ReactRenderPage;
  siteModel: ReactRenderSiteModel;
  options: Required<RealReactRendererOptions>;
};

export type RenderComponentImplementation = (props: RenderComponentImplementationProps) => ReactElement;

export type RenderComponentRegistry = {
  get: (renderKind: string) => RenderComponentImplementation | null;
  has: (renderKind: string) => boolean;
  register: (renderKind: string, impl: RenderComponentImplementation) => void;
  listKinds: () => string[];
};
