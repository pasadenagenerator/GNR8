import type {
  Gnr8OutputAdapter,
  Gnr8OutputAdapterDescriptor,
  Gnr8OutputAdapterFile,
  Gnr8OutputAdapterFileManifest,
} from "./output-adapter-contract";

export interface NormalizedSiteNavItem {
  label: string;
  href: string;
}

export interface NormalizedSiteHero {
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface NormalizedSiteCard {
  title: string;
  body: string;
}

export interface NormalizedSiteSection {
  id: string;
  eyebrow?: string;
  title: string;
  body?: string;
  cards?: NormalizedSiteCard[];
}

export interface NormalizedSiteContact {
  heading: string;
  body: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface NormalizedSiteFooter {
  text: string;
}

export interface NormalizedSiteThemeSignals {
  accentHex?: string;
  backgroundHex?: string;
  textHex?: string;
  mutedHex?: string;
  surfaceHex?: string;
  fontFamily?: string;
  tone?: "operator" | "premium" | "technical" | "retail" | "classic";
}

export interface NormalizedStaticBusinessSiteContent {
  siteName: string;
  brandName: string;
  navItems: NormalizedSiteNavItem[];
  hero: NormalizedSiteHero;
  sections: NormalizedSiteSection[];
  contact: NormalizedSiteContact;
  footer: NormalizedSiteFooter;
  theme: NormalizedSiteThemeSignals;
}

export const ASTRO_STATIC_SITE_PREVIEW_PORT = 4321;

export const astroStaticSiteAdapterDescriptor: Gnr8OutputAdapterDescriptor = {
  id: "astro-static-site",
  label: "Astro static site source workspace",
  supportedSiteClasses: ["static-business-site", "marketing-site", "service-business-site", "content-site"],
  sourceWorkspaceShape: "source-project",
  projectFileReadback: ["package.json", "astro.config.mjs", "src/pages/index.astro", "src/styles/global.css"],
  buildCommand: {
    command: "pnpm build",
    cwdHint: "workspace-root",
  },
  devCommand: {
    command: "pnpm dev --host 127.0.0.1 --port 4321",
    cwdHint: "workspace-root",
  },
  previewTargetPort: ASTRO_STATIC_SITE_PREVIEW_PORT,
  exportOutput: {
    kind: "static-dist",
    outputPath: "dist",
  },
  supportedEditCategories: ["copy", "navigation", "theme", "layout", "sections", "cards", "contact", "assets"],
  limitations: [
    "Skeleton adapter only; not wired into production generation, publishing, or deployment.",
    "Single-page static business-site proof only.",
    "No ecommerce checkout, inventory, account, CMS, or application-state support.",
    "No live pointer, DNS, provider, billing, dry-run, rollback, shadow-publish, or runtime artifact mutation.",
  ],
  mutationBoundary: {
    mutatesRuntimeArtifact: false,
    mutatesPublishedOutput: false,
    mutatesLivePointer: false,
    mutatesDns: false,
    mutatesProvider: false,
    mutatesBilling: false,
    writesSourceWorkspace: true,
    requiresGitBaseline: true,
  },
  airshipIntegrationReadback: {
    prepareWorkspace: "Future worker prepares an Astro source workspace from this deterministic file manifest.",
    gitBaseline: "Future worker creates a git baseline before Airship edits.",
    devServer: "Future worker runs pnpm dev --host 127.0.0.1 --port 4321.",
    airshipTarget: "Airship targets http://127.0.0.1:4321.",
    captureDiffs: "Future worker captures source diffs after Airship edits.",
    mapAndApply: "Future worker maps and applies only supported edit categories through the adapter boundary.",
    buildCandidate: "Future worker runs pnpm build and exports dist as a review candidate.",
  },
};

export const astroStaticSiteAdapter: Gnr8OutputAdapter<NormalizedStaticBusinessSiteContent> = {
  descriptor: astroStaticSiteAdapterDescriptor,
  createProjectManifest: createAstroStaticSiteProjectManifest,
};

export function createAstroStaticSiteProjectManifest(input: NormalizedStaticBusinessSiteContent): Gnr8OutputAdapterFileManifest {
  const files: Gnr8OutputAdapterFile[] = [
    {
      path: "package.json",
      role: "manifest",
      contents: `${JSON.stringify(createPackageJson(input), null, 2)}\n`,
    },
    {
      path: "astro.config.mjs",
      role: "config",
      contents: createAstroConfig(),
    },
    {
      path: "src/pages/index.astro",
      role: "source",
      contents: createIndexAstro(input),
    },
    {
      path: "src/styles/global.css",
      role: "style",
      contents: createGlobalCss(input.theme),
    },
  ];

  return { files };
}

function createPackageJson(input: NormalizedStaticBusinessSiteContent): Record<string, unknown> {
  return {
    name: slugify(input.siteName || input.brandName || "gnr8-astro-site"),
    version: "0.0.0",
    private: true,
    type: "module",
    scripts: {
      dev: "astro dev --host 127.0.0.1 --port 4321",
      build: "astro build",
      preview: "astro preview --host 127.0.0.1 --port 4321",
    },
    dependencies: {
      astro: "^5.0.0",
    },
  };
}

function createAstroConfig(): string {
  return `import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
});
`;
}

function createIndexAstro(input: NormalizedStaticBusinessSiteContent): string {
  const nav = input.navItems
    .map((item) => `        <a href="${escapeAttribute(item.href)}">${escapeHtml(item.label)}</a>`)
    .join("\n");
  const sections = input.sections.map(renderSection).join("\n\n");
  const contactLinks = [
    input.contact.email ? `<a href="mailto:${escapeAttribute(input.contact.email)}">${escapeHtml(input.contact.email)}</a>` : null,
    input.contact.phone ? `<a href="tel:${escapeAttribute(input.contact.phone)}">${escapeHtml(input.contact.phone)}</a>` : null,
    input.contact.address ? `<span>${escapeHtml(input.contact.address)}</span>` : null,
  ]
    .filter(Boolean)
    .join("\n          ");

  return `---
import "../styles/global.css";
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.siteName)}</title>
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/">${escapeHtml(input.brandName)}</a>
      <nav aria-label="Primary navigation">
${nav}
      </nav>
    </header>

    <main>
      <section class="hero" id="home">
        <p class="eyebrow">${escapeHtml(input.brandName)}</p>
        <h1>${escapeHtml(input.hero.headline)}</h1>
        <p>${escapeHtml(input.hero.body)}</p>
        <a class="cta" href="${escapeAttribute(input.hero.ctaHref)}">${escapeHtml(input.hero.ctaLabel)}</a>
      </section>

${sections}

      <section class="contact" id="contact">
        <div>
          <p class="eyebrow">Contact</p>
          <h2>${escapeHtml(input.contact.heading)}</h2>
          <p>${escapeHtml(input.contact.body)}</p>
        </div>
        <address>
          ${contactLinks}
        </address>
      </section>
    </main>

    <footer>
      <p>${escapeHtml(input.footer.text)}</p>
    </footer>
  </body>
</html>
`;
}

function renderSection(section: NormalizedSiteSection): string {
  const cards = (section.cards ?? [])
    .map(
      (card) => `          <article class="card">
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.body)}</p>
          </article>`,
    )
    .join("\n");

  return `      <section class="content-section" id="${escapeAttribute(section.id)}">
        ${section.eyebrow ? `<p class="eyebrow">${escapeHtml(section.eyebrow)}</p>` : ""}
        <h2>${escapeHtml(section.title)}</h2>
        ${section.body ? `<p>${escapeHtml(section.body)}</p>` : ""}
        ${cards ? `<div class="card-grid">\n${cards}\n        </div>` : ""}
      </section>`;
}

function createGlobalCss(theme: NormalizedSiteThemeSignals): string {
  const accent = normalizeHex(theme.accentHex, "#f97316");
  const background = normalizeHex(theme.backgroundHex, "#fff7ed");
  const text = normalizeHex(theme.textHex, "#1f2937");
  const muted = normalizeHex(theme.mutedHex, "#6b7280");
  const surface = normalizeHex(theme.surfaceHex, "#ffffff");
  const fontFamily = theme.fontFamily?.trim() || "Inter, ui-sans-serif, system-ui, sans-serif";

  return `:root {
  --gnr8-astro-accent: ${accent};
  --gnr8-astro-background: ${background};
  --gnr8-astro-text: ${text};
  --gnr8-astro-muted: ${muted};
  --gnr8-astro-surface: ${surface};
  --gnr8-astro-font: ${fontFamily};
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: var(--gnr8-astro-font);
  color: var(--gnr8-astro-text);
  background: var(--gnr8-astro-background);
}

a {
  color: inherit;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px clamp(20px, 6vw, 72px);
  border-bottom: 1px solid color-mix(in srgb, var(--gnr8-astro-text) 12%, transparent);
}

.brand {
  font-weight: 800;
  text-decoration: none;
}

nav {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: var(--gnr8-astro-muted);
}

nav a {
  text-decoration: none;
}

.hero,
.content-section,
.contact {
  padding: clamp(56px, 8vw, 104px) clamp(20px, 6vw, 72px);
}

.hero {
  max-width: 920px;
}

.eyebrow {
  color: var(--gnr8-astro-accent);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  max-width: 780px;
  font-size: clamp(3rem, 10vw, 7rem);
  line-height: 0.92;
}

h2 {
  max-width: 720px;
  font-size: clamp(2rem, 5vw, 4.5rem);
  line-height: 1;
}

p {
  max-width: 720px;
  color: var(--gnr8-astro-muted);
  font-size: 1.04rem;
  line-height: 1.7;
}

.cta {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 18px;
  color: #ffffff;
  background: var(--gnr8-astro-accent);
  border-radius: 6px;
  font-weight: 800;
  text-decoration: none;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 28px;
}

.card {
  min-height: 180px;
  padding: 24px;
  background: var(--gnr8-astro-surface);
  border: 1px solid color-mix(in srgb, var(--gnr8-astro-text) 12%, transparent);
  border-radius: 8px;
}

.contact {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(240px, 0.8fr);
  gap: 32px;
  background: var(--gnr8-astro-text);
  color: var(--gnr8-astro-surface);
}

.contact p {
  color: color-mix(in srgb, var(--gnr8-astro-surface) 72%, transparent);
}

address {
  display: grid;
  align-content: start;
  gap: 12px;
  font-style: normal;
}

footer {
  padding: 24px clamp(20px, 6vw, 72px);
}

@media (max-width: 720px) {
  .site-header,
  .contact {
    display: grid;
  }
}
`;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "gnr8-astro-site";
}

function normalizeHex(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toLowerCase() : fallback;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
