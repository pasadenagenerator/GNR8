import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  __setPublicRuntimeRenderDependenciesForTest,
  __setPublicRuntimeUsageDependenciesForTest,
  normalizePublicDomainHost,
  renderPublicPathResponse,
  resolveRequestHost,
  resolvePublicRuntimeMode,
} from "@/src/public-site/public-runtime-render";
import { injectMonoOsmapPublicFallback } from "@/src/public-site/raw-template-runtime";
import { materializeCmsContentSlotsForScopedImport } from "@/gnr8/site/scoped-import-pipeline";
import { planBatchDraftUpserts } from "@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/batch/batch-overrides-route-helpers";
import type { ContentOverride, ContentSlot } from "@/gnr8/runtime/content-binding";

type ResolutionLogPayload = {
  runtimeResolutionMode: string;
  artifactHit: boolean;
  artifactMiss: boolean;
  pathResolved: boolean | null;
  pathUnresolved: boolean | null;
  governanceAllowed: boolean | null;
  governanceDenied: boolean | null;
  builderFallbackUsed: boolean;
  reasonCode: string | null;
  statusCode: number | null;
  outcome: string;
};

async function captureResolutionLog(run: () => Promise<Response>): Promise<{ response: Response; payload: ResolutionLogPayload }> {
  const originalInfo = console.info;
  let payload: ResolutionLogPayload | null = null;

  console.info = (...args: unknown[]) => {
    const message = String(args[0] ?? "");
    const jsonStart = message.indexOf("{");
    if (!message.startsWith("[gnr8.public-runtime.resolution]") || jsonStart < 0) return;
    payload = JSON.parse(message.slice(jsonStart)) as ResolutionLogPayload;
  };

  try {
    const response = await run();
    assert.ok(payload, "expected structured resolution diagnostics log");
    return { response, payload };
  } finally {
    console.info = originalInfo;
  }
}

async function captureConsoleInfo(run: () => Promise<Response>): Promise<{
  response: Response;
  entries: Array<{ message: string; args: unknown[] }>;
}> {
  const originalInfo = console.info;
  const entries: Array<{ message: string; args: unknown[] }> = [];

  console.info = (...args: unknown[]) => {
    entries.push({ message: String(args[0] ?? ""), args });
  };

  try {
    const response = await run();
    return { response, entries };
  } finally {
    console.info = originalInfo;
  }
}

test("public runtime artifact hit: serves artifact HTML with artifact-only diagnostics", async () => {
  const usageCalls: Array<{
    siteId: string;
    requestCount?: number;
    bandwidthBytes?: number;
    computeMs?: number;
    artifactId?: string | null;
  }> = [];
  const restoreUsageDeps = __setPublicRuntimeUsageDependenciesForTest({
    persistRuntimeUsageEvent: async (usage) => {
      usageCalls.push({
        siteId: String(usage.siteId ?? ""),
        requestCount: usage.requestCount,
        bandwidthBytes: usage.bandwidthBytes,
        computeMs: usage.computeMs,
        artifactId: usage.artifactId ?? null,
      });
      return { status: "written" };
    },
  });
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_miss",
        host: "maver.app.pasadenagenerator.com",
        normalizedPath: "/",
        siteId: null,
        siteVersionId: null,
        domain: null,
        bindingId: null,
        status: null,
        reasonCode: "domain_not_found",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () =>
      ({
        outcome: "artifact_hit",
        host: "maver.app.pasadenagenerator.com",
        path: "/",
        normalizedPath: "/",
        siteId: "site_1",
        siteResolution: "host_match",
        hostBindingId: "binding_1",
        hostBindingKind: "canonical",
        hostBindingStatus: "ACTIVE",
        activeSiteVersionId: "sv_1",
        artifactId: "artifact_1",
        artifact: {} as never,
        html: "<!doctype html><html><body><h1>artifact</h1></body></html>",
        resolvedPath: "/",
      }) as never,
  });

  try {
    const { response, payload } = await captureResolutionLog(() =>
      renderPublicPathResponse({ host: "maver.app.pasadenagenerator.com", rawHost: "maver.app.pasadenagenerator.com", path: "/" }),
    );

    assert.equal(response.status, 200);
    assert.match(await response.text(), /artifact/);
    assert.equal(payload.runtimeResolutionMode, "artifact_only");
    assert.equal(payload.artifactHit, true);
    assert.equal(payload.artifactMiss, false);
    assert.equal(payload.pathResolved, true);
    assert.equal(payload.pathUnresolved, false);
    assert.equal(payload.governanceAllowed, true);
    assert.equal(payload.governanceDenied, false);
    assert.equal(payload.builderFallbackUsed, false);
    assert.equal(usageCalls.length, 1);
    assert.equal(usageCalls[0]?.siteId, "site_1");
    assert.equal(usageCalls[0]?.requestCount, 1);
    assert.equal(usageCalls[0]?.artifactId, "artifact_1");
    assert.ok((usageCalls[0]?.bandwidthBytes ?? 0) > 0);
  } finally {
    restoreDeps();
    restoreUsageDeps();
  }
});

test("public runtime domain hit: serves raw template HTML and rewrites /assets URLs", async () => {
  const usageCalls: Array<{ siteId: string; artifactId?: string | null; requestCount?: number }> = [];
  const restoreUsageDeps = __setPublicRuntimeUsageDependenciesForTest({
    persistRuntimeUsageEvent: async (usage) => {
      usageCalls.push({
        siteId: String(usage.siteId ?? ""),
        artifactId: usage.artifactId ?? null,
        requestCount: usage.requestCount,
      });
      return { status: "written" };
    },
  });
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_hit",
        host: "beauty-clinic.example.com",
        siteId: "site_raw_1",
        siteVersionId: "sv_raw_1",
        domain: "beauty-clinic.example.com",
        bindingId: "domain_binding_1",
        status: "active",
        legacyDomainSiteVersionId: "sv_raw_1",
        activePointerSiteVersionId: "sv_raw_1",
        activeArtifactId: "artifact_raw_1",
        diagnostics: [],
        normalizedPath: "/",
        resolvedFilePath: "nested/page.html",
        html: "<!doctype html><html><head><link rel=\"stylesheet\" href=\"/assets/main.css\" /><link rel=\"stylesheet\" href=\"../assets/nested.css\" /><style>.hero{background-image:url('./assets/bg.jpg')}</style></head><body style=\"background-image:url('../assets/body-bg.jpg')\"><img src=\"/assets/hero.jpg\" /><script src=\"./assets/app.js\"></script></body></html>",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () => {
      throw new Error("artifact resolver should not run when raw template domain hit succeeds");
    },
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
  });

  try {
    const response = await renderPublicPathResponse({ host: "beauty-clinic.example.com", path: "/" });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<base href="\/" data-gnr8-runtime="1" \/>/);
    assert.match(html, /\/api\/gnr8\/runtime\/preview-assets\/site_raw_1\/sv_raw_1\/assets\/main\.css/);
    assert.match(html, /\/api\/gnr8\/runtime\/preview-assets\/site_raw_1\/sv_raw_1\/assets\/nested\.css/);
    assert.match(html, /\/api\/gnr8\/runtime\/preview-assets\/site_raw_1\/sv_raw_1\/assets\/hero\.jpg/);
    assert.match(html, /\/api\/gnr8\/runtime\/preview-assets\/site_raw_1\/sv_raw_1\/nested\/assets\/app\.js/);
    assert.match(html, /\/api\/gnr8\/runtime\/preview-assets\/site_raw_1\/sv_raw_1\/nested\/assets\/bg\.jpg/);
    assert.match(html, /\/api\/gnr8\/runtime\/preview-assets\/site_raw_1\/sv_raw_1\/assets\/body-bg\.jpg/);
    assert.deepEqual(usageCalls, [{ siteId: "site_raw_1", artifactId: "artifact_raw_1", requestCount: 1 }]);
  } finally {
    restoreDeps();
    restoreUsageDeps();
  }
});

test("public runtime host match serves raw imported Maver HTML before recovered artifact fallback", async () => {
  const restoreUsageDeps = __setPublicRuntimeUsageDependenciesForTest({
    persistRuntimeUsageEvent: async () => ({ status: "written" }),
  });
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_hit",
        host: "maver.app.pasadenagenerator.com",
        siteId: "site_maver",
        siteVersionId: "sv_maver_active",
        siteResolution: "host_match",
        matchKind: "host_match",
        domain: null,
        bindingId: "host_binding_maver",
        status: "ACTIVE",
        legacyDomainSiteVersionId: null,
        activePointerSiteVersionId: "sv_maver_active",
        activeArtifactId: "artifact_maver_runtime",
        diagnostics: [{ code: "host_match_raw_template_selected" }],
        normalizedPath: "/",
        resolvedFilePath: "index.html",
        html: "<!doctype html><html><head><title>Transporti Maver d.o.o.</title><link rel=\"stylesheet\" href=\"assets/main.css\" /></head><body><h1>Maver raw imported site</h1></body></html>",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () =>
      ({
        outcome: "artifact_hit",
        host: "maver.app.pasadenagenerator.com",
        path: "/",
        normalizedPath: "/",
        siteId: "site_maver",
        siteResolution: "host_match",
        hostBindingId: "host_binding_maver",
        hostBindingKind: "canonical",
        hostBindingStatus: "ACTIVE",
        activeSiteVersionId: "sv_maver_active",
        artifactId: "artifact_maver_runtime",
        artifact: {} as never,
        html: "<!doctype html><html><head><title>Recovered raw-block fallback</title></head><body>poor transformed runtime artifact</body></html>",
        resolvedPath: "/",
      }) as never,
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
  });

  try {
    const response = await renderPublicPathResponse({ host: "maver.app.pasadenagenerator.com", path: "/" });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<title>Transporti Maver d\.o\.o\.<\/title>/);
    assert.match(html, /Maver raw imported site/);
    assert.match(html, /\/api\/gnr8\/runtime\/preview-assets\/site_maver\/sv_maver_active\/assets\/main\.css/);
    assert.ok(!html.includes("poor transformed runtime artifact"));
  } finally {
    restoreDeps();
    restoreUsageDeps();
  }
});

test("Mono osmap public fallback rewrites Maver-style map container to safe OSM link card", () => {
  const source =
    '<!doctype html><html><body><div id="m4482" class="module map osmap" data-url="?m=m4482" data-req-lazy="mapbox-gl,leaflet,osmap"><div class="map-container cookieconsent-optin-marketing" data-address="Dolenjska cesta 328 Lavrica 1291 Slovenia" data-zoom="16"></div></div></body></html>';

  const result = injectMonoOsmapPublicFallback(source);

  assert.match(result.html, /class="map-container gnr8-osmap-fallback"/);
  assert.match(result.html, /data-address="Dolenjska cesta 328 Lavrica 1291 Slovenia"/);
  assert.match(result.html, /https:\/\/www\.openstreetmap\.org\/search\?query=Dolenjska%20cesta%20328%20Lavrica%201291%20Slovenia/);
  assert.match(result.html, /Open in OpenStreetMap/);
  assert.equal(result.html.includes("cookieconsent-optin-marketing"), false);
  assert.deepEqual(
    result.diagnostics.map((diagnostic) => diagnostic.code),
    ["OSMAP_JSON_ENDPOINT_UNAVAILABLE", "OSMAP_PUBLIC_FALLBACK_INJECTED"],
  );
  assert.equal(result.diagnostics[0]?.moduleId, "m4482");
  assert.equal(result.diagnostics[0]?.address, "Dolenjska cesta 328 Lavrica 1291 Slovenia");
  assert.equal(result.diagnostics[0]?.fallbackType, "osm_link_card");
});

test("Mono osmap public fallback leaves non-map HTML unchanged", () => {
  const source = '<!doctype html><html><body><main><h1>No map here</h1><p>Original content.</p></main></body></html>';
  const result = injectMonoOsmapPublicFallback(source);

  assert.equal(result.html, source);
  assert.deepEqual(result.diagnostics, []);
});

test("Mono osmap public fallback skips missing data-address without invalid fallback", () => {
  const source =
    '<!doctype html><html><body><div id="m4482" class="module map osmap"><div class="map-container" data-zoom="16"></div></div></body></html>';
  const result = injectMonoOsmapPublicFallback(source);

  assert.equal(result.html, source);
  assert.doesNotMatch(result.html, /openstreetmap\.org\/search\?query=/);
  assert.deepEqual(result.diagnostics, []);
});

test("Mono osmap public fallback escapes visible address and URL-encodes href safely", () => {
  const source =
    '<!doctype html><html><body><div id="map-danger" class="module map osmap"><div class="map-container" data-address="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt; &amp; Lavrica"></div></div></body></html>';
  const result = injectMonoOsmapPublicFallback(source);

  assert.match(result.html, /data-address="&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; Lavrica"/);
  assert.match(result.html, /%22%3E%3Cscript%3Ealert\(1\)%3C%2Fscript%3E%20%26%20Lavrica/);
  assert.doesNotMatch(result.html, /<script>alert\(1\)<\/script>/);
  assert.equal(result.diagnostics[0]?.moduleId, "map-danger");
});

test("public raw-template rendering injects Mono osmap fallback diagnostics", async () => {
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_hit",
        host: "maver.app.pasadenagenerator.com",
        siteId: "site_maver",
        siteVersionId: "sv_maver_active",
        siteResolution: "host_match",
        matchKind: "host_match",
        domain: null,
        bindingId: "host_binding_maver",
        status: "ACTIVE",
        normalizedPath: "/",
        resolvedFilePath: "index.html",
        html: '<!doctype html><html><body><div id="m4482" class="module map osmap" data-url="?m=m4482" data-req-lazy="mapbox-gl,leaflet,osmap"><div class="map-container cookieconsent-optin-marketing" data-address="Dolenjska cesta 328 Lavrica 1291 Slovenia" data-zoom="16"></div></div></body></html>',
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () => {
      throw new Error("artifact resolver should not run when raw template domain hit succeeds");
    },
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
  });

  try {
    const { response, entries } = await captureConsoleInfo(() =>
      renderPublicPathResponse({ host: "maver.app.pasadenagenerator.com", path: "/" }),
    );
    assert.equal(response.status, 200);
    const html = await response.text();

    assert.match(html, /data-gnr8-osmap-fallback="osm_link_card"/);
    assert.match(html, /Open in OpenStreetMap/);
    assert.match(html, /data-url="\?m=m4482"/);
    assert.equal(
      entries.some(
        (entry) =>
          entry.message.includes("OSMAP_JSON_ENDPOINT_UNAVAILABLE") &&
          JSON.stringify(entry.args).includes("m4482") &&
          JSON.stringify(entry.args).includes("Dolenjska cesta 328 Lavrica 1291 Slovenia") &&
          JSON.stringify(entry.args).includes("osm_link_card"),
      ),
      true,
    );
    assert.equal(
      entries.some((entry) => entry.message.includes("OSMAP_PUBLIC_FALLBACK_INJECTED")),
      true,
    );
  } finally {
    restoreDeps();
  }
});

test("public runtime domain hit: applies published content overrides and ignores draft status", async () => {
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_hit",
        host: "override.example.com",
        siteId: "site_override_1",
        siteVersionId: "sv_override_1",
        domain: "override.example.com",
        bindingId: "domain_binding_override_1",
        status: "active",
        normalizedPath: "/",
        resolvedFilePath: "index.html",
        html: "<!doctype html><html><body><h1>Old title</h1></body></html>",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () => {
      throw new Error("artifact resolver should not run when raw template domain hit succeeds");
    },
    listContentSlots: async () =>
      [
        {
          id: "slot-1",
          siteId: "site_override_1",
          siteVersionId: "sv_override_1",
          slotKey: "hero.title",
          slotType: "text",
          sourceSelector: "html > body:nth-of-type(1) > h1:nth-of-type(1)",
          sourceText: "Old title",
          sourceAssetPath: null,
          confidence: 1,
          diagnostics: null,
        },
      ] as never,
    listContentOverrides: async () =>
      [
        {
          id: "override-1",
          siteId: "site_override_1",
          siteVersionId: "sv_override_1",
          slotKey: "hero.title",
          valueType: "text",
          valueJson: { value: "Published title" },
          status: "published",
        },
      ] as never,
  });

  try {
    const response = await renderPublicPathResponse({ host: "override.example.com", path: "/" });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Published title/);
    assert.ok(!html.includes("Old title"));
  } finally {
    restoreDeps();
  }
});

test("migration MVP readiness: imported raw template renders published CMS override on active domain without artifact fallback", async () => {
  const siteId = "site_migration_mvp";
  const siteVersionId = "11111111-1111-4111-8111-111111111111";
  const domain = "migration-mvp.example.com";
  const rawImportedHtml =
    '<!doctype html><html><head><title>Migration MVP</title></head><body><main data-render-source="raw-imported-template"><section><h1>Imported Hero Title</h1><p>Imported raw template body remains here.</p></section></main></body></html>';
  const artifactFallbackHtml =
    '<!doctype html><html><body><main data-render-source="artifact-only-fallback"><h1>Artifact Fallback Hero</h1><p>ARTIFACT_FALLBACK_SHOULD_NOT_RENDER</p></main></body></html>';

  const persistedSlots: ContentSlot[] = [];
  const materialized = await materializeCmsContentSlotsForScopedImport({
    siteId,
    siteVersionId,
    html: rawImportedHtml,
    semanticImport: {
      sourceMode: "raw_html_only",
      captureMode: "raw_html_only",
      title: "Migration MVP",
      language: "en",
      navigation: [],
      hero: {
        title: "Imported Hero Title",
        subtitle: null,
        cta: null,
        image: null,
        confidence: 0.9,
        diagnostics: [],
      },
      sections: [],
      assets: {
        images: [],
        groupedByRole: {
          logo: [],
          hero_image: [],
          gallery_image: [],
          service_image: [],
          testimonial_avatar: [],
          content_image: [],
          icon: [],
          unknown: [],
        },
        knownAssets: [],
      },
      diagnostics: [],
    } as never,
    persistContentSlots: async (input) => {
      persistedSlots.splice(
        0,
        persistedSlots.length,
        ...input.slots.map((slot, index) => ({
          id: `slot-${index + 1}`,
          ...slot,
        })),
      );
      return input.slots.length;
    },
  });
  const titleSlot = persistedSlots.find((slot) => slot.slotKey === "hero.title");
  assert.ok(titleSlot, "expected raw import to materialize editable hero title slot");

  const draftPlan = planBatchDraftUpserts({
    slots: persistedSlots.map((slot) => ({ slotKey: slot.slotKey, slotType: slot.slotType })),
    overrides: [{ slotKey: "hero.title", status: "draft", value: "Published Migration MVP Hero" }],
  });
  assert.equal(draftPlan.valid.length, 1);

  const draftOverrides = new Map<string, ContentOverride>();
  const publishedOverrides = new Map<string, ContentOverride>();
  const saveDraft = (override: { slotKey: string; valueType: ContentOverride["valueType"]; valueJson: unknown }) => {
    draftOverrides.set(override.slotKey, {
      id: `draft-${override.slotKey}`,
      siteId,
      siteVersionId,
      slotKey: override.slotKey,
      valueType: override.valueType,
      valueJson: override.valueJson,
      status: "draft",
    });
  };
  const publishDrafts = () => {
    for (const override of draftOverrides.values()) {
      publishedOverrides.set(override.slotKey, {
        ...override,
        id: `published-${override.slotKey}`,
        status: "published",
      });
    }
  };

  saveDraft(draftPlan.valid[0]!);
  publishDrafts();
  saveDraft({
    slotKey: "hero.title",
    valueType: "text",
    valueJson: { value: "Draft Migration MVP Hero" },
  });

  const activeSite = {
    versionState: "PUBLISHED",
    activeSiteVersionId: siteVersionId,
    activeArtifactId: "artifact_fallback_mvp",
    domainBindingStatus: "active",
    rawTemplateArtifactType: "raw_imported_site",
  };
  let artifactFallbackCalls = 0;
  const overrideListCalls: Array<{ siteVersionId: string; status: string }> = [];
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async (input) => {
      assert.equal(input.host, domain);
      assert.equal(input.path, "/");
      assert.equal(activeSite.versionState, "PUBLISHED");
      assert.equal(activeSite.activeSiteVersionId, siteVersionId);
      assert.equal(activeSite.domainBindingStatus, "active");
      assert.equal(activeSite.rawTemplateArtifactType, "raw_imported_site");
      return {
        outcome: "raw_template_hit",
        host: domain,
        siteId,
        siteVersionId,
        domain,
        bindingId: "domain_binding_migration_mvp",
        status: "active",
        normalizedPath: "/",
        resolvedFilePath: "index.html",
        html: rawImportedHtml,
      } as never;
    },
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () => {
      artifactFallbackCalls += 1;
      return {
        outcome: "artifact_hit",
        host: domain,
        path: "/",
        normalizedPath: "/",
        siteId,
        siteResolution: "host_match",
        hostBindingId: "domain_binding_migration_mvp",
        hostBindingKind: "canonical",
        hostBindingStatus: "ACTIVE",
        activeSiteVersionId: siteVersionId,
        artifactId: activeSite.activeArtifactId,
        artifact: {} as never,
        html: artifactFallbackHtml,
        resolvedPath: "/",
      } as never;
    },
    listContentSlots: async (requestedSiteVersionId) => {
      assert.equal(requestedSiteVersionId, siteVersionId);
      return persistedSlots as never;
    },
    listContentOverrides: async ({ siteVersionId: requestedSiteVersionId, status }) => {
      overrideListCalls.push({ siteVersionId: requestedSiteVersionId, status: String(status ?? "") });
      assert.equal(requestedSiteVersionId, siteVersionId);
      assert.equal(status, "published");
      return [...publishedOverrides.values()] as never;
    },
  });

  try {
    const { response, entries } = await captureConsoleInfo(() => renderPublicPathResponse({ host: domain, path: "/" }));
    assert.equal(response.status, 200);
    const html = await response.text();

    assert.match(html, /Published Migration MVP Hero/);
    assert.doesNotMatch(html, /Draft Migration MVP Hero/);
    assert.match(html, /data-render-source="raw-imported-template"/);
    assert.doesNotMatch(html, /ARTIFACT_FALLBACK_SHOULD_NOT_RENDER/);
    assert.doesNotMatch(html, /data-render-source="artifact-only-fallback"/);
    assert.equal(artifactFallbackCalls, 0);
    assert.deepEqual(overrideListCalls, [{ siteVersionId, status: "published" }]);
    assert.equal(materialized.persistedSlotCount, materialized.inferredSlotCount);
    assert.ok(materialized.diagnostics.includes("CMS_SLOT_PERSISTENCE_COMPLETED"));
    assert.equal(
      entries.some((entry) => entry.message.includes("PUBLIC_DOMAIN_RAW_TEMPLATE_SELECTED")),
      true,
    );
    assert.equal(
      entries.some(
        (entry) =>
          entry.message.includes("[gnr8.public-runtime.resolution]") ||
          entry.message.includes("PUBLIC_ARTIFACT_FALLBACK_SELECTED"),
      ),
      false,
    );
  } finally {
    restoreDeps();
  }
});

test("public runtime domain hit: supports nested paths when raw template page exists", async () => {
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async (input) =>
      ({
        outcome: "raw_template_hit",
        host: String(input.host ?? ""),
        siteId: "site_raw_2",
        siteVersionId: "sv_raw_2",
        domain: "spa.example.com",
        bindingId: "domain_binding_2",
        status: "active",
        normalizedPath: "/nested/path",
        resolvedFilePath: "nested/path/index.html",
        html: "<!doctype html><html><body><h1>Nested Path</h1></body></html>",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () => {
      throw new Error("artifact resolver should not run when nested raw template page is resolved");
    },
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
  });

  try {
    const response = await renderPublicPathResponse({ host: "spa.example.com", path: "/nested/path" });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Nested Path/);
  } finally {
    restoreDeps();
  }
});

test("public runtime debug mode: appends custom-domain runtime panel on raw-template hit", async () => {
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_hit",
        host: "debug.example.com",
        siteId: "site_debug_1",
        siteVersionId: "sv_debug_1",
        domain: "debug.example.com",
        bindingId: "domain_binding_debug_1",
        status: "active",
        normalizedPath: "/",
        resolvedFilePath: "index.html",
        html: "<!doctype html><html><body><h1>Debug Site</h1></body></html>",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () => {
      throw new Error("artifact resolver should not run when raw template domain hit succeeds");
    },
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
  });

  try {
    const response = await renderPublicPathResponse({ host: "debug.example.com", path: "/", debugMode: true });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /data-gnr8-runtime-debug="1"/);
    assert.match(html, /siteId: site_debug_1/);
    assert.match(html, /versionId: sv_debug_1/);
    assert.match(html, /binding: active/);
  } finally {
    restoreDeps();
  }
});

test("public runtime artifact miss: returns deterministic 404 without builder fallback", async () => {
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_miss",
        host: "maver.app.pasadenagenerator.com",
        normalizedPath: "/missing",
        siteId: null,
        siteVersionId: null,
        domain: null,
        bindingId: null,
        status: null,
        reasonCode: "domain_not_found",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () =>
      ({
        outcome: "artifact_miss",
        host: "maver.app.pasadenagenerator.com",
        path: "/missing",
        normalizedPath: "/missing",
        siteId: "site_1",
        siteResolution: "host_match",
        hostBindingId: "binding_1",
        hostBindingKind: "canonical",
        hostBindingStatus: "ACTIVE",
        activeSiteVersionId: "sv_1",
        artifactId: "artifact_1",
        reasonCode: "artifact_path_missing",
      }) as never,
  });

  try {
    const { response, payload } = await captureResolutionLog(() =>
      renderPublicPathResponse({ host: "maver.app.pasadenagenerator.com", rawHost: "maver.app.pasadenagenerator.com", path: "/missing" }),
    );

    assert.equal(response.status, 404);
    assert.equal(payload.runtimeResolutionMode, "artifact_only");
    assert.equal(payload.artifactHit, false);
    assert.equal(payload.artifactMiss, true);
    assert.equal(payload.pathResolved, false);
    assert.equal(payload.pathUnresolved, true);
    assert.equal(payload.builderFallbackUsed, false);
    assert.equal(payload.reasonCode, "artifact_path_missing");
    assert.equal(payload.statusCode, 404);
  } finally {
    restoreDeps();
  }
});

test("public runtime governance deny: returns deterministic 403 without builder fallback", async () => {
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_miss",
        host: "canary.app.pasadenagenerator.com",
        normalizedPath: "/",
        siteId: null,
        siteVersionId: null,
        domain: null,
        bindingId: null,
        status: null,
        reasonCode: "domain_not_found",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () =>
      ({
        outcome: "artifact_miss",
        host: "canary.app.pasadenagenerator.com",
        path: "/",
        normalizedPath: "/",
        siteId: "site_2",
        siteResolution: "host_match",
        hostBindingId: "binding_2",
        hostBindingKind: "canary",
        hostBindingStatus: "ACTIVE",
        activeSiteVersionId: "sv_2",
        artifactId: "artifact_2",
        reasonCode: "artifact_stage_denied",
      }) as never,
  });

  try {
    const { response, payload } = await captureResolutionLog(() =>
      renderPublicPathResponse({ host: "canary.app.pasadenagenerator.com", rawHost: "canary.app.pasadenagenerator.com", path: "/" }),
    );

    assert.equal(response.status, 403);
    assert.equal(payload.governanceAllowed, false);
    assert.equal(payload.governanceDenied, true);
    assert.equal(payload.builderFallbackUsed, false);
    assert.equal(payload.reasonCode, "artifact_stage_denied");
    assert.equal(payload.statusCode, 403);
  } finally {
    restoreDeps();
  }
});

test("public runtime unbound host at root: blocks fallback-latest-site leak and serves app shell fallback", async () => {
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_miss",
        host: "unbound.example.com",
        normalizedPath: "/",
        siteId: null,
        siteVersionId: null,
        domain: null,
        bindingId: null,
        status: null,
        reasonCode: "domain_not_found",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () =>
      ({
        outcome: "artifact_hit",
        host: "unbound.example.com",
        path: "/",
        normalizedPath: "/",
        siteId: "fallback_site",
        siteResolution: "fallback_latest_site",
        hostBindingId: null,
        hostBindingKind: null,
        hostBindingStatus: null,
        activeSiteVersionId: "sv_fallback",
        artifactId: "artifact_fallback",
        artifact: {} as never,
        html: "<!doctype html><html><body>should_not_leak</body></html>",
        resolvedPath: "/",
      }) as never,
  });

  try {
    const response = await renderPublicPathResponse({ host: "unbound.example.com", path: "/" });

    assert.equal(response.status, 200);
    assert.match(await response.text(), /WEB AGENCY OS/);
  } finally {
    restoreDeps();
  }
});

test("public runtime pending custom-domain binding: does not serve fallback latest-site artifact at root", async () => {
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_miss",
        host: "pending.beauty-clinic.pasadenagenerator.com",
        normalizedPath: "/",
        siteId: null,
        siteVersionId: null,
        domain: null,
        bindingId: null,
        status: null,
        reasonCode: "domain_not_found",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () =>
      ({
        outcome: "artifact_hit",
        host: "pending.beauty-clinic.pasadenagenerator.com",
        path: "/",
        normalizedPath: "/",
        siteId: "fallback_site",
        siteResolution: "fallback_latest_site",
        hostBindingId: null,
        hostBindingKind: null,
        hostBindingStatus: null,
        activeSiteVersionId: "sv_fallback",
        artifactId: "artifact_fallback",
        artifact: {} as never,
        html: "<!doctype html><html><body>should_not_leak_pending</body></html>",
        resolvedPath: "/",
      }) as never,
  });

  try {
    const response = await renderPublicPathResponse({ host: "pending.beauty-clinic.pasadenagenerator.com", path: "/" });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /WEB AGENCY OS/);
    assert.doesNotMatch(html, /should_not_leak_pending/);
  } finally {
    restoreDeps();
  }
});

test("public runtime wrong domain: nested path falls back safely to deterministic 404", async () => {
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_miss",
        host: "wrong.example.com",
        normalizedPath: "/",
        siteId: null,
        siteVersionId: null,
        domain: null,
        bindingId: null,
        status: null,
        reasonCode: "domain_not_found",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () =>
      ({
        outcome: "artifact_miss",
        host: "wrong.example.com",
        path: "/nested/path",
        normalizedPath: "/nested/path",
        siteId: null,
        siteResolution: "none",
        hostBindingId: null,
        hostBindingKind: null,
        hostBindingStatus: null,
        activeSiteVersionId: null,
        artifactId: null,
        reasonCode: "no_runtime_site",
      }) as never,
  });

  try {
    const response = await renderPublicPathResponse({ host: "wrong.example.com", path: "/nested/path" });
    assert.equal(response.status, 404);
    assert.match(await response.text(), /could not be found/i);
  } finally {
    restoreDeps();
  }
});

test("public runtime root on platform host without active domain binding: returns app shell fallback", async () => {
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_miss",
        host: "app.pasadenagenerator.com",
        normalizedPath: "/",
        siteId: null,
        siteVersionId: null,
        domain: null,
        bindingId: null,
        status: null,
        reasonCode: "domain_not_found",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () =>
      ({
        outcome: "artifact_miss",
        host: "app.pasadenagenerator.com",
        path: "/",
        normalizedPath: "/",
        siteId: null,
        siteResolution: "none",
        hostBindingId: null,
        hostBindingKind: null,
        hostBindingStatus: null,
        activeSiteVersionId: null,
        artifactId: null,
        reasonCode: "no_runtime_site",
      }) as never,
  });

  try {
    const response = await renderPublicPathResponse({ host: "app.pasadenagenerator.com", path: "/" });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /WEB AGENCY OS/);
  } finally {
    restoreDeps();
  }
});

test("host normalization lowercases and strips protocol/port/trailing slash", () => {
  assert.equal(normalizePublicDomainHost("HTTPS://Beauty-Clinic.PasadenaGenerator.com:443/"), "beauty-clinic.pasadenagenerator.com");
  assert.equal(normalizePublicDomainHost("beauty-clinic.pasadenagenerator.com:3000"), "beauty-clinic.pasadenagenerator.com");
  assert.equal(normalizePublicDomainHost(""), "");
});

test("request host extraction prefers x-forwarded-host and keeps first host before normalization", () => {
  const host = resolveRequestHost({
    get(name: string): string | null {
      if (name === "x-forwarded-host") return "Beauty-Clinic.PasadenaGenerator.com:443, proxy.internal";
      if (name === "host") return "ignored.example.com";
      return null;
    },
  });
  assert.equal(host, "Beauty-Clinic.PasadenaGenerator.com:443");
  assert.equal(normalizePublicDomainHost(host), "beauty-clinic.pasadenagenerator.com");
});

test("public runtime regression guard: no builder-page fallback usage remains in serving path", async () => {
  const source = await readFile("src/public-site/public-runtime-render.tsx", "utf8");
  assert.doesNotMatch(source, /artifact-with-builder-fallback/);
  assert.doesNotMatch(source, /fallback_latest_builder_page/);
  assert.doesNotMatch(source, /public\.builder_pages/);
  assert.doesNotMatch(source, /@\/src\/public-site\/public-pages/);
});

test("public runtime mode defaults to artifact-only, even in production env", () => {
  const previousMode = process.env.GNR8_PUBLIC_RUNTIME_MODE;
  const previousVercelEnv = process.env.VERCEL_ENV;

  try {
    delete process.env.GNR8_PUBLIC_RUNTIME_MODE;
    process.env.VERCEL_ENV = "production";
    assert.equal(resolvePublicRuntimeMode(), "artifact-only");
  } finally {
    if (previousMode === undefined) delete process.env.GNR8_PUBLIC_RUNTIME_MODE;
    else process.env.GNR8_PUBLIC_RUNTIME_MODE = previousMode;
    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercelEnv;
  }
});

test("public runtime domain hit: uses published overrides only (never draft)", async () => {
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_hit",
        host: "published-only.example.com",
        siteId: "site_pub_1",
        siteVersionId: "sv_pub_1",
        domain: "published-only.example.com",
        bindingId: "domain_binding_pub_1",
        status: "active",
        normalizedPath: "/",
        resolvedFilePath: "index.html",
        html: "<!doctype html><html><body><h2>Services</h2><p>Old content</p></body></html>",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () => {
      throw new Error("artifact resolver should not run when raw template domain hit succeeds")
    },
    listContentSlots: async () => [
      {
        id: "slot_1",
        siteId: "site_pub_1",
        siteVersionId: "sv_pub_1",
        slotKey: "sections.0.intro",
        slotType: "text",
        sourceSelector: "html > body:nth-of-type(1) > p:nth-of-type(1)",
        sourceText: "Old content",
        sourceAssetPath: null,
        confidence: 1,
        diagnostics: null,
      },
    ],
    listContentOverrides: async ({ status }) =>
      status === "published"
        ? [
            {
              id: "ov_pub_1",
              siteId: "site_pub_1",
              siteVersionId: "sv_pub_1",
              slotKey: "sections.0.intro",
              valueType: "text",
              valueJson: { value: "Published content" },
              status: "published",
            },
          ]
        : [
            {
              id: "ov_draft_1",
              siteId: "site_pub_1",
              siteVersionId: "sv_pub_1",
              slotKey: "sections.0.intro",
              valueType: "text",
              valueJson: { value: "Draft content" },
              status: "draft",
            },
          ],
  })

  try {
    const response = await renderPublicPathResponse({ host: "published-only.example.com", path: "/" })
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.match(html, /Published content/)
    assert.doesNotMatch(html, /Draft content/)
  } finally {
    restoreDeps()
  }
})

test("public runtime version isolation: overrides for v1 never leak into v2 render", async () => {
  const calls: string[] = []
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_hit",
        host: "versioned.example.com",
        siteId: "site_pub_2",
        siteVersionId: "sv_v2",
        domain: "versioned.example.com",
        bindingId: "domain_binding_pub_2",
        status: "active",
        normalizedPath: "/",
        resolvedFilePath: "index.html",
        html: "<!doctype html><html><body><p>Original text</p></body></html>",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () => {
      throw new Error("artifact resolver should not run when raw template domain hit succeeds")
    },
    listContentSlots: async () => [
      {
        id: "slot_v2",
        siteId: "site_pub_2",
        siteVersionId: "sv_v2",
        slotKey: "sections.0.intro",
        slotType: "text",
        sourceSelector: "html > body:nth-of-type(1) > p:nth-of-type(1)",
        sourceText: "Original text",
        sourceAssetPath: null,
        confidence: 1,
        diagnostics: null,
      },
    ],
    listContentOverrides: async ({ siteVersionId, status }) => {
      calls.push(`${siteVersionId}:${status}`)
      return [
        {
          id: "ov_v2",
          siteId: "site_pub_2",
          siteVersionId,
          slotKey: "sections.0.intro",
          valueType: "text",
          valueJson: { value: siteVersionId === "sv_v2" ? "V2 content only" : "V1 leaked content" },
          status: "published",
        },
      ]
    },
  })

  try {
    const response = await renderPublicPathResponse({ host: "versioned.example.com", path: "/" })
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.match(html, /V2 content only/)
    assert.doesNotMatch(html, /V1 leaked content/)
    assert.equal(calls.includes("sv_v2:published"), true)
  } finally {
    restoreDeps()
  }
})

test("uploads variant path falls back to original upload path when direct variant is missing", async () => {
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  const loggedEvents: string[] = [];
  const requestedUrls: string[] = [];

  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRuntimeSiteForHost: async () =>
      ({
        outcome: "site_hit",
        siteId: "site_1",
        sourceUrl: "https://source.example.com/",
      }) as never,
  });

  console.info = (...args: unknown[]) => {
    const message = String(args[0] ?? "");
    if (message.startsWith("[gnr8.public-runtime.domain]")) {
      loggedEvents.push(message);
    }
  };

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url.endsWith("/uploads/VmPFXCum/236x0_247x0/image.png")) return new Response(null, { status: 404 });
    if (url.endsWith("/uploads/VmPFXCum/image.png")) {
      return new Response("ok-image", {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    }
    return new Response(null, { status: 404 });
  }) as typeof fetch;

  try {
    const response = await renderPublicPathResponse({ host: "maver.app.pasadenagenerator.com", path: "/uploads/VmPFXCum/236x0_247x0/image.png" });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ok-image");
    assert.equal(requestedUrls.some((url) => url.endsWith("/uploads/VmPFXCum/236x0_247x0/image.png")), true);
    assert.equal(requestedUrls.some((url) => url.endsWith("/uploads/VmPFXCum/image.png")), true);
    assert.equal(loggedEvents.some((entry) => entry.includes("CONTENT_ASSET_VARIANT_FALLBACK_USED")), true);
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
    restoreDeps();
  }
});

test("uploads variant path logs variant not found when both direct and fallback are missing", async () => {
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  const loggedEvents: string[] = [];

  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveRuntimeSiteForHost: async () =>
      ({
        outcome: "site_hit",
        siteId: "site_1",
        sourceUrl: "https://source.example.com/",
      }) as never,
  });

  console.info = (...args: unknown[]) => {
    const message = String(args[0] ?? "");
    if (message.startsWith("[gnr8.public-runtime.domain]")) {
      loggedEvents.push(message);
    }
  };

  globalThis.fetch = (async () => new Response(null, { status: 404 })) as typeof fetch;

  try {
    const response = await renderPublicPathResponse({ host: "maver.app.pasadenagenerator.com", path: "/uploads/VmPFXCum/767x0_2560x0/image.png" });
    assert.equal(response.status, 404);
    assert.equal(loggedEvents.some((entry) => entry.includes("CONTENT_ASSET_VARIANT_NOT_FOUND")), true);
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
    restoreDeps();
  }
});
