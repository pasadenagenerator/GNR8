import React, { type ReactElement } from "react";

import type { ReactRenderGlobalRegion, RenderDiagnostic } from "@/gnr8/renderer-contract";
import { RenderNotFound } from "@/gnr8/react-renderer/components/RenderNotFound";
import { PageRenderer } from "@/gnr8/react-renderer/core/page-renderer";
import { ThemeBoundaryProvider } from "@/gnr8/react-renderer/core/theme-provider";
import type { RealReactRendererOptions, RenderComponentRegistry } from "@/gnr8/react-renderer/types/renderer-runtime-types";

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function regionWeight(region: ReactRenderGlobalRegion): number {
  if (region.type === "header") return 0;
  if (region.type === "announcement") return 1;
  if (region.type === "utility") return 2;
  if (region.type === "footer") return 3;
  return 4;
}

function regionElementTag(regionType: ReactRenderGlobalRegion["type"]): "header" | "footer" | "aside" {
  if (regionType === "header") return "header";
  if (regionType === "footer") return "footer";
  return "aside";
}

function renderGlobalRegion(region: ReactRenderGlobalRegion, diagnosticsMode: Required<RealReactRendererOptions>["diagnosticsMode"]): ReactElement {
  const Tag = regionElementTag(region.type);
  return (
    <Tag
      key={region.regionId}
      data-gnr8-global-region-id={region.regionId}
      data-gnr8-global-region-type={region.type}
      data-gnr8-region-pages={region.pageIds.join(",")}
      data-gnr8-region-sections={region.sectionIds.join(",")}
    >
      {diagnosticsMode === "visible" ? (
        <p data-gnr8-diagnostic-visible="global-region">
          Global region: {region.label} ({region.type})
        </p>
      ) : null}
    </Tag>
  );
}

export type SiteRendererProps = {
  routePath: string;
  resolvedPage: import("@/gnr8/renderer-contract").ReactRenderPage | null;
  siteModel: import("@/gnr8/renderer-contract").ReactRenderSiteModel;
  diagnostics: RenderDiagnostic[];
  registry: RenderComponentRegistry;
  options: Required<RealReactRendererOptions>;
  fallbackComponentIds: Set<string>;
};

export function SiteRenderer({
  routePath,
  resolvedPage,
  siteModel,
  diagnostics,
  registry,
  options,
  fallbackComponentIds,
}: SiteRendererProps): ReactElement {
  const regionCandidates = siteModel.globalRegions
    .slice()
    .sort((a, b) => regionWeight(a) - regionWeight(b) || stringCmp(a.regionId, b.regionId));

  const renderedRegions = regionCandidates.filter((region) => {
    if (!resolvedPage) return true;
    if (region.pageIds.length === 0) return true;
    return region.pageIds.includes(resolvedPage.pageId);
  });

  return (
    <ThemeBoundaryProvider theme={siteModel.theme}>
      <div data-gnr8-rendered-site="true" data-gnr8-route-path={routePath} data-gnr8-diagnostics-count={String(diagnostics.length)}>
        {options.diagnosticsMode !== "silent" ? (
          <template data-gnr8-diagnostics-json={JSON.stringify(diagnostics)} />
        ) : null}

        {options.diagnosticsMode === "visible" && diagnostics.length > 0 ? (
          <aside data-gnr8-diagnostics-visible="true" aria-label="Renderer diagnostics">
            <h2>Renderer diagnostics</h2>
            <ul>
              {diagnostics.map((diagnostic, index) => (
                <li key={`diag-${index}`}>
                  [{diagnostic.severity}] {diagnostic.code}: {diagnostic.message}
                </li>
              ))}
            </ul>
          </aside>
        ) : null}

        {renderedRegions.map((region) => renderGlobalRegion(region, options.diagnosticsMode))}

        {resolvedPage ? (
          <PageRenderer
            page={resolvedPage}
            siteModel={siteModel}
            registry={registry}
            options={options}
            fallbackComponentIds={fallbackComponentIds}
          />
        ) : (
          <RenderNotFound routePath={routePath} />
        )}
      </div>
    </ThemeBoundaryProvider>
  );
}
