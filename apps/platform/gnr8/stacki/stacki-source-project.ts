import { createHash } from "node:crypto";
import { createAstroStaticSiteSourceSnapshot } from "../output-adapters/astro-static-site-workspace-preparation";
import { StackiDraftError, parseStackiSave, STACKI_FILE_MAX_BYTES, STACKI_PROJECT_MAX_BYTES, type StackiDraftFile } from "./stacki-draft-contract";

export type StackiSourceBinding = {
  runtimeSiteId: string;
  sourceSiteVersionId: string;
  sourceArtifactId: string;
  sourceSnapshotSha256: string;
  requiredAssets: Array<{ path: string; sha256: string }>;
};
export type StackiSourceAsset = { path: string; mediaType: string; sizeBytes: number; sha256: string };

/**
 * Uses the persisted generator source, not compiled HTML or a regenerated page.
 * Retained assets keep their exact version-scoped URL under public/. CSS bytes
 * come from the existing verified preview resolver, including its dependency
 * rewriting. Thus a separate editor origin needs no Platform session cookies.
 */
export async function prepareStackiSourceProject(input: {
  workspace: unknown;
  binding: StackiSourceBinding;
  readVerifiedAsset(asset: StackiSourceAsset, filePath: string, allowedPaths: string[]): Promise<Uint8Array>;
}): Promise<{ files: StackiDraftFile[]; sourceSnapshotSha256: string; assetCount: number }> {
  const workspace = record(input.workspace);
  const binding = input.binding;
  if (workspace.adapterId !== "astro-static-site" ||
      workspace.adapterVersion !== "gnr8-output-adapter-selection:v1" ||
      workspace.sourceSiteVersionId !== binding.sourceSiteVersionId ||
      workspace.sourceArtifactId !== binding.sourceArtifactId ||
      !Array.isArray(workspace.files) || workspace.files.length > 256 ||
      !Array.isArray(workspace.assetEvidence) || workspace.assetEvidence.length > 5000 ||
      !Array.isArray(binding.requiredAssets) || binding.requiredAssets.length > 256) invalid();
  let sourceBytes = 0;
  const sourceFiles = workspace.files.map(value => {
    const file = record(value);
    if (typeof file.path !== "string" || typeof file.contents !== "string" ||
        Buffer.byteLength(file.contents) > STACKI_FILE_MAX_BYTES) invalid();
    sourceBytes += Buffer.byteLength(file.contents);
    if (sourceBytes > STACKI_PROJECT_MAX_BYTES) throw new StackiDraftError(413, "STACKI_CHECKPOINT_TOO_LARGE");
    const body = Buffer.from(file.contents);
    if (file.bytes !== body.length || file.sha256 !== hash(body)) invalid();
    return { path: file.path, body };
  });
  // Apply checkpoint bounds/path policy BEFORE any asset read or storage write.
  const files = parseStackiSave({
    expectedRevision: 0, files: sourceFiles.map(file => ({ path: file.path, base64: file.body.toString("base64") })),
  }).files;
  const source = createAstroStaticSiteSourceSnapshot(sourceFiles);
  if (source.aggregateSha256 !== binding.sourceSnapshotSha256) invalid();
  const prefix = `/api/gnr8/runtime/preview-assets/${encodeURIComponent(binding.runtimeSiteId)}/${encodeURIComponent(binding.sourceSiteVersionId)}/`;
  const evidence = new Map<string, StackiSourceAsset>();
  for (const value of workspace.assetEvidence) {
    const asset = record(value);
    if (typeof asset.path !== "string" || !asset.path.startsWith(prefix) ||
        typeof asset.mediaType !== "string" || !Number.isSafeInteger(asset.sizeBytes) ||
        Number(asset.sizeBytes) < 0 || typeof asset.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(asset.sha256) ||
        evidence.has(asset.path)) invalid();
    evidence.set(asset.path, asset as StackiSourceAsset);
  }
  const requested = new Set<string>();
  const assets = binding.requiredAssets.map(required => {
    const asset = evidence.get(required.path);
    if (!asset || requested.has(asset.path) || asset.sha256 !== required.sha256) invalid();
    if (asset.sizeBytes > STACKI_FILE_MAX_BYTES) throw new StackiDraftError(413, "STACKI_CHECKPOINT_TOO_LARGE");
    requested.add(asset.path);
    return asset;
  });
  // Preserve the existing limits instead of partially dropping pictures/fonts.
  if (assets.reduce((total, asset) => total + asset.sizeBytes, sourceBytes) > STACKI_PROJECT_MAX_BYTES)
    throw new StackiDraftError(413, "STACKI_CHECKPOINT_TOO_LARGE");
  const allowedPaths = assets.map(asset => asset.path.slice(prefix.length));
  // Empty placeholders validate all destination paths/collisions before I/O.
  parseStackiSave({ expectedRevision: 0, files: [...files, ...assets.map(asset => ({ path: `public${asset.path}`, base64: "" }))] });
  for (const asset of assets) {
    const bytes = await input.readVerifiedAsset(asset, asset.path.slice(prefix.length), allowedPaths);
    if (bytes.byteLength > STACKI_FILE_MAX_BYTES) throw new StackiDraftError(413, "STACKI_CHECKPOINT_TOO_LARGE");
    // CSS is intentionally rewritten by the authoritative resolver AFTER raw
    // integrity verification. Other asset bytes must be unchanged.
    if (!asset.path.endsWith(".css") && (bytes.byteLength !== asset.sizeBytes || hash(bytes) !== asset.sha256)) invalid();
    files.push({ path: `public${asset.path}`, base64: Buffer.from(bytes).toString("base64") });
  }
  return { files: parseStackiSave({ expectedRevision: 0, files }).files,
    sourceSnapshotSha256: source.aggregateSha256, assetCount: assets.length };
}
function hash(bytes: Uint8Array) { return createHash("sha256").update(bytes).digest("hex"); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function invalid(): never { throw new StackiDraftError(422, "STACKI_SOURCE_PROJECT_INVALID"); }
