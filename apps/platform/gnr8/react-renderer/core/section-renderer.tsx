import type { ReactElement } from "react";

import type { ReactRenderPage, ReactRenderSection } from "@/gnr8/renderer-contract";
import { ComponentRenderer } from "@/gnr8/react-renderer/core/component-renderer";
import type { RealReactRendererOptions, RenderComponentRegistry } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export const SUPPORTED_SECTION_LAYOUT_KINDS = new Set([
  "stack",
  "split_media",
  "grid",
  "carousel",
  "hero",
  "faq_list",
  "pricing_table",
  "footer",
  "default",
]);

function deterministicJoin(values: string[] | undefined): string {
  if (!values || values.length === 0) return "";
  return values.join(",");
}

function resolveLayoutKind(layoutKind: string): string {
  return SUPPORTED_SECTION_LAYOUT_KINDS.has(layoutKind) ? layoutKind : "stack";
}

export type SectionRendererProps = {
  section: ReactRenderSection;
  page: ReactRenderPage;
  siteModel: import("@/gnr8/renderer-contract").ReactRenderSiteModel;
  registry: RenderComponentRegistry;
  options: Required<RealReactRendererOptions>;
  fallbackComponentIds: Set<string>;
};

export function SectionRenderer({
  section,
  page,
  siteModel,
  registry,
  options,
  fallbackComponentIds,
}: SectionRendererProps): ReactElement {
  const normalizedLayout = resolveLayoutKind(section.layoutKind);

  return (
    <section
      data-gnr8-section-id={section.sectionId}
      data-gnr8-semantic-role={section.semanticRole}
      data-gnr8-layout-kind={normalizedLayout}
      data-gnr8-layout-kind-input={section.layoutKind}
      data-gnr8-theme-refs={deterministicJoin(section.themeRefs)}
      data-gnr8-provenance-source={options.includeProvenance ? (section.provenance?.source ?? "") : undefined}
      data-gnr8-provenance-source-id={options.includeProvenance ? (section.provenance?.sourceId ?? "") : undefined}
      className={`gnr8-layout-${normalizedLayout}`}
    >
      {section.components.map((component) => (
        <ComponentRenderer
          key={component.componentId}
          component={component}
          section={section}
          page={page}
          siteModel={siteModel}
          registry={registry}
          options={options}
          usedFallback={fallbackComponentIds.has(component.componentId)}
        />
      ))}
    </section>
  );
}
