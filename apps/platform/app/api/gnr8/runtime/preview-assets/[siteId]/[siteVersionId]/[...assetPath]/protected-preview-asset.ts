import "server-only";
import { retainedStylesheetSourceUrl } from "@/gnr8/validation/runtime/retained-css-dependency-path";
import { createHash } from "node:crypto";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";
import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";
import { SupabaseAstroCandidateOwnershipResolver } from "@/gnr8/output-adapters/astro-production-candidate-ownership-resolver";
import { isAstroProductionCandidatePreviewFeatureEnabled } from "@/gnr8/output-adapters/astro-production-candidate-preview-feature-gate";
import { resolveAssetMediaType, rewriteRawTemplateCssForRuntime } from "@/src/public-site/raw-template-runtime";

const headers = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
  "cross-origin-resource-policy": "same-origin",
  "content-security-policy": "sandbox; default-src 'none'",
};

/** Use the same stateless data target as the protected candidate HTML. Never
 * acquire a session-pool connection for each image/font in a review page. */
export async function readProtectedPreviewAsset(
  input: { siteId: string; siteVersionId: string; path: string; host?: string },
  dependencies = {
    enabled: () => (process.env.VERCEL_ENV === "preview" || (process.env.VERCEL_ENV === "production" && input.host === "app.pasadenagenerator.com")) && isAstroProductionCandidatePreviewFeatureEnabled(),
    authenticate: requireSuperadminUserId,
    client: getSupabaseServiceRoleClient,
    ownership: (siteVersionId: string, expectedRuntimeSiteId: string) =>
      new SupabaseAstroCandidateOwnershipResolver().resolve({ siteVersionId, expectedRuntimeSiteId }),
  },
): Promise<Response | null> {
  if (!dependencies.enabled() || !/\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot)$/i.test(input.path)) return null;
  const fail = (status: number) => new Response("Preview asset unavailable.", { status, headers });
  try {
    await dependencies.authenticate();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return fail(message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500);
  }
  try {
    await dependencies.ownership(input.siteVersionId, input.siteId);
    const client = dependencies.client();
    if (!client) return fail(503);
    return await readVerifiedRetainedAsset(input, client);
  } catch { return fail(500); }
}

/** Caller must establish either authenticated ownership or an active public artifact binding. */
export async function readVerifiedRetainedAsset(
  input: { siteId: string; siteVersionId: string; path: string; expectedSha256?: string; allowedPaths?: string[] },
  client: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
): Promise<Response> {
  const fail = (status: number) => new Response("Retained asset unavailable.", { status, headers });
  try {
    const { data: artifacts, error: artifactError } = await client.from("gnr8_runtime_raw_template_artifacts")
      .select("id,site_id,site_version_id,file_map")
      .eq("site_version_id", input.siteVersionId).eq("site_id", input.siteId)
      .in("artifact_type", ["raw_imported_site", "raw_template_site"]).limit(2);
    if (artifactError) return fail(500);
    if (artifacts?.length !== 1) return fail(404);
    const artifact = artifacts[0];
    const entry = artifact.file_map?.[input.path];
    if (!entry || entry.path !== input.path) return fail(404);
    const { data: files, error: fileError } = await client.from("gnr8_runtime_raw_template_artifact_files")
      .select("media_type,file_size_bytes,sha256,content_bytes")
      .eq("artifact_id", artifact.id).eq("file_path", input.path).limit(2);
    if (fileError) return fail(500);
    if (files?.length !== 1) return fail(404);
    const file = files[0];
    // PostgREST encodes PostgreSQL bytea as hex, not base64.
    if (typeof file.content_bytes !== "string" || !/^\\x(?:[a-f0-9]{2})*$/i.test(file.content_bytes)) return fail(500);
    const bytes = Buffer.from(file.content_bytes.slice(2), "hex");
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== file.file_size_bytes || bytes.length !== entry.sizeBytes ||
      digest !== file.sha256 || digest !== entry.sha256 || file.media_type !== entry.mediaType ||
      (input.expectedSha256 !== undefined && digest !== input.expectedSha256)) return fail(500);
    let stylesheetSourceUrl: string | null = null;
    const sourceMap = artifact.file_map['url-fetch-manifest.json'];
    if (input.path.endsWith('.css') && sourceMap) {
      const result = await client.from('gnr8_runtime_raw_template_artifact_files').select('content_bytes')
        .eq('artifact_id',artifact.id).eq('file_path','url-fetch-manifest.json').single();
      if (result.error || typeof result.data?.content_bytes !== 'string' || !/^\\x(?:[a-f0-9]{2})*$/i.test(result.data.content_bytes)) return fail(500);
      stylesheetSourceUrl = retainedStylesheetSourceUrl({bytes:Buffer.from(result.data.content_bytes.slice(2),'hex'),expectedSha256:sourceMap.sha256,expectedSizeBytes:sourceMap.sizeBytes,stylesheetPath:input.path});
    }
    const body = input.path.endsWith(".css") ? rewriteRawTemplateCssForRuntime({
      css: bytes.toString("utf8"), siteId: input.siteId, siteVersionId: input.siteVersionId, assetFilePath: input.path, stylesheetSourceUrl, versionCssUrls: true,
      fileMapPaths: new Set(input.allowedPaths ?? Object.keys(artifact.file_map)),
    }) : new Uint8Array(bytes);
    return new Response(body, { status: 200, headers: {
      ...headers,
      "content-type": resolveAssetMediaType({ filePath: input.path, mediaType: file.media_type }),
      "x-gnr8-preview-asset-path": input.path,
    } });
  } catch {
    return fail(500);
  }
}
