import type { GeneratedComponent } from "../../design-adapter";
import { pushConflict, pushDiagnostic } from "../diagnostics/merge-diagnostics";
import type {
  FinalComponentKind,
  FinalComponentModel,
  FinalComponentSlot,
  FinalProvenance,
  MergeContext,
} from "../types/merge-types";

const COMPONENT_KIND_BY_EXTERNAL: Record<string, FinalComponentKind> = {
  hero: "hero",
  header: "section_heading",
  section_heading: "section_heading",
  heading: "section_heading",
  text: "rich_text",
  rich_text: "rich_text",
  paragraph: "rich_text",
  image: "image",
  media: "image",
  cta: "cta_group",
  button_group: "cta_group",
  buttons: "cta_group",
  card_grid: "card_grid",
  cards: "card_grid",
  gallery: "gallery",
  testimonial: "testimonial",
  testimonials: "testimonial",
  pricing: "pricing",
  faq: "faq",
  footer: "footer_block",
  footer_block: "footer_block",
  container: "container",
};

function normalizeType(type: string): string {
  return type.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function inferSlotsFromProps(props: Record<string, unknown>): FinalComponentSlot[] {
  const slots = Object.keys(props)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => {
      const value = props[key];
      let valueType: FinalComponentSlot["valueType"] = "unknown";

      if (Array.isArray(value)) {
        valueType = "list";
      } else if (typeof value === "string") {
        const lower = key.toLowerCase();
        if (lower.includes("html") || lower.includes("rich")) {
          valueType = "rich_text";
        } else if (lower.includes("url") || lower.includes("href") || lower.includes("link")) {
          valueType = "url";
        } else {
          valueType = "text";
        }
      } else if (value && typeof value === "object") {
        const maybeAssetRef = (value as { assetRef?: unknown }).assetRef;
        if (typeof maybeAssetRef === "string") {
          valueType = "image";
        }
      }

      return {
        key,
        valueType,
        sourceHint: typeof value === "string" ? value.slice(0, 100) : null,
      };
    });

  if (slots.length > 0) {
    return slots;
  }

  return [
    {
      key: "content",
      valueType: "unknown",
      sourceHint: null,
    },
  ];
}

export function mapDesignComponent(input: {
  component: GeneratedComponent;
  sectionId: string;
  order: number;
  context: MergeContext;
}): FinalComponentModel | null {
  const { component, sectionId, order, context } = input;
  const normalizedExternalType = normalizeType(component.type);
  const mapped = COMPONENT_KIND_BY_EXTERNAL[normalizedExternalType];

  const provenance: FinalProvenance = {
    source: mapped ? "design" : "merged",
    sourceId: component.id,
    rationale: mapped
      ? `Mapped design component type '${component.type}' to '${mapped}'.`
      : `Unsupported design component type '${component.type}' handled via '${context.options.unknownComponentPolicy}'.`,
    confidence: component.confidence,
  };

  if (!mapped) {
    pushConflict(context, {
      type: "component_unmapped",
      resolution:
        context.options.unknownComponentPolicy === "drop"
          ? "skipped"
          : context.options.unknownComponentPolicy === "diagnose"
            ? "skipped"
            : "fallback_generic",
      details: {
        componentId: component.id,
        sectionId,
        externalType: component.type,
        policy: context.options.unknownComponentPolicy,
      },
    });

    if (context.options.unknownComponentPolicy === "drop" || context.options.unknownComponentPolicy === "diagnose") {
      pushDiagnostic(context, {
        code: "MERGE_COMPONENT_UNMAPPED_DROPPED",
        severity: context.options.unknownComponentPolicy === "diagnose" ? "error" : "warning",
        message: `Dropped unmapped component '${component.id}' of type '${component.type}'.`,
        sectionId,
        details: {
          policy: context.options.unknownComponentPolicy,
        },
      });
      return null;
    }

    pushDiagnostic(context, {
      code: "MERGE_COMPONENT_UNMAPPED_WRAPPED",
      severity: "warning",
      message: `Wrapped unmapped component '${component.id}' as generic component.`,
      sectionId,
      details: {
        externalType: component.type,
      },
    });
  }

  const kind: FinalComponentKind = mapped ?? "generic";
  return {
    id: component.id,
    sectionId,
    kind,
    mappedType: component.type,
    variant: component.variant,
    order,
    slots: inferSlotsFromProps(component.props),
    tokenRefs: [],
    fallback: {
      wrappedAsGeneric: !mapped,
      reason: mapped ? null : "unsupported_component_type",
      rawMetadata: mapped ? null : { type: component.type, props: component.props },
    },
    provenance,
  };
}
