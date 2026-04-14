import type { FinalGlobalRegion, FinalPageModel, FinalProvenance, FinalSite, FinalSiteModel, FinalTokenSet } from "../../merge-engine";

export type RendererContractInput = {
  site: FinalSiteModel;
  options?: RendererContractOptions;
};

export type RendererContractOptions = {
  fallbackMode?: "safe" | "strict";
  includeDiagnostics?: boolean;
  includeProvenance?: boolean;
  componentMappingMode?: "normalized_only" | "allow_generic";
};

export type RenderDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  pageId?: string;
  sectionId?: string;
  componentId?: string;
  details?: Record<string, unknown>;
};

export type RenderProvenance = {
  source: FinalProvenance["source"];
  sourceId: string;
  rationale: string;
  confidence: number;
};

export type ReactRenderTokenValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | null>
  | Record<string, string | number | boolean | null | Array<string | number | boolean | null>>;

export type ReactRenderTokenGroup = {
  tokens: Record<string, ReactRenderTokenValue>;
  provenance?: Record<string, RenderProvenance[]>;
};

export type ReactRenderTheme = {
  tokenGroups: Record<string, ReactRenderTokenGroup>;
  semanticTokens: Record<string, string>;
  componentThemes?: Record<string, Record<string, string>>;
};

export type ReactRenderSeo = {
  titleContentIds: string[];
  descriptionContentIds: string[];
};

export type ReactRenderBoundValue = {
  kind: "bound_content" | "fallback";
  valueType: "text" | "rich_text" | "image" | "url" | "list" | "unknown";
  slotPath: string;
  slotKey: string;
  contentId: string | null;
  bindingId: string | null;
  confidence: number | null;
  fallbackValue: unknown;
};

export type ReactRenderSlotValue =
  | ReactRenderBoundValue
  | ReactRenderBoundValue[]
  | Record<string, ReactRenderBoundValue | ReactRenderBoundValue[]>;

export type ReactFallbackRender = {
  reason: string;
  safeRenderable: boolean;
  originalKind: string;
  rawMetadata?: Record<string, unknown> | null;
};

export type ReactRenderComponent = {
  componentId: string;
  renderKind: string;
  props: Record<string, unknown>;
  slots?: Record<string, ReactRenderSlotValue>;
  themeRefs?: string[];
  fallback?: ReactFallbackRender;
  provenance?: RenderProvenance;
};

export type ReactRenderSection = {
  sectionId: string;
  semanticRole: string;
  layoutKind: string;
  themeRefs: string[];
  components: ReactRenderComponent[];
  provenance?: RenderProvenance;
};

export type ReactRenderPage = {
  pageId: string;
  routePath: string;
  pageRole?: string;
  seo?: ReactRenderSeo;
  sections: ReactRenderSection[];
};

export type ReactRenderSiteRoute = {
  routeId: string;
  path: string;
  pageId: string | null;
  parentRouteId: string | null;
  order: number;
  status: "resolved" | "placeholder";
};

export type ReactRenderSite = {
  siteId: string;
  locale: string;
  defaultPageId: string | null;
  routes: ReactRenderSiteRoute[];
};

export type ReactRenderGlobalRegion = {
  regionId: string;
  type: FinalGlobalRegion["type"];
  label: string;
  navigationTreeId: string | null;
  sectionIds: string[];
  pageIds: string[];
  provenance?: RenderProvenance;
};

export type ReactRenderSiteModel = {
  site: ReactRenderSite;
  pages: ReactRenderPage[];
  globalRegions: ReactRenderGlobalRegion[];
  theme: ReactRenderTheme;
  diagnostics: RenderDiagnostic[];
};

export type RendererContractContext = {
  input: RendererContractInput;
  options: Required<RendererContractOptions>;
  diagnostics: RenderDiagnostic[];
};

export type ComponentRenderResolution = {
  renderKind: string;
  usedGenericFallback: boolean;
  fallbackReason: string | null;
};

export type ContentResolutionInput = {
  component: FinalPageModel["sections"][number]["components"][number];
  section: FinalPageModel["sections"][number];
  context: RendererContractContext;
};

export type ThemeResolutionInput = {
  site: FinalSite;
  tokens: FinalTokenSet;
  includeProvenance: boolean;
};
