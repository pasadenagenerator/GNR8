import {
  materializeGeneratedWebsiteVersionThumbnail,
  materializeOriginalWebsiteVersionThumbnail,
} from "./website-version-thumbnail-materializer";

const ODV_SITE_VERSION_ID = "09dce7ea-d860-4f60-a1eb-26c3335b302e";

function targetFromArgs(args: string[]): "original" | "1" | "2" | "all" {
  const target = args.find((arg) => arg.startsWith("--target="))?.split("=")[1] ?? "all";
  if (target === "original" || target === "1" || target === "2" || target === "all") return target;
  throw new Error("Invalid --target. Use original, 1, 2, or all.");
}

async function main() {
  const args = process.argv.slice(2);
  const target = targetFromArgs(args);
  const persist = args.includes("--persist");
  const mode = persist ? "persist" : "dry_run";
  const basePreviewUrl = args.find((arg) => arg.startsWith("--base-preview-url="))?.split("=")[1] ?? process.env.WVT_BASE_PREVIEW_URL;
  const browserCookieHeader = process.env.WVT_BROWSER_COOKIE_HEADER ?? null;
  const results = [];

  if (target === "original" || target === "all") {
    results.push(["original", await materializeOriginalWebsiteVersionThumbnail({
      siteVersionId: ODV_SITE_VERSION_ID,
      mode,
      options: { basePreviewUrl, browserCookieHeader },
    })] as const);
  }
  if (target === "1" || target === "all") {
    results.push(["iteration 1", await materializeGeneratedWebsiteVersionThumbnail({
      siteVersionId: ODV_SITE_VERSION_ID,
      iteration: 1,
      mode,
      options: { basePreviewUrl, browserCookieHeader },
    })] as const);
  }
  if (target === "2" || target === "all") {
    results.push(["iteration 2", await materializeGeneratedWebsiteVersionThumbnail({
      siteVersionId: ODV_SITE_VERSION_ID,
      iteration: 2,
      mode,
      options: { basePreviewUrl, browserCookieHeader },
    })] as const);
  }

  console.log(JSON.stringify({
    ok: results.every(([, result]) => result.ok),
    siteVersionId: ODV_SITE_VERSION_ID,
    mode,
    productionWriteBoundary: persist ? "explicit --persist requested" : "dry-run/read-only; no writes performed",
    results: results.map(([label, result]) => result.ok ? {
      label,
      ok: true,
      wrote: result.wrote,
      artifactId: result.artifact.artifactId,
      mediaType: result.artifact.mediaType,
      dimensions: { width: result.artifact.imageWidth, height: result.artifact.imageHeight },
      byteLength: result.artifact.byteLength,
      contentHash: result.artifact.contentHash,
      sourceArtifactId: result.artifact.sourceArtifactId,
      diagnostics: result.diagnostics,
    } : {
      label,
      ok: false,
      code: result.code,
      message: result.message,
      diagnostics: result.diagnostics,
    }),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
