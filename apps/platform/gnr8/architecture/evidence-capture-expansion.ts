import crypto from "node:crypto";

import type {
  FontProviderClassification,
  WidgetInventoryClassification,
  WidgetInventoryEvidence,
  WidgetInventoryType,
} from "./importer-architecture-split-contract";

export type CapturedRouteIdentityInput = {
  sourceUrl?: string | null;
  finalUrl?: string | null;
  routePath?: string | null;
};

export type NormalizedCapturedRouteIdentity = {
  routeIdentity: string;
  routePath: string;
  sourceUrl: string;
  finalUrl: string | null;
};

export type LoadedFontInventoryItem = {
  family: string;
  source: string;
  providerClassification: FontProviderClassification;
};

export type LoadedFontInventoryInput = {
  renderedHtml?: string | null;
  computedStyleSamples?: unknown[] | null;
};

export type WidgetInventoryInput = {
  renderedHtml?: string | null;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function normalizeRoutePath(value: string): string {
  const withoutHash = value.split("#")[0] ?? "";
  const withoutQuery = withoutHash.split("?")[0] ?? "";
  let normalized = withoutQuery.trim() || "/";
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    normalized = withoutQuery.trim() || "/";
  }
  normalized = normalized.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/(?:index|default)\.(?:html?|php|aspx?)$/i, "/");
  normalized = normalized.replace(/\/+$/g, "") || "/";
  return normalized.toLowerCase();
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function normalizeUrl(value: string): string {
  const parsed = parseUrl(value);
  if (!parsed) return value.trim();
  parsed.protocol = "https:";
  parsed.hostname = normalizeHost(parsed.hostname);
  parsed.hash = "";
  parsed.search = "";
  parsed.pathname = normalizeRoutePath(parsed.pathname);
  parsed.port = "";
  return parsed.toString();
}

export function normalizeCapturedRouteIdentity(input: CapturedRouteIdentityInput): NormalizedCapturedRouteIdentity {
  const sourceUrlRaw = text(input.sourceUrl);
  const finalUrlRaw = text(input.finalUrl);
  const routePathRaw = text(input.routePath);
  const finalUrl = finalUrlRaw ? normalizeUrl(finalUrlRaw) : null;
  const sourceUrl = sourceUrlRaw ? normalizeUrl(sourceUrlRaw) : "";
  const identityUrl = parseUrl(finalUrl ?? sourceUrl);
  const routePath = normalizeRoutePath(routePathRaw || identityUrl?.pathname || "/");
  const host = identityUrl ? normalizeHost(identityUrl.hostname) : "unknown-host";

  return {
    routeIdentity: `${host}${routePath}`,
    routePath,
    sourceUrl,
    finalUrl,
  };
}

function normalizeRenderedHtmlForHash(renderedHtml: string): string {
  return renderedHtml
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .replace(/\s+>/g, ">")
    .replace(/<\s+/g, "<")
    .trim();
}

export function buildRenderedHtmlHash(renderedHtml: string): string {
  const normalized = normalizeRenderedHtmlForHash(renderedHtml);
  return `sha256:${crypto.createHash("sha256").update(normalized, "utf8").digest("hex")}`;
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function attributeValue(tag: string, attribute: string): string | null {
  const pattern = new RegExp(`${attribute}\\s*=\\s*(["'])(.*?)\\1`, "i");
  const match = tag.match(pattern);
  return match ? decodeHtmlAttribute(match[2] ?? "") : null;
}

function classifyFontSource(source: string): FontProviderClassification {
  const value = source.toLowerCase();
  if (value.includes("fonts.googleapis.com") || value.includes("fonts.gstatic.com")) return "google_fonts";
  if (value.includes("use.typekit.net") || value.includes("p.typekit.net") || value.includes("adobe")) return "adobe_fonts";
  if (value.startsWith("/") || value.startsWith("./") || value.startsWith("../") || value.startsWith("data:")) return "local";
  if (/^https?:\/\//.test(value)) return "custom_cdn";
  return value ? "local" : "unknown";
}

function cleanFontFamily(value: string): string {
  return value.replace(/["']/g, "").replace(/\+/g, " ").trim();
}

function splitFontFamilies(value: string): string[] {
  return value
    .split(",")
    .map(cleanFontFamily)
    .filter(Boolean)
    .filter((family) => !/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|inherit|initial|unset)$/i.test(family));
}

function fontFamilyFromGoogleUrl(url: string): string[] {
  const parsed = parseUrl(url);
  const familyParams = parsed?.searchParams.getAll("family") ?? [];
  return familyParams
    .map((family) => cleanFontFamily(family.split(":")[0] ?? ""))
    .filter(Boolean);
}

function addFont(
  fonts: Map<string, LoadedFontInventoryItem>,
  input: LoadedFontInventoryItem,
): void {
  const family = cleanFontFamily(input.family);
  const source = text(input.source);
  if (!family || !source) return;
  const key = `${family.toLowerCase()}|${source.toLowerCase()}|${input.providerClassification}`;
  fonts.set(key, { family, source, providerClassification: input.providerClassification });
}

export function extractLoadedFontInventory(input: LoadedFontInventoryInput): LoadedFontInventoryItem[] {
  const renderedHtml = text(input.renderedHtml);
  const fonts = new Map<string, LoadedFontInventoryItem>();

  for (const tag of renderedHtml.match(/<link\b[^>]*>/gi) ?? []) {
    const href = attributeValue(tag, "href");
    if (!href) continue;
    const providerClassification = classifyFontSource(href);
    if (providerClassification === "google_fonts") {
      for (const family of fontFamilyFromGoogleUrl(href)) {
        addFont(fonts, { family, source: href, providerClassification });
      }
    } else if (/\.(?:woff2?|ttf|otf|eot)(?:[?#].*)?$/i.test(href) || providerClassification === "adobe_fonts") {
      addFont(fonts, { family: "unknown", source: href, providerClassification });
    }
  }

  for (const style of renderedHtml.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) ?? []) {
    const css = style.replace(/^<style\b[^>]*>/i, "").replace(/<\/style>$/i, "");
    for (const fontFace of css.match(/@font-face\s*{[\s\S]*?}/gi) ?? []) {
      const family = fontFace.match(/font-family\s*:\s*([^;]+);?/i)?.[1] ?? "unknown";
      const src = fontFace.match(/url\((["']?)(.*?)\1\)/i)?.[2] ?? "";
      addFont(fonts, {
        family: cleanFontFamily(family),
        source: src || "inline_font_face",
        providerClassification: classifyFontSource(src),
      });
    }
  }

  for (const sample of input.computedStyleSamples ?? []) {
    const styles = typeof sample === "object" && sample ? (sample as { styles?: { fontFamily?: unknown } }).styles : null;
    const fontFamily = text(styles?.fontFamily);
    for (const family of splitFontFamilies(fontFamily)) {
      addFont(fonts, {
        family,
        source: "computed_style",
        providerClassification: "unknown",
      });
    }
  }

  return [...fonts.values()].sort((a, b) =>
    `${a.providerClassification}:${a.family}:${a.source}`.localeCompare(`${b.providerClassification}:${b.family}:${b.source}`),
  );
}

function classifyWidgetSource(source: string): WidgetInventoryClassification {
  const value = source.toLowerCase();
  if (value.includes("google.com/maps") || value.includes("maps.googleapis.com")) return "google_maps";
  if (value.includes("openstreetmap") || value.includes("osm.org")) return "openstreetmap";
  if (value.includes("mapbox")) return "mapbox";
  if (value.includes("leaflet")) return "leaflet";
  if (value.includes("youtube.com") || value.includes("youtu.be")) return "youtube";
  if (value.includes("vimeo.com")) return "vimeo";
  if (value.includes("accessibe") || value.includes("acsbapp") || value.includes("userway") || value.includes("equalweb") || value.includes("accessibility")) return "accessibility_overlay";
  if (value.includes("onetrust") || value.includes("cookiebot") || value.includes("cookieyes") || value.includes("cookiebanner") || value.includes("cookie-banner") || value.includes("cookie")) return "cookie_banner";
  if (value.includes("intercom") || value.includes("drift") || value.includes("tawk.to") || value.includes("zendesk") || value.includes("crisp.chat") || value.includes("chat-widget") || value.includes("chat")) return "chat_widget";
  if (value.includes("swiper") || value.includes("slick") || value.includes("carousel") || value.includes("lightbox") || value.includes("fancybox") || value.includes("gallery")) return "gallery";
  if (value.includes("form")) return "native_form";
  return "unknown";
}

function widgetTypeForClassification(classification: WidgetInventoryClassification): WidgetInventoryType {
  if (classification === "google_maps" || classification === "openstreetmap" || classification === "mapbox" || classification === "leaflet") return "map";
  if (classification === "gallery") return "gallery";
  if (classification === "native_form") return "form";
  if (classification === "accessibility_overlay") return "accessibility_overlay";
  if (classification === "cookie_banner") return "cookie_banner";
  if (classification === "chat_widget") return "chat_widget";
  if (classification === "youtube" || classification === "vimeo" || classification === "html5_video") return "embedded_video";
  return "unknown";
}

function addWidget(
  widgets: Map<string, WidgetInventoryEvidence>,
  input: Omit<WidgetInventoryEvidence, "id" | "evidenceRefIds"> & { evidenceRefIds?: string[] },
): void {
  const source = text(input.source) || null;
  const selectorHint = text(input.selectorHint) || null;
  const key = `${input.type}|${source ?? ""}|${input.classification}|${selectorHint ?? ""}`;
  const id = `widget_${widgets.size + 1}_${input.type}`;
  widgets.set(key, {
    id,
    type: input.type,
    source,
    selectorHint,
    classification: input.classification,
    confidence: Math.max(0, Math.min(1, input.confidence)),
    evidenceRefIds: input.evidenceRefIds ?? [id],
  });
}

export function extractWidgetInventory(input: WidgetInventoryInput): WidgetInventoryEvidence[] {
  const renderedHtml = text(input.renderedHtml);
  const widgets = new Map<string, WidgetInventoryEvidence>();

  for (const tag of renderedHtml.match(/<(?:iframe|script)\b[^>]*>/gi) ?? []) {
    const src = attributeValue(tag, "src");
    if (!src) continue;
    const classification = classifyWidgetSource(src);
    const type = widgetTypeForClassification(classification);
    if (type !== "unknown" || /widget|embed|player|map/i.test(src)) {
      addWidget(widgets, {
        type,
        source: src,
        selectorHint: tag.toLowerCase().startsWith("<iframe") ? "iframe" : "script",
        classification,
        confidence: classification === "unknown" ? 0.35 : 0.9,
      });
    }
  }

  for (const form of renderedHtml.match(/<form\b[^>]*>/gi) ?? []) {
    addWidget(widgets, {
      type: "form",
      source: attributeValue(form, "action") ?? "form",
      selectorHint: "form",
      classification: "native_form",
      confidence: 0.95,
    });
  }

  const classLikeMatches = renderedHtml.match(/(?:class|id)\s*=\s*(["'])(.*?)\1/gi) ?? [];
  for (const raw of classLikeMatches) {
    const value = raw.toLowerCase();
    const classification = classifyWidgetSource(value);
    const type = widgetTypeForClassification(classification);
    if (type !== "unknown") {
      addWidget(widgets, {
        type,
        source: value,
        selectorHint: value.startsWith("id") ? "#id" : ".class",
        classification,
        confidence: 0.7,
      });
    }
  }

  for (const video of renderedHtml.match(/<video\b[^>]*>/gi) ?? []) {
    addWidget(widgets, {
      type: "embedded_video",
      source: attributeValue(video, "src") ?? "video",
      selectorHint: "video",
      classification: "html5_video",
      confidence: 0.95,
    });
  }

  return [...widgets.values()].sort((a, b) =>
    `${a.type}:${a.classification}:${a.source ?? ""}:${a.selectorHint ?? ""}`.localeCompare(
      `${b.type}:${b.classification}:${b.source ?? ""}:${b.selectorHint ?? ""}`,
    ),
  ).map((widget, index) => ({
    ...widget,
    id: `widget_${index + 1}_${widget.type}`,
    evidenceRefIds: [`widget_${index + 1}_${widget.type}`],
  }));
}
