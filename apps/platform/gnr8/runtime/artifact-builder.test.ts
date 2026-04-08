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

test("artifact-builder renders visible faq.basic fallback plus section payload script", () => {
  const faqSiteVersion = {
    ...siteVersion,
    pages: [
      {
        ...siteVersion.pages[0],
        structureModel: {
          sections: [{ id: "faq", type: "faq.basic", order: 0 }],
        },
        contentModel: {
          sectionProps: {
            faq: {
              title: "Frequently Asked Questions",
              items: [
                { question: "How fast is setup?", answer: "Most setups are completed in one business day." },
                { question: "Do you support imports?", answer: "Yes, imported content is supported in preview fallback." },
              ],
            },
          },
        },
      },
    ],
  };

  const out = buildDeterministicArtifactBundle({ siteVersion: faqSiteVersion, renderMode: "PREVIEW" });
  const html = out.htmlByPath["/"] ?? "";
  assert.match(html, /data-gnr8-fallback-section-type="faq\.basic"/);
  assert.match(html, /Frequently Asked Questions/);
  assert.match(html, /How fast is setup\?/);
  assert.match(html, /Most setups are completed in one business day\./);
  assert.match(html, /data-gnr8-section-props/);
});

test("artifact-builder renders visible navbar.basic links fallback", () => {
  const navbarSiteVersion = {
    ...siteVersion,
    pages: [
      {
        ...siteVersion.pages[0],
        structureModel: {
          sections: [{ id: "nav", type: "navbar.basic", order: 0 }],
        },
        contentModel: {
          sectionProps: {
            nav: {
              title: "Main Navigation",
              links: [
                { href: "/about", label: "About" },
                { href: "/contact", label: "Contact" },
              ],
            },
          },
        },
      },
    ],
  };

  const out = buildDeterministicArtifactBundle({ siteVersion: navbarSiteVersion, renderMode: "PREVIEW" });
  const html = out.htmlByPath["/"] ?? "";
  assert.match(html, /data-gnr8-fallback-section-type="navbar\.basic"/);
  assert.match(html, /fallback-navbar/);
  assert.match(html, /href="\/about"/);
  assert.match(html, /href="\/contact"/);
});

test("artifact-builder renders non-empty generic fallback for unknown section types", () => {
  const unknownSiteVersion = {
    ...siteVersion,
    pages: [
      {
        ...siteVersion.pages[0],
        structureModel: {
          sections: [{ id: "unknown", type: "promo.experimental", order: 0 }],
        },
        contentModel: {
          sectionProps: {
            unknown: {
              title: "Experimental Promo",
              summary: "This section has no dedicated renderer yet.",
              action: { href: "/try", label: "Try now" },
            },
          },
        },
      },
    ],
  };

  const out = buildDeterministicArtifactBundle({ siteVersion: unknownSiteVersion, renderMode: "PREVIEW" });
  const html = out.htmlByPath["/"] ?? "";
  assert.match(html, /data-gnr8-fallback-section-type="promo\.experimental"/);
  assert.match(html, /Experimental Promo/);
  assert.match(html, /This section has no dedicated renderer yet\./);
  assert.match(html, /href="\/try"/);
});

test("artifact-builder renders placeholder fallback for weak/empty section props", () => {
  const emptySiteVersion = {
    ...siteVersion,
    pages: [
      {
        ...siteVersion.pages[0],
        structureModel: {
          sections: [{ id: "empty", type: "content.basic", order: 0 }],
        },
        contentModel: {
          sectionProps: {
            empty: {},
          },
        },
      },
    ],
  };

  const out = buildDeterministicArtifactBundle({ siteVersion: emptySiteVersion, renderMode: "PREVIEW" });
  const html = out.htmlByPath["/"] ?? "";
  assert.match(html, /data-gnr8-fallback-section-type="content\.basic"/);
  assert.match(html, /No text paragraphs extracted for this section\./);
  assert.match(html, /Diagnostics:/);
  assert.match(html, /data-gnr8-section-props/);
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
  assert.match(html, /<h2[^>]*>O Podjetju<\/h2>/);
  assert.match(html, /<h2[^>]*>Storitve<\/h2>/);
  assert.match(html, /<h2[^>]*>Kontakt<\/h2>/);
  assert.match(html, /<img src="\/assets\/image\/hero\.jpg"/);
  assert.doesNotMatch(html, /<img src="\/uploads\/logo\.png"/);
  assert.match(html, /transporti\.maver@siol\.net/);
  assert.match(html, /data-gnr8-section-props/);
  assert.match(html, /class="gnr8-card"/);
  assert.match(html, /class="gnr8-grid"/);
  assert.doesNotMatch(html, /"html"\s*:/);
});

test("artifact-builder prefers reachable uploads variants over paired shadow asset aliases", () => {
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
                  "TRANSPORTI MAVER D.O.O. Naše podjetje ima dolgo tradicijo prevozov po Evropi. Kontakt: Tel: +386 (0)1 366 38 36.",
                extractedImageSrcs: [
                  "/uploads/7xhKQCOl/359x359_262x262/IMG-bad76e2941b335a088af8711f800f90b-V1.jpg",
                  "/assets/image/908ec33b5e4f-img-bad76e2941b335a088af8711f800f90b-v1.jpg",
                  "/uploads/Qi761Jwt/359x359_262x262/IMG-afb691cd5a7fb7d96843132462218cfa-V.jpg",
                  "/assets/image/e228ccd461f1-img-afb691cd5a7fb7d96843132462218cfa-v.jpg",
                ],
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
  assert.match(html, /<img src="\/uploads\/7xhKQCOl\/359x359_262x262\/IMG-bad76e2941b335a088af8711f800f90b-V1\.jpg"/);
  assert.match(html, /<img src="\/uploads\/Qi761Jwt\/359x359_262x262\/IMG-afb691cd5a7fb7d96843132462218cfa-V\.jpg"/);
  assert.doesNotMatch(html, /<img src="\/assets\/image\/908ec33b5e4f-img-bad76e2941b335a088af8711f800f90b-v1\.jpg"/);
  assert.doesNotMatch(html, /<img src="\/assets\/image\/e228ccd461f1-img-afb691cd5a7fb7d96843132462218cfa-v\.jpg"/);
});

test("artifact-builder dedupes paired image variants with suffix drift and keeps only one canonical candidate", () => {
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
                extractedText: "Transporti Maver prevozi po Evropi od leta 1982.",
                extractedImageSrcs: [
                  "/assets/image/f5980028633a-img-a81226fb846b379c1fc1888535e365f5-v_380.jpg",
                  "/uploads/zW6mwK78/359x359_262x262/IMG-a81226fb846b379c1fc1888535e365f5-V_380.jpg",
                  "/uploads/MSU7H5mJ/359x359_262x262/IMG-5cacfc9f514f39ac71a52dce724e730a-V.jpg",
                ],
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
  const renderedImages = [...html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1] ?? "");
  const pairedImageCount = renderedImages.filter((src) => src.includes("a81226fb846b379c1fc1888535e365f5")).length;
  assert.equal(pairedImageCount, 1);
  assert.match(html, /<img src="\/uploads\/zW6mwK78\/359x359_262x262\/IMG-a81226fb846b379c1fc1888535e365f5-V_380\.jpg"/);
  assert.doesNotMatch(html, /<img src="\/assets\/image\/f5980028633a-img-a81226fb846b379c1fc1888535e365f5-v_380\.jpg"/);
});

test("artifact-builder suppresses nav/contact noise in about and services blocks", () => {
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
                  "Home O nas Galerija Kontakt Legal TRANSPORTI MAVER D.O.O. Naše podjetje ima dolgo tradicijo saj se ukvarja s prevozi že od leta 1982. Trenutno imamo na razpolago 15 avto transporterjev in pokrivamo destinacije po vsej Evropi. Kontakt: Tel: +386 (0)1 366 38 36 E-mail: info@transportimaver.si.",
                extractedImageSrcs: ["/uploads/hero.jpg"],
                extractedLinks: [
                  { href: "#oneclickaboutus", label: "O nas" },
                  { href: "#oneclickgallery", label: "Galerija" },
                  { href: "tel:+386(0)13663836", label: "+386 (0)1 366 38 36" },
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
  const visibleBlock = html.split("<script type=\"application/json\" data-gnr8-section-props>")[0] ?? html;
  assert.doesNotMatch(visibleBlock, /Home O nas Galerija Kontakt Legal/);
  assert.doesNotMatch(visibleBlock, /<h1[^>]*>Kontakt Legal TRANSPORTI MAVER D\.O\.O\.<\/h1>/);
  assert.match(html, /Naše podjetje ima dolgo tradicijo saj se ukvarja s prevozi že od leta 1982\./);
  assert.match(html, /Trenutno imamo na razpolago 15 avto transporterjev/);
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

test("artifact-builder demotes legal-prefixed hero noise and cleans contact duplicates/noisy links", () => {
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
                  "+386 (0)1 366 38 36 transporti.maver@siol.net Home O nas Galerija Kontakt Legal TRANSPORTI MAVER D.O.O. Naše podjetje ima dolgo tradicijo prevozov po Evropi. Dolenjska cesta 328, Lavrica, Škofljica 1291. Kontakt: Tel: +386 (0)1 366 38 36 E-mail: transporti.maver@siol.net.",
                extractedImageSrcs: ["/uploads/hero.jpg"],
                extractedLinks: [
                  { href: "#oneclickcontact", label: "Kontakt" },
                  { href: "/assets/image/f5980028633a-img-a81226fb846b379c1fc1888535e365f5-v_380.jpg", label: "+386 (0)1 366 38 36" },
                  { href: "tel:+386(0)13663836", label: "+386 (0)1 366 38 36" },
                  { href: "mailto:transporti.maver@siol.net", label: "transporti.maver@siol.net" },
                  { href: "https://www.google.com/maps/dir//Dolenjska+cesta+328,Lavrica", label: "Pridobite navodila" },
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
  const visibleBlock = html.split("<script type=\"application/json\" data-gnr8-section-props>")[0] ?? html;

  assert.match(visibleBlock, /<h1[^>]*>TRANSPORTI MAVER D\.O\.O\.<\/h1>/);
  assert.doesNotMatch(visibleBlock, /<h1[^>]*>Legal TRANSPORTI MAVER D\.O\.O\.<\/h1>/);
  assert.doesNotMatch(visibleBlock, /href="#oneclickcontact"/);
  assert.doesNotMatch(visibleBlock, /\/assets\/image\/f5980028633a-img-a81226fb846b379c1fc1888535e365f5-v_380\.jpg/);

  const phoneOccurrences = (visibleBlock.match(/\+386 \(0\)1 366 38 36/g) ?? []).length;
  const emailOccurrences = (visibleBlock.match(/transporti\.maver@siol\.net/g) ?? []).length;
  assert.equal(phoneOccurrences, 1);
  assert.equal(emailOccurrences, 1);
  assert.match(visibleBlock, /Pridobite navodila/);
});
