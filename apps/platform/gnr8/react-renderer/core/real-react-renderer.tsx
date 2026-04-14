import type { ReactElement } from "react";

import type { ReactRenderComponent, ReactRenderPage, ReactRenderSiteModel, RenderDiagnostic } from "@/gnr8/renderer-contract";
import { didRenderWithFallback, sortRuntimeDiagnostics } from "@/gnr8/react-renderer/core/diagnostics";
import { resolveRoutePage } from "@/gnr8/react-renderer/core/route-page-resolver";
import { SiteRenderer } from "@/gnr8/react-renderer/core/site-renderer";
import { isMalformedSlotValue } from "@/gnr8/react-renderer/core/slot-utils";
import { SUPPORTED_SECTION_LAYOUT_KINDS } from "@/gnr8/react-renderer/core/section-renderer";
import { registerDefaultComponents } from "@/gnr8/react-renderer/registry/register-default-components";
import type {
  RealReactRendererInput,
  RealReactRendererOptions,
  RealReactRendererOutput,
  RenderComponentRegistry,
} from "@/gnr8/react-renderer/types/renderer-runtime-types";

export const DEFAULT_REAL_REACT_RENDERER_OPTIONS: Required<RealReactRendererOptions> = {
  diagnosticsMode: "silent",
  fallbackMode: "safe",
  includeProvenance: false,
};

const DEFAULT_COMPONENT_REGISTRY = registerDefaultComponents();

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function requiresHeading(renderKind: string): boolean {
  return renderKind === "render.hero" || renderKind === "render.heading";
}

function requiresBody(renderKind: string): boolean {
  return renderKind === "render.hero" || renderKind === "render.rich_text";
}

function requiresMedia(renderKind: string): boolean {
  return renderKind === "render.hero" || renderKind === "render.image" || renderKind === "render.gallery";
}

function analyzeComponent(input: {
  component: ReactRenderComponent;
  page: ReactRenderPage;
  sectionId: string;
  registry: RenderComponentRegistry;
  options: Required<RealReactRendererOptions>;
  diagnostics: RenderDiagnostic[];
  fallbackComponentIds: Set<string>;
}): void {
  const { component, page, sectionId, registry, options, diagnostics, fallbackComponentIds } = input;

  let componentFallback = false;

  if (!registry.has(component.renderKind)) {
    componentFallback = true;
    diagnostics.push({
      code: "RUNTIME_COMPONENT_UNKNOWN_KIND",
      severity: options.fallbackMode === "strict" ? "error" : "warning",
      message: `Unsupported render kind '${component.renderKind}' mapped to deterministic generic renderer.`,
      pageId: page.pageId,
      sectionId,
      componentId: component.componentId,
      details: {
        renderKind: component.renderKind,
      },
    });
  }

  if (component.renderKind === "render.generic" || component.fallback) {
    componentFallback = true;
  }

  if (requiresHeading(component.renderKind) && !hasValue(component.props.heading) && !hasValue(component.slots?.heading)) {
    componentFallback = true;
    diagnostics.push({
      code: "RUNTIME_COMPONENT_PROP_MISSING",
      severity: "warning",
      message: `Component '${component.componentId}' is missing heading content and used safe fallback text.`,
      pageId: page.pageId,
      sectionId,
      componentId: component.componentId,
      details: {
        renderKind: component.renderKind,
        prop: "heading",
      },
    });
  }

  if (requiresBody(component.renderKind) && !hasValue(component.props.body) && !hasValue(component.slots?.body)) {
    componentFallback = true;
    diagnostics.push({
      code: "RUNTIME_COMPONENT_PROP_MISSING",
      severity: "warning",
      message: `Component '${component.componentId}' is missing body content and used safe fallback text.`,
      pageId: page.pageId,
      sectionId,
      componentId: component.componentId,
      details: {
        renderKind: component.renderKind,
        prop: "body",
      },
    });
  }

  const mediaSlot = component.slots?.image ?? component.slots?.media;
  if (requiresMedia(component.renderKind) && !hasValue(component.props.media) && !hasValue(mediaSlot)) {
    componentFallback = true;
    diagnostics.push({
      code: "RUNTIME_COMPONENT_MEDIA_MISSING",
      severity: "warning",
      message: `Component '${component.componentId}' is missing media content and used deterministic placeholder media.`,
      pageId: page.pageId,
      sectionId,
      componentId: component.componentId,
      details: {
        renderKind: component.renderKind,
      },
    });
  }

  const slots = component.slots ?? {};
  for (const slotKey of Object.keys(slots).sort((a, b) => (a === b ? 0 : a < b ? -1 : 1))) {
    if (isMalformedSlotValue(slots[slotKey])) {
      componentFallback = true;
      diagnostics.push({
        code: "RUNTIME_SLOT_MALFORMED",
        severity: "warning",
        message: `Component '${component.componentId}' slot '${slotKey}' is malformed and rendered through safe generic slot fallback.`,
        pageId: page.pageId,
        sectionId,
        componentId: component.componentId,
        details: {
          slotKey,
        },
      });
    }
  }

  if (componentFallback) {
    fallbackComponentIds.add(component.componentId);
  }
}

function analyzePageRuntime(input: {
  page: ReactRenderPage | null;
  options: Required<RealReactRendererOptions>;
  diagnostics: RenderDiagnostic[];
  registry: RenderComponentRegistry;
}): Set<string> {
  const { page, options, diagnostics, registry } = input;
  const fallbackComponentIds = new Set<string>();

  if (!page) return fallbackComponentIds;

  if (page.sections.length === 0) {
    diagnostics.push({
      code: "RUNTIME_PAGE_EMPTY",
      severity: options.fallbackMode === "strict" ? "error" : "warning",
      message: `Page '${page.pageId}' has no sections and rendered deterministic empty-page fallback.`,
      pageId: page.pageId,
    });
  }

  for (const section of page.sections) {
    if (!SUPPORTED_SECTION_LAYOUT_KINDS.has(section.layoutKind)) {
      diagnostics.push({
        code: "RUNTIME_SECTION_LAYOUT_UNSUPPORTED",
        severity: "warning",
        message: `Section '${section.sectionId}' layout '${section.layoutKind}' is unsupported and was rendered as 'stack'.`,
        pageId: page.pageId,
        sectionId: section.sectionId,
      });
    }

    for (const component of section.components) {
      analyzeComponent({
        component,
        page,
        sectionId: section.sectionId,
        registry,
        options,
        diagnostics,
        fallbackComponentIds,
      });
    }
  }

  return fallbackComponentIds;
}

export type RenderedSiteProps = {
  routePath: string;
  resolvedPage: ReactRenderPage | null;
  siteModel: ReactRenderSiteModel;
  diagnostics: RenderDiagnostic[];
  options: Required<RealReactRendererOptions>;
  registry: RenderComponentRegistry;
  fallbackComponentIds: Set<string>;
};

export function RenderedSite(props: RenderedSiteProps): ReactElement {
  return <SiteRenderer {...props} />;
}

export function renderRealReactSite(input: RealReactRendererInput): RealReactRendererOutput {
  const options: Required<RealReactRendererOptions> = {
    ...DEFAULT_REAL_REACT_RENDERER_OPTIONS,
    ...(input.options ?? {}),
  };

  const diagnostics: RenderDiagnostic[] = [...input.siteModel.diagnostics];
  const resolved = resolveRoutePage({
    siteModel: input.siteModel,
    routePath: input.routePath,
    options,
    diagnostics,
  });

  const fallbackComponentIds = analyzePageRuntime({
    page: resolved.matchedPage,
    options,
    diagnostics,
    registry: DEFAULT_COMPONENT_REGISTRY,
  });

  const sortedDiagnostics = sortRuntimeDiagnostics(diagnostics);

  const renderedSite = (
    <RenderedSite
      routePath={input.routePath}
      resolvedPage={resolved.matchedPage}
      siteModel={input.siteModel}
      diagnostics={sortedDiagnostics}
      options={options}
      registry={DEFAULT_COMPONENT_REGISTRY}
      fallbackComponentIds={fallbackComponentIds}
    />
  );

  return {
    renderedSite,
    result: {
      matchedPageId: resolved.matchedPageId,
      diagnostics: sortedDiagnostics,
      renderedWithFallback: didRenderWithFallback(sortedDiagnostics) || fallbackComponentIds.size > 0,
    },
  };
}
