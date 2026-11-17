import { ORIGINAL_ASTRO_CONFIG, projectStackiRetainedAssets } from './stacki-retained-assets';
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
  assetMode?: "runtime-overlay";
  binding: StackiSourceBinding;
  readVerifiedAsset(asset: StackiSourceAsset, filePath: string, allowedPaths: string[]): Promise<Uint8Array>;
}): Promise<{ files: StackiDraftFile[]; sourceSnapshotSha256: string; assetCount: number; runtimeAssets?: StackiSourceAsset[] }> {
  const workspace = record(input.workspace);
  const binding = input.binding;
  if (workspace.adapterId !== "astro-static-site" ||
      workspace.adapterVersion !== "gnr8-output-adapter-selection:v1" ||
      workspace.sourceSiteVersionId !== binding.sourceSiteVersionId ||
      workspace.sourceArtifactId !== binding.sourceArtifactId ||
      !Array.isArray(workspace.files) || workspace.files.length > 256 ||
      !Array.isArray(workspace.assetEvidence) || workspace.assetEvidence.length > 5000 ||
      !Array.isArray(binding.requiredAssets) || binding.requiredAssets.length > (input.assetMode === "runtime-overlay" ? 2000 : 256)) invalid();
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
    if (asset.sizeBytes > (input.assetMode === "runtime-overlay" ? 12 * 1024 * 1024 : STACKI_FILE_MAX_BYTES)) throw new StackiDraftError(413, "STACKI_CHECKPOINT_TOO_LARGE");
    requested.add(asset.path);
    return asset;
  });
  if (input.assetMode === "runtime-overlay") {
    if (assets.reduce((total,asset) => total + asset.sizeBytes,0) > 128 * 1024 * 1024)
      throw new StackiDraftError(413,"STACKI_RETAINED_ASSETS_TOO_LARGE");
    for (const asset of assets) {
      const path = asset.path.slice(prefix.length);
      let decoded: string;
      try { decoded = decodeURIComponent(path); } catch { invalid(); }
      if (!path || path.length > 2048 || /[?#\\\u0000-\u001f]/.test(decoded!) ||
          decoded!.split('/').some(part => !part || part === '.' || part === '..')) invalid();
    }
    const projected = projectStackiRetainedAssets(files,assets);
    return {files:parseStackiSave({expectedRevision:0,files:projected}).files,sourceSnapshotSha256:source.aggregateSha256,assetCount:assets.length,runtimeAssets:assets};
  }
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

/** Explicit preparation of a NEW baseline, never an edit to a saved checkpoint.
 * The caller must independently verify the retained source and persist the new
 * source identity/provenance before treating it as a candidate baseline.
 * This intentionally supports only the old GNR8-generated dependency manifest.
 */
export function prepareStackiAstro7Baseline(input: {
  files: StackiDraftFile[];
  expectedSourceSnapshotSha256: string;
}) {
  const files = parseStackiSave({ expectedRevision: 0, files: input.files }).files;
  const snapshot = (items: StackiDraftFile[]) => createAstroStaticSiteSourceSnapshot(
    items.filter(file => !file.path.startsWith('.studio-state/')).map(file => ({ path: file.path, body: Buffer.from(file.base64, 'base64') })),
  );
  const previous = snapshot(files);
  const configFile = files.find(file => file.path === 'astro.config.mjs');
  if (!configFile) invalid();
  const config = Buffer.from(configFile.base64, 'base64').toString('utf8');
  // The verified retained-asset projection changes only this config. Compare
  // the recorded generator identity with its exact pre-projection source.
  const original = previous.aggregateSha256 === input.expectedSourceSnapshotSha256 ? previous : snapshot(
    files.map(file => file.path === 'astro.config.mjs' ?
      {path:file.path,base64:Buffer.from(ORIGINAL_ASTRO_CONFIG).toString('base64')} : file));
  if (original.aggregateSha256 !== input.expectedSourceSnapshotSha256) invalid();
  const packageFile = files.find(file => file.path === 'package.json');
  if (!packageFile || files.some(file => /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|npm-shrinkwrap\.json)$/.test(file.path))) invalid();
  let pkg: Record<string, unknown>;
  try { pkg = record(JSON.parse(Buffer.from(packageFile.base64, 'base64').toString('utf8'))); } catch { invalid(); }
  const exact = (actual: unknown, expected: Record<string, unknown>) => {
    const value = record(actual);
    return Object.keys(value).length === Object.keys(expected).length && Object.entries(expected).every(([key, item]) => value[key] === item);
  };
  const currentAstro7 = Object.keys(pkg).sort().join(',') === 'dependencies,engines,name,private,scripts,type,version' &&
    exact(pkg.engines, {node:'26.x'}) && exact(pkg.dependencies, {astro:'7.4.4'});
  const legacyAstro5 = Object.keys(pkg).sort().join(',') === 'dependencies,name,private,scripts,type,version' &&
    exact(pkg.dependencies, {astro:'^5.0.0'});
  if ((!currentAstro7 && !legacyAstro5) ||
      typeof pkg.name !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(pkg.name) || pkg.version !== '0.0.0' || pkg.private !== true || pkg.type !== 'module' ||
      !exact(pkg.scripts, {
        dev: 'astro dev --host 127.0.0.1 --port 4321', build: 'astro build', preview: 'astro preview --host 127.0.0.1 --port 4321',
      })) invalid();
  const marker = "export default defineConfig({output:'static',vite:{plugins:[{";
  if (!config.includes("name:'gnr8-retained-assets-v1',apply:'serve'") || config.split(marker).length !== 2) invalid();
  if (currentAstro7) return {files,sourceSnapshot:previous,derivedFromSourceSnapshot:original,
    preparationVersion:'gnr8-stacki-astro7-baseline:v1' as const,changedPaths:[] as string[]};
  // Preserve legacy retained CSS verbatim. Astro 7's LightningCSS minifier
  // rejects old IE syntax; this changes build configuration, never CSS/code
  // permissions on a saved checkpoint. It belongs only in the NEW baseline.
  const compatibleConfig = config.replace(marker, "export default defineConfig({output:'static',vite:{build:{cssMinify:false},plugins:[{");
  const next = files.map(file => file.path === 'package.json' ? {
    path: file.path, base64: Buffer.from(JSON.stringify({ ...pkg, engines: { node: '26.13.0' }, dependencies: { astro: '7.4.4' } }, null, 2) + '\n').toString('base64'),
  } : file.path === 'astro.config.mjs' ? { path: file.path, base64: Buffer.from(compatibleConfig).toString('base64') } : { ...file });
  return { files: next, sourceSnapshot: snapshot(next), derivedFromSourceSnapshot: original,
    preparationVersion: 'gnr8-stacki-astro5-to-7-baseline:v1' as const, changedPaths: ['package.json', 'astro.config.mjs'] as const };
}
