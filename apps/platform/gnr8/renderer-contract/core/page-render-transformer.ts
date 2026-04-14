import type { FinalPageModel } from "../../merge-engine";
import { pushRenderDiagnostic } from "../diagnostics/render-diagnostics";
import { transformSectionToRenderSection } from "./section-render-transformer";
import type { ReactRenderPage, RendererContractContext } from "../types/renderer-types";

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

const SUPPORTED_PAGE_ROLES = new Set(["home", "landing", "about", "services", "contact", "blog", "generic"]);

export function transformPageToRenderPage(input: {
  page: FinalPageModel;
  context: RendererContractContext;
}): ReactRenderPage {
  const { page, context } = input;

  if (!SUPPORTED_PAGE_ROLES.has(page.role)) {
    pushRenderDiagnostic(context, {
      code: "RENDER_PAGE_ROLE_UNSUPPORTED",
      severity: "info",
      message: `Page '${page.id}' role '${page.role}' is unsupported; role was preserved as metadata only.`,
      pageId: page.id,
      details: {
        role: page.role,
      },
    });
  }

  if (page.sections.length === 0) {
    pushRenderDiagnostic(context, {
      code: "RENDER_PAGE_SECTIONS_EMPTY",
      severity: "warning",
      message: `Page '${page.id}' has no sections and will render as an empty route shell.`,
      pageId: page.id,
    });
  }

  const seenSectionIds = new Set<string>();
  const sections = page.sections
    .slice()
    .sort((a, b) => a.order - b.order || stringCmp(a.id, b.id))
    .map((section) => {
      if (seenSectionIds.has(section.id)) {
        pushRenderDiagnostic(context, {
          code: "RENDER_SECTION_ID_DUPLICATE",
          severity: "warning",
          message: `Duplicate section id '${section.id}' detected on page '${page.id}'.`,
          pageId: page.id,
          sectionId: section.id,
        });
      }
      seenSectionIds.add(section.id);

      return transformSectionToRenderSection({
        section,
        page,
        context,
      });
    });

  return {
    pageId: page.id,
    routePath: page.path,
    pageRole: page.role,
    seo: {
      titleContentIds: [...page.seo.titleContentIds].sort((a, b) => stringCmp(a, b)),
      descriptionContentIds: [...page.seo.descriptionContentIds].sort((a, b) => stringCmp(a, b)),
    },
    sections,
  };
}
