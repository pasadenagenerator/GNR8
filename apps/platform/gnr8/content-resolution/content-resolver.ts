import type { FinalSiteModel } from "@/gnr8/merge-engine";
import type { ReactRenderBoundValue, ReactRenderComponent, ReactRenderSiteModel, ReactRenderSlotValue } from "@/gnr8/renderer-contract";
import {
  CONTENT_RESOLUTION_DIAGNOSTIC,
  sortContentResolutionDiagnostics,
} from "@/gnr8/content-resolution/content-resolution-diagnostics";
import type {
  ContentResolutionDiagnostic,
  ContentResolutionInput,
  ContentResolutionResult,
  ContentResolutionStatus,
  ResolvedRenderValue,
  ResolvedRenderValueMap,
} from "@/gnr8/content-resolution/content-resolution-types";

const PLACEHOLDER_MEDIA_SRC = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

type ResolutionSource = "render_model" | "final_model_binding" | "final_model_structured" | "fallback" | "placeholder";

type SlotResolution = {
  value: ResolvedRenderValue;
  status: ContentResolutionStatus;
  source: ResolutionSource;
};

type FinalContentIndexes = {
  bindingBySlotPath: Map<string, { contentId: string; bindingId: string }>;
  contentById: Map<string, unknown>;
  structuredSlotByPath: Map<string, unknown>;
  seenRenderSlotPaths: Set<string>;
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function toNonEmptyText(value: unknown): string | null {
  const text = asText(value).trim();
  return text.length > 0 ? text : null;
}

function isBoundValue(value: unknown): value is ReactRenderBoundValue {
  return (
    isRecord(value) &&
    typeof value.kind === "string" &&
    typeof value.valueType === "string" &&
    typeof value.slotPath === "string" &&
    typeof value.slotKey === "string"
  );
}

function normalizeSlotKeyCandidates(slotKey: string): string[] {
  const keyBase = slotKey.includes(".") ? slotKey.split(".").at(-1) ?? slotKey : slotKey;
  return [slotKey, slotKey.replaceAll(".", "_"), keyBase];
}

function readPropCandidate(input: { props: Record<string, unknown>; slotKey: string }): unknown {
  const { props, slotKey } = input;
  for (const key of normalizeSlotKeyCandidates(slotKey)) {
    if (key in props && props[key] != null && !isBoundValue(props[key])) {
      return props[key];
    }
  }
  return null;
}

function mapPrimitiveItem(value: unknown): ResolvedRenderValueMap {
  const text = toNonEmptyText(value);
  return text ? { value: { kind: "text", value: text } } : {};
}

function mapObjectItem(value: Record<string, unknown>): ResolvedRenderValueMap {
  const out: ResolvedRenderValueMap = {};

  for (const key of Object.keys(value).sort((a, b) => stringCmp(a, b))) {
    const raw = value[key];
    if (raw == null) continue;

    const lowered = key.toLowerCase();
    if (lowered.includes("href") || lowered.includes("url") || lowered.includes("link")) {
      const url = toNonEmptyText(raw);
      if (url) out[key] = { kind: "url", value: url };
      continue;
    }

    if (lowered.includes("image") || lowered.includes("media") || lowered === "src" || lowered.includes("asset")) {
      if (typeof raw === "string") {
        out[key] = { kind: "image", src: raw, alt: null };
        continue;
      }
      if (isRecord(raw)) {
        const src = toNonEmptyText(raw.src ?? raw.assetRef ?? raw.url);
        const alt = toNonEmptyText(raw.alt ?? raw.altText);
        if (src || alt) out[key] = { kind: "image", src: src ?? null, alt: alt ?? null };
      }
      continue;
    }

    const text = toNonEmptyText(raw);
    if (text) {
      out[key] = { kind: "text", value: text };
    }
  }

  return out;
}

function mapListValue(raw: unknown): { value: ResolvedRenderValue; status: ContentResolutionStatus } | null {
  let entries: unknown[] = [];

  if (Array.isArray(raw)) {
    entries = raw;
  } else if (isRecord(raw) && Array.isArray(raw.entries)) {
    entries = raw.entries;
  } else {
    const text = toNonEmptyText(raw);
    if (text) {
      return {
        value: { kind: "items", items: [{ value: { kind: "text", value: text } }] },
        status: "degraded_resolved",
      };
    }
    return null;
  }

  const mapped = entries
    .map((entry) => {
      if (isRecord(entry)) return mapObjectItem(entry);
      return mapPrimitiveItem(entry);
    })
    .filter((item) => Object.keys(item).length > 0);

  if (mapped.length === 0) {
    return {
      value: { kind: "items", items: [] },
      status: "unresolved_fallback",
    };
  }

  return {
    value: { kind: "items", items: mapped },
    status: mapped.length === entries.length ? "resolved" : "degraded_resolved",
  };
}

function toResolvedValue(input: {
  valueType: ReactRenderBoundValue["valueType"];
  raw: unknown;
  sourceContentId: string | null;
}): { value: ResolvedRenderValue; status: ContentResolutionStatus } | null {
  const { valueType, raw, sourceContentId } = input;

  if (valueType === "text") {
    const text = toNonEmptyText(raw);
    if (!text) return null;
    return { value: { kind: "text", value: text, sourceContentId }, status: "resolved" };
  }

  if (valueType === "rich_text") {
    const text = toNonEmptyText(raw);
    if (!text) return null;
    return { value: { kind: "rich_text", value: text, sourceContentId }, status: "resolved" };
  }

  if (valueType === "url") {
    const text = toNonEmptyText(raw);
    if (!text) return null;
    return { value: { kind: "url", value: text, sourceContentId }, status: "resolved" };
  }

  if (valueType === "image") {
    if (typeof raw === "string") {
      const src = toNonEmptyText(raw);
      if (!src) return null;
      return {
        value: { kind: "image", src, alt: null, sourceContentId },
        status: "degraded_resolved",
      };
    }

    if (isRecord(raw)) {
      const src = toNonEmptyText(raw.src ?? raw.assetRef ?? raw.url);
      const alt = toNonEmptyText(raw.alt ?? raw.altText);
      const caption = toNonEmptyText(raw.caption);
      if (!src && !alt && !caption) return null;
      return {
        value: { kind: "image", src: src ?? null, alt: alt ?? null, caption: caption ?? null, sourceContentId },
        status: src && alt ? "resolved" : "degraded_resolved",
      };
    }

    return null;
  }

  if (valueType === "list") {
    const mapped = mapListValue(raw);
    if (!mapped) return null;
    return {
      value: {
        ...mapped.value,
        sourceContentId,
      },
      status: mapped.status,
    };
  }

  if (raw == null) return null;
  return {
    value: { kind: "unknown", value: raw, sourceContentId },
    status: "degraded_resolved",
  };
}

function unresolvedPlaceholder(valueType: ReactRenderBoundValue["valueType"], slotPath: string): ResolvedRenderValue {
  switch (valueType) {
    case "text":
      return { kind: "text", value: `[missing:${slotPath}]`, sourceContentId: null };
    case "rich_text":
      return { kind: "rich_text", value: `[missing:${slotPath}]`, sourceContentId: null };
    case "url":
      return { kind: "url", value: "#", sourceContentId: null };
    case "image":
      return { kind: "image", src: PLACEHOLDER_MEDIA_SRC, alt: `Missing media for ${slotPath}`, sourceContentId: null };
    case "list":
      return { kind: "items", items: [], sourceContentId: null };
    default:
      return { kind: "unknown", value: null, sourceContentId: null };
  }
}

function collectFinalContentIndexes(finalSiteModel: FinalSiteModel | null): FinalContentIndexes {
  const bindingBySlotPath = new Map<string, { contentId: string; bindingId: string }>();
  const contentById = new Map<string, unknown>();
  const structuredSlotByPath = new Map<string, unknown>();
  const seenRenderSlotPaths = new Set<string>();

  if (!finalSiteModel) {
    return { bindingBySlotPath, contentById, structuredSlotByPath, seenRenderSlotPaths };
  }

  for (const page of finalSiteModel.pages) {
    for (const section of page.sections) {
      for (const binding of section.contentBindings) {
        bindingBySlotPath.set(binding.slotPath, {
          contentId: binding.contentId,
          bindingId: binding.id,
        });
      }

      for (const component of section.components) {
        for (const slot of component.slots) {
          seenRenderSlotPaths.add(`${component.id}.${slot.key}`);
        }

        const metadata = component.fallback.rawMetadata;
        if (!isRecord(metadata)) continue;

        const resolvedContentById = isRecord(metadata.resolvedContentById) ? metadata.resolvedContentById : null;
        if (resolvedContentById) {
          for (const key of Object.keys(resolvedContentById).sort((a, b) => stringCmp(a, b))) {
            contentById.set(key, resolvedContentById[key]);
          }
        }

        const resolvedSlotValues = isRecord(metadata.resolvedSlotValues) ? metadata.resolvedSlotValues : null;
        if (resolvedSlotValues) {
          for (const slotKey of Object.keys(resolvedSlotValues).sort((a, b) => stringCmp(a, b))) {
            structuredSlotByPath.set(`${component.id}.${slotKey}`, resolvedSlotValues[slotKey]);
          }
        }
      }
    }
  }

  return { bindingBySlotPath, contentById, structuredSlotByPath, seenRenderSlotPaths };
}

function readResolvedSlotValue(slotValue: ReactRenderSlotValue | undefined): unknown {
  if (!isBoundValue(slotValue)) return null;
  return slotValue.resolvedValue ?? null;
}

function resolveSlot(input: {
  component: ReactRenderComponent;
  slotValue: ReactRenderSlotValue | undefined;
  slotPath: string;
  slotKey: string;
  diagnostics: ContentResolutionDiagnostic[];
  indexes: FinalContentIndexes;
  pageId: string;
  sectionId: string;
}): SlotResolution {
  const { component, slotValue, slotPath, slotKey, diagnostics, indexes, pageId, sectionId } = input;

  const fallbackValue = isBoundValue(slotValue) ? slotValue.fallbackValue : null;
  const slotValueType = isBoundValue(slotValue) ? slotValue.valueType : "unknown";
  const bindingFromFinal = indexes.bindingBySlotPath.get(slotPath) ?? null;
  const boundContentId = isBoundValue(slotValue) ? slotValue.contentId : null;

  const fromRender = readResolvedSlotValue(slotValue);
  const fromRenderProps = readPropCandidate({ props: component.props, slotKey });
  const fromFinalBinding = (boundContentId ? indexes.contentById.get(boundContentId) : undefined) ??
    (bindingFromFinal ? indexes.contentById.get(bindingFromFinal.contentId) : undefined);
  const fromFinalStructured = indexes.structuredSlotByPath.get(slotPath);

  const candidates: Array<{ source: ResolutionSource; raw: unknown; sourceContentId: string | null }> = [
    { source: "render_model", raw: fromRender, sourceContentId: boundContentId },
    { source: "render_model", raw: fromRenderProps, sourceContentId: boundContentId },
    {
      source: "final_model_binding",
      raw: fromFinalBinding,
      sourceContentId: boundContentId ?? bindingFromFinal?.contentId ?? null,
    },
    {
      source: "final_model_structured",
      raw: fromFinalStructured,
      sourceContentId: boundContentId ?? bindingFromFinal?.contentId ?? null,
    },
    {
      source: "fallback",
      raw: fallbackValue,
      sourceContentId: null,
    },
  ];

  for (const candidate of candidates) {
    const mapped = toResolvedValue({
      valueType: slotValueType,
      raw: candidate.raw,
      sourceContentId: candidate.sourceContentId,
    });
    if (!mapped) continue;

    const status = candidate.source === "fallback" ? "unresolved_fallback" : mapped.status;
    const resolved: SlotResolution = {
      value: mapped.value,
      status,
      source: candidate.source,
    };

    const baseDiagnostic = {
      pageId,
      sectionId,
      componentId: component.componentId,
      slotPath,
    };

    if (candidate.source === "render_model") {
      diagnostics.push({
        code: CONTENT_RESOLUTION_DIAGNOSTIC.VALUE_RESOLVED_FROM_RENDER_MODEL,
        message: `Resolved slot '${slotPath}' from render-model value.`,
        ...baseDiagnostic,
      });
    }

    if (candidate.source === "final_model_binding" || candidate.source === "final_model_structured") {
      diagnostics.push({
        code: CONTENT_RESOLUTION_DIAGNOSTIC.VALUE_RESOLVED_FROM_FINAL_MODEL,
        message: `Resolved slot '${slotPath}' from final-model truth.`,
        ...baseDiagnostic,
      });
    }

    diagnostics.push({
      code: CONTENT_RESOLUTION_DIAGNOSTIC.VALUE_RESOLVED,
      message: `Resolved render value for '${slotPath}'.`,
      ...baseDiagnostic,
    });

    if (mapped.value.kind === "image") {
      diagnostics.push({
        code: CONTENT_RESOLUTION_DIAGNOSTIC.MEDIA_RESOLVED,
        message: `Resolved media for '${slotPath}'.`,
        ...baseDiagnostic,
      });
    }

    if (mapped.value.kind === "items") {
      if (mapped.value.items.length === 0) {
        diagnostics.push({
          code: CONTENT_RESOLUTION_DIAGNOSTIC.REPEATABLE_GROUP_EMPTY,
          message: `Repeatable slot '${slotPath}' has no resolved items.`,
          ...baseDiagnostic,
        });
      } else {
        diagnostics.push({
          code: CONTENT_RESOLUTION_DIAGNOSTIC.REPEATABLE_GROUP_RESOLVED,
          message: `Resolved repeatable slot '${slotPath}'.`,
          ...baseDiagnostic,
        });
      }
    }

    if (resolved.status === "degraded_resolved") {
      diagnostics.push({
        code: CONTENT_RESOLUTION_DIAGNOSTIC.VALUE_PARTIALLY_RESOLVED,
        message: `Slot '${slotPath}' resolved in degraded mode.`,
        ...baseDiagnostic,
      });
    }

    if (resolved.status === "unresolved_fallback") {
      diagnostics.push({
        code: CONTENT_RESOLUTION_DIAGNOSTIC.VALUE_UNRESOLVED_FALLBACK_USED,
        message: `Slot '${slotPath}' used deterministic fallback.`,
        ...baseDiagnostic,
      });
    }

    return resolved;
  }

  if (!indexes.bindingBySlotPath.has(slotPath) && isBoundValue(slotValue) && slotValue.kind === "bound_content") {
    diagnostics.push({
      code: CONTENT_RESOLUTION_DIAGNOSTIC.BINDING_TARGET_MISSING,
      message: `No final-model binding target was found for '${slotPath}'.`,
      pageId,
      sectionId,
      componentId: component.componentId,
      slotPath,
    });
  }

  if (isBoundValue(slotValue) && slotValue.contentId && !indexes.contentById.has(slotValue.contentId)) {
    diagnostics.push({
      code: CONTENT_RESOLUTION_DIAGNOSTIC.BINDING_SOURCE_MISSING,
      message: `No authoritative source value exists for contentId '${slotValue.contentId}'.`,
      pageId,
      sectionId,
      componentId: component.componentId,
      slotPath,
    });
  }

  diagnostics.push({
    code: CONTENT_RESOLUTION_DIAGNOSTIC.VALUE_UNRESOLVED_FALLBACK_USED,
    message: `Slot '${slotPath}' had no resolvable truth and used placeholder fallback.`,
    pageId,
    sectionId,
    componentId: component.componentId,
    slotPath,
  });

  return {
    value: unresolvedPlaceholder(slotValueType, slotPath),
    status: "unresolved_fallback",
    source: "placeholder",
  };
}

function readResolvedText(slot: ReactRenderSlotValue | undefined, fallback: string): string {
  if (!isBoundValue(slot) || !slot.resolvedValue) return fallback;
  const value = slot.resolvedValue as ResolvedRenderValue;
  if (value.kind === "text" || value.kind === "rich_text" || value.kind === "url") return value.value;
  return fallback;
}

function readResolvedUrl(slot: ReactRenderSlotValue | undefined, fallback = "#"): string {
  if (!isBoundValue(slot) || !slot.resolvedValue) return fallback;
  const value = slot.resolvedValue as ResolvedRenderValue;
  if (value.kind === "url") return value.value;
  if (value.kind === "text") return value.value;
  return fallback;
}

function readResolvedImage(slot: ReactRenderSlotValue | undefined, fallbackAlt: string): { src: string; alt: string } {
  if (!isBoundValue(slot) || !slot.resolvedValue) return { src: PLACEHOLDER_MEDIA_SRC, alt: fallbackAlt };
  const value = slot.resolvedValue as ResolvedRenderValue;
  if (value.kind !== "image") return { src: PLACEHOLDER_MEDIA_SRC, alt: fallbackAlt };
  return {
    src: value.src ?? PLACEHOLDER_MEDIA_SRC,
    alt: value.alt ?? fallbackAlt,
  };
}

function readResolvedItems(slot: ReactRenderSlotValue | undefined): ResolvedRenderValueMap[] {
  if (!isBoundValue(slot) || !slot.resolvedValue) return [];
  const value = slot.resolvedValue as ResolvedRenderValue;
  return value.kind === "items" ? value.items : [];
}

function buildResolvedProps(input: {
  renderKind: string;
  slots: Record<string, ReactRenderSlotValue>;
  existing: Record<string, unknown>;
}): Record<string, unknown> {
  const { renderKind, slots, existing } = input;

  const heading = readResolvedText(slots.heading, "[heading]");
  const body = readResolvedText(slots.body, "[body]");
  const image = readResolvedImage(slots.image ?? slots.media, "Image");
  const ctaLabel = readResolvedText(slots["cta.label"] ?? slots.cta_label ?? slots.label, "Call to action");
  const ctaHref = readResolvedUrl(slots["cta.href"] ?? slots.cta_url ?? slots.href, "#");
  const items = readResolvedItems(slots.items ?? slots.cards ?? slots.plans ?? slots.questions ?? slots.images);

  if (renderKind === "render.hero") {
    return {
      ...existing,
      heading,
      body,
      media: image,
      ctas: [{ label: ctaLabel, href: ctaHref }],
      title: heading,
      subtitle: body,
    };
  }

  if (renderKind === "render.heading") {
    return {
      ...existing,
      heading,
    };
  }

  if (renderKind === "render.rich_text") {
    return {
      ...existing,
      body,
      richText: body,
    };
  }

  if (renderKind === "render.image") {
    return {
      ...existing,
      media: image,
    };
  }

  if (renderKind === "render.cta_group") {
    return {
      ...existing,
      ctas: [{ label: ctaLabel, href: ctaHref }],
    };
  }

  if (renderKind === "render.card_grid" || renderKind === "render.gallery" || renderKind === "render.pricing" || renderKind === "render.faq") {
    return {
      ...existing,
      heading,
      items,
    };
  }

  if (renderKind === "render.testimonial") {
    return {
      ...existing,
      quote: body,
      author: readResolvedText(slots.author ?? slots.heading, "[author]"),
    };
  }

  if (renderKind === "render.footer_block") {
    return {
      ...existing,
      heading,
      body,
    };
  }

  if (renderKind === "render.generic") {
    const resolvedSlots: Record<string, unknown> = {};
    for (const key of Object.keys(slots).sort((a, b) => stringCmp(a, b))) {
      const slot = slots[key];
      if (!isBoundValue(slot)) continue;
      resolvedSlots[key] = slot.resolvedValue ?? null;
    }

    return {
      ...existing,
      resolvedSlots,
    };
  }

  return {
    ...existing,
    heading,
    body,
    media: image,
    items,
  };
}

export function resolveReactRenderSiteContent(input: ContentResolutionInput): ContentResolutionResult {
  const diagnostics: ContentResolutionDiagnostic[] = [
    {
      code: CONTENT_RESOLUTION_DIAGNOSTIC.STARTED,
      message: "Deterministic content resolution started.",
    },
  ];

  const indexes = collectFinalContentIndexes(input.finalSiteModel);

  let resolvedContentCount = 0;
  let degradedResolvedContentCount = 0;
  let unresolvedContentCount = 0;

  const resolvedSite: ReactRenderSiteModel = {
    ...input.siteModel,
    pages: input.siteModel.pages
      .slice()
      .sort((a, b) => stringCmp(a.routePath, b.routePath) || stringCmp(a.pageId, b.pageId))
      .map((page) => ({
        ...page,
        sections: page.sections
          .slice()
          .sort((a, b) => stringCmp(a.sectionId, b.sectionId))
          .map((section) => ({
            ...section,
            components: section.components
              .slice()
              .sort((a, b) => stringCmp(a.componentId, b.componentId))
              .map((component) => {
                const slots = component.slots ?? {};
                const resolvedSlots: Record<string, ReactRenderSlotValue> = {};

                for (const slotKey of Object.keys(slots).sort((a, b) => stringCmp(a, b))) {
                  const slotValue = slots[slotKey];
                  if (!isBoundValue(slotValue)) {
                    resolvedSlots[slotKey] = slotValue;
                    continue;
                  }

                  const slotPath = slotValue.slotPath || `${component.componentId}.${slotKey}`;
                  const resolved = resolveSlot({
                    component,
                    slotValue,
                    slotPath,
                    slotKey,
                    diagnostics,
                    indexes,
                    pageId: page.pageId,
                    sectionId: section.sectionId,
                  });

                  resolvedSlots[slotKey] = {
                    ...slotValue,
                    resolvedValue: resolved.value,
                    resolutionStatus: resolved.status,
                    resolutionSource: resolved.source,
                  };

                  if (resolved.status === "resolved") resolvedContentCount += 1;
                  if (resolved.status === "degraded_resolved") degradedResolvedContentCount += 1;
                  if (resolved.status === "unresolved_fallback") unresolvedContentCount += 1;
                }

                return {
                  ...component,
                  slots: resolvedSlots,
                  props: buildResolvedProps({
                    renderKind: component.renderKind,
                    slots: resolvedSlots,
                    existing: component.props,
                  }),
                };
              }),
          })),
      })),
  };

  const contentResolutionDegraded = degradedResolvedContentCount > 0 || unresolvedContentCount > 0;
  if (contentResolutionDegraded) {
    diagnostics.push({
      code: CONTENT_RESOLUTION_DIAGNOSTIC.DEGRADED,
      message: "Content resolution completed in degraded mode.",
    });
  }

  diagnostics.push({
    code: CONTENT_RESOLUTION_DIAGNOSTIC.COMPLETED,
    message: "Deterministic content resolution completed.",
    details: {
      resolvedContentCount,
      degradedResolvedContentCount,
      unresolvedContentCount,
    },
  });

  return {
    resolvedSite,
    diagnostics: input.options?.includeDiagnostics === false ? [] : sortContentResolutionDiagnostics(diagnostics),
    resolvedContentCount,
    degradedResolvedContentCount,
    unresolvedContentCount,
    renderedWithFallback: unresolvedContentCount > 0,
    contentResolutionApplied: true,
    contentResolutionDegraded,
  };
}
