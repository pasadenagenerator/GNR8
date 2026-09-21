import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];

export type AirshipCapturedDiffDraftConfidence = "exact" | "probable" | "unsupported";

export type AirshipKnownDraftFieldMapping = {
  elementMarker: string;
  sectionMarker?: string | null;
  elementIndex?: string | null;
  draftFieldKey: string;
  confidence?: Exclude<AirshipCapturedDiffDraftConfidence, "unsupported">;
  readback?: string;
};

export type AirshipCapturedDiffToDraftMapperInput = {
  beforeHtml: string;
  afterHtml: string;
  context?: {
    migrationId?: string | null;
    siteKey?: string | null;
    route?: string | null;
  } | null;
  knownDraftFieldMappings?: AirshipKnownDraftFieldMapping[] | null;
};

export type AirshipCapturedDiffChangeKind =
  | "text"
  | "style_class"
  | "attribute"
  | "structure"
  | "marker_added"
  | "marker_removed"
  | "section_added"
  | "section_removed"
  | "css"
  | "script"
  | "unknown";

export type AirshipCapturedDiffToDraftMappingEntry = {
  changeKind: AirshipCapturedDiffChangeKind;
  changedElementMarker: string | null;
  elementIndex: string | null;
  sectionMarker: string | null;
  previousText: string | null;
  nextText: string | null;
  draftFieldKey: string | null;
  confidence: AirshipCapturedDiffDraftConfidence;
  reason: string;
  readback: string;
  safeToApplyLater: boolean;
};

export type AirshipCapturedDiffToDraftMappingResult = {
  status: "mapped";
  proofOnly: true;
  dryRunOnly: true;
  hasChanges: boolean;
  entries: AirshipCapturedDiffToDraftMappingEntry[];
  safeEntryCount: number;
  unsupportedEntryCount: number;
  readback: string;
  context: NonNullable<AirshipCapturedDiffToDraftMapperInput["context"]> | null;
  safety: {
    noDraftPersistence: true;
    noArtifactRegeneration: true;
    noPublishMutation: true;
  };
  diagnostics: {
    beforeElementCount: number;
    afterElementCount: number;
    beforeSectionMarkers: string[];
    afterSectionMarkers: string[];
  };
};

type MarkedElementSnapshot = {
  identityKey: string;
  marker: string;
  elementIndex: string | null;
  occurrence: number;
  sectionMarker: string | null;
  tagName: string;
  text: string;
  textNodes: string[];
  className: string | null;
  style: string | null;
  attrSignature: string;
  structureSignature: string;
};

type ParsedHtmlSnapshot = {
  elements: MarkedElementSnapshot[];
  elementsByKey: Map<string, MarkedElementSnapshot>;
  sectionMarkers: string[];
  executableBlocks: Array<{ kind: "script" | "css"; occurrence: number; text: string }>;
};

type DraftFieldResolution = {
  draftFieldKey: string | null;
  confidence: AirshipCapturedDiffDraftConfidence;
  reason: string;
  readback: string;
  safeToApplyLater: boolean;
};

const BUILT_IN_FIELD_MAPPINGS: Record<string, { draftFieldKey: string; confidence: Exclude<AirshipCapturedDiffDraftConfidence, "unsupported">; reason: string }> = {
  "hero-headline": {
    draftFieldKey: "headline",
    confidence: "exact",
    reason: "Known Airship hero headline marker maps to the hero headline draft field.",
  },
  "hero-subheading": {
    draftFieldKey: "subheading",
    confidence: "exact",
    reason: "Known Airship hero subheading marker maps to the hero subheading/body draft field.",
  },
  "hero-body": {
    draftFieldKey: "subheading",
    confidence: "probable",
    reason: "Hero body marker is treated as a probable alias for the hero subheading/body draft field.",
  },
  "hero-cta": {
    draftFieldKey: "ctaLabel",
    confidence: "exact",
    reason: "Known Airship primary hero CTA marker maps to the CTA label draft field.",
  },
  "primary-cta": {
    draftFieldKey: "ctaLabel",
    confidence: "exact",
    reason: "Known Airship primary CTA marker maps to the CTA label draft field.",
  },
  "contact-cta": {
    draftFieldKey: "ctaLabel",
    confidence: "exact",
    reason: "Known Airship contact CTA marker maps to the CTA label draft field.",
  },
  "cta-label": {
    draftFieldKey: "ctaLabel",
    confidence: "exact",
    reason: "Known Airship CTA label marker maps to the CTA label draft field.",
  },
};

export function mapAirshipCapturedDiffToDraft(input: AirshipCapturedDiffToDraftMapperInput): AirshipCapturedDiffToDraftMappingResult {
  const before = parseHtmlSnapshot(input.beforeHtml);
  const after = parseHtmlSnapshot(input.afterHtml);
  const entries: AirshipCapturedDiffToDraftMappingEntry[] = [];

  entries.push(...compareExecutableBlocks(before.executableBlocks, after.executableBlocks));
  entries.push(...compareSections(before.sectionMarkers, after.sectionMarkers));

  const allElementKeys = Array.from(new Set([...before.elementsByKey.keys(), ...after.elementsByKey.keys()])).sort();
  for (const key of allElementKeys) {
    const previous = before.elementsByKey.get(key) ?? null;
    const next = after.elementsByKey.get(key) ?? null;

    if (!previous && next) {
      entries.push(unsupportedEntry({
        changeKind: "marker_added",
        changedElementMarker: next.marker,
        elementIndex: next.elementIndex,
        sectionMarker: next.sectionMarker,
        previousText: null,
        nextText: next.text,
        reason: "A new data-airship-element marker appeared in the captured HTML.",
        readback: `Added marked element ${describeMarker(next)}. Added elements require operator review before any draft mapping.`,
      }));
      continue;
    }

    if (previous && !next) {
      entries.push(unsupportedEntry({
        changeKind: "marker_removed",
        changedElementMarker: previous.marker,
        elementIndex: previous.elementIndex,
        sectionMarker: previous.sectionMarker,
        previousText: previous.text,
        nextText: null,
        reason: "A data-airship-element marker from the baseline HTML is missing after capture.",
        readback: `Removed marked element ${describeMarker(previous)}. Deleted markers are not safe draft edits.`,
      }));
      continue;
    }

    if (!previous || !next) continue;
    entries.push(...compareMatchedElement(previous, next, input.knownDraftFieldMappings ?? []));
  }

  if (input.beforeHtml !== input.afterHtml && entries.length === 0) {
    entries.push(unsupportedEntry({
      changeKind: "unknown",
      changedElementMarker: null,
      elementIndex: null,
      sectionMarker: null,
      previousText: null,
      nextText: null,
      reason: "The HTML changed outside known Airship element, section, script, and style markers.",
      readback: "Captured HTML changed, but no supported marked element target could be resolved.",
    }));
  }

  const safeEntryCount = entries.filter((entry) => entry.safeToApplyLater).length;
  const unsupportedEntryCount = entries.filter((entry) => entry.confidence === "unsupported").length;
  const hasChanges = entries.length > 0;

  return {
    status: "mapped",
    proofOnly: true,
    dryRunOnly: true,
    hasChanges,
    entries,
    safeEntryCount,
    unsupportedEntryCount,
    readback: hasChanges
      ? `Mapped ${entries.length} captured HTML change${entries.length === 1 ? "" : "s"} into dry-run draft candidates; ${safeEntryCount} safe exact candidate${safeEntryCount === 1 ? "" : "s"}, ${unsupportedEntryCount} unsupported readback item${unsupportedEntryCount === 1 ? "" : "s"}.`
      : "No captured HTML changes were detected for Airship draft mapping.",
    context: input.context ?? null,
    safety: {
      noDraftPersistence: true,
      noArtifactRegeneration: true,
      noPublishMutation: true,
    },
    diagnostics: {
      beforeElementCount: before.elements.length,
      afterElementCount: after.elements.length,
      beforeSectionMarkers: before.sectionMarkers,
      afterSectionMarkers: after.sectionMarkers,
    },
  };
}

function compareMatchedElement(
  previous: MarkedElementSnapshot,
  next: MarkedElementSnapshot,
  knownDraftFieldMappings: AirshipKnownDraftFieldMapping[],
): AirshipCapturedDiffToDraftMappingEntry[] {
  const entries: AirshipCapturedDiffToDraftMappingEntry[] = [];
  const textChanged = previous.text !== next.text;
  const classOrStyleChanged = previous.className !== next.className || previous.style !== next.style;
  const attrsChanged = previous.attrSignature !== next.attrSignature;
  const structureChanged = previous.structureSignature !== next.structureSignature || previous.tagName !== next.tagName;

  if (classOrStyleChanged) {
    entries.push(unsupportedEntry({
      changeKind: "style_class",
      changedElementMarker: next.marker,
      elementIndex: next.elementIndex,
      sectionMarker: next.sectionMarker,
      previousText: previous.text,
      nextText: next.text,
      reason: "Class or inline style changed on a marked Airship element.",
      readback: `${describeMarker(next)} changed class/style attributes. Style changes are read back only and are not draft text edits.`,
    }));
  } else if (attrsChanged) {
    entries.push(unsupportedEntry({
      changeKind: "attribute",
      changedElementMarker: next.marker,
      elementIndex: next.elementIndex,
      sectionMarker: next.sectionMarker,
      previousText: previous.text,
      nextText: next.text,
      reason: "A non-text attribute changed on a marked Airship element.",
      readback: `${describeMarker(next)} changed attributes outside supported text mapping.`,
    }));
  }

  if (structureChanged) {
    entries.push(unsupportedEntry({
      changeKind: "structure",
      changedElementMarker: next.marker,
      elementIndex: next.elementIndex,
      sectionMarker: next.sectionMarker,
      previousText: previous.text,
      nextText: next.text,
      reason: "The marked element structure changed.",
      readback: `${describeMarker(next)} changed structure. Structural edits require operator review before draft application.`,
    }));
  }

  if (!textChanged) return entries;

  const changedTextNodeCount = countChangedTextNodes(previous.textNodes, next.textNodes);
  if (changedTextNodeCount !== 1) {
    entries.push(unsupportedEntry({
      changeKind: "text",
      changedElementMarker: next.marker,
      elementIndex: next.elementIndex,
      sectionMarker: next.sectionMarker,
      previousText: previous.text,
      nextText: next.text,
      reason: `Expected one changed text node inside the marked element, found ${changedTextNodeCount}.`,
      readback: `${describeMarker(next)} changed multiple text nodes or changed text shape, so it is not safe for automatic draft mapping.`,
    }));
    return entries;
  }

  if (structureChanged || classOrStyleChanged || attrsChanged) return entries;

  const field = resolveDraftField(next, knownDraftFieldMappings);
  entries.push({
    changeKind: "text",
    changedElementMarker: next.marker,
    elementIndex: next.elementIndex,
    sectionMarker: next.sectionMarker,
    previousText: previous.text,
    nextText: next.text,
    draftFieldKey: field.draftFieldKey,
    confidence: field.confidence,
    reason: field.reason,
    readback: field.readback,
    safeToApplyLater: field.safeToApplyLater,
  });
  return entries;
}

function resolveDraftField(element: MarkedElementSnapshot, knownDraftFieldMappings: AirshipKnownDraftFieldMapping[]): DraftFieldResolution {
  const customMatches = knownDraftFieldMappings.filter((mapping) =>
    mapping.elementMarker === element.marker &&
    optionalMatch(mapping.sectionMarker, element.sectionMarker) &&
    optionalMatch(mapping.elementIndex, element.elementIndex),
  );

  if (customMatches.length === 1) {
    const match = customMatches[0]!;
    const confidence = match.confidence ?? "exact";
    return {
      draftFieldKey: match.draftFieldKey,
      confidence,
      reason: `Known draft field metadata maps ${describeMarker(element)} to ${match.draftFieldKey}.`,
      readback: match.readback ?? `${describeMarker(element)} maps to draft field ${match.draftFieldKey} with ${confidence} confidence.`,
      safeToApplyLater: confidence === "exact",
    };
  }

  if (customMatches.length > 1) {
    return {
      draftFieldKey: null,
      confidence: "unsupported",
      reason: "Known draft field metadata had multiple possible matches.",
      readback: `${describeMarker(element)} has ambiguous draft field metadata and is not safe to apply.`,
      safeToApplyLater: false,
    };
  }

  const builtIn = BUILT_IN_FIELD_MAPPINGS[element.marker];
  if (builtIn) {
    return {
      draftFieldKey: builtIn.draftFieldKey,
      confidence: builtIn.confidence,
      reason: builtIn.reason,
      readback: `${describeMarker(element)} maps to draft field ${builtIn.draftFieldKey} with ${builtIn.confidence} confidence.`,
      safeToApplyLater: builtIn.confidence === "exact",
    };
  }

  return {
    draftFieldKey: null,
    confidence: "unsupported",
    reason: "The changed Airship element marker is not in the supported draft mapping set.",
    readback: `${describeMarker(element)} changed text, but the marker is unknown to the proof mapper.`,
    safeToApplyLater: false,
  };
}

function parseHtmlSnapshot(html: string): ParsedHtmlSnapshot {
  const root = parse(html, { sourceCodeLocationInfo: false }) as unknown as Node;
  const elements: MarkedElementSnapshot[] = [];
  const sectionMarkers: string[] = [];
  const executableBlocks: ParsedHtmlSnapshot["executableBlocks"] = [];
  const markerOccurrences = new Map<string, number>();
  const executableOccurrences = { script: 0, css: 0 };

  function walk(node: Node, currentSection: string | null): void {
    const element = asElement(node);
    const nextSection = element ? attrValue(element, "data-airship-section") || currentSection : currentSection;

    if (element) {
      const tagName = (element.tagName || "").toLowerCase();
      if (nextSection && attrValue(element, "data-airship-section")) sectionMarkers.push(nextSection);
      if (tagName === "style" || tagName === "script") {
        const kind = tagName === "style" ? "css" : "script";
        executableBlocks.push({ kind, occurrence: executableOccurrences[kind], text: textOf(element) });
        executableOccurrences[kind] += 1;
      }

      const marker = attrValue(element, "data-airship-element");
      if (marker) {
        const occurrence = markerOccurrences.get(marker) ?? 0;
        markerOccurrences.set(marker, occurrence + 1);
        const elementIndex = attrValue(element, "data-airship-element-index") || null;
        const snapshot: MarkedElementSnapshot = {
          identityKey: markerIdentityKey(marker, elementIndex, occurrence),
          marker,
          elementIndex,
          occurrence,
          sectionMarker: nextSection,
          tagName,
          text: textOf(element),
          textNodes: textNodesOf(element),
          className: attrValue(element, "class") || null,
          style: attrValue(element, "style") || null,
          attrSignature: attrSignature(element),
          structureSignature: structureSignature(element),
        };
        elements.push(snapshot);
      }
    }

    for (const child of childrenOf(node)) walk(child, nextSection);
  }

  walk(root, null);
  return {
    elements,
    elementsByKey: new Map(elements.map((element) => [element.identityKey, element])),
    sectionMarkers: unique(sectionMarkers),
    executableBlocks,
  };
}

function compareExecutableBlocks(
  before: ParsedHtmlSnapshot["executableBlocks"],
  after: ParsedHtmlSnapshot["executableBlocks"],
): AirshipCapturedDiffToDraftMappingEntry[] {
  const entries: AirshipCapturedDiffToDraftMappingEntry[] = [];
  const maxLength = Math.max(before.length, after.length);
  for (let index = 0; index < maxLength; index += 1) {
    const previous = before[index] ?? null;
    const next = after[index] ?? null;
    if (previous?.kind !== next?.kind || previous?.text !== next?.text) {
      const kind = next?.kind ?? previous?.kind ?? "script";
      entries.push(unsupportedEntry({
        changeKind: kind,
        changedElementMarker: null,
        elementIndex: null,
        sectionMarker: null,
        previousText: previous?.text ?? null,
        nextText: next?.text ?? null,
        reason: `${kind === "css" ? "Style" : "Script"} block changed in captured HTML.`,
        readback: `${kind === "css" ? "CSS/style" : "Script"} changes are unsupported by the draft mapper and are read back only.`,
      }));
    }
  }
  return entries;
}

function compareSections(before: string[], after: string[]): AirshipCapturedDiffToDraftMappingEntry[] {
  const entries: AirshipCapturedDiffToDraftMappingEntry[] = [];
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  for (const section of before) {
    if (!afterSet.has(section)) {
      entries.push(unsupportedEntry({
        changeKind: "section_removed",
        changedElementMarker: null,
        elementIndex: null,
        sectionMarker: section,
        previousText: null,
        nextText: null,
        reason: "A data-airship-section marker from the baseline HTML is missing after capture.",
        readback: `Removed section marker ${section}. Added or removed sections are structural changes.`,
      }));
    }
  }
  for (const section of after) {
    if (!beforeSet.has(section)) {
      entries.push(unsupportedEntry({
        changeKind: "section_added",
        changedElementMarker: null,
        elementIndex: null,
        sectionMarker: section,
        previousText: null,
        nextText: null,
        reason: "A new data-airship-section marker appeared in captured HTML.",
        readback: `Added section marker ${section}. Added or removed sections are structural changes.`,
      }));
    }
  }
  return entries;
}

function unsupportedEntry(input: Omit<AirshipCapturedDiffToDraftMappingEntry, "draftFieldKey" | "confidence" | "safeToApplyLater">): AirshipCapturedDiffToDraftMappingEntry {
  return {
    ...input,
    draftFieldKey: null,
    confidence: "unsupported",
    safeToApplyLater: false,
  };
}

function asElement(node: Node | null | undefined): Element | null {
  if (!node || typeof (node as { tagName?: unknown }).tagName !== "string") return null;
  return node as Element;
}

function childrenOf(node: Node | null | undefined): Node[] {
  const childNodes = (node as { childNodes?: unknown[] } | null | undefined)?.childNodes;
  return Array.isArray(childNodes) ? childNodes as Node[] : [];
}

function attrValue(element: Element, name: string): string {
  const attrs = Array.isArray((element as { attrs?: unknown[] }).attrs)
    ? (element as { attrs: Array<{ name: string; value: string }> }).attrs
    : [];
  const hit = attrs.find((attr) => attr.name.toLowerCase() === name.toLowerCase());
  return String(hit?.value ?? "").trim();
}

function attrSignature(element: Element): string {
  const attrs = Array.isArray((element as { attrs?: unknown[] }).attrs)
    ? (element as { attrs: Array<{ name: string; value: string }> }).attrs
    : [];
  return attrs
    .filter((attr) => !attr.name.toLowerCase().startsWith("data-airship-"))
    .map((attr) => `${attr.name.toLowerCase()}=${attr.value}`)
    .sort()
    .join("|");
}

function textOf(node: Node | null | undefined): string {
  if (!node) return "";
  const raw = (node as { value?: unknown }).value;
  if (typeof raw === "string") return normalizeText(raw);
  return normalizeText(childrenOf(node).map((child) => textOf(child)).filter(Boolean).join(" "));
}

function textNodesOf(node: Node | null | undefined): string[] {
  if (!node) return [];
  const raw = (node as { value?: unknown }).value;
  if (typeof raw === "string") {
    const normalized = normalizeText(raw);
    return normalized ? [normalized] : [];
  }
  return childrenOf(node).flatMap((child) => textNodesOf(child));
}

function structureSignature(node: Node): string {
  const element = asElement(node);
  if (!element) return "#text";
  return `${(element.tagName || "").toLowerCase()}(${childrenOf(element).map((child) => structureSignature(child)).join(",")})`;
}

function countChangedTextNodes(previous: string[], next: string[]): number {
  const maxLength = Math.max(previous.length, next.length);
  let changed = 0;
  for (let index = 0; index < maxLength; index += 1) {
    if ((previous[index] ?? null) !== (next[index] ?? null)) changed += 1;
  }
  return changed;
}

function markerIdentityKey(marker: string, elementIndex: string | null, occurrence: number): string {
  return `${marker}::${elementIndex ?? `occurrence-${occurrence}`}`;
}

function optionalMatch(expected: string | null | undefined, actual: string | null): boolean {
  return expected === undefined || expected === null || expected === actual;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function describeMarker(element: MarkedElementSnapshot): string {
  return element.elementIndex ? `${element.marker}[${element.elementIndex}]` : element.marker;
}
