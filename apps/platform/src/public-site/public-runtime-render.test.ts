import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  __setPublicRuntimeRenderDependenciesForTest,
  renderPublicPathResponse,
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
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
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
      renderPublicPathResponse({ host: "maver.app.pasadenagenerator.com", path: "/" }),
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
  } finally {
    restoreDeps();
  }
});

test("public runtime artifact miss: returns deterministic 404 without builder fallback", async () => {
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
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
      renderPublicPathResponse({ host: "maver.app.pasadenagenerator.com", path: "/missing" }),
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
      renderPublicPathResponse({ host: "canary.app.pasadenagenerator.com", path: "/" }),
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

test("public runtime unbound host: returns deterministic artifact-only 404", async () => {
  const restoreDeps = __setPublicRuntimeRenderDependenciesForTest({
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () =>
      ({
        outcome: "artifact_miss",
        host: "unbound.example.com",
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
    const { response, payload } = await captureResolutionLog(() =>
      renderPublicPathResponse({ host: "unbound.example.com", path: "/" }),
    );

    assert.equal(response.status, 404);
    assert.equal(payload.runtimeResolutionMode, "artifact_only");
    assert.equal(payload.builderFallbackUsed, false);
    assert.equal(payload.reasonCode, "no_runtime_site");
    assert.equal(payload.statusCode, 404);
  } finally {
    restoreDeps();
  }
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
