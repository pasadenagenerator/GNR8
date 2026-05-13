export type SmokeAssetExpectation = {
  label: string;
  path: string;
  required: boolean;
};

export type SmokeFetchResult = {
  status: number;
  body: string;
  headers?: Headers;
};

export type PreviewSmokeTarget = {
  siteLabel: string;
  siteVersionId: string;
  expectedSiteId?: string;
  previewPath?: string;
  previewMode?: string;
  identitySignals: string[];
  requiredAssets: SmokeAssetExpectation[];
  optionalNoiseAssets?: string[];
};

export type PreviewSmokeSummary = {
  siteLabel: string;
  siteId: string | null;
  siteVersionId: string;
  previewStatus: number;
  previewMode: string | null;
  sourceMode: string | null;
  assetChecks: Array<{ label: string; path: string; required: boolean; status: number; ok: boolean }>;
  forbiddenMarkerChecks: Array<{ marker: string; ok: boolean }>;
  nativeBackToTopStatus: "present" | "missing";
  mapStatus: "present" | "missing";
  galleryStatus: "present" | "missing";
  nonBlockingNoise: Array<{ path: string; status: number; classification: string }>;
  pass: boolean;
};

export type PreviewSmokeValidatorDependencies = {
  fetchPreviewHtml: (input: { siteVersionId: string; previewPath: string; previewMode: string }) => Promise<SmokeFetchResult>;
  fetchPreviewAsset: (input: { siteId: string; siteVersionId: string; assetPath: string }) => Promise<SmokeFetchResult>;
};

const FORBIDDEN_BACK_TO_TOP_MARKERS = [
  ["gnr8", "preview", "backtotop", "fallback"].join("-"),
  ["data", "gnr8", "backtotop", "fallback"].join("-"),
  ["PREVIEW_BACK_TO_TOP_FALLBACK", "APPLIED"].join("_"),
  ["RUNTIME_SIGNAL", "FALLBACK"].join("_"),
  ["fallbackInjected", " true"].join(":"),
  ["finalButtonSource", '"fallback"'].join(":"),
  ["finalButtonSource", ' "fallback"'].join(":"),
  "PREVIEW_BACK_TO_TOP_NATIVE_ICON_RENDERED",
  "gnr8-native-scrollicon-glyph",
  "data-gnr8-native-scrollicon-glyph",
];

function headerValue(headers: Headers | undefined, key: string): string | null {
  if (!headers) return null;
  const value = headers.get(key);
  if (value === null) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSiteIdFromAssetPath(path: string): string | null {
  const match = path.match(/^\/?api\/gnr8\/runtime\/preview-assets\/([^/]+)\//i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function resolveSiteId(input: { expectedSiteId?: string; previewHtml: string; requiredAssets: SmokeAssetExpectation[] }): string | null {
  if (input.expectedSiteId) return input.expectedSiteId;
  for (const asset of input.requiredAssets) {
    const fromPath = normalizeSiteIdFromAssetPath(asset.path);
    if (fromPath) return fromPath;
  }
  const inlineMatch = input.previewHtml.match(/\/api\/gnr8\/runtime\/preview-assets\/([^/]+)\//i);
  return inlineMatch?.[1] ? decodeURIComponent(inlineMatch[1]) : null;
}

function classifyNoiseAsset(path: string): string {
  const normalized = path.toLowerCase();
  if (normalized.includes("/legal") || /\blegal\d+\b/.test(normalized)) return "prefetch_noise";
  if (/\.(pdf|doc|docx|rtf|odt)(\?|$)/i.test(normalized)) return "optional_document_asset";
  if (normalized.includes("downloadvcard")) return "dynamic_download_endpoint";
  return "non_blocking_asset_miss";
}

export async function runPreviewSmokeValidation(
  deps: PreviewSmokeValidatorDependencies,
  target: PreviewSmokeTarget,
): Promise<PreviewSmokeSummary> {
  const previewPath = target.previewPath ?? "/";
  const previewMode = target.previewMode ?? "transformed";
  const previewResponse = await deps.fetchPreviewHtml({
    siteVersionId: target.siteVersionId,
    previewPath,
    previewMode,
  });

  const previewStatus = previewResponse.status;
  const previewHtml = previewResponse.body;
  const selectedPreviewMode = headerValue(previewResponse.headers, "x-gnr8-preview-mode");
  const selectedSourceMode = headerValue(previewResponse.headers, "x-gnr8-preview-source");

  const siteId = resolveSiteId({
    expectedSiteId: target.expectedSiteId,
    previewHtml,
    requiredAssets: target.requiredAssets,
  });

  const forbiddenMarkerChecks = FORBIDDEN_BACK_TO_TOP_MARKERS.map((marker) => ({
    marker,
    ok: !previewHtml.includes(marker),
  }));

  const nativeBackToTopStatus = /class="[^"]*scrollIcon[^"]*"/.test(previewHtml) ? "present" : "missing";
  const mapStatus = /PREVIEW_MAP_MODULE_DETECTED|data-req="osmap"|class="[^"]*\bosmap\b[^"]*"/.test(previewHtml)
    ? "present"
    : "missing";
  const galleryStatus =
    /PREVIEW_GALLERY_PAGED_LAYOUT_STATUS|class="[^"]*\bgallery\b[^"]*"|moduleId!=="m4695"/.test(previewHtml)
      ? "present"
      : "missing";

  const duplicatedPrefixAbsent = !/\/preview-assets\/[^/]+\/[^/]+\/api\/gnr8\/runtime\/preview-assets\//.test(previewHtml);
  const duplicatedPrefixCheck = { marker: "duplicated_preview_assets_prefix_absent", ok: duplicatedPrefixAbsent };

  const identityChecks = target.identitySignals.map((signal) => ({ marker: `identity:${signal}`, ok: previewHtml.includes(signal) }));

  const assetChecks: PreviewSmokeSummary["assetChecks"] = [];
  if (siteId) {
    for (const asset of target.requiredAssets) {
      const normalizedPath = asset.path
        .replace(/^\/?api\/gnr8\/runtime\/preview-assets\/[^/]+\/[^/]+\//i, "")
        .replace(/^\//, "");
      const response = await deps.fetchPreviewAsset({
        siteId,
        siteVersionId: target.siteVersionId,
        assetPath: normalizedPath,
      });
      const ok = response.status === 200 || !asset.required;
      assetChecks.push({
        label: asset.label,
        path: normalizedPath,
        required: asset.required,
        status: response.status,
        ok,
      });
    }
  }

  const nonBlockingNoise: PreviewSmokeSummary["nonBlockingNoise"] = [];
  if (siteId) {
    for (const path of target.optionalNoiseAssets ?? []) {
      const normalizedPath = path.replace(/^\//, "");
      const response = await deps.fetchPreviewAsset({
        siteId,
        siteVersionId: target.siteVersionId,
        assetPath: normalizedPath,
      });
      if (response.status !== 200) {
        nonBlockingNoise.push({
          path: normalizedPath,
          status: response.status,
          classification: classifyNoiseAsset(normalizedPath),
        });
      }
    }
  }

  const hardChecks = [
    previewStatus === 200,
    selectedPreviewMode !== null,
    selectedSourceMode !== null,
    duplicatedPrefixCheck.ok,
    nativeBackToTopStatus === "present",
    mapStatus === "present",
    galleryStatus === "present",
    identityChecks.every((entry) => entry.ok),
    forbiddenMarkerChecks.every((entry) => entry.ok),
    assetChecks.every((entry) => entry.ok),
  ];

  return {
    siteLabel: target.siteLabel,
    siteId,
    siteVersionId: target.siteVersionId,
    previewStatus,
    previewMode: selectedPreviewMode,
    sourceMode: selectedSourceMode,
    assetChecks,
    forbiddenMarkerChecks: [...forbiddenMarkerChecks, duplicatedPrefixCheck, ...identityChecks],
    nativeBackToTopStatus,
    mapStatus,
    galleryStatus,
    nonBlockingNoise,
    pass: hardChecks.every(Boolean),
  };
}
