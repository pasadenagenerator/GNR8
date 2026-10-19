import "server-only";
import { createHash } from "node:crypto";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";
import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";
import { SupabaseAstroCandidateOwnershipResolver } from "@/gnr8/output-adapters/astro-production-candidate-ownership-resolver";
import { isAstroProductionCandidatePreviewFeatureEnabled } from "@/gnr8/output-adapters/astro-production-candidate-preview-feature-gate";
import { resolveAssetMediaType } from "@/src/public-site/raw-template-runtime";

const headers = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
  "cross-origin-resource-policy": "same-origin",
  "content-security-policy": "sandbox; default-src 'none'",
};

/** Use the same stateless data target as the protected candidate HTML. Never
 * acquire a session-pool connection for each image/font in a review page. */
export async function readProtectedPreviewAsset(
  input: { siteId: string; siteVersionId: string; path: string },
  dependencies = {
    enabled: () => process.env.VERCEL_ENV === "preview" && isAstroProductionCandidatePreviewFeatureEnabled(),
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
      digest !== file.sha256 || digest !== entry.sha256 || file.media_type !== entry.mediaType) return fail(500);
    return new Response(new Uint8Array(bytes), { status: 200, headers: {
      ...headers,
      "content-type": resolveAssetMediaType({ filePath: input.path, mediaType: file.media_type }),
      "x-gnr8-preview-asset-path": input.path,
    } });
  } catch {
    return fail(500);
  }
}
