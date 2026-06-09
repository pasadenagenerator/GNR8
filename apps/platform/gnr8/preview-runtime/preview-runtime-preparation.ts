import { deterministicId, normalizePagePath } from "@/gnr8/runtime/deterministic";
import type { CanonicalPageVersionSnapshot } from "@/gnr8/runtime/types";
import { DEFAULT_MERGE_OPTIONS, type FinalSiteModel } from "@/gnr8/merge-engine";
import { createReactRendererContract, type RenderDiagnostic } from "@/gnr8/renderer-contract";
import { renderRealReactSite } from "@/gnr8/react-renderer";
import type { ReactElement } from "react";
import { PREVIEW_RUNTIME_DIAGNOSTIC, withSortedDiagnostics } from "@/gnr8/preview-runtime/preview-runtime-diagnostics";
import { selectPreviewRuntimeMode } from "@/gnr8/preview-runtime/preview-mode-selector";
import type { PreviewRuntimePreparationInput, PreviewRuntimePreparationResult, PreviewRuntimeSummary } from "@/gnr8/preview-runtime/preview-runtime-types";
import { SEMANTIC_PREVIEW_DIAGNOSTIC, shouldUseSemanticFallbackPreview } from "@/gnr8/preview-semantic/semantic-preview-renderer";
import {
  applyFamilyPageInstanceToFinalSiteModel,
  diagnosticsCodes,
  prepareFamilyRenderForRoute,
  type FamilyRenderPreparationResult,
} from "@/gnr8/renderer-family-mode";

function normalizeText(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return "";
  return String(value ?? "").trim();
}

type TransformedAssemblyDiagnostics = NonNullable<PreviewRuntimeSummary["transformedAssemblyDiagnostics"]>;

type RuntimeSectionProjection = {
  section: Record<string, unknown>;
  sectionId: string;
  sectionType: string;
  order: number;
  props: Record<string, unknown>;
  fingerprint: string;
};

type RuntimePageProjection = {
  sections: RuntimeSectionProjection[];
  diagnostics: TransformedAssemblyDiagnostics;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toSectionType(section: Record<string, unknown>): string {
  const sectionType = normalizeText(section.type).toLowerCase();
  return sectionType || "content";
}

function hasRenderableSlotValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (!isRecord(value)) return false;
  return Object.values(value).some((entry) => hasRenderableSlotValue(entry));
}

function inferComponentKind(input: {
  sectionType: string;
  sectionProps: Record<string, unknown>;
}): FinalSiteModel["pages"][number]["sections"][number]["components"][number]["kind"] {
  const { sectionType, sectionProps } = input;
  if (sectionType.includes("hero")) return "hero";
  if (sectionType.includes("faq")) return "faq";
  if (sectionType.includes("pricing")) return "pricing";
  if (sectionType.includes("testimonial")) return "testimonial";
  if (sectionType.includes("gallery")) return "gallery";
  if (sectionType.includes("image")) return "image";
  if (sectionType.includes("cta") || sectionType.includes("contact")) return "cta_group";
  if (sectionType.includes("footer")) return "footer_block";
  if (sectionType.includes("heading") || sectionType.includes("title")) return "section_heading";
  if (sectionType.includes("card")) return "card_grid";
  if (/\b(news|blog|listing|latest|article|post|publication)s?\b/.test(sectionType.replace(/[_-]+/g, " "))) return "card_grid";

  const slotValues = pickSectionSlotValues(sectionProps);
  if (hasRenderableSlotValue(slotValues.items) || hasRenderableSlotValue(slotValues.cards)) return "card_grid";
  if (hasRenderableSlotValue(slotValues["cta.label"]) || hasRenderableSlotValue(slotValues["cta.href"])) return "cta_group";
  if (hasRenderableSlotValue(slotValues.image) && !hasRenderableSlotValue(slotValues.heading) && !hasRenderableSlotValue(slotValues.body)) {
    return "image";
  }
  if (hasRenderableSlotValue(slotValues.body)) return "rich_text";
  if (hasRenderableSlotValue(slotValues.heading)) return "section_heading";

  return "rich_text";
}

function inferLayoutRole(sectionType: string): string {
  if (sectionType.includes("hero")) return "hero";
  if (sectionType.includes("gallery")) return "grid";
  if (sectionType.includes("faq")) return "faq_list";
  if (sectionType.includes("pricing")) return "pricing_table";
  if (sectionType.includes("footer")) return "footer";
  return "stack";
}

function inferSemanticRole(sectionType: string): FinalSiteModel["pages"][number]["sections"][number]["semanticRole"] {
  if (sectionType.includes("hero")) return "hero";
  if (sectionType.includes("pricing")) return "pricing";
  if (sectionType.includes("heading") || sectionType.includes("title")) return "section_heading";
  return "content";
}

function pickValue(input: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const direct = normalizeText(input[key]);
    if (direct) return direct;
    const lowerKey = Object.keys(input).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    if (!lowerKey) continue;
    const viaLower = normalizeText(input[lowerKey]);
    if (viaLower) return viaLower;
  }
  return null;
}

function pickImageValue(input: Record<string, unknown>, keys: string[]): { src: string; alt: string | null } | null {
  for (const key of keys) {
    const direct = input[key];
    const directText = normalizeText(direct);
    if (directText) return { src: directText, alt: null };
    if (isRecord(direct)) {
      const src = normalizeText(direct.src ?? direct.assetRef ?? direct.url);
      const alt = normalizeText(direct.alt ?? direct.altText ?? direct.caption);
      if (src || alt) return { src, alt: alt || null };
    }

    const lowerKey = Object.keys(input).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    if (!lowerKey) continue;
    const viaLower = input[lowerKey];
    const viaLowerText = normalizeText(viaLower);
    if (viaLowerText) return { src: viaLowerText, alt: null };
    if (isRecord(viaLower)) {
      const src = normalizeText(viaLower.src ?? viaLower.assetRef ?? viaLower.url);
      const alt = normalizeText(viaLower.alt ?? viaLower.altText ?? viaLower.caption);
      if (src || alt) return { src, alt: alt || null };
    }
  }
  return null;
}

function pickRecord(input: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const direct = input[key];
    if (isRecord(direct)) return direct;
    const lowerKey = Object.keys(input).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    if (!lowerKey) continue;
    const viaLower = input[lowerKey];
    if (isRecord(viaLower)) return viaLower;
  }
  return null;
}

function pickSectionProps(input: {
  sectionRecord: Record<string, unknown>;
  sectionPropsById: Record<string, unknown>;
  sectionId: string;
}): Record<string, unknown> {
  const explicitProps = input.sectionPropsById[input.sectionId];
  if (isRecord(explicitProps)) return explicitProps;

  const nestedProps = pickRecord(input.sectionRecord, ["props", "content", "data", "resolvedProps", "semanticProps"]);
  if (nestedProps) return nestedProps;

  const directKeys = [
    "heading",
    "headline",
    "title",
    "heroTitle",
    "body",
    "description",
    "text",
    "copy",
    "subtitle",
    "heroBody",
    "image",
    "imageSrc",
    "media",
    "heroImage",
    "ctaLabel",
    "buttonLabel",
    "label",
    "primaryCtaLabel",
    "ctaHref",
    "buttonUrl",
    "href",
    "url",
    "link",
    "items",
    "cards",
    "features",
    "gallery",
    "images",
    "plans",
    "faq",
    "faqs",
    "links",
    "question",
    "answer",
    "htmlSummary",
  ];
  return Object.fromEntries(
    directKeys
      .map((key) => [key, input.sectionRecord[key]] as const)
      .filter(([, value]) => hasRenderableSlotValue(value)),
  );
}

function pickSectionSlotValues(sectionProps: Record<string, unknown>): {
  [key: string]: unknown;
} {
  const htmlSummary = isRecord(sectionProps.htmlSummary) ? sectionProps.htmlSummary : null;
  const textFromSummary = normalizeText(htmlSummary?.extractedText);
  const firstImageFromSummary =
    Array.isArray(htmlSummary?.extractedImageSrcs) && htmlSummary.extractedImageSrcs.length > 0
      ? normalizeText(htmlSummary.extractedImageSrcs[0])
      : null;

  const heading = pickValue(sectionProps, ["heading", "headline", "title", "heroTitle"]) ?? null;
  const body =
    pickValue(sectionProps, ["body", "description", "text", "copy", "subtitle", "heroBody"]) ?? (textFromSummary || null);
  const image = pickImageValue(sectionProps, ["image", "imageSrc", "media", "heroImage"]) ??
    (firstImageFromSummary ? { src: firstImageFromSummary, alt: null } : null);
  const ctaLabel = pickValue(sectionProps, ["ctaLabel", "buttonLabel", "label", "primaryCtaLabel"]) ?? null;
  const ctaHref = pickValue(sectionProps, ["ctaHref", "buttonUrl", "href", "url", "link", "primaryCtaHref"]) ?? null;
  const quote = pickValue(sectionProps, ["quote", "testimonialQuote"]) ?? null;
  const author = pickValue(sectionProps, ["author", "testimonialAuthor", "byline"]) ?? null;
  const listValue =
    sectionProps.items ??
    sectionProps.cards ??
    sectionProps.features ??
    sectionProps.gallery ??
    sectionProps.images ??
    sectionProps.plans ??
    sectionProps.faq ??
    sectionProps.faqs ??
    sectionProps.links ??
    null;

  const fallbackFaqQuestion = pickValue(sectionProps, ["question", "faqQuestion"]);
  const fallbackFaqAnswer = pickValue(sectionProps, ["answer", "faqAnswer"]);
  const normalizedItems =
    Array.isArray(listValue)
      ? listValue
      : fallbackFaqQuestion || fallbackFaqAnswer
        ? [
            {
              question: fallbackFaqQuestion ?? "",
              answer: fallbackFaqAnswer ?? "",
            },
          ]
        : null;

  return Object.fromEntries(
    Object.entries({
      heading,
      body,
      image: image ? { src: image.src, alt: image.alt ?? heading ?? "Section image" } : null,
      "cta.label": ctaLabel,
      "cta.href": ctaHref,
      quote,
      author,
      items: normalizedItems,
      cards: normalizedItems,
      plans: normalizedItems,
      questions: normalizedItems,
      links: normalizedItems,
    }).filter(([, value]) => value != null),
  );
}

function normalizeFingerprintText(value: unknown): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function sectionTextForFingerprint(sectionProps: Record<string, unknown>): string {
  const htmlSummary = isRecord(sectionProps.htmlSummary) ? sectionProps.htmlSummary : null;
  return [
    pickValue(sectionProps, ["heading", "headline", "title", "heroTitle"]),
    pickValue(sectionProps, ["body", "description", "text", "copy", "subtitle", "heroBody"]),
    normalizeText(htmlSummary?.extractedText),
  ]
    .filter(Boolean)
    .join(" ");
}

function fingerprintSection(input: {
  sectionType: string;
  sectionProps: Record<string, unknown>;
}): string {
  const type = normalizeText(input.sectionType).toLowerCase() || "content";
  const text = normalizeFingerprintText(sectionTextForFingerprint(input.sectionProps));
  return `${type}:${text || "empty"}`;
}

function isSharedRegionSection(section: RuntimeSectionProjection): boolean {
  const type = section.sectionType.toLowerCase();
  return type.includes("header") || type.includes("navigation") || type.includes("footer");
}

function listingDetectionReason(section: RuntimeSectionProjection, routePath: string): string | null {
  const type = section.sectionType.toLowerCase();
  const text = normalizeFingerprintText(sectionTextForFingerprint(section.props));
  if (/\b(news|blog|listing|latest)\b/.test(type)) return `type:${type}`;
  if (/\b(latest news|news listing|full news|all news|blog|articles|publications|posts)\b/.test(text)) return "text:listing_terms";
  const itemCount = Array.isArray(section.props.items) ? section.props.items.length : 0;
  const cardsCount = Array.isArray(section.props.cards) ? section.props.cards.length : 0;
  if ((routePath === "/news" || routePath === "/blog") && Math.max(itemCount, cardsCount) >= 2) return "route_listing_items";
  return null;
}

function isIntroLikeBeforeListing(section: RuntimeSectionProjection): boolean {
  const type = section.sectionType.toLowerCase();
  if (isSharedRegionSection(section)) return false;
  if (type.includes("hero") || type.includes("intro") || type.includes("content")) return true;
  const text = normalizeFingerprintText(sectionTextForFingerprint(section.props));
  return text.length > 0 && text.length <= 220;
}

function resolveSelectedRawFile(input: {
  siteVersion: PreviewRuntimePreparationInput["siteVersion"];
  routePath: string;
}): string | null {
  const routeMap = input.siteVersion.importProvenanceSummary?.multiPageDiscovery?.rawArtifactAssembly?.routeMap ?? [];
  const match = routeMap.find((entry) => normalizePagePath(entry.routePath) === input.routePath);
  if (match?.rawFilePath) return match.rawFilePath;
  if (input.routePath === "/") {
    const entryPath = input.siteVersion.importProvenanceSummary?.captureEvidence?.entryHtmlPath ?? null;
    return normalizeText(entryPath) || null;
  }
  return null;
}

function resolveHeadingStyleSource(input: {
  page: PreviewRuntimePreparationInput["siteVersion"]["pages"][number];
  routePath: string;
}): TransformedAssemblyDiagnostics["headingStyleSource"] {
  const styleTokens = input.page.styleTokens ?? {};
  const headingFontFamily = normalizeText(styleTokens["typography.heading.fontFamily"]) || null;
  const bodyFontFamily = normalizeText(styleTokens["typography.body.fontFamily"]) || null;
  const source = normalizeText(styleTokens["typography.heading.source"]) || (headingFontFamily ? "style_token" : "fallback_missing");
  return {
    source,
    headingFontFamily,
    bodyFontFamily,
    routePath: input.routePath,
  };
}

function projectRuntimePageSections(input: {
  page: PreviewRuntimePreparationInput["siteVersion"]["pages"][number];
  siteVersion: PreviewRuntimePreparationInput["siteVersion"];
}): RuntimePageProjection {
  const routePath = normalizePagePath(input.page.path);
  const structure = isRecord(input.page.structureModel) ? input.page.structureModel : {};
  const rawSections = Array.isArray((structure as { sections?: unknown }).sections) ? (structure as { sections: unknown[] }).sections : [];
  const content = isRecord(input.page.contentModel) ? input.page.contentModel : {};
  const sectionPropsById = isRecord((content as { sectionProps?: unknown }).sectionProps)
    ? ((content as { sectionProps: Record<string, unknown> }).sectionProps)
    : {};

  const projected = rawSections
    .map((section, index): RuntimeSectionProjection => {
      const sectionRecord = isRecord(section) ? section : {};
      const sectionId = normalizeText(sectionRecord.id) || deterministicId("final_section", `${input.page.pageId}:${index}`);
      const sectionType = toSectionType(sectionRecord);
      const props = pickSectionProps({ sectionRecord, sectionPropsById, sectionId });
      const order = Number.isFinite(Number(sectionRecord.order)) ? Number(sectionRecord.order) : index;
      return {
        section: sectionRecord,
        sectionId,
        sectionType,
        order,
        props,
        fingerprint: fingerprintSection({ sectionType, sectionProps: props }),
      };
    })
    .sort((a, b) => a.order - b.order || a.sectionId.localeCompare(b.sectionId));

  const fingerprintGroups = new Map<string, RuntimeSectionProjection[]>();
  for (const section of projected) {
    if (section.fingerprint.endsWith(":empty")) continue;
    fingerprintGroups.set(section.fingerprint, [...(fingerprintGroups.get(section.fingerprint) ?? []), section]);
  }
  const repeatedSectionFingerprints = [...fingerprintGroups.entries()]
    .filter(([, sections]) => sections.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([fingerprint, sections]) => ({
      fingerprint,
      count: sections.length,
      sectionIds: sections.map((section) => section.sectionId).sort((a, b) => a.localeCompare(b)),
    }));

  const listing = projected
    .map((section, index) => ({ section, index, reason: listingDetectionReason(section, routePath) }))
    .find((entry) => entry.reason != null);

  const removedDuplicateSectionIds = new Set<string>();
  if (listing) {
    const seenIntroFingerprints = new Set<string>();
    for (const section of projected.slice(0, listing.index)) {
      if (!isIntroLikeBeforeListing(section)) continue;
      if (!repeatedSectionFingerprints.some((entry) => entry.fingerprint === section.fingerprint)) continue;
      if (seenIntroFingerprints.has(section.fingerprint)) {
        removedDuplicateSectionIds.add(section.sectionId);
        continue;
      }
      seenIntroFingerprints.add(section.fingerprint);
    }
  }

  const sections = projected.filter((section) => !removedDuplicateSectionIds.has(section.sectionId));
  const diagnostics: TransformedAssemblyDiagnostics = {
    selectedRoutePath: routePath,
    selectedSourceRawFile: resolveSelectedRawFile({ siteVersion: input.siteVersion, routePath }),
    semanticSectionCount: rawSections.length,
    transformedRouteSectionCountBeforeHydration: sections.length,
    duplicateRemovalCount: removedDuplicateSectionIds.size,
    clientHydrationMode: "idempotent",
    repeatedSectionFingerprints,
    sharedHeaderFooterSectionCount: projected.filter(isSharedRegionSection).length,
    listingDetection: {
      detected: Boolean(listing),
      sectionId: listing?.section.sectionId ?? null,
      reason: listing?.reason ?? null,
    },
    finalSectionOrder: sections.map((section) => ({
      sectionId: section.sectionId,
      type: section.sectionType,
      order: section.order,
    })),
    removedDuplicateSectionIds: [...removedDuplicateSectionIds].sort((a, b) => a.localeCompare(b)),
    headingStyleSource: resolveHeadingStyleSource({ page: input.page, routePath }),
  };

  return { sections, diagnostics };
}

function slotKeysForKind(kind: FinalSiteModel["pages"][number]["sections"][number]["components"][number]["kind"]): string[] {
  switch (kind) {
    case "hero":
      return ["heading", "body", "cta.label", "cta.href", "image"];
    case "section_heading":
      return ["heading"];
    case "rich_text":
      return ["body"];
    case "image":
      return ["image"];
    case "cta_group":
      return ["cta.label", "cta.href"];
    case "card_grid":
      return ["heading", "items"];
    case "gallery":
      return ["heading", "items", "image"];
    case "testimonial":
      return ["quote", "author"];
    case "pricing":
      return ["heading", "plans"];
    case "faq":
      return ["heading", "items"];
    case "footer_block":
      return ["heading", "body", "links"];
    default:
      return ["heading", "body", "image", "items"];
  }
}

function slotKeysWithResolvedValues(input: {
  kind: FinalSiteModel["pages"][number]["sections"][number]["components"][number]["kind"];
  slotValues: Record<string, unknown>;
}): string[] {
  const keys = slotKeysForKind(input.kind).filter((slotKey) => hasRenderableSlotValue(input.slotValues[slotKey]));

  if (input.kind === "rich_text" && hasRenderableSlotValue(input.slotValues.heading) && !keys.includes("heading")) {
    keys.unshift("heading");
  }

  if (keys.length > 0) return keys;

  return ["heading", "body", "items", "image", "cta.label", "cta.href"].filter((slotKey) =>
    hasRenderableSlotValue(input.slotValues[slotKey]),
  );
}

function toValueType(slotKey: string): "text" | "rich_text" | "image" | "url" | "list" {
  if (slotKey === "image") return "image";
  if (slotKey === "cta.href") return "url";
  if (slotKey === "items" || slotKey === "cards" || slotKey === "plans" || slotKey === "questions" || slotKey === "links") return "list";
  if (slotKey === "body") return "rich_text";
  return "text";
}

function stringifyDeterministic(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stringifyDeterministic(entry)).join(",")}]`;
  if (!isRecord(value)) return "";
  return `{${Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}:${stringifyDeterministic(value[key])}`)
    .join(",")}}`;
}

function mapPageToFinalPage(input: {
  page: CanonicalPageVersionSnapshot;
  siteId: string;
  pageOrder: number;
  siteVersion: PreviewRuntimePreparationInput["siteVersion"];
  projection?: RuntimePageProjection;
}): FinalSiteModel["pages"][number] {
  const projected =
    input.projection ??
    projectRuntimePageSections({
      page: input.page,
      siteVersion: input.siteVersion,
    });

  const finalSections: FinalSiteModel["pages"][number]["sections"] = projected.sections
    .map((section, index) => {
      const sectionId = section.sectionId;
      const sectionType = section.sectionType;
      const sectionProps = section.props;
      const componentKind = inferComponentKind({ sectionType, sectionProps });
      const componentId = deterministicId("final_component", `${sectionId}:primary`);

      const slotValues = pickSectionSlotValues(sectionProps);
      const slotKeys = slotKeysWithResolvedValues({ kind: componentKind, slotValues });
      if (slotKeys.length === 0) return null;
      const slots = slotKeys.map((slotKey) => ({
        key: slotKey,
        valueType: toValueType(slotKey),
        sourceHint: "runtime_section_props",
      }));
      const resolvedSlotValues = Object.fromEntries(
        slotKeys
          .map((slotKey) => [slotKey, slotValues[slotKey]] as const)
          .filter((entry): entry is readonly [string, unknown] => hasRenderableSlotValue(entry[1])),
      );
      const contentBindings = slotKeys
        .map((slotKey) => {
          const value = slotValues[slotKey];
          if (!hasRenderableSlotValue(value)) return null;
          const contentId = deterministicId("content", `${componentId}:${slotKey}:${stringifyDeterministic(value)}`);
          return {
            id: deterministicId("binding", `${componentId}:${slotKey}`),
            componentId,
            sectionId,
            slotPath: `${componentId}.${slotKey}`,
            contentId,
            confidence: 1,
            source: "heuristic" as const,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry != null);
      const resolvedContentById = Object.fromEntries(
        contentBindings
          .map((binding) => [binding.contentId, slotValues[binding.slotPath.split(".").slice(1).join(".")]])
          .filter((entry): entry is [string, unknown] => hasRenderableSlotValue(entry[1])),
      );

      return {
        id: sectionId,
        pageId: input.page.pageId,
        semanticRole: inferSemanticRole(sectionType),
        layoutRole: inferLayoutRole(sectionType),
        order: Number.isFinite(section.order) ? section.order : index,
        components: [
          {
            id: componentId,
            sectionId,
            kind: componentKind,
            mappedType: componentKind,
            variant: "default",
            order: 0,
            slots,
            tokenRefs: [],
            fallback: {
              wrappedAsGeneric: componentKind === "generic",
              reason: componentKind === "generic" ? "unknown_section_type" : null,
              rawMetadata: {
                sectionType,
                resolvedSlotValues,
                resolvedContentById,
                transformedAssembly: {
                  fingerprint: section.fingerprint,
                },
              },
            },
            provenance: {
              source: "merged",
              sourceId: sectionId,
              rationale: "Deterministic preview runtime projection from canonical runtime page model.",
              confidence: 1,
            },
          },
        ],
        contentBindings,
        styleRefs: {
          colorTokenIds: [],
          typographyTokenIds: [],
          spacingTokenIds: [],
          gradientIds: [],
        },
        provenance: {
          source: "merged",
          sourceId: sectionId,
          rationale: "Deterministic preview runtime projection from canonical runtime page model.",
          confidence: 1,
        },
      } as FinalSiteModel["pages"][number]["sections"][number];
    })
    .filter((section): section is FinalSiteModel["pages"][number]["sections"][number] => section != null)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  return {
    id: input.page.pageId,
    path: normalizePagePath(input.page.path),
    role: input.pageOrder === 0 ? "home" : "content",
    title: input.page.title,
    routeNodeId: deterministicId("route", `${input.siteId}:${normalizePagePath(input.page.path)}`),
    seo: {
      titleContentIds: [],
      descriptionContentIds: [],
    },
    sections: finalSections,
    globalRegionIds: [],
    provenance: {
      source: "merged",
      sourceId: input.page.pageId,
      rationale: "Deterministic preview runtime projection from canonical runtime page model.",
      confidence: 1,
    },
  };
}

function buildFinalSiteModelFromRuntimeSiteVersion(input: PreviewRuntimePreparationInput): {
  finalSiteModel: FinalSiteModel | null;
  transformedAssemblyDiagnosticsByRoute: Record<string, TransformedAssemblyDiagnostics>;
} {
  const transformedAssemblyDiagnosticsByRoute: Record<string, TransformedAssemblyDiagnostics> = {};
  const pages = [...input.siteVersion.pages]
    .sort((a, b) => normalizePagePath(a.path).localeCompare(normalizePagePath(b.path)) || a.pageId.localeCompare(b.pageId))
    .map((page, index) => {
      const projection = projectRuntimePageSections({
        page,
        siteVersion: input.siteVersion,
      });
      transformedAssemblyDiagnosticsByRoute[normalizePagePath(page.path)] = projection.diagnostics;
      return mapPageToFinalPage({
        page,
        siteId: input.siteVersion.siteId,
        pageOrder: index,
        siteVersion: input.siteVersion,
        projection,
      });
    });

  if (pages.length === 0) return { finalSiteModel: null, transformedAssemblyDiagnosticsByRoute };
  const totalSections = pages.reduce((sum, page) => sum + page.sections.length, 0);
  if (totalSections === 0) return { finalSiteModel: null, transformedAssemblyDiagnosticsByRoute };

  const sortedRoutes = pages
    .map((page, index) => ({
      id: deterministicId("route", `${input.siteVersion.siteId}:${page.path}`),
      path: normalizePagePath(page.path),
      pageId: page.id,
      parentRouteId: null,
      titleHint: page.title,
      order: index,
      status: "resolved" as const,
    }))
    .sort((a, b) => a.path.localeCompare(b.path) || a.id.localeCompare(b.id))
    .map((route, index) => ({ ...route, order: index }));

  const primaryBackground = pages[0]?.title ? "#ffffff" : "#f8fafc";
  const primaryText = "#111827";

  const firstPageStyleTokens = input.siteVersion.pages
    .slice()
    .sort((a, b) => normalizePagePath(a.path).localeCompare(normalizePagePath(b.path)) || a.pageId.localeCompare(b.pageId))[0]?.styleTokens ?? {};
  const headingFamily = normalizeText(firstPageStyleTokens["typography.heading.fontFamily"]);
  const bodyFamily = normalizeText(firstPageStyleTokens["typography.body.fontFamily"]) || headingFamily;

  return {
    finalSiteModel: {
    site: {
      id: input.siteVersion.siteId,
      locale: "en",
      defaultPageId: pages[0]?.id ?? null,
      routes: sortedRoutes,
      navigation: [],
      provenance: {
        importRunId: input.siteVersion.id,
        sourceFingerprint: deterministicId("preview_source", `${input.siteVersion.siteId}:${input.siteVersion.id}`),
        capturedAtIso: input.siteVersion.createdAt,
        mergeModes: DEFAULT_MERGE_OPTIONS,
        designPagesCount: 0,
        designWarningsCount: 0,
      },
    },
    pages,
    globalRegions: [],
    tokens: {
      colors: [
        {
          id: deterministicId("color", "background"),
          name: "background",
          semanticRole: "surface.background",
          valueHex8: primaryBackground,
          provenance: [
            {
              source: "merged",
              sourceId: input.siteVersion.id,
              rationale: "Deterministic preview fallback token for runtime rendering.",
              confidence: 1,
            },
          ],
        },
        {
          id: deterministicId("color", "text"),
          name: "text",
          semanticRole: "text.primary",
          valueHex8: primaryText,
          provenance: [
            {
              source: "merged",
              sourceId: input.siteVersion.id,
              rationale: "Deterministic preview fallback token for runtime rendering.",
              confidence: 1,
            },
          ],
        },
      ],
      typography: [
        ...(headingFamily
          ? [
              {
                id: deterministicId("typography", "heading"),
                role: "heading",
                family: headingFamily,
                weight: 700,
                sizePx: 42,
                lineHeight: 1.12,
                letterSpacing: 0,
                provenance: [
                  {
                    source: "import" as const,
                    sourceId: input.siteVersion.id,
                    rationale: "Heading typography projected from transformed preview style tokens.",
                    confidence: 0.9,
                  },
                ],
              },
            ]
          : []),
        ...(bodyFamily
          ? [
              {
                id: deterministicId("typography", "body"),
                role: "body",
                family: bodyFamily,
                weight: 400,
                sizePx: 16,
                lineHeight: 1.55,
                letterSpacing: 0,
                provenance: [
                  {
                    source: "import" as const,
                    sourceId: input.siteVersion.id,
                    rationale: "Body typography projected from transformed preview style tokens.",
                    confidence: 0.85,
                  },
                ],
              },
            ]
          : []),
      ],
      spacing: [],
      surface: {
        radiusScalePx: [0, 4, 8, 12],
        borderStyle: "subtle",
        shadowStyle: "soft",
        provenance: [
          {
            source: "merged",
            sourceId: input.siteVersion.id,
            rationale: "Deterministic preview fallback surface token set.",
            confidence: 1,
          },
        ],
      },
      componentProfile: {
        buttons: {
          variants: ["solid"],
          cornerStyle: "rounded",
          prominence: "medium",
        },
        inputs: {
          border: "thin",
          cornerStyle: "rounded",
        },
        media: {
          treatment: "edge_to_edge",
          saturationHint: "balanced",
        },
        sectionTone: "corporate",
        provenance: [
          {
            source: "merged",
            sourceId: input.siteVersion.id,
            rationale: "Deterministic preview fallback component profile.",
            confidence: 1,
          },
        ],
      },
      gradients: [],
    },
    reusableComponents: [],
    diagnostics: [],
    conflicts: [],
    },
    transformedAssemblyDiagnosticsByRoute,
  };
}

function toSummary(input: {
  mode: PreviewRuntimePreparationResult["mode"];
  finalSiteModel: FinalSiteModel | null;
  reactRenderSiteModelAvailable: boolean;
  rendererResult: PreviewRuntimePreparationResult["rendererResult"];
  diagnostics: string[];
  familyRender: FamilyRenderPreparationResult | null;
  transformedAssemblyDiagnostics?: TransformedAssemblyDiagnostics | null;
}): PreviewRuntimeSummary {
  const familyRenderDiagnostics = diagnosticsCodes(input.familyRender?.diagnostics ?? []);
  const familyRenderMode = input.familyRender?.selectedMode ?? "page_fallback";
  return {
    previewMode: input.mode,
    rendererContractAvailable: input.reactRenderSiteModelAvailable,
    finalSiteModelAvailable: input.finalSiteModel != null,
    familyRenderUsed: familyRenderMode === "family_primary" || familyRenderMode === "hybrid_family_page",
    familyRenderFamilyId: input.familyRender?.selectedFamilyId ?? null,
    familyRenderMode,
    familyRenderFallbackToPage: Boolean(input.familyRender?.fallbackToPage ?? true),
    familyRenderDiagnosticsCount: familyRenderDiagnostics.length,
    familyRenderDiagnostics,
    renderedWithFallback: Boolean(input.rendererResult?.renderedWithFallback),
    matchedPageId: input.rendererResult?.matchedPageId ?? null,
    contentResolutionApplied: Boolean(input.rendererResult?.contentResolutionApplied),
    resolvedContentCount: input.rendererResult?.resolvedContentCount ?? 0,
    unresolvedContentCount: input.rendererResult?.unresolvedContentCount ?? 0,
    contentResolutionDegraded: Boolean(input.rendererResult?.contentResolutionDegraded),
    contentResolutionDiagnostics: [...new Set(input.rendererResult?.contentResolutionDiagnostics ?? [])].sort((a, b) => a.localeCompare(b)),
    previewDiagnostics: input.diagnostics,
    ...(input.transformedAssemblyDiagnostics ? { transformedAssemblyDiagnostics: input.transformedAssemblyDiagnostics } : {}),
  };
}

function hasMeaningfulRenderableStructure(finalSiteModel: FinalSiteModel | null, matchedPageId: string | null): boolean {
  if (!finalSiteModel || !matchedPageId) return false;
  const page = finalSiteModel.pages.find((entry) => entry.id === matchedPageId);
  if (!page) return false;
  const sectionCount = page.sections.length;
  const componentCount = page.sections.reduce((sum, section) => sum + section.components.length, 0);
  return sectionCount > 0 && componentCount > 0;
}

function hasRenderedCaptureAvailable(input: PreviewRuntimePreparationInput): boolean {
  if (typeof input.renderedCaptureAvailable === "boolean") return input.renderedCaptureAvailable;
  const summary = input.siteVersion.importProvenanceSummary ?? null;
  if (!summary) return false;
  const status = String(summary.renderedCapture.status ?? "").trim().toLowerCase();
  const domSize = Math.max(0, Number(summary.renderedCapture.nodeCount ?? summary.renderedCapture.domLength ?? 0));
  const screenshotCount = Math.max(0, Number(summary.screenshotCount ?? 0));
  return (status === "available" || status === "partial") && (domSize > 0 || screenshotCount > 0);
}

export function preparePreviewRuntime(input: PreviewRuntimePreparationInput): PreviewRuntimePreparationResult {
  const diagnostics: string[] = [PREVIEW_RUNTIME_DIAGNOSTIC.PREPARATION_STARTED];
  const routePath = normalizePagePath(input.routePath);
  const runtimeProjection = buildFinalSiteModelFromRuntimeSiteVersion(input);
  let finalSiteModel = runtimeProjection.finalSiteModel;
  const transformedAssemblyDiagnostics = runtimeProjection.transformedAssemblyDiagnosticsByRoute[routePath] ?? null;
  let familyRenderPreparation: FamilyRenderPreparationResult | null = null;

  if (finalSiteModel) {
    familyRenderPreparation = prepareFamilyRenderForRoute({
      siteId: input.siteVersion.siteId,
      routePath,
      finalSiteModel,
      familyHandoffModel: input.siteVersion.importProvenanceSummary?.templateFamilies?.families ?? null,
    });
    diagnostics.push(...diagnosticsCodes(familyRenderPreparation.diagnostics));

    if (familyRenderPreparation.pageInstance && !familyRenderPreparation.fallbackToPage) {
      finalSiteModel = applyFamilyPageInstanceToFinalSiteModel({
        finalSiteModel,
        pageInstance: familyRenderPreparation.pageInstance,
      });
    }
  }

  if (finalSiteModel) diagnostics.push(PREVIEW_RUNTIME_DIAGNOSTIC.FINAL_SITE_MODEL_AVAILABLE);
  else diagnostics.push(PREVIEW_RUNTIME_DIAGNOSTIC.FINAL_SITE_MODEL_UNAVAILABLE);

  let reactRenderSiteModel: PreviewRuntimePreparationResult["reactRenderSiteModel"] = null;
  if (finalSiteModel && !input.simulateRendererContractUnavailable) {
    reactRenderSiteModel = createReactRendererContract({
      site: finalSiteModel,
      options: {
        fallbackMode: "safe",
        includeDiagnostics: true,
        includeProvenance: false,
        componentMappingMode: "allow_generic",
      },
    });
    diagnostics.push(PREVIEW_RUNTIME_DIAGNOSTIC.RENDERER_CONTRACT_CREATED);
  }

  let rendererResult: PreviewRuntimePreparationResult["rendererResult"] = null;
  let renderedSiteElement: ReactElement | null = null;
  let rendererDiagnostics: RenderDiagnostic[] = [];
  let rendererRuntimeFailed = false;
  const rendererInput =
    reactRenderSiteModel == null
      ? null
      : {
          siteModel: reactRenderSiteModel,
          finalSiteModel,
          routePath,
          options: {
            diagnosticsMode: "silent" as const,
            fallbackMode: "safe" as const,
            includeProvenance: false,
          },
        };

  if (rendererInput) {
    try {
      if (input.simulateRendererRuntimeFailure) {
        throw new Error("simulated_renderer_runtime_failure");
      }
      const rendered = renderRealReactSite(rendererInput);
      rendererResult = rendered.result;
      renderedSiteElement = rendered.renderedSite;
      rendererDiagnostics = rendered.result.diagnostics;
    } catch {
      rendererRuntimeFailed = true;
      diagnostics.push(PREVIEW_RUNTIME_DIAGNOSTIC.RENDERER_RUNTIME_FAILED);
    }
  }

  const selection = selectPreviewRuntimeMode({
    finalSiteModelAvailable: finalSiteModel != null,
    rendererContractAvailable: reactRenderSiteModel != null,
    rendererSucceeded: rendererResult != null,
    rendererMatchedPage: rendererResult?.matchedPageId != null,
    hasMeaningfulRenderableStructure: hasMeaningfulRenderableStructure(finalSiteModel, rendererResult?.matchedPageId ?? null),
    rendererUsedFallback: Boolean(rendererResult?.renderedWithFallback),
    rendererRuntimeFailed,
    renderedCaptureAvailable: hasRenderedCaptureAvailable(input),
  });

  const finalDiagnostics = withSortedDiagnostics([...diagnostics, ...selection.diagnostics]);

  const prepared: PreviewRuntimePreparationResult = {
    mode: selection.mode,
    siteVersionId: input.siteVersion.id,
    routePath,
    finalSiteModel,
    reactRenderSiteModel,
    rendererInput,
    rendererResult,
    renderedSiteElement,
    rendererDiagnostics,
    diagnostics: finalDiagnostics,
    summary: {
      previewMode: "fallback_preview",
      rendererContractAvailable: false,
      finalSiteModelAvailable: false,
      familyRenderUsed: false,
      familyRenderFamilyId: null,
      familyRenderMode: "page_fallback",
      familyRenderFallbackToPage: true,
      familyRenderDiagnosticsCount: 0,
      familyRenderDiagnostics: [],
      renderedWithFallback: false,
      matchedPageId: null,
      contentResolutionApplied: false,
      resolvedContentCount: 0,
      unresolvedContentCount: 0,
      contentResolutionDegraded: false,
      contentResolutionDiagnostics: [],
      previewDiagnostics: [],
    },
  };

  prepared.summary = toSummary({
    mode: prepared.mode,
    finalSiteModel: prepared.finalSiteModel,
    reactRenderSiteModelAvailable: prepared.reactRenderSiteModel != null,
    rendererResult: prepared.rendererResult,
    diagnostics: prepared.diagnostics,
    familyRender: familyRenderPreparation,
    transformedAssemblyDiagnostics,
  });

  return prepared;
}

export function buildPersistedPreviewRuntimeSummary(input: {
  siteVersion: PreviewRuntimePreparationInput["siteVersion"];
  routePath?: string;
}): PreviewRuntimeSummary {
  const prepared = preparePreviewRuntime({
    siteVersion: input.siteVersion,
    routePath: input.routePath ?? "/",
  });
  const semanticImport = input.siteVersion.importProvenanceSummary?.semanticImport ?? null;
  const semanticEligible = shouldUseSemanticFallbackPreview({
    captureMode: input.siteVersion.importProvenanceSummary?.captureMode,
    renderedCaptureUsed: Boolean(input.siteVersion.importProvenanceSummary?.renderedCapture?.used),
    semanticImport,
  });
  if (!semanticEligible || !semanticImport) {
    return {
      ...prepared.summary,
      previewDiagnostics: withSortedDiagnostics([...prepared.summary.previewDiagnostics, PREVIEW_RUNTIME_DIAGNOSTIC.MODE_PERSISTED]),
    };
  }

  const semanticSectionCount = semanticImport.sections.length + (semanticImport.hero ? 1 : 0);
  const semanticImageCount =
    (semanticImport.hero?.image ? 1 : 0) + semanticImport.sections.reduce((sum, section) => sum + section.images.length, 0);
  const semanticCtaCount =
    (semanticImport.hero?.cta ? 1 : 0) + semanticImport.sections.reduce((sum, section) => sum + section.ctas.length, 0);

  return {
    ...prepared.summary,
    previewMode: "semantic_fallback_preview",
    renderedWithFallback: true,
    contentResolutionApplied: true,
    contentResolutionDegraded: false,
    unresolvedContentCount: 0,
    resolvedContentCount: Math.max(prepared.summary.resolvedContentCount, semanticSectionCount + semanticImageCount + semanticCtaCount),
    semanticSectionCount,
    semanticImageCount,
    semanticCtaCount,
    previewDiagnostics: withSortedDiagnostics([
      ...prepared.summary.previewDiagnostics,
      SEMANTIC_PREVIEW_DIAGNOSTIC.SELECTED,
      PREVIEW_RUNTIME_DIAGNOSTIC.MODE_PERSISTED,
    ]),
  };
}
