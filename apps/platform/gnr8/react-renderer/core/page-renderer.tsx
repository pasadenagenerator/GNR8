import type { ReactElement } from "react";

import type { ReactRenderPage } from "@/gnr8/renderer-contract";
import { RenderEmptyPage } from "@/gnr8/react-renderer/components/RenderEmptyPage";
import { SectionRenderer } from "@/gnr8/react-renderer/core/section-renderer";
import type { RealReactRendererOptions, RenderComponentRegistry } from "@/gnr8/react-renderer/types/renderer-runtime-types";

export type PageRendererProps = {
  page: ReactRenderPage;
  siteModel: import("@/gnr8/renderer-contract").ReactRenderSiteModel;
  registry: RenderComponentRegistry;
  options: Required<RealReactRendererOptions>;
  fallbackComponentIds: Set<string>;
};

export function PageRenderer({ page, siteModel, registry, options, fallbackComponentIds }: PageRendererProps): ReactElement {
  return (
    <main
      data-gnr8-page-id={page.pageId}
      data-gnr8-route-path={page.routePath}
      data-gnr8-page-role={page.pageRole ?? ""}
      data-gnr8-section-count={String(page.sections.length)}
    >
      {page.sections.length === 0 ? <RenderEmptyPage pageId={page.pageId} /> : null}
      {page.sections.map((section) => (
        <SectionRenderer
          key={section.sectionId}
          section={section}
          page={page}
          siteModel={siteModel}
          registry={registry}
          options={options}
          fallbackComponentIds={fallbackComponentIds}
        />
      ))}
    </main>
  );
}
