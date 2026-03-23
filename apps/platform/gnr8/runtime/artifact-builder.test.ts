import assert from "node:assert/strict";
import test from "node:test";

import { buildDeterministicArtifactBundle } from "@/gnr8/runtime/artifact-builder";

const siteVersion = {
  id: "sv_1",
  siteId: "site_1",
  versionNo: 1,
  state: "APPROVED" as const,
  source: "migration" as const,
  actor: "test",
  createdAt: "2026-03-21T00:00:00.000Z",
  rendererCompatibilityVersion: "gnr8-renderer-v1",
  artifactId: null,
  pages: [
    {
      id: "pv_1",
      siteVersionId: "sv_1",
      pageId: "page_1",
      path: "/",
      title: "Home",
      structureModel: {
        sections: [{ id: "hero", type: "hero.split", order: 0 }],
      },
      contentModel: {
        sectionProps: {
          hero: { headline: "Deterministic", subheadline: "Bundle" },
        },
      },
      styleTokens: {
        "color.background": "#fff",
        "color.text": "#111",
        "spacing.section": "48px",
      },
      assetGraph: [{ path: "/assets/logo.svg", mediaType: "image/svg+xml", required: true }],
      semanticSignals: [{ label: "migration.initial", confidence: 0.9, source: "migration" as const }],
      source: "migration" as const,
      actor: "test",
      createdAt: "2026-03-21T00:00:00.000Z",
    },
  ],
};

test("artifact-builder is deterministic for same input", () => {
  const a = buildDeterministicArtifactBundle({ siteVersion, renderMode: "PUBLISH" });
  const b = buildDeterministicArtifactBundle({ siteVersion, renderMode: "PUBLISH" });

  assert.equal(a.bundleSha256, b.bundleSha256);
  assert.deepEqual(a.htmlByPath, b.htmlByPath);
  assert.ok(a.htmlByPath["/"]?.includes("data-gnr8-render-mode=\"publish\""));
});

test("artifact-builder preview mode marks noindex", () => {
  const preview = buildDeterministicArtifactBundle({ siteVersion, renderMode: "PREVIEW" });
  assert.ok(preview.htmlByPath["/"]?.includes("noindex"));
});

test("artifact-builder renders visible legacy summary v2 with grouped recognizability blocks", () => {
  const legacySiteVersion = {
    ...siteVersion,
    pages: [
      {
        ...siteVersion.pages[0],
        structureModel: {
          sections: [{ id: "legacy", type: "legacy.html", order: 0 }],
        },
        contentModel: {
          sectionProps: {
            legacy: {
              htmlSummary: {
                extractedText:
                  "TRANSPORTI MAVER D.O.O. Naše podjetje ima dolgo tradicijo prevozov po Evropi. Trenutno imamo na razpolago 15 avto transporterjev in pokrivamo Nemčijo, Italijo in Francijo. Kontakt: Tel: +386 (0)1 366 38 36 E-mail: transporti.maver@siol.net Dolenjska cesta 328, Lavrica 1291 Škofljica.",
                extractedImageSrcs: ["/uploads/logo.png", "/assets/image/hero.jpg", "/assets/image/fleet.jpg"],
                extractedLinks: [
                  { href: "/kontakt", label: "Kontakt" },
                  { href: "tel:+386(0)13663836", label: "+386 (0)1 366 38 36" },
                  { href: "mailto:transporti.maver@siol.net", label: "transporti.maver@siol.net" },
                ],
              },
            },
          },
        },
      },
    ],
  };

  const out = buildDeterministicArtifactBundle({ siteVersion: legacySiteVersion, renderMode: "PUBLISH" });
  const html = out.htmlByPath["/"] ?? "";
  assert.match(html, /data-gnr8-legacy-summary="visible-v2"/);
  assert.match(html, /<h1[^>]*>TRANSPORTI MAVER D\.O\.O\.<\/h1>/);
  assert.match(html, /<h2[^>]*>About<\/h2>/);
  assert.match(html, /<h2[^>]*>Services<\/h2>/);
  assert.match(html, /<h2[^>]*>Contact<\/h2>/);
  assert.match(html, /<img src="\/assets\/image\/hero\.jpg"/);
  assert.doesNotMatch(html, /<img src="\/uploads\/logo\.png"/);
  assert.match(html, /<a href="mailto:transporti\.maver@siol\.net">transporti\.maver@siol\.net<\/a>/);
  assert.match(html, /data-gnr8-section-props/);
  assert.doesNotMatch(html, /"html"\s*:/);
});

test("artifact-builder skips visible legacy summary wrapper when summary is empty", () => {
  const legacySiteVersion = {
    ...siteVersion,
    pages: [
      {
        ...siteVersion.pages[0],
        structureModel: {
          sections: [{ id: "legacy", type: "legacy.html", order: 0 }],
        },
        contentModel: {
          sectionProps: {
            legacy: {
              htmlSummary: {
                extractedText: "",
                extractedImageSrcs: [],
                extractedLinks: [],
              },
            },
          },
        },
      },
    ],
  };

  const out = buildDeterministicArtifactBundle({ siteVersion: legacySiteVersion, renderMode: "PUBLISH" });
  const html = out.htmlByPath["/"] ?? "";
  assert.doesNotMatch(html, /data-gnr8-legacy-summary="visible-v2"/);
  assert.match(html, /data-gnr8-section-props/);
});
