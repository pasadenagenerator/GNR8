import type { FinalPageModel, FinalSectionModel } from "../../merge-engine";
import { pushRenderDiagnostic } from "../diagnostics/render-diagnostics";
import { resolveRenderKind } from "./component-render-mapper";
import { resolveComponentContent } from "./content-prop-resolver";
import { resolveThemeRefs } from "./theme-resolver";
import type { ReactRenderSection, RendererContractContext } from "../types/renderer-types";

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

const SUPPORTED_LAYOUT_KINDS = new Set([
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

function normalizeLayoutKind(input: {
  layoutRole: string;
  pageId: string;
  section: FinalSectionModel;
  context: RendererContractContext;
}): string {
  const { layoutRole, pageId, section, context } = input;
  const normalized = layoutRole
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (normalized.length === 0) {
    pushRenderDiagnostic(context, {
      code: "RENDER_SECTION_LAYOUT_EMPTY",
      severity: "warning",
      message: `Section '${section.id}' had empty layoutRole and was normalized to 'stack'.`,
      pageId,
      sectionId: section.id,
    });
    return "stack";
  }

  if (SUPPORTED_LAYOUT_KINDS.has(normalized)) {
    return normalized;
  }

  pushRenderDiagnostic(context, {
    code: "RENDER_SECTION_LAYOUT_UNSUPPORTED",
    severity: "warning",
    message: `Section '${section.id}' layout '${layoutRole}' is unsupported and was mapped to 'stack'.`,
    pageId,
    sectionId: section.id,
    details: {
      inputLayout: layoutRole,
    },
  });

  return "stack";
}

export function transformSectionToRenderSection(input: {
  section: FinalSectionModel;
  page: FinalPageModel;
  context: RendererContractContext;
}): ReactRenderSection {
  const { section, page, context } = input;

  if (section.components.length === 0) {
    pushRenderDiagnostic(context, {
      code: "RENDER_SECTION_COMPONENTS_EMPTY",
      severity: "info",
      message: `Section '${section.id}' contains no components and will render as an empty section shell.`,
      pageId: page.id,
      sectionId: section.id,
    });
  }

  const seenComponentIds = new Set<string>();
  const components = section.components
    .slice()
    .sort((a, b) => a.order - b.order || stringCmp(a.id, b.id))
    .map((component) => {
      if (seenComponentIds.has(component.id)) {
        pushRenderDiagnostic(context, {
          code: "RENDER_COMPONENT_ID_DUPLICATE",
          severity: "warning",
          message: `Duplicate component id '${component.id}' detected in section '${section.id}'.`,
          pageId: page.id,
          sectionId: section.id,
          componentId: component.id,
        });
      }
      seenComponentIds.add(component.id);

      const renderResolution = resolveRenderKind({
        component,
        pageId: page.id,
        sectionId: section.id,
        context,
      });

      const contentResolution = resolveComponentContent({
        component,
        section,
        context,
        renderKind: renderResolution.renderKind,
        pageId: page.id,
      });

      const fallback =
        renderResolution.usedGenericFallback || contentResolution.hasFallbacks || component.fallback.wrappedAsGeneric
          ? {
              reason:
                renderResolution.fallbackReason ??
                component.fallback.reason ??
                (contentResolution.hasFallbacks ? "missing_content_bindings" : "generic_fallback"),
              safeRenderable: true,
              originalKind: component.kind,
              rawMetadata: component.fallback.rawMetadata,
            }
          : undefined;

      return {
        componentId: component.id,
        renderKind: renderResolution.renderKind,
        props: {
          ...contentResolution.props,
          mappedType: component.mappedType,
          variant: component.variant,
        },
        slots: contentResolution.slots,
        themeRefs: [...component.tokenRefs].sort((a, b) => stringCmp(a, b)).map((tokenId) => `tokens.${tokenId}`),
        fallback,
        ...(context.options.includeProvenance
          ? {
              provenance: {
                source: component.provenance.source,
                sourceId: component.provenance.sourceId,
                rationale: component.provenance.rationale,
                confidence: component.provenance.confidence,
              },
            }
          : {}),
      };
    });

  return {
    sectionId: section.id,
    semanticRole: section.semanticRole,
    layoutKind: normalizeLayoutKind({
      layoutRole: section.layoutRole,
      pageId: page.id,
      section,
      context,
    }),
    themeRefs: resolveThemeRefs(section.styleRefs),
    components,
    ...(context.options.includeProvenance
      ? {
          provenance: {
            source: section.provenance.source,
            sourceId: section.provenance.sourceId,
            rationale: section.provenance.rationale,
            confidence: section.provenance.confidence,
          },
        }
      : {}),
  };
}
