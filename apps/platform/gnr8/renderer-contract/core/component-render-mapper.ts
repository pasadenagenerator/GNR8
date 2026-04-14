import type { FinalComponentModel } from "../../merge-engine";
import { pushRenderDiagnostic } from "../diagnostics/render-diagnostics";
import type { ComponentRenderResolution, RendererContractContext } from "../types/renderer-types";

const RENDER_KIND_BY_COMPONENT_KIND: Record<string, string> = {
  hero: "render.hero",
  heading: "render.heading",
  section_heading: "render.heading",
  rich_text: "render.rich_text",
  image: "render.image",
  cta_group: "render.cta_group",
  card_grid: "render.card_grid",
  gallery: "render.gallery",
  testimonial: "render.testimonial",
  pricing: "render.pricing",
  faq: "render.faq",
  footer_block: "render.footer_block",
  generic: "render.generic",
};

function normalizeRenderType(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function resolveRenderKind(input: {
  component: FinalComponentModel;
  pageId: string;
  sectionId: string;
  context: RendererContractContext;
}): ComponentRenderResolution {
  const { component, pageId, sectionId, context } = input;
  const kind = component.kind;
  const mapped = RENDER_KIND_BY_COMPONENT_KIND[kind];

  if (mapped) {
    return {
      renderKind: mapped,
      usedGenericFallback: mapped === "render.generic",
      fallbackReason: mapped === "render.generic" ? "generic_component_kind" : null,
    };
  }

  if (context.options.componentMappingMode === "allow_generic") {
    const normalizedMappedType = normalizeRenderType(component.mappedType);
    if (normalizedMappedType.length > 0) {
      pushRenderDiagnostic(context, {
        code: "RENDER_COMPONENT_MAPPING_ALLOW_GENERIC",
        severity: "info",
        message: `Component '${component.id}' used mappedType-derived render kind '${normalizedMappedType}'.`,
        pageId,
        sectionId,
        componentId: component.id,
        details: {
          componentKind: component.kind,
          mappedType: component.mappedType,
        },
      });

      return {
        renderKind: `render.${normalizedMappedType}`,
        usedGenericFallback: false,
        fallbackReason: null,
      };
    }
  }

  pushRenderDiagnostic(context, {
    code: "RENDER_COMPONENT_KIND_UNKNOWN",
    severity: context.options.fallbackMode === "strict" ? "error" : "warning",
    message: `Component '${component.id}' kind '${String(component.kind)}' is unsupported and was mapped to render.generic.`,
    pageId,
    sectionId,
    componentId: component.id,
    details: {
      componentKind: component.kind,
      mappedType: component.mappedType,
      fallbackMode: context.options.fallbackMode,
    },
  });

  return {
    renderKind: "render.generic",
    usedGenericFallback: true,
    fallbackReason: "unsupported_component_kind",
  };
}
