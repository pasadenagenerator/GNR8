import type { SemanticImportResult, SemanticImportSection } from "@/gnr8/import-semantic/semantic-import-engine";

export const SEMANTIC_PREVIEW_DIAGNOSTIC = {
  RENDER_STARTED: "SEMANTIC_PREVIEW_RENDER_STARTED",
  RENDER_COMPLETED: "SEMANTIC_PREVIEW_RENDER_COMPLETED",
  RENDER_EMPTY: "SEMANTIC_PREVIEW_RENDER_EMPTY",
  SELECTED: "SEMANTIC_PREVIEW_SELECTED",
  IMAGE_UNRESOLVED: "SEMANTIC_PREVIEW_IMAGE_UNRESOLVED",
} as const;

export type SemanticPreviewRenderInput = {
  siteId: string;
  runtimeSiteId: string;
  runtimeSiteVersionId: string;
  path: string;
  semanticImport: SemanticImportResult;
  diagnostics?: string[];
};

export type SemanticPreviewRenderOutput = {
  previewMode: "semantic_fallback_preview";
  html: string;
  sectionCount: number;
  imageCount: number;
  ctaCount: number;
  diagnostics: string[];
};

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeHref(value: unknown): string | null {
  const href = normalizeText(value);
  if (!href) return null;
  const lower = href.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("vbscript:") || lower.startsWith("data:")) return null;
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("/") ||
    lower.startsWith("#") ||
    lower.startsWith("./") ||
    lower.startsWith("../")
  ) {
    return href;
  }
  if (/^[a-z0-9][a-z0-9/_#?&=.%+-]*$/i.test(href)) return `/${href.replace(/^\/+/, "")}`;
  return null;
}

function safeImageSrc(value: unknown): string | null {
  const src = safeHref(value);
  if (!src) return null;
  if (src.toLowerCase().startsWith("mailto:") || src.toLowerCase().startsWith("tel:")) return null;
  return src;
}

function imageBaseName(pathValue: string): string {
  const normalized = pathValue.split("?")[0]?.split("#")[0] ?? pathValue;
  const pieces = normalized.split("/");
  return normalizeText(pieces[pieces.length - 1]).toLowerCase();
}

function resolveImageSrc(input: {
  src: unknown;
  semanticImport: SemanticImportResult;
  diagnostics: Set<string>;
}): string | null {
  const direct = safeImageSrc(input.src);
  if (direct) return direct;
  const src = normalizeText(input.src);
  if (!src) return null;

  const wantedBase = imageBaseName(src);
  if (!wantedBase) {
    input.diagnostics.add(SEMANTIC_PREVIEW_DIAGNOSTIC.IMAGE_UNRESOLVED);
    return null;
  }

  for (const asset of input.semanticImport.assets.knownAssets) {
    const assetPath = normalizeText(asset.path);
    if (!assetPath) continue;
    if (imageBaseName(assetPath) !== wantedBase) continue;
    const resolved = safeImageSrc(assetPath);
    if (resolved) return resolved;
  }

  input.diagnostics.add(SEMANTIC_PREVIEW_DIAGNOSTIC.IMAGE_UNRESOLVED);
  return null;
}

function toCardTitle(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return (
    normalizeText(value.title) ||
    normalizeText(value.heading) ||
    normalizeText(value.name) ||
    normalizeText(value.label) ||
    null
  );
}

function toCardBody(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return normalizeText(value.description) || normalizeText(value.body) || normalizeText(value.text) || null;
}

function renderSectionHeading(title: string | null, fallback: string): string {
  return `<h2>${escapeHtml(title ?? fallback)}</h2>`;
}

function renderImageFigure(src: string | null, alt: string | null, emptyLabel: string): string {
  if (!src) return `<div class="img-placeholder">${escapeHtml(emptyLabel)}</div>`;
  const safeAlt = normalizeText(alt) || "Image";
  return `<figure class="img-frame"><img src="${escapeHtml(src)}" alt="${escapeHtml(safeAlt)}" loading="lazy" /></figure>`;
}

function renderServicesSection(input: {
  section: SemanticImportSection;
  semanticImport: SemanticImportResult;
  diagnostics: Set<string>;
}): string {
  const cards = input.section.items
    .map((item) => {
      const title = toCardTitle(item) ?? "Service";
      const body = toCardBody(item) ?? "Description not available.";
      return `<article class="card"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`;
    })
    .slice(0, 12)
    .join("");
  return `<section class="preview-section">${renderSectionHeading(input.section.title, "Services")}<div class="card-grid">${cards || '<article class="card"><h3>Services</h3><p>Service details were not extracted.</p></article>'}</div></section>`;
}

function renderGallerySection(input: {
  section: SemanticImportSection;
  semanticImport: SemanticImportResult;
  diagnostics: Set<string>;
}): string {
  const galleryImages = input.section.images
    .map((image) => {
      const resolvedSrc = resolveImageSrc({
        src: image.src,
        semanticImport: input.semanticImport,
        diagnostics: input.diagnostics,
      });
      return renderImageFigure(resolvedSrc, image.alt, "Image unavailable");
    })
    .slice(0, 18)
    .join("");

  return `<section class="preview-section">${renderSectionHeading(input.section.title, "Gallery")}<div class="image-grid">${galleryImages || '<div class="img-placeholder">No gallery images were extracted.</div>'}</div></section>`;
}

function renderContactSection(input: {
  section: SemanticImportSection;
}): string {
  const intro = normalizeText(input.section.intro);
  const forms = input.section.forms
    .map((form, index) => {
      const method = normalizeText(form.method).toUpperCase() || "POST";
      const action = normalizeText(form.action) || "#";
      return `<li>Form ${index + 1}: ${escapeHtml(method)} ${escapeHtml(action)} (${Math.max(0, form.fieldCount)} fields)</li>`;
    })
    .slice(0, 4)
    .join("");

  return `<section class="preview-section">${renderSectionHeading(input.section.title, "Contact")}<p>${escapeHtml(intro || "Contact details and form endpoints were extracted from semantic import.")}</p><div class="contact-block"><strong>Contact form placeholder</strong>${forms ? `<ul>${forms}</ul>` : "<p>No form metadata was extracted.</p>"}</div></section>`;
}

function renderCtas(ctas: Array<{ label: string; url: string }>): string {
  return ctas
    .map((cta) => {
      const label = normalizeText(cta.label);
      const href = safeHref(cta.url) ?? "#";
      if (!label) return "";
      return `<a class="btn" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
    })
    .filter(Boolean)
    .join("");
}

function renderGenericSection(input: {
  section: SemanticImportSection;
  semanticImport: SemanticImportResult;
  diagnostics: Set<string>;
}): string {
  const intro = normalizeText(input.section.intro);
  const images = input.section.images
    .slice(0, 6)
    .map((image) =>
      renderImageFigure(
        resolveImageSrc({
          src: image.src,
          semanticImport: input.semanticImport,
          diagnostics: input.diagnostics,
        }),
        image.alt,
        "Image unavailable",
      ),
    )
    .join("");
  const ctas = renderCtas(input.section.ctas);
  return `<section class="preview-section">${renderSectionHeading(input.section.title, "Section")}<p>${escapeHtml(intro || "Content extracted from semantic section.")}</p>${images ? `<div class="image-grid">${images}</div>` : ""}${ctas ? `<div class="cta-row">${ctas}</div>` : ""}</section>`;
}

export function shouldUseSemanticFallbackPreview(input: {
  captureMode: unknown;
  renderedCaptureUsed: boolean;
  semanticImport: SemanticImportResult | null | undefined;
}): boolean {
  const captureMode = normalizeText(input.captureMode).toLowerCase();
  if (captureMode !== "raw_html_only") return false;
  if (input.renderedCaptureUsed) return false;
  const semanticImport = input.semanticImport ?? null;
  if (!semanticImport) return false;
  const hasHero = Boolean(semanticImport.hero?.title || semanticImport.hero?.subtitle || semanticImport.hero?.cta);
  const hasSections = semanticImport.sections.length > 0;
  const hasImages = semanticImport.assets.images.length > 0;
  return hasHero || hasSections || hasImages;
}

export function renderSemanticPreview(input: SemanticPreviewRenderInput): SemanticPreviewRenderOutput {
  const diagnostics = new Set<string>(input.diagnostics ?? []);
  diagnostics.add(SEMANTIC_PREVIEW_DIAGNOSTIC.RENDER_STARTED);

  const blocks: string[] = [];
  const navigation = input.semanticImport.navigation
    .map((item) => {
      const label = normalizeText(item.label);
      const href = safeHref(item.href) ?? "#";
      if (!label) return "";
      return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
    })
    .filter(Boolean)
    .join("");
  if (navigation) blocks.push(`<nav class="top-nav">${navigation}</nav>`);

  const hero = input.semanticImport.hero;
  if (hero && (hero.title || hero.subtitle || hero.cta || hero.image)) {
    const heroImageSrc = resolveImageSrc({
      src: hero.image?.src ?? null,
      semanticImport: input.semanticImport,
      diagnostics,
    });
    blocks.push(
      `<section class="hero"><div><h1>${escapeHtml(normalizeText(hero.title) || "Homepage")}</h1><p>${
        escapeHtml(normalizeText(hero.subtitle) || "Semantic fallback preview generated from imported structure.")
      }</p>${hero.cta && normalizeText(hero.cta.label) ? `<div class="cta-row"><a class="btn" href="${escapeHtml(safeHref(hero.cta.url) ?? "#")}">${escapeHtml(normalizeText(hero.cta.label))}</a></div>` : ""}</div>${renderImageFigure(heroImageSrc, hero.image?.alt ?? null, "Hero image unavailable")}</section>`,
    );
  }

  for (const section of input.semanticImport.sections) {
    if (section.type === "navigation" || section.type === "header") continue;
    if (section.type === "services") {
      blocks.push(renderServicesSection({ section, semanticImport: input.semanticImport, diagnostics }));
      continue;
    }
    if (section.type === "gallery") {
      blocks.push(renderGallerySection({ section, semanticImport: input.semanticImport, diagnostics }));
      continue;
    }
    if (section.type === "contact") {
      blocks.push(renderContactSection({ section }));
      continue;
    }
    if (section.type === "footer") {
      blocks.push(
        `<footer class="footer">${renderSectionHeading(section.title, "Footer")}<p>${escapeHtml(
          normalizeText(section.intro) || "Footer content extracted from semantic import.",
        )}</p>${renderCtas(section.ctas) ? `<div class="cta-row">${renderCtas(section.ctas)}</div>` : ""}</footer>`,
      );
      continue;
    }
    blocks.push(renderGenericSection({ section, semanticImport: input.semanticImport, diagnostics }));
  }

  if (blocks.length === 0) {
    diagnostics.add(SEMANTIC_PREVIEW_DIAGNOSTIC.RENDER_EMPTY);
    blocks.push(
      `<section class="preview-section"><h2>Semantic Preview</h2><p>No semantic sections were extracted. This is a structural placeholder preview.</p></section>`,
    );
  }
  diagnostics.add(SEMANTIC_PREVIEW_DIAGNOSTIC.RENDER_COMPLETED);

  const ctaCount =
    (input.semanticImport.hero?.cta ? 1 : 0) + input.semanticImport.sections.reduce((sum, section) => sum + section.ctas.length, 0);
  const imageCount =
    (input.semanticImport.hero?.image ? 1 : 0) +
    input.semanticImport.sections.reduce((sum, section) => sum + section.images.length, 0);
  const sectionCount = input.semanticImport.sections.length + (input.semanticImport.hero ? 1 : 0);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>GNR8 Semantic Preview</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; background: #f4f7fb; color: #0f172a; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 1024px; margin: 0 auto; padding: 24px 18px 40px; display: grid; gap: 16px; }
    .top-nav { display: flex; flex-wrap: wrap; gap: 12px; background: #ffffff; border: 1px solid #dbe2ea; border-radius: 10px; padding: 12px 14px; }
    .top-nav a { color: #1d4ed8; text-decoration: none; font-size: 14px; }
    .hero, .preview-section, .footer { background: #ffffff; border: 1px solid #dbe2ea; border-radius: 12px; padding: 16px; }
    .hero { display: grid; gap: 14px; align-items: start; }
    @media (min-width: 860px) { .hero { grid-template-columns: 1.25fr 1fr; } }
    h1 { margin: 0; font-size: 34px; line-height: 1.14; letter-spacing: -0.02em; }
    h2 { margin: 0; font-size: 22px; line-height: 1.2; }
    h3 { margin: 0; font-size: 17px; line-height: 1.25; }
    p { margin: 10px 0 0; color: #334155; line-height: 1.6; }
    .cta-row { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 10px; }
    .btn { background: #0f172a; color: #ffffff; border-radius: 9px; padding: 9px 14px; font-weight: 600; font-size: 14px; text-decoration: none; display: inline-block; }
    .card-grid { margin-top: 12px; display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
    .card { border: 1px solid #dbe2ea; border-radius: 10px; padding: 12px; background: #f8fafc; }
    .card p { margin-top: 8px; font-size: 14px; }
    .image-grid { margin-top: 12px; display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    .img-frame { margin: 0; border-radius: 10px; border: 1px solid #dbe2ea; background: #ffffff; min-height: 124px; overflow: hidden; }
    .img-frame img { width: 100%; height: 100%; min-height: 124px; object-fit: cover; display: block; }
    .img-placeholder { border: 1px dashed #94a3b8; border-radius: 10px; min-height: 124px; display: grid; place-items: center; font-size: 13px; color: #64748b; background: #f8fafc; padding: 10px; text-align: center; }
    .contact-block { margin-top: 12px; border: 1px dashed #94a3b8; border-radius: 10px; padding: 12px; background: #f8fafc; font-size: 14px; color: #334155; }
    .contact-block ul { margin: 8px 0 0; padding-left: 18px; }
    .footer p { color: #475569; }
  </style>
</head>
<body data-gnr8-preview-mode="semantic_fallback_preview" data-gnr8-route-path="${escapeHtml(input.path)}" data-gnr8-site-id="${escapeHtml(
    input.siteId,
  )}" data-gnr8-runtime-site-id="${escapeHtml(input.runtimeSiteId)}" data-gnr8-runtime-site-version-id="${escapeHtml(input.runtimeSiteVersionId)}">
  <main class="container">
    ${blocks.join("\n")}
  </main>
</body>
</html>`;

  return {
    previewMode: "semantic_fallback_preview",
    html,
    sectionCount,
    imageCount,
    ctaCount,
    diagnostics: [...diagnostics].sort((a, b) => a.localeCompare(b)),
  };
}
