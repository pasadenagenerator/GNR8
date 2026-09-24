import assert from "node:assert/strict";
import test from "node:test";

import { htmlStaticArtifactAdapterDescriptor } from "./output-adapter-contract";
import {
  ASTRO_STATIC_SITE_PREVIEW_PORT,
  astroStaticSiteAdapterDescriptor,
  createAstroStaticSiteProjectManifest,
  type NormalizedStaticBusinessSiteContent,
} from "./astro-static-site-adapter";

test("CHS-like content produces a deterministic Astro source project manifest", () => {
  const manifest = createAstroStaticSiteProjectManifest(chsFixture());
  const files = fileMap(manifest.files);

  assert.deepEqual(
    manifest.files.map((file) => file.path),
    ["package.json", "astro.config.mjs", "src/pages/index.astro", "src/styles/global.css"],
  );
  assert.match(files.get("src/pages/index.astro") ?? "", /Construction Health Solutions/);
  assert.match(files.get("src/pages/index.astro") ?? "", /Safer sites, cleaner handoffs, faster closeouts/);
  assert.match(files.get("src/pages/index.astro") ?? "", /Preconstruction/);
  assert.match(files.get("src/pages/index.astro") ?? "", /Closeout Support/);
  assert.match(files.get("src/pages/index.astro") ?? "", /hello@chs.example/);
  assert.match(files.get("src/styles/global.css") ?? "", /--gnr8-astro-accent: #f97316;/);
  assert.match(files.get("src/styles/global.css") ?? "", /--gnr8-astro-background: #fff7ed;/);
});

test("ARIS-like content produces nav, contact, card sections, and adapter readback", () => {
  const manifest = createAstroStaticSiteProjectManifest(arisFixture());
  const files = fileMap(manifest.files);
  const page = files.get("src/pages/index.astro") ?? "";

  assert.match(page, /ARIS Supply/);
  assert.match(page, /Retail-ready safety supplies without procurement drag/);
  assert.match(page, /href="#catalog"/);
  assert.match(page, /Bulk sourcing/);
  assert.match(page, /Countertop merchandising/);
  assert.match(page, /sales@aris.example/);
  assert.equal(astroStaticSiteAdapterDescriptor.devCommand?.command, "pnpm dev --host 127.0.0.1 --port 4321");
  assert.equal(astroStaticSiteAdapterDescriptor.buildCommand?.command, "pnpm build");
  assert.equal(astroStaticSiteAdapterDescriptor.previewTargetPort, ASTRO_STATIC_SITE_PREVIEW_PORT);
  assert.equal(ASTRO_STATIC_SITE_PREVIEW_PORT, 4321);
});

test("adapter descriptors keep Astro skeletal and runtime fallback intact", () => {
  assert.equal(astroStaticSiteAdapterDescriptor.id, "astro-static-site");
  assert.equal(htmlStaticArtifactAdapterDescriptor.id, "html-static-artifact");
  assert.equal(htmlStaticArtifactAdapterDescriptor.sourceWorkspaceShape, "runtime-artifact-bundle");
  assert.equal(htmlStaticArtifactAdapterDescriptor.exportOutput.kind, "runtime-html-artifact");
  assert.equal(astroStaticSiteAdapterDescriptor.exportOutput.kind, "static-dist");

  for (const descriptor of [astroStaticSiteAdapterDescriptor, htmlStaticArtifactAdapterDescriptor]) {
    assert.equal(descriptor.mutationBoundary.mutatesRuntimeArtifact, false);
    assert.equal(descriptor.mutationBoundary.mutatesPublishedOutput, false);
    assert.equal(descriptor.mutationBoundary.mutatesLivePointer, false);
    assert.equal(descriptor.mutationBoundary.mutatesDns, false);
    assert.equal(descriptor.mutationBoundary.mutatesProvider, false);
    assert.equal(descriptor.mutationBoundary.mutatesBilling, false);
  }

  assert.match(astroStaticSiteAdapterDescriptor.airshipIntegrationReadback?.devServer ?? "", /4321/);
  assert.ok(astroStaticSiteAdapterDescriptor.limitations.some((limit) => limit.includes("Skeleton adapter only")));
});

function fileMap(files: Array<{ path: string; contents: string }>): Map<string, string> {
  return new Map(files.map((file) => [file.path, file.contents]));
}

function chsFixture(): NormalizedStaticBusinessSiteContent {
  return {
    siteName: "CHS Site Proof",
    brandName: "Construction Health Solutions",
    navItems: [
      { label: "Services", href: "#services" },
      { label: "Proof", href: "#proof" },
      { label: "Contact", href: "#contact" },
    ],
    hero: {
      headline: "Safer sites, cleaner handoffs, faster closeouts",
      body: "Field-tested safety coordination and documentation support for construction teams that need clarity before crews mobilize.",
      ctaLabel: "Schedule a site consult",
      ctaHref: "#contact",
    },
    sections: [
      {
        id: "services",
        eyebrow: "Services",
        title: "Built for jobsite operators",
        body: "CHS keeps safety programs practical, visible, and ready for inspection.",
        cards: [
          { title: "Preconstruction", body: "Safety planning and kickoff material for project teams." },
          { title: "Site audits", body: "Readable findings, corrective actions, and closeout logs." },
          { title: "Closeout Support", body: "Documentation packages that are ready for owner review." },
        ],
      },
      {
        id: "proof",
        eyebrow: "Proof",
        title: "A calm operating layer for complex work",
        body: "The site structure stays simple enough for Airship edits and rich enough for a business homepage.",
      },
    ],
    contact: {
      heading: "Bring CHS into the planning room",
      body: "Send a project timeline and the team will map the safety support plan.",
      email: "hello@chs.example",
      phone: "+1 555 0100",
    },
    footer: {
      text: "Construction Health Solutions - GNR8 Astro adapter proof.",
    },
    theme: {
      accentHex: "#f97316",
      backgroundHex: "#fff7ed",
      textHex: "#1f2937",
      mutedHex: "#6b7280",
      surfaceHex: "#ffffff",
      tone: "operator",
    },
  };
}

function arisFixture(): NormalizedStaticBusinessSiteContent {
  return {
    siteName: "ARIS Static Proof",
    brandName: "ARIS Supply",
    navItems: [
      { label: "Catalog", href: "#catalog" },
      { label: "Programs", href: "#programs" },
      { label: "Contact", href: "#contact" },
    ],
    hero: {
      headline: "Retail-ready safety supplies without procurement drag",
      body: "ARIS helps local teams stock dependable safety, cleaning, and workwear essentials with simple reorder paths.",
      ctaLabel: "Request wholesale pricing",
      ctaHref: "#contact",
    },
    sections: [
      {
        id: "catalog",
        eyebrow: "Catalog",
        title: "Practical categories for repeat buyers",
        cards: [
          { title: "Bulk sourcing", body: "Core consumables and jobsite essentials packed for easy restock." },
          { title: "Countertop merchandising", body: "Retail displays that make high-velocity products easy to find." },
          { title: "Custom kits", body: "Role-based kits for onboarding, service vehicles, and seasonal work." },
        ],
      },
      {
        id: "programs",
        eyebrow: "Programs",
        title: "Programs that fit existing operations",
        body: "The generated source keeps copy, cards, and contact content editable without touching runtime artifact paths.",
      },
    ],
    contact: {
      heading: "Talk to ARIS",
      body: "Share the categories you move most often and ARIS will shape a starter order.",
      email: "sales@aris.example",
      address: "Pasadena, CA",
    },
    footer: {
      text: "ARIS Supply - static business site proof.",
    },
    theme: {
      accentHex: "#ea580c",
      backgroundHex: "#f8fafc",
      textHex: "#111827",
      mutedHex: "#475569",
      surfaceHex: "#ffffff",
      tone: "retail",
    },
  };
}
