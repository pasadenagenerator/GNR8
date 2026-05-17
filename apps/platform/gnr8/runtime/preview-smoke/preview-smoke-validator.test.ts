import assert from "node:assert/strict";
import test from "node:test";

import { runPreviewSmokeValidation, type PreviewSmokeTarget } from "@/gnr8/runtime/preview-smoke/preview-smoke-validator";
import { evaluateProviderCredentialBoundary } from "@/gnr8/runtime/dns/provider-credentials-boundary";
import { evaluateDnsProviderImplementationReadiness } from "@/gnr8/runtime/dns/provider-implementation-readiness";
import { evaluateProviderExecutionGate } from "@/gnr8/runtime/dns/provider-execution-gate";
import { createProviderSandboxAdapterDescriptor } from "@/gnr8/runtime/dns/provider-sandbox-adapters";
import { assertDnsProviderAdapterContract, getDnsProviderAdapter } from "@/gnr8/runtime/dns/provider-adapter-registry";
import { DNS_PROVIDER_CAPABILITIES } from "@/gnr8/runtime/dns/dns-provider-types";
import { GET as previewRouteGet } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/route";
import { setPreviewRouteDependenciesForTest } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/preview-route-dependencies";
import { createPreviewAssetsRouteHandlers } from "@/app/api/gnr8/runtime/preview-assets/[siteId]/[siteVersionId]/[...assetPath]/preview-assets-route-handlers";

function makeHeaders(values: Record<string, string>): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(values)) {
    headers.set(key, value);
  }
  return headers;
}

test("preview smoke validator: reports pass with deterministic transformed fixture", async () => {
  const assetCalls: string[] = [];
  const target: PreviewSmokeTarget = {
    siteLabel: "Maver",
    expectedSiteId: "site_preview_1",
    siteVersionId: "sv_preview_1",
    identitySignals: ["maver", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
    requiredAssets: [
      { label: "hero", path: "uploads/KcGdxACT/hero-01.jpg", required: true },
      { label: "stylesheet", path: "assets/user-style.css", required: true },
    ],
    optionalNoiseAssets: ["legal1", "uploads/docs/missing.pdf"],
  };

  const previewHtml = `<!doctype html><html><head><title>maver transport</title></head><body>
  <a href="#" data-req="scrollTop" class="scrollIcon bottom_right">Top</a>
  <section id="m777" class="module osmap" data-req="osmap"></section>
  <section id="m4695" class="module gallery"></section>
  <script>console.info("PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS");console.info("PREVIEW_GALLERY_PAGED_LAYOUT_STATUS");console.info("PREVIEW_MAP_MODULE_DETECTED");</script>
  </body></html>`;

  const summary = await runPreviewSmokeValidation(
    {
      fetchPreviewHtml: async () => ({
        status: 200,
        body: previewHtml,
        headers: makeHeaders({
          "x-gnr8-preview-mode": "transformed",
          "x-gnr8-preview-source": "transformed_artifact",
        }),
      }),
      fetchPreviewAsset: async ({ assetPath }) => {
        assetCalls.push(assetPath);
        if (assetPath === "legal1" || assetPath.endsWith(".pdf")) {
          return { status: 404, body: "missing" };
        }
        return { status: 200, body: "ok" };
      },
    },
    target,
  );

  assert.equal(summary.pass, true);
  assert.equal(summary.previewMode, "transformed");
  assert.equal(summary.sourceMode, "transformed_artifact");
  assert.equal(summary.nativeBackToTopStatus, "present");
  assert.equal(summary.mapStatus, "present");
  assert.equal(summary.galleryStatus, "present");
  assert.equal(summary.assetChecks.length, 2);
  assert.deepEqual(assetCalls.sort(), ["assets/user-style.css", "legal1", "uploads/KcGdxACT/hero-01.jpg", "uploads/docs/missing.pdf"].sort());
  assert.equal(summary.nonBlockingNoise.length, 2);
  assert.equal(summary.nonBlockingNoise[0]?.classification.length > 0, true);
  assert.equal(summary.runtimeIdentity.siteId, "site_preview_1");
  assert.equal(summary.runtimeIdentity.siteVersionId, "sv_preview_1");
  assert.equal(summary.runtimeIdentity.previewMode, "transformed");
  assert.equal(summary.runtimeIdentity.sourceMode, "transformed_artifact");
  assert.equal(summary.runtimeIdentity.normalizedPath, "/");
  assert.equal(summary.runtimeIdentity.correlationKey.length, 64);
});

test("preview smoke validator: fails when forbidden fallback marker appears", async () => {
  const fallbackMarker = ["PREVIEW_BACK_TO_TOP_FALLBACK", "APPLIED"].join("_");
  const summary = await runPreviewSmokeValidation(
    {
      fetchPreviewHtml: async () => ({
        status: 200,
        body: `<html><body>${fallbackMarker}<a class="scrollIcon">Top</a><section class="gallery"></section><section data-req="osmap"></section>roboplast PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS</body></html>`,
        headers: makeHeaders({
          "x-gnr8-preview-mode": "transformed",
          "x-gnr8-preview-source": "raw_template_site",
        }),
      }),
      fetchPreviewAsset: async () => ({ status: 200, body: "ok" }),
    },
    {
      siteLabel: "Roboplast",
      expectedSiteId: "site_preview_2",
      siteVersionId: "sv_preview_2",
      identitySignals: ["roboplast", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
      requiredAssets: [{ label: "stylesheet", path: "assets/stylesheet/site.css", required: true }],
    },
  );

  assert.equal(summary.pass, false);
  assert.equal(summary.forbiddenMarkerChecks.some((entry) => entry.marker === fallbackMarker && !entry.ok), true);
  assert.equal(summary.runtimeIdentity.siteId, "site_preview_2");
  assert.equal(summary.runtimeIdentity.normalizedPath, "/");
  assert.equal(summary.runtimeIdentity.previewMode, "transformed");
});

test("preview smoke validator: fails when duplicated preview-assets prefix exists", async () => {
  const html = "<html><body>maver PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS <a data-req=\"scrollTop\" class=\"scrollIcon\">Top</a><div class=\"gallery\"></div><section data-req=\"osmap\"></section><img src=\"/api/gnr8/runtime/preview-assets/site_preview_1/sv_preview_1/api/gnr8/runtime/preview-assets/site_preview_1/sv_preview_1/uploads/x.jpg\"/></body></html>";

  const summary = await runPreviewSmokeValidation(
    {
      fetchPreviewHtml: async () => ({
        status: 200,
        body: html,
        headers: makeHeaders({
          "x-gnr8-preview-mode": "transformed",
          "x-gnr8-preview-source": "transformed_artifact",
        }),
      }),
      fetchPreviewAsset: async () => ({ status: 200, body: "ok" }),
    },
    {
      siteLabel: "Maver",
      expectedSiteId: "site_preview_1",
      siteVersionId: "sv_preview_1",
      identitySignals: ["maver", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
      requiredAssets: [{ label: "hero", path: "uploads/KcGdxACT/hero-01.jpg", required: true }],
    },
  );

  assert.equal(summary.pass, false);
  assert.equal(summary.forbiddenMarkerChecks.some((entry) => entry.marker === "duplicated_preview_assets_prefix_absent" && !entry.ok), true);
});

test("preview smoke validator: route harness mode validates auth-gated preview route and preview-assets locally", async () => {
  const restorePreviewDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_preview_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_preview_1", actorMode: "agency_member" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
          <h1>maver transport</h1>
          <a href="#" data-req="scrollTop" class="scrollIcon bottom_right">Top</a>
          <section id="m777" class="module osmap" data-req="osmap"></section>
          <section id="m4695" class="module gallery"></section>
          <img src="/api/gnr8/runtime/preview-assets/site_preview_1/sv_preview_1/uploads/KcGdxACT/hero-01.jpg"/>
          <script>console.info("PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS");console.info("PREVIEW_GALLERY_PAGED_LAYOUT_STATUS");console.info("PREVIEW_MAP_MODULE_DETECTED");</script>
        </body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
      }) as never,
    canShowContentDebug: async () => false,
  });
  const assetHandlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () => ({ outcome: "domain_miss", host: "app.pasadenagenerator.com", reasonCode: "domain_not_found" }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_preview_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_preview_1", actorMode: "agency_member" }) as never,
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {
          "uploads/KcGdxACT/hero-01.jpg": { path: "uploads/KcGdxACT/hero-01.jpg", mediaType: "image/jpeg", sizeBytes: 4, sha256: "h1" },
          "assets/user-style.css": { path: "assets/user-style.css", mediaType: "text/css; charset=utf-8", sizeBytes: 18, sha256: "h2" },
        },
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 2, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async ({ filePath }) => {
      if (filePath === "uploads/KcGdxACT/hero-01.jpg") {
        return { mediaType: "image/jpeg", sizeBytes: 4, sha256: "h1", bytes: Buffer.from([255, 216, 255, 217]) } as never;
      }
      if (filePath === "assets/user-style.css") {
        return { mediaType: "text/css; charset=utf-8", sizeBytes: 18, sha256: "h2", bytes: Buffer.from("body{color:#111;}", "utf8") } as never;
      }
      return null;
    },
  });

  try {
    const summary = await runPreviewSmokeValidation(
      {
        fetchPreviewHtml: async ({ siteVersionId, previewPath, previewMode }) => {
          const response = await previewRouteGet(
            new Request(
              `https://app.pasadenagenerator.com/api/gnr8/runtime/versions/${siteVersionId}/preview?mode=${previewMode}&path=${encodeURIComponent(previewPath)}`,
              { headers: { host: "app.pasadenagenerator.com", "x-forwarded-host": "app.pasadenagenerator.com" } },
            ),
            { params: Promise.resolve({ siteVersionId }) },
          );
          return { status: response.status, body: await response.text(), headers: response.headers };
        },
        fetchPreviewAsset: async ({ siteId, siteVersionId, assetPath }) => {
          const response = await assetHandlers.GET(
            new Request(`https://app.pasadenagenerator.com/api/gnr8/runtime/preview-assets/${siteId}/${siteVersionId}/${assetPath}`),
            {
              params: Promise.resolve({
                siteId,
                siteVersionId,
                assetPath: assetPath.split("/").filter(Boolean),
              }),
            },
          );
          return { status: response.status, body: await response.text(), headers: response.headers };
        },
      },
      {
        siteLabel: "Maver",
        expectedSiteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        identitySignals: ["maver", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
        requiredAssets: [
          { label: "hero", path: "uploads/KcGdxACT/hero-01.jpg", required: true },
          { label: "stylesheet", path: "assets/user-style.css", required: true },
        ],
      },
    );

    assert.equal(summary.previewStatus, 200);
    assert.equal(summary.previewMode, "transformed");
    assert.equal(summary.sourceMode, "preview");
    assert.equal(summary.assetChecks.every((entry) => entry.status === 200), true);
    assert.equal(summary.pass, true);
  } finally {
    restorePreviewDeps();
  }
});

test("preview smoke validator: strategy-based active resolution emits deterministic runtime diagnostic", async () => {
  const summary = await runPreviewSmokeValidation(
    {
      fetchPreviewHtml: async ({ siteVersionId }) => ({
        status: 200,
        body: `<html><body>maver PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS <a data-req="scrollTop" class="scrollIcon">Top</a><div class="gallery"></div><section data-req="osmap"></section><img src="/api/gnr8/runtime/preview-assets/site_preview_active/${siteVersionId}/uploads/x.jpg"/></body></html>`,
        headers: makeHeaders({
          "x-gnr8-preview-mode": "transformed",
          "x-gnr8-preview-source": "preview",
        }),
      }),
      fetchPreviewAsset: async () => ({ status: 200, body: "ok" }),
    },
    {
      siteLabel: "Maver",
      expectedSiteId: "site_preview_active",
      resolution: {
        strategy: "active",
        binding: {
          siteId: "site_preview_active",
          canonicalSlug: "maver",
          activeSiteVersionId: "sv_active_1",
          latestImportedSiteVersionId: "sv_latest_1",
          publishedSiteVersionId: null,
          previewSiteVersionId: null,
        },
        siteResolutionBinding: {
          siteId: "site_preview_active",
          canonicalSlug: "maver",
          activeSiteVersionId: "sv_active_1",
          latestImportedSiteVersionId: "sv_latest_1",
          publishedSiteVersionId: undefined,
          previewSiteVersionId: undefined,
          candidateSiteVersions: [
            {
              siteVersionId: "sv_latest_1",
              versionNo: 1,
              state: "READY",
              createdAt: "2026-05-12T10:00:00.000Z",
              artifactId: "artifact_1",
            },
          ],
        },
        siteDomainReadinessBinding: {
          siteId: "site_preview_active",
          canonicalSlug: "maver",
          primaryHost: "source.example.com",
          internalPreviewHost: "maver.preview.gnr8.test",
          customDomains: ["maver.example.com"],
          activeDomainBindingHost: "maver.example.com",
          domainBindingCandidates: [
            {
              host: "maver.preview.gnr8.test",
              source: "runtime_host_binding",
              status: "ACTIVE",
              isInternalHost: true,
              isActive: true,
            },
            {
              host: "maver.example.com",
              source: "runtime_domain_binding",
              status: "active",
              isInternalHost: false,
              isActive: true,
            },
          ],
        },
      },
      identitySignals: ["maver", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
      requiredAssets: [{ label: "hero", path: "uploads/x.jpg", required: true }],
    },
  );

  assert.equal(summary.siteVersionId, "sv_active_1");
  assert.equal(summary.runtimeResolutionDiagnostic?.code, "PREVIEW_RUNTIME_RESOLUTION_APPLIED");
  assert.equal(summary.runtimeResolutionDiagnostic?.strategy, "active");
  assert.equal(summary.runtimeResolutionDiagnostic?.resolvedSiteVersionId, "sv_active_1");
  assert.equal(summary.runtimeResolutionDiagnostic?.fallbackUsed, false);
  assert.equal((summary.runtimeResolutionDiagnostic?.resolutionKey?.length ?? 0) > 0, true);
  assert.equal(summary.runtimeReadiness?.readinessStatus, "ready_with_warnings");
  assert.equal(summary.runtimeReadiness?.siteId, "site_preview_active");
  assert.deepEqual(summary.runtimeReadiness?.warnings, ["missing_published_site_version"]);
  assert.equal(summary.runtimeDomainReadiness?.siteId, "site_preview_active");
  assert.equal(summary.runtimeDomainReadiness?.domainReadinessStatus, "ready");
  assert.deepEqual(summary.runtimeDomainReadiness?.warnings, []);
  assert.equal(summary.runtimeDnsReadinessPlan?.providerId, "manual");
  assert.equal((summary.runtimeDnsReadinessPlan?.plannedRecords.length ?? 0) > 0, true);
  assert.equal(summary.runtimeDomainLifecyclePlan?.providerId, "manual");
  assert.equal(summary.runtimeDomainLifecyclePlan?.currentStage, "verified");
  assert.equal(summary.runtimeDomainProviderSelection?.selectedProviderId, "manual");
  assert.equal(summary.runtimeDomainProviderSelection?.selectionStatus, "selected");
  assert.equal(summary.runtimeDomainExecutionIntent?.executionMode, "manual");
  assert.equal(summary.runtimeDomainExecutionIntent?.manualActions.length ? true : false, true);
  assert.equal(summary.runtimeDomainExecutionDryRun?.executionMode, "manual");
  assert.equal(summary.runtimeDomainExecutionDryRun?.dryRunStatus, "ready_with_warnings");
  assert.equal(summary.runtimeDomainExecutionDryRun?.dryRunActions.length ? true : false, true);
  assert.equal(summary.runtimeDomainExecutionDryRun?.providerAdapterStatus.providerId, "manual");
  assert.equal(summary.runtimeDomainExecutionDryRun?.providerAdapterStatus.adapterAvailable, true);
  assert.equal(summary.runtimeDomainExecutionDryRun?.providerAdapterStatus.contractStatus, "pass");
});

test("preview smoke validator: mock provider deterministic dry-run path remains non-live", async () => {
  const summary = await runPreviewSmokeValidation(
    {
      fetchPreviewHtml: async ({ siteVersionId }) => ({
        status: 200,
        body: `<html><body>maver PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS <a data-req="scrollTop" class="scrollIcon">Top</a><div class="gallery"></div><section data-req="osmap"></section><img src="/api/gnr8/runtime/preview-assets/site_preview_mock/${siteVersionId}/uploads/x.jpg"/></body></html>`,
        headers: makeHeaders({
          "x-gnr8-preview-mode": "transformed",
          "x-gnr8-preview-source": "preview",
        }),
      }),
      fetchPreviewAsset: async () => ({ status: 200, body: "ok" }),
    },
    {
      siteLabel: "Maver",
      expectedSiteId: "site_preview_mock",
      resolution: {
        strategy: "active",
        binding: {
          siteId: "site_preview_mock",
          canonicalSlug: "maver",
          activeSiteVersionId: "sv_active_mock_1",
          latestImportedSiteVersionId: "sv_latest_mock_1",
          publishedSiteVersionId: null,
          previewSiteVersionId: null,
        },
        siteResolutionBinding: {
          siteId: "site_preview_mock",
          canonicalSlug: "maver",
          activeSiteVersionId: "sv_active_mock_1",
          latestImportedSiteVersionId: "sv_latest_mock_1",
          publishedSiteVersionId: undefined,
          previewSiteVersionId: undefined,
          candidateSiteVersions: [
            {
              siteVersionId: "sv_latest_mock_1",
              versionNo: 1,
              state: "READY",
              createdAt: "2026-05-12T10:00:00.000Z",
              artifactId: "artifact_mock_1",
            },
          ],
        },
        siteDomainReadinessBinding: {
          siteId: "site_preview_mock",
          canonicalSlug: "maver",
          primaryHost: "source.example.com",
          internalPreviewHost: "maver.preview.gnr8.test",
          customDomains: ["maver.example.com"],
          activeDomainBindingHost: "maver.example.com",
          domainBindingCandidates: [
            {
              host: "maver.preview.gnr8.test",
              source: "runtime_host_binding",
              status: "ACTIVE",
              isInternalHost: true,
              isActive: true,
            },
            {
              host: "maver.example.com",
              source: "runtime_domain_binding",
              status: "active",
              isInternalHost: false,
              isActive: true,
            },
          ],
        },
      },
      runtimeDomainProviderSelection: {
        preferredProviderId: "mock_provider",
        allowedProviderIds: ["mock_provider"],
      },
      identitySignals: ["maver", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
      requiredAssets: [{ label: "hero", path: "uploads/x.jpg", required: true }],
    },
  );

  assert.equal(summary.runtimeDomainProviderSelection?.selectedProviderId, "mock_provider");
  assert.equal(summary.runtimeDomainExecutionIntent?.executionMode, "provider_api_future");
  assert.equal(summary.runtimeDomainExecutionDryRun?.providerAdapterStatus.providerId, "mock_provider");
  assert.equal(summary.runtimeDomainExecutionDryRun?.providerAdapterStatus.contractStatus, "pass");
  assert.equal(
    summary.runtimeDomainExecutionDryRun?.dryRunStatus === "ready" || summary.runtimeDomainExecutionDryRun?.dryRunStatus === "ready_with_warnings",
    true,
  );

  const dryRun = summary.runtimeDomainExecutionDryRun;
  if (!dryRun) {
    throw new Error("Expected runtimeDomainExecutionDryRun to be defined for mock provider scenario.");
  }

  const providerId = "mock_provider";
  const contractReport = await assertDnsProviderAdapterContract(providerId);
  const providerReadiness = evaluateDnsProviderImplementationReadiness({
    providerId,
    capability: DNS_PROVIDER_CAPABILITIES[providerId],
    adapter: getDnsProviderAdapter(providerId),
    contractReport,
  });
  const credentialBoundary = evaluateProviderCredentialBoundary({
    providerId,
    environment: "sandbox",
    availableCredentialNames: [],
    credentialValuesByName: {},
  });
  const executionGate = evaluateProviderExecutionGate({
    dryRun,
    providerReadiness,
    credentialBoundary,
    requestedEnvironment: "live",
  });
  assert.equal(executionGate.gateStatus, "blocked");
  assert.equal(executionGate.blockers.includes("live_execution_blocked_in_current_phase"), true);

  const sandboxExecutionGate = evaluateProviderExecutionGate({
    dryRun,
    providerReadiness,
    credentialBoundary,
    requestedEnvironment: "sandbox",
  });
  const descriptor = createProviderSandboxAdapterDescriptor(providerId, providerReadiness, credentialBoundary, sandboxExecutionGate);
  assert.equal(descriptor.mode === "mock" || descriptor.sandboxEligible, true);
});

test("preview smoke validator: Maver and Roboplast strategy resolution resolves expected siteVersionId", async () => {
  const deps = {
    fetchPreviewHtml: async ({ siteVersionId }: { siteVersionId: string }) => ({
      status: 200,
      body: `<html><body>PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS <a data-req="scrollTop" class="scrollIcon">Top</a><div class="gallery"></div><section data-req="osmap"></section><img src="/api/gnr8/runtime/preview-assets/site_test/${siteVersionId}/uploads/x.jpg"/></body></html>`,
      headers: makeHeaders({
        "x-gnr8-preview-mode": "transformed",
        "x-gnr8-preview-source": "preview",
      }),
    }),
    fetchPreviewAsset: async () => ({ status: 200, body: "ok" }),
  };

  const maver = await runPreviewSmokeValidation(deps, {
    siteLabel: "Maver",
    expectedSiteId: "site_test",
    resolution: {
      strategy: "active",
      binding: {
        siteId: "site_test",
        canonicalSlug: "maver",
        activeSiteVersionId: "sv_maver_active",
        latestImportedSiteVersionId: "sv_maver_latest",
      },
    },
    identitySignals: ["PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
    requiredAssets: [{ label: "hero", path: "uploads/x.jpg", required: true }],
  });
  assert.equal(maver.siteVersionId, "sv_maver_active");

  const roboplast = await runPreviewSmokeValidation(deps, {
    siteLabel: "Roboplast",
    expectedSiteId: "site_test",
    resolution: {
      strategy: "latest_imported",
      binding: {
        siteId: "site_test",
        canonicalSlug: "roboplast",
        activeSiteVersionId: null,
        latestImportedSiteVersionId: null,
      },
      candidateSiteVersionIds: ["sv_robo_001", "sv_robo_003", "sv_robo_002"],
    },
    identitySignals: ["PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
    requiredAssets: [{ label: "hero", path: "uploads/x.jpg", required: true }],
  });
  assert.equal(roboplast.siteVersionId, "sv_robo_003");
});

test("preview smoke validator: direct siteVersionId mode keeps runtimeDomainReadiness unchanged", async () => {
  const summary = await runPreviewSmokeValidation(
    {
      fetchPreviewHtml: async () => ({
        status: 200,
        body: `<html><body>PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS <a data-req="scrollTop" class="scrollIcon">Top</a><div class="gallery"></div><section data-req="osmap"></section></body></html>`,
        headers: makeHeaders({
          "x-gnr8-preview-mode": "transformed",
          "x-gnr8-preview-source": "preview",
        }),
      }),
      fetchPreviewAsset: async () => ({ status: 200, body: "ok" }),
    },
    {
      siteLabel: "Direct",
      expectedSiteId: "site_direct",
      siteVersionId: "sv_direct",
      identitySignals: ["PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
      requiredAssets: [],
    },
  );

  assert.equal(summary.runtimeReadiness, undefined);
  assert.equal(summary.runtimeDomainReadiness, undefined);
  assert.equal(summary.runtimeDnsReadinessPlan, undefined);
  assert.equal(summary.runtimeDomainLifecyclePlan, undefined);
  assert.equal(summary.runtimeDomainProviderSelection, undefined);
  assert.equal(summary.runtimeDomainExecutionIntent, undefined);
  assert.equal(summary.runtimeDomainExecutionDryRun, undefined);
});
