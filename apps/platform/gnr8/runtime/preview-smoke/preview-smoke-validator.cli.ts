import { resolveDomainSiteVersionForHost } from "@/gnr8/runtime/runtime-store";
import { getRuntimeSiteResolutionBinding } from "@/gnr8/runtime/runtime-store";
import { getRuntimeSiteDomainReadinessBinding } from "@/gnr8/runtime/runtime-store";
import { runPreviewSmokeValidation, type PreviewSmokeTarget, type SmokeAssetExpectation } from "@/gnr8/runtime/preview-smoke/preview-smoke-validator";
import { GET as previewRouteGet } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/route";
import { setPreviewRouteDependenciesForTest } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/preview-route-dependencies";
import { createPreviewAssetsRouteHandlers } from "@/app/api/gnr8/runtime/preview-assets/[siteId]/[siteVersionId]/[...assetPath]/preview-assets-route-handlers";
import type { RuntimeResolutionStrategy, RuntimeSiteBinding } from "@/gnr8/runtime/resolution/runtime-resolution";

type SmokeExecutionMode = "http" | "route_harness";

type ResolvedSite = { siteId: string; siteVersionId: string };
type StrategyTargetInput = {
  label: string;
  siteId: string | null;
  strategy: RuntimeResolutionStrategy | null;
  identitySignals: string[];
  fallbackAssets: SmokeAssetExpectation[];
  executionMode: SmokeExecutionMode;
};
type StrategyTargetDeps = {
  getResolutionBinding: typeof getRuntimeSiteResolutionBinding;
  getDomainReadinessBinding: typeof getRuntimeSiteDomainReadinessBinding;
  logWarn: typeof console.warn;
  logInfo: typeof console.info;
};

type BaselineFallbackTarget = {
  siteId: string;
  siteVersionId: string;
};

const APP_BASE_URL = process.env.GNR8_PREVIEW_BASE_URL?.trim() || "http://localhost:3000";
const MAVER_HOST = process.env.GNR8_MAVER_HOST?.trim() || "maver.app.pasadenagenerator.com";
const ROBOPLAST_HOST = process.env.GNR8_ROBOPLAST_HOST?.trim() || "roboplast.app.pasadenagenerator.com";
const BASELINE_FALLBACK_REASON_CODE = "runtime_resolution_binding_missing";

export const RUNTIME_SMOKE_BASELINE_FALLBACK_TARGETS: Record<string, BaselineFallbackTarget> = {
  Maver: {
    siteId: "site_7c77126de646f746b3bd",
    siteVersionId: "88253466-783e-4484-8b68-df6c83b8a11c",
  },
  Roboplast: {
    siteId: "site_aa6b25cd33e9c1384d35",
    siteVersionId: "30bfe5b1-a441-41ef-92e3-0d6b3ee678e1",
  },
};

function parseExecutionMode(value: string | null): SmokeExecutionMode {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "" || normalized === "http") return "http";
  if (normalized === "route_harness") return "route_harness";
  throw new Error(`Unsupported execution mode '${value}'. Use http or route_harness.`);
}

function parseArg(flag: string): string | null {
  const prefix = `--${flag}=`;
  const arg = process.argv.slice(2).find((part) => part.startsWith(prefix));
  if (!arg) return null;
  const value = arg.slice(prefix.length).trim();
  return value.length > 0 ? value : null;
}

function parseResolutionStrategy(value: string | null): RuntimeResolutionStrategy | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "latest_imported" || normalized === "active" || normalized === "published" || normalized === "preview") {
    return normalized;
  }
  throw new Error(`Unsupported runtime resolution strategy '${value}'. Use latest_imported, active, published, or preview.`);
}

async function resolveTargetFromHost(host: string): Promise<ResolvedSite | null> {
  const resolved = await resolveDomainSiteVersionForHost({ host });
  if (resolved.outcome !== "domain_hit" || !resolved.siteId || !resolved.siteVersionId) return null;
  return {
    siteId: resolved.siteId,
    siteVersionId: resolved.siteVersionId,
  };
}

function parseAssetList(input: string | null, fallback: SmokeAssetExpectation[]): SmokeAssetExpectation[] {
  if (!input) return fallback;
  const out: SmokeAssetExpectation[] = [];
  for (const token of input.split(",")) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    out.push({ label: trimmed, path: trimmed, required: true });
  }
  return out.length > 0 ? out : fallback;
}

export async function makeTarget(input: {
  label: string;
  host: string;
  explicitSiteId: string | null;
  explicitSiteVersionId: string | null;
  identitySignals: string[];
  fallbackAssets: SmokeAssetExpectation[];
}): Promise<PreviewSmokeTarget | null> {
  const resolved = !input.explicitSiteId || !input.explicitSiteVersionId ? await resolveTargetFromHost(input.host) : null;
  const siteId = input.explicitSiteId ?? resolved?.siteId ?? null;
  const siteVersionId = input.explicitSiteVersionId ?? resolved?.siteVersionId ?? null;
  if (!siteVersionId) return null;
  return {
    siteLabel: input.label,
    expectedSiteId: siteId ?? undefined,
    siteVersionId,
    previewMode: "transformed",
    previewPath: "/",
    identitySignals: input.identitySignals,
    requiredAssets: input.fallbackAssets,
    optionalNoiseAssets: ["legal1", "uploads/documents/missing.pdf"],
  };
}

function makeDeterministicBaselineTarget(input: StrategyTargetInput, logWarn: typeof console.warn): PreviewSmokeTarget | null {
  if (input.executionMode !== "route_harness" || !input.strategy) return null;
  const baseline = RUNTIME_SMOKE_BASELINE_FALLBACK_TARGETS[input.label];
  if (!baseline) return null;
  logWarn("[preview-smoke] RUNTIME_SMOKE_BASELINE_TARGET_FALLBACK_USED", {
    siteLabel: input.label,
    siteId: baseline.siteId,
    siteVersionId: baseline.siteVersionId,
    reasonCode: BASELINE_FALLBACK_REASON_CODE,
  });
  return {
    siteLabel: input.label,
    expectedSiteId: baseline.siteId,
    siteVersionId: baseline.siteVersionId,
    previewMode: "transformed",
    previewPath: "/",
    identitySignals: input.identitySignals,
    requiredAssets: input.fallbackAssets,
    optionalNoiseAssets: ["legal1", "uploads/documents/missing.pdf"],
  };
}

export async function makeTargetFromSiteResolution(
  input: StrategyTargetInput,
  deps: StrategyTargetDeps = {
    getResolutionBinding: getRuntimeSiteResolutionBinding,
    getDomainReadinessBinding: getRuntimeSiteDomainReadinessBinding,
    logWarn: console.warn,
    logInfo: console.info,
  },
): Promise<PreviewSmokeTarget | null> {
  if (!input.siteId || !input.strategy) return null;

  const [binding, domainReadinessBinding] = await Promise.all([
    deps.getResolutionBinding(input.siteId),
    deps.getDomainReadinessBinding(input.siteId),
  ]);
  if (!binding) {
    deps.logWarn("[preview-smoke] RUNTIME_RESOLUTION_BINDING_MISSING", {
      siteLabel: input.label,
      siteId: input.siteId,
      strategy: input.strategy,
    });
    return makeDeterministicBaselineTarget(input, deps.logWarn);
  }

  if (domainReadinessBinding) {
    deps.logInfo("[preview-smoke] RUNTIME_DOMAIN_READINESS_BINDING_LOADED", {
      siteLabel: input.label,
      siteId: domainReadinessBinding.siteId,
      strategy: input.strategy,
      canonicalSlug: domainReadinessBinding.canonicalSlug ?? null,
      primaryHost: domainReadinessBinding.primaryHost,
      internalPreviewHost: domainReadinessBinding.internalPreviewHost,
      customDomains: domainReadinessBinding.customDomains,
      activeDomainBindingHost: domainReadinessBinding.activeDomainBindingHost,
      candidateHosts: domainReadinessBinding.domainBindingCandidates.map((candidate) => candidate.host),
    });
  } else {
    deps.logWarn("[preview-smoke] RUNTIME_DOMAIN_READINESS_BINDING_MISSING", {
      siteLabel: input.label,
      siteId: input.siteId,
      strategy: input.strategy,
    });
  }

  const resolutionBinding: RuntimeSiteBinding = {
    siteId: binding.siteId,
    canonicalSlug: binding.canonicalSlug ?? input.label.toLowerCase(),
    activeSiteVersionId: binding.activeSiteVersionId,
    latestImportedSiteVersionId: binding.latestImportedSiteVersionId,
    publishedSiteVersionId: binding.publishedSiteVersionId,
    previewSiteVersionId: binding.previewSiteVersionId,
  };
  const candidateSiteVersionIds = binding.candidateSiteVersions.map((candidate) => candidate.siteVersionId);

  deps.logInfo("[preview-smoke] RUNTIME_RESOLUTION_BINDING_LOADED", {
    siteLabel: input.label,
    siteId: binding.siteId,
    strategy: input.strategy,
    canonicalSlug: binding.canonicalSlug ?? null,
    activeSiteVersionId: binding.activeSiteVersionId,
    latestImportedSiteVersionId: binding.latestImportedSiteVersionId,
    publishedSiteVersionId: binding.publishedSiteVersionId ?? null,
    previewSiteVersionId: binding.previewSiteVersionId ?? null,
    candidateSiteVersionIds,
  });

  return {
    siteLabel: input.label,
    expectedSiteId: binding.siteId,
    resolution: {
      strategy: input.strategy,
      binding: resolutionBinding,
      candidateSiteVersionIds,
      siteResolutionBinding: binding,
      siteDomainReadinessBinding: domainReadinessBinding ?? undefined,
    },
    previewMode: "transformed",
    previewPath: "/",
    identitySignals: input.identitySignals,
    requiredAssets: input.fallbackAssets,
    optionalNoiseAssets: ["legal1", "uploads/documents/missing.pdf"],
  };
}

async function main(): Promise<void> {
  const executionMode = parseExecutionMode(parseArg("execution-mode") ?? process.env.GNR8_PREVIEW_SMOKE_EXECUTION_MODE ?? "route_harness");
  const explicitMaverSiteId = parseArg("maver-site-id") ?? process.env.GNR8_MAVER_SITE_ID ?? null;
  const explicitMaverVersionId = parseArg("maver-site-version-id") ?? process.env.GNR8_MAVER_SITE_VERSION_ID ?? null;
  const explicitRoboplastSiteId = parseArg("roboplast-site-id") ?? process.env.GNR8_ROBOPLAST_SITE_ID ?? null;
  const explicitRoboplastVersionId = parseArg("roboplast-site-version-id") ?? process.env.GNR8_ROBOPLAST_SITE_VERSION_ID ?? null;
  const maverStrategy = parseResolutionStrategy(parseArg("maver-strategy") ?? process.env.GNR8_MAVER_STRATEGY ?? null);
  const roboplastStrategy = parseResolutionStrategy(parseArg("roboplast-strategy") ?? process.env.GNR8_ROBOPLAST_STRATEGY ?? null);

  const maverAssets = parseAssetList(parseArg("maver-assets"), [
    { label: "hero image", path: "uploads/KcGdxACT/hero-01.jpg", required: true },
    { label: "overlay image", path: "uploads/QBSeVQys/overlay.png", required: true },
    { label: "local stylesheet", path: "assets/user-style.css", required: true },
  ]);

  const roboplastAssets = parseAssetList(parseArg("roboplast-assets"), []);

  const targets: PreviewSmokeTarget[] = [];
  const maver = await makeTargetFromSiteResolution({
    label: "Maver",
    siteId: explicitMaverSiteId,
    strategy: maverStrategy,
    identitySignals: ["maver", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
    fallbackAssets: maverAssets,
    executionMode,
  }) ??
    (await makeTarget({
      label: "Maver",
      host: MAVER_HOST,
      explicitSiteId: explicitMaverSiteId,
      explicitSiteVersionId: explicitMaverVersionId,
      identitySignals: ["maver", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
      fallbackAssets: maverAssets,
    }));
  if (maver) targets.push(maver);

  const roboplast = await makeTargetFromSiteResolution({
    label: "Roboplast",
    siteId: explicitRoboplastSiteId,
    strategy: roboplastStrategy,
    identitySignals: ["roboplast", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
    fallbackAssets: roboplastAssets,
    executionMode,
  }) ??
    (await makeTarget({
      label: "Roboplast",
      host: ROBOPLAST_HOST,
      explicitSiteId: explicitRoboplastSiteId,
      explicitSiteVersionId: explicitRoboplastVersionId,
      identitySignals: ["roboplast", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
      fallbackAssets: roboplastAssets,
    }));
  if (roboplast) targets.push(roboplast);

  if (targets.length === 0) {
    const output = {
      kind: "preview_smoke_summary_v1",
      generatedAt: new Date().toISOString(),
      executionMode,
      pass: false,
      diagnostics: ["RUNTIME_RESOLUTION_BINDING_MISSING"],
      results: [],
    };
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const restorePreviewRouteDeps =
    executionMode === "route_harness"
      ? setPreviewRouteDependenciesForTest({
          resolveAgencyIdForSiteVersion: async () => "agency_preview_smoke",
          requireAgencyActionContext: async () => ({ agencyId: "agency_preview_smoke", actorMode: "agency_member" }) as never,
        })
      : null;
  const previewAssetHandlers =
    executionMode === "route_harness"
      ? createPreviewAssetsRouteHandlers({
          resolveAgencyIdForSiteVersion: async () => "agency_preview_smoke",
          requireAgencyActionContext: async () => ({ agencyId: "agency_preview_smoke", actorMode: "agency_member" }) as never,
        })
      : null;

  const results = [];
  try {
    for (const target of targets) {
      const summary = await runPreviewSmokeValidation(
        {
          fetchPreviewHtml: async ({ siteVersionId, previewPath, previewMode }) => {
            if (executionMode === "route_harness") {
              const request = new Request(
                `${APP_BASE_URL}/api/gnr8/runtime/versions/${encodeURIComponent(siteVersionId)}/preview?mode=${encodeURIComponent(previewMode)}&path=${encodeURIComponent(previewPath)}`,
                {
                  method: "GET",
                  headers: { host: "app.pasadenagenerator.com", "x-forwarded-host": "app.pasadenagenerator.com" },
                },
              );
              const response = await previewRouteGet(request, {
                params: Promise.resolve({ siteVersionId }),
              });
              return { status: response.status, body: await response.text(), headers: response.headers };
            }
            const previewUrl = `${APP_BASE_URL}/api/gnr8/runtime/versions/${encodeURIComponent(siteVersionId)}/preview?mode=${encodeURIComponent(previewMode)}&path=${encodeURIComponent(previewPath)}`;
            const response = await fetch(previewUrl, { method: "GET" });
            return { status: response.status, body: await response.text(), headers: response.headers };
          },
          fetchPreviewAsset: async ({ siteId, siteVersionId, assetPath }) => {
            if (executionMode === "route_harness" && previewAssetHandlers) {
              const normalizedSegments = assetPath.split("/").filter(Boolean);
              const response = await previewAssetHandlers.GET(
                new Request(
                  `${APP_BASE_URL}/api/gnr8/runtime/preview-assets/${encodeURIComponent(siteId)}/${encodeURIComponent(siteVersionId)}/${assetPath}`,
                  {
                    method: "GET",
                    headers: { host: "app.pasadenagenerator.com", "x-forwarded-host": "app.pasadenagenerator.com" },
                  },
                ),
                {
                  params: Promise.resolve({
                    siteId,
                    siteVersionId,
                    assetPath: normalizedSegments,
                  }),
                },
              );
              return { status: response.status, body: await response.text(), headers: response.headers };
            }
            const assetUrl = `${APP_BASE_URL}/api/gnr8/runtime/preview-assets/${encodeURIComponent(siteId)}/${encodeURIComponent(siteVersionId)}/${assetPath}`;
            const response = await fetch(assetUrl, { method: "GET" });
            return { status: response.status, body: await response.text(), headers: response.headers };
          },
        },
        target,
      );
      results.push(summary);
    }
  } finally {
    restorePreviewRouteDeps?.();
  }

  const pass = results.every((entry) => entry.pass);
  const output = {
    kind: "preview_smoke_summary_v1",
    generatedAt: new Date().toISOString(),
    executionMode,
    pass,
    results,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exitCode = pass ? 0 : 1;
}

const isDirectExecution = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === new URL(`file://${entry}`).href;
})();

if (isDirectExecution) {
  void main();
}
