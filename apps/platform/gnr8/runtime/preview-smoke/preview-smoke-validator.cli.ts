import { resolveDomainSiteVersionForHost } from "@/gnr8/runtime/runtime-store";
import { runPreviewSmokeValidation, type PreviewSmokeTarget, type SmokeAssetExpectation } from "@/gnr8/runtime/preview-smoke/preview-smoke-validator";

type ResolvedSite = { siteId: string; siteVersionId: string };

const APP_BASE_URL = process.env.GNR8_PREVIEW_BASE_URL?.trim() || "http://localhost:3000";
const MAVER_HOST = process.env.GNR8_MAVER_HOST?.trim() || "maver.app.pasadenagenerator.com";
const ROBOPLAST_HOST = process.env.GNR8_ROBOPLAST_HOST?.trim() || "roboplast.app.pasadenagenerator.com";

function parseArg(flag: string): string | null {
  const prefix = `--${flag}=`;
  const arg = process.argv.slice(2).find((part) => part.startsWith(prefix));
  if (!arg) return null;
  const value = arg.slice(prefix.length).trim();
  return value.length > 0 ? value : null;
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

async function makeTarget(input: {
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

async function main(): Promise<void> {
  const explicitMaverSiteId = parseArg("maver-site-id") ?? process.env.GNR8_MAVER_SITE_ID ?? null;
  const explicitMaverVersionId = parseArg("maver-site-version-id") ?? process.env.GNR8_MAVER_SITE_VERSION_ID ?? null;
  const explicitRoboplastSiteId = parseArg("roboplast-site-id") ?? process.env.GNR8_ROBOPLAST_SITE_ID ?? null;
  const explicitRoboplastVersionId = parseArg("roboplast-site-version-id") ?? process.env.GNR8_ROBOPLAST_SITE_VERSION_ID ?? null;

  const maverAssets = parseAssetList(parseArg("maver-assets"), [
    { label: "hero image", path: "uploads/KcGdxACT/hero-01.jpg", required: true },
    { label: "overlay image", path: "uploads/QBSeVQys/overlay.png", required: true },
    { label: "local stylesheet", path: "assets/user-style.css", required: true },
  ]);

  const roboplastAssets = parseAssetList(parseArg("roboplast-assets"), [
    { label: "local stylesheet", path: "assets/stylesheet/site.css", required: true },
  ]);

  const targets: PreviewSmokeTarget[] = [];
  const maver = await makeTarget({
    label: "Maver",
    host: MAVER_HOST,
    explicitSiteId: explicitMaverSiteId,
    explicitSiteVersionId: explicitMaverVersionId,
    identitySignals: ["maver", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
    fallbackAssets: maverAssets,
  });
  if (maver) targets.push(maver);

  const roboplast = await makeTarget({
    label: "Roboplast",
    host: ROBOPLAST_HOST,
    explicitSiteId: explicitRoboplastSiteId,
    explicitSiteVersionId: explicitRoboplastVersionId,
    identitySignals: ["roboplast", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
    fallbackAssets: roboplastAssets,
  });
  if (roboplast) targets.push(roboplast);

  if (targets.length === 0) {
    throw new Error("No smoke targets resolved. Provide env/args for siteVersionIds or ensure host bindings resolve.");
  }

  const results = [];
  for (const target of targets) {
    const summary = await runPreviewSmokeValidation(
      {
        fetchPreviewHtml: async ({ siteVersionId, previewPath, previewMode }) => {
          const previewUrl = `${APP_BASE_URL}/api/gnr8/runtime/versions/${encodeURIComponent(siteVersionId)}/preview?mode=${encodeURIComponent(previewMode)}&path=${encodeURIComponent(previewPath)}`;
          const response = await fetch(previewUrl, { method: "GET" });
          return { status: response.status, body: await response.text(), headers: response.headers };
        },
        fetchPreviewAsset: async ({ siteId, siteVersionId, assetPath }) => {
          const assetUrl = `${APP_BASE_URL}/api/gnr8/runtime/preview-assets/${encodeURIComponent(siteId)}/${encodeURIComponent(siteVersionId)}/${assetPath}`;
          const response = await fetch(assetUrl, { method: "GET" });
          return { status: response.status, body: await response.text(), headers: response.headers };
        },
      },
      target,
    );
    results.push(summary);
  }

  const pass = results.every((entry) => entry.pass);
  const output = {
    kind: "preview_smoke_summary_v1",
    generatedAt: new Date().toISOString(),
    pass,
    results,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exitCode = pass ? 0 : 1;
}

void main();
