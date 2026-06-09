import React, { type ReactElement } from "react";

import type { ReactRenderComponent, ReactRenderPage, ReactRenderSection } from "@/gnr8/renderer-contract";
import { RenderGeneric } from "@/gnr8/react-renderer/components/RenderGeneric";
import type { RealReactRendererOptions, RenderComponentRegistry } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export type ComponentRendererProps = {
  component: ReactRenderComponent;
  section: ReactRenderSection;
  page: ReactRenderPage;
  siteModel: import("@/gnr8/renderer-contract").ReactRenderSiteModel;
  registry: RenderComponentRegistry;
  options: Required<RealReactRendererOptions>;
  usedFallback: boolean;
};

function joinDeterministic(values: string[] | undefined): string {
  if (!values || values.length === 0) return "";
  return values.join(",");
}

export function ComponentRenderer({
  component,
  section,
  page,
  siteModel,
  registry,
  options,
  usedFallback,
}: ComponentRendererProps): ReactElement {
  const implementation = registry.get(component.renderKind);

  const element = implementation
    ? implementation({ component, section, page, siteModel, options })
    : RenderGeneric({ component, section, page, siteModel, options });

  const fallbackReason = implementation ? component.fallback?.reason ?? "" : "unknown_render_kind";

  return (
    <div
      data-gnr8-component-id={component.componentId}
      data-gnr8-render-kind={component.renderKind}
      data-gnr8-theme-refs={joinDeterministic(component.themeRefs)}
      data-gnr8-fallback={usedFallback ? "true" : "false"}
      data-gnr8-fallback-reason={fallbackReason}
      data-gnr8-provenance-source={options.includeProvenance ? (component.provenance?.source ?? "") : undefined}
      data-gnr8-provenance-source-id={options.includeProvenance ? (component.provenance?.sourceId ?? "") : undefined}
    >
      {options.diagnosticsMode === "visible" && usedFallback ? (
        <p data-gnr8-diagnostic-visible="component-fallback">
          Fallback: {fallbackReason || "component fallback"}
        </p>
      ) : null}
      {element}
    </div>
  );
}
