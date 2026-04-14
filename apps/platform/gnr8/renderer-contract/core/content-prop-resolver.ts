import type { FinalComponentContentBinding } from "../../merge-engine";
import { pushRenderDiagnostic } from "../diagnostics/render-diagnostics";
import type { ContentResolutionInput, ReactRenderBoundValue, ReactRenderSlotValue } from "../types/renderer-types";

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function fallbackForValueType(valueType: ReactRenderBoundValue["valueType"], slotPath: string): unknown {
  switch (valueType) {
    case "text":
    case "rich_text":
      return `[missing:${slotPath}]`;
    case "url":
      return "#";
    case "image":
      return {
        src: null,
        alt: `Missing media for ${slotPath}`,
      };
    case "list":
      return [];
    default:
      return null;
  }
}

function findBinding(input: {
  bindings: FinalComponentContentBinding[];
  componentId: string;
  slotKey: string;
}): FinalComponentContentBinding | null {
  const { bindings, componentId, slotKey } = input;
  const exactPath = `${componentId}.${slotKey}`;

  const exact = bindings.find((binding) => binding.slotPath === exactPath);
  if (exact) return exact;

  const suffix = `.${slotKey}`;
  const fallback = bindings
    .filter((binding) => binding.componentId === componentId && binding.slotPath.endsWith(suffix))
    .sort((a, b) => stringCmp(a.id, b.id))[0];

  return fallback ?? null;
}

function resolveSingleSlotValue(input: {
  slotKey: string;
  slotPath: string;
  valueType: ReactRenderBoundValue["valueType"];
  binding: FinalComponentContentBinding | null;
}): ReactRenderBoundValue {
  const { slotKey, slotPath, valueType, binding } = input;

  if (!binding) {
    return {
      kind: "fallback",
      valueType,
      slotPath,
      slotKey,
      contentId: null,
      bindingId: null,
      confidence: null,
      fallbackValue: fallbackForValueType(valueType, slotPath),
    };
  }

  return {
    kind: "bound_content",
    valueType,
    slotPath,
    slotKey,
    contentId: binding.contentId,
    bindingId: binding.id,
    confidence: binding.confidence,
    fallbackValue: fallbackForValueType(valueType, slotPath),
  };
}

function findSlotRef(input: {
  slots: Record<string, ReactRenderSlotValue>;
  names: string[];
}): ReactRenderBoundValue | null {
  const { slots, names } = input;
  const lowerNames = names.map((name) => name.toLowerCase());
  const key = Object.keys(slots)
    .sort((a, b) => stringCmp(a, b))
    .find((k) => lowerNames.some((candidate) => k.toLowerCase() === candidate || k.toLowerCase().includes(candidate)));

  if (!key) return null;
  const value = slots[key];
  if (!value || Array.isArray(value) || typeof value !== "object") return null;

  if ("kind" in value && "slotPath" in value) {
    return value as ReactRenderBoundValue;
  }

  return null;
}

function buildCtaProps(slots: Record<string, ReactRenderSlotValue>): Record<string, unknown> {
  const label = findSlotRef({ slots, names: ["cta.label", "cta_label", "label", "button_label"] });
  const href = findSlotRef({ slots, names: ["cta.href", "cta_url", "href", "url", "link"] });

  if (!label && !href) {
    return {
      ctas: [],
    };
  }

  return {
    ctas: [
      {
        label,
        href,
      },
    ],
  };
}

function buildCollectionProps(slots: Record<string, ReactRenderSlotValue>): Record<string, unknown> {
  const collections: Record<string, ReactRenderBoundValue[]> = {};

  for (const [slotKey, slotValue] of Object.entries(slots).sort(([a], [b]) => stringCmp(a, b))) {
    if (!slotValue || Array.isArray(slotValue) || typeof slotValue !== "object") continue;
    if (!("valueType" in slotValue) || slotValue.valueType !== "list") continue;

    const scalar = slotValue as ReactRenderBoundValue;
    collections[slotKey] = [scalar];
  }

  return {
    collections,
  };
}

function buildRenderProps(input: {
  renderKind: string;
  slots: Record<string, ReactRenderSlotValue>;
}): Record<string, unknown> {
  const { renderKind, slots } = input;

  const heading = findSlotRef({ slots, names: ["heading", "headline", "title"] });
  const body = findSlotRef({ slots, names: ["body", "text", "description", "copy"] });
  const media = findSlotRef({ slots, names: ["image", "media", "logo", "background"] });

  const base = {
    heading,
    body,
    media,
    ...buildCtaProps(slots),
    ...buildCollectionProps(slots),
    slotKeys: Object.keys(slots).sort((a, b) => stringCmp(a, b)),
  };

  switch (renderKind) {
    case "render.hero":
      return {
        ...base,
        variant: "hero",
      };
    case "render.heading":
      return {
        heading,
        slotKeys: base.slotKeys,
      };
    case "render.rich_text":
      return {
        body,
        slotKeys: base.slotKeys,
      };
    case "render.image":
      return {
        media,
        slotKeys: base.slotKeys,
      };
    case "render.cta_group":
      return {
        ...buildCtaProps(slots),
        slotKeys: base.slotKeys,
      };
    case "render.card_grid":
    case "render.gallery":
    case "render.testimonial":
    case "render.pricing":
    case "render.faq":
    case "render.footer_block":
      return {
        ...base,
      };
    default:
      return {
        ...base,
      };
  }
}

export function resolveComponentContent(input: ContentResolutionInput & { renderKind: string; pageId: string }): {
  props: Record<string, unknown>;
  slots: Record<string, ReactRenderSlotValue>;
  hasFallbacks: boolean;
} {
  const { component, section, context, renderKind, pageId } = input;

  const sectionBindings = section.contentBindings
    .slice()
    .sort((a, b) => stringCmp(a.slotPath, b.slotPath) || stringCmp(a.id, b.id));

  const slots: Record<string, ReactRenderSlotValue> = {};
  let hasFallbacks = false;

  for (const slot of component.slots.slice().sort((a, b) => stringCmp(a.key, b.key))) {
    const binding = findBinding({
      bindings: sectionBindings,
      componentId: component.id,
      slotKey: slot.key,
    });

    const slotPath = `${component.id}.${slot.key}`;
    const value = resolveSingleSlotValue({
      slotKey: slot.key,
      slotPath,
      valueType: slot.valueType,
      binding,
    });

    if (!binding) {
      hasFallbacks = true;
      pushRenderDiagnostic(context, {
        code: "RENDER_CONTENT_BINDING_MISSING",
        severity: context.options.fallbackMode === "strict" ? "error" : "warning",
        message: `Component slot '${slotPath}' has no content binding and received deterministic fallback content.`,
        pageId,
        sectionId: section.id,
        componentId: component.id,
        details: {
          valueType: slot.valueType,
          sourceHint: slot.sourceHint,
          fallbackMode: context.options.fallbackMode,
        },
      });

      if (slot.valueType === "image") {
        pushRenderDiagnostic(context, {
          code: "RENDER_MEDIA_BINDING_MISSING",
          severity: "warning",
          message: `Media slot '${slotPath}' is missing and will render with safe media fallback.`,
          pageId,
          sectionId: section.id,
          componentId: component.id,
        });
      }
    }

    slots[slot.key] = value;
  }

  const props = buildRenderProps({ renderKind, slots });
  return {
    props,
    slots,
    hasFallbacks,
  };
}
