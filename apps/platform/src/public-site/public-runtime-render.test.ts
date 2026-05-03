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
