/** Pure local bridge from the existing confirmed standalone release contract.
 * Caller supplies bytes read from the existing immutable release store.
 */
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { lstat, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { loadPinnedRelease } from './load-pinned-release.mjs';
import { LUMOS_PIN, prepareLumosLibrary } from './prepare-lumos-library.mjs';
import { NATIVE_ASTRO_TOOLCHAIN_PIN, prepareNativeAstroToolchain } from './native-astro-toolchain.mjs';
import { configuration, prepareNativeStudio, STACKI_RELEASE_PIN } from './prepare-native-studio.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = () => { throw new Error('Confirmed export or Studio binding mismatch'); };
const MAX_PREPARED_FILES = 10_000;
const MAX_PREPARED_BYTES = 256_000_000;
async function pinnedLumosSource() {
  for (const prefix of ['scripts/stacki', '../scripts/stacki', '../../scripts/stacki']) {
    const path = resolve(process.cwd(), prefix, 'vendor/lumos-1.0.4');
    const stat = await lstat(path).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
    if (stat) {
      if (!stat.isDirectory() || stat.isSymbolicLink()) fail();
      return path;
    }
  }
  throw Error('Pinned Lumos source unavailable');
}
const NATIVE_OVERRIDES = new Set(['package.json', 'package-lock.json', 'astro.config.mjs',
  '.stacki/folders.json', '.stacki/components.json', '.stacki/styles.json']);
const REQUIRED_NATIVE_PATHS = ['source-manifest.json', 'package.json', 'package-lock.json',
  'astro.config.mjs', 'studio/src/cloudflare/site.ts', 'wrangler.json',
  '.stacki/publish.json', 'src/lumos/LICENSE',
  'src/lumos/components/Button.astro',
  'src/lumos/assets/fonts/inter-regular.woff2', '.gnr8/lumos-library.json',
  '.stacki/folders.json', '.stacki/components.json', '.stacki/styles.json'];
const EXPORTED_ASTRO_CONFIGS = new Set([
  'import {defineConfig} from "astro/config";\nexport default defineConfig({output:"static",compressHTML:true});\n',
  'import {defineConfig} from "astro/config";\nexport default defineConfig({output:"static",compressHTML:true,vite:{build:{cssMinify:false}}});\n',
]);
function nativeAstroConfig(site) {
  const origin = configuration(site).site.studioOrigin;
  return Buffer.from(`import { defineConfig, fontProviders } from 'astro/config';\n` +
    `export default defineConfig({\n  output: 'static',\n  compressHTML: true,\n` +
    `  site: ${JSON.stringify(origin)},\n` +
    `  fonts: [{ name: 'Inter', cssVariable: '--font-inter', provider: fontProviders.local(),\n` +
    `    options: { variants: [{ weight: 400, style: 'normal',\n` +
    `      src: ['./src/lumos/assets/fonts/inter-regular.woff2'] }] } }],\n` +
    `  vite: { build: { cssMinify: false } },\n});\n`);
}
async function prepareNativeAstroConfig(project, site) {
  const path = join(project, 'astro.config.mjs');
  if (!EXPORTED_ASTRO_CONFIGS.has(await readFile(path, 'utf8'))) fail();
  await writeFile(path, nativeAstroConfig(site));
}
function preparationBindingSha256(site, access) {
  const configured = configuration(site, access);
  return digest(Buffer.from(JSON.stringify({ site: configured.site,
    ...(configured.access ? { access: configured.access } : {}), files: [...configured.files],
    release: STACKI_RELEASE_PIN, lumosSourceSha256: LUMOS_PIN.sourceSha256,
    astroToolchain: NATIVE_ASTRO_TOOLCHAIN_PIN })));
}
export async function prepareFromConfirmedExport({ release, files, releaseFile, site }) {
  if (!release?.foundation || !/^[a-f0-9]{64}$/.test(release.foundation.confirmationSha256) ||
      !/^[a-f0-9]{64}$/.test(release.manifestSha256) || !Array.isArray(release.files) ||
      !release.input?.selection?.scope || !release.target || !Array.isArray(files) ||
      release.contactRequired || site.siteId !== release.input.selection.scope.siteId ||
      site.repository.toLowerCase() !== `${release.target.githubOwner}/${release.target.repository}`.toLowerCase() ||
      (release.target.provisionedRepositoryId !== undefined && String(release.target.provisionedRepositoryId) !== site.repositoryId)) fail();
  return prepareVerifiedAstroFiles({ files, expectedFiles: release.files,
    manifestSha256: release.manifestSha256, selection: release.input.selection,
    confirmationSha256: release.foundation.confirmationSha256, releaseFile, site });
}

/** Local export boundary for a currently confirmed Astro source. The caller
 * must recheck the current capture/Brand certificate before passing the export. */
export async function prepareFromVerifiedAstroExport({ exported, selection, confirmationSha256, releaseFile, site, access }) {
  const expectedFiles = verifyAstroExport({ exported, selection, confirmationSha256, site });
  return prepareVerifiedAstroFiles({ files: exported.files, expectedFiles,
    manifestSha256: exported.manifestSha256, selection, confirmationSha256, releaseFile, site, access });
}

function verifyAstroExport({ exported, selection, confirmationSha256, site }) {
  if (!exported || exported.contactRequired !== false || !Array.isArray(exported.files) ||
      !/^[a-f0-9]{64}$/.test(exported.manifestSha256) ||
      !/^[a-f0-9]{64}$/.test(confirmationSha256) ||
      !selection?.scope || selection.scope.siteId !== site?.siteId) fail();
  const manifestFile = exported.files.find(file => file.path === 'source-manifest.json');
  if (!manifestFile || !Buffer.isBuffer(manifestFile.body) ||
      digest(manifestFile.body) !== exported.manifestSha256) fail();
  let manifest;
  try { manifest = JSON.parse(manifestFile.body.toString('utf8')); } catch { fail(); }
  if (!Array.isArray(manifest.files) || !Array.isArray(manifest.routes) ||
      manifest.contact !== null ||
      !isDeepStrictEqual(manifest.selection, selection) ||
      !isDeepStrictEqual(manifest.routes, exported.manifest?.routes) ||
      !isDeepStrictEqual(manifest.files, exported.manifest?.files)) fail();
  const expectedFiles = [...manifest.files, { path: 'source-manifest.json',
    sha256: exported.manifestSha256, bytes: manifestFile.body.length }];
  if (exported.files.length !== expectedFiles.length) fail();
  const expected = new Map(expectedFiles.map(file => [file.path, file]));
  if (expected.size !== expectedFiles.length) fail();
  for (const file of exported.files) {
    const item = expected.get(file.path);
    if (!item || !Buffer.isBuffer(file.body) || file.body.length !== item.bytes ||
        digest(file.body) !== item.sha256) fail();
    expected.delete(file.path);
  }
  if (expected.size) fail();
  return expectedFiles;
}

async function prepareVerifiedAstroFiles({ files, expectedFiles, manifestSha256, selection, confirmationSha256, releaseFile, site, access }) {
  const expected = new Map();
  for (const item of expectedFiles) {
    if (!item || typeof item.path !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256) ||
        !Number.isSafeInteger(item.bytes) || item.bytes < 0 || expected.has(item.path)) fail();
    expected.set(item.path, item);
  }
  if (files.length !== expected.size) fail();
  for (const file of files) {
    const entry = expected.get(file.path);
    if (!entry || !Buffer.isBuffer(file.body) || file.body.length !== entry.bytes || digest(file.body) !== entry.sha256) fail();
    expected.delete(file.path);
  }
  const manifestFile = files.find(file => file.path === 'source-manifest.json');
  if (expected.size || !manifestFile || digest(manifestFile.body) !== manifestSha256) fail();
  let manifest;
  try { manifest = JSON.parse(manifestFile.body.toString('utf8')); } catch { fail(); }
  if (!isDeepStrictEqual(manifest.selection, selection) || selection.scope.siteId !== site.siteId) fail();
  const root = await mkdtemp(join(tmpdir(), 'gnr8-confirmed-native-'));
  try {
    for (const file of files) {
      // Store manifest paths are validated again before touching the temp tree.
      if (!/^[A-Za-z0-9_@+.-]+(?:\/[A-Za-z0-9_@+.-]+)*$/.test(file.path) ||
          file.path.split('/').some(part => part === '.' || part === '..' || part === '.git' ||
            part === '.gitattributes' || part === '.gitmodules')) fail();
      const target = join(root, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.body, { flag: 'wx' });
    }
    const status = await prepareNativeStudio({ project: root, releaseFile, site, access });
    await prepareNativeAstroToolchain({ project: root });
    await prepareLumosLibrary({ project: root, upstream: await pinnedLumosSource() });
    await prepareNativeAstroConfig(root, site);
    const added = [];
    async function collect(directory, prefix = '') {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) await collect(join(directory, entry.name), path);
        else if (NATIVE_OVERRIDES.has(path) ||
                 !files.some(file => file.path === path))
          added.push({ path, body: await readFile(join(directory, entry.name)) });
      }
    }
    await collect(root);
    // Runtime draft/update directories and local receipt are not Git source.
    const output = [...files.filter(file => file.path !== 'vercel.json' &&
      file.path !== 'README.md' && !NATIVE_OVERRIDES.has(file.path)),
      ...added.filter(file => file.path.startsWith('studio/') ||
        file.path.startsWith('src/lumos/') ||
        file.path === '.gnr8/lumos-library.json' ||
        NATIVE_OVERRIDES.has(file.path) || configuration(site, access).files.has(file.path))];
    output.push({ path: 'README.native-studio.md', body: Buffer.from(
      `# Native Stacki site\n\nSource export: ${manifestSha256}\nStacki: ${status.version}\nLumos: ${LUMOS_PIN.version}\n` +
      `Repository: ${site.repository}\nBranch: ${site.branch}\n\n` +
      `This is an offline prepared source package. Cloudflare resources, secrets, GitHub App installation, ` +
      `website build pipeline and live revision verification must be configured before hosting or Publish.\n`) });
    output.sort((a, b) => a.path.localeCompare(b.path));
    return { status, sourceManifestSha256: manifestSha256, confirmationSha256, files: output };
  } finally { await rm(root, { recursive: true, force: true }); }
}

/** Existing publication store is the source of truth; no capture or rebuild. */
export async function prepareFromStoredRelease({ store, releaseId, releaseFile, site }) {
  if (!/^[a-f0-9]{64}$/.test(releaseId)) fail();
  const release = await store.read(`releases/${releaseId}/release.json`);
  if (!release || release.id !== releaseId || !Array.isArray(release.files)) fail();
  const files = [];
  for (const file of release.files) files.push({ path: file.path, body: await store.getBytes(file.sha256) });
  return prepareFromConfirmedExport({ release, files, releaseFile, site });
}

/** Persist the prepared derivative in the existing immutable publication store.
 * A retry reuses its receipt and bytes; changing the site binding cannot reuse it.
 */
export async function persistPreparedStudio({ store, releaseId, releaseFile, site, getReleaseFile = () => loadPinnedRelease({ directory: join(tmpdir(), 'gnr8-pinned-stacki') }) }) {
  if (!/^[a-f0-9]{64}$/.test(releaseId)) fail();
  const bindingSha256 = preparationBindingSha256(site);
  const key = `releases/${releaseId}/native-studio-${bindingSha256}.json`;
  const existing = await store.read(key);
  if (existing) {
    if (existing.format !== 'gnr8-native-studio-derivative:v1' ||
        existing.releaseId !== releaseId || existing.bindingSha256 !== bindingSha256 ||
        existing.lumosSourceSha256 !== LUMOS_PIN.sourceSha256 ||
        !isDeepStrictEqual(existing.astroToolchain, NATIVE_ASTRO_TOOLCHAIN_PIN) ||
        !/^[a-f0-9]{64}$/.test(existing.sourceManifestSha256) ||
        existing.version !== STACKI_RELEASE_PIN.version) fail();
    validatePreparedEntries(existing.files);
    if (!REQUIRED_NATIVE_PATHS.every(path => existing.files.some(file => file.path === path))) fail();
    const files = [];
    for (const file of existing.files) {
      const body = await store.getBytes(file.sha256);
      if (body.length !== file.bytes || digest(body) !== file.sha256) fail();
      files.push({ path: file.path, body });
    }
    return { receipt: existing, files, reused: true };
  }
  const prepared = await prepareFromStoredRelease({ store, releaseId, releaseFile: releaseFile ?? await getReleaseFile(), site });
  const files = prepared.files.map(file => ({ path: file.path, sha256: digest(file.body), bytes: file.body.length }));
  if (files.length > MAX_PREPARED_FILES ||
      files.reduce((total, file) => total + file.bytes, 0) > MAX_PREPARED_BYTES) fail();
  for (const file of prepared.files) await store.putBytes(digest(file.body), file.body);
  const receipt = { format: 'gnr8-native-studio-derivative:v1', releaseId, bindingSha256,
    lumosSourceSha256: LUMOS_PIN.sourceSha256, astroToolchain: NATIVE_ASTRO_TOOLCHAIN_PIN,
    sourceManifestSha256: prepared.sourceManifestSha256, version: prepared.status.version, files };
  await store.put(key, receipt);
  return { receipt, files: prepared.files, reused: false };
}

/** Target-free immutable derivative. The caller must first verify current
 * capture/Brand/technical acceptance and pass its confirmation SHA. */
export async function persistVerifiedAstroStudio({ store, exported, selection, confirmationSha256, site, access,
  releaseFile, getReleaseFile = () => loadPinnedRelease({ directory: join(tmpdir(), 'gnr8-pinned-stacki') }) }) {
  verifyAstroExport({ exported, selection, confirmationSha256, site });
  const configured = configuration(site, access);
  const bindingSha256 = preparationBindingSha256(site, configured.access);
  const sourceManifestSha256 = exported.manifestSha256;
  const identitySha256 = digest(Buffer.from(JSON.stringify({
    sourceManifestSha256, confirmationSha256, bindingSha256,
    stackiReleaseSha256: STACKI_RELEASE_PIN.sha256,
    lumosSourceSha256: LUMOS_PIN.sourceSha256,
    astroToolchain: NATIVE_ASTRO_TOOLCHAIN_PIN,
  })));
  const key = `native-sources/${identitySha256}.json`;
  const existing = await store.read(key);
  if (existing) {
    const stored = await verifyStoredStudio({ store, receipt: existing, sourceId: identitySha256, site });
    if (stored.receipt.sourceManifestSha256 !== sourceManifestSha256 ||
        stored.receipt.confirmationSha256 !== confirmationSha256) fail();
    return stored;
  }
  const prepared = await prepareFromVerifiedAstroExport({ exported, selection, confirmationSha256, site,
    access: configured.access,
    releaseFile: releaseFile ?? await getReleaseFile() });
  const files = prepared.files.map(file => ({ path: file.path, sha256: digest(file.body), bytes: file.body.length }));
  validatePreparedEntries(files);
  for (const file of prepared.files) await store.putBytes(digest(file.body), file.body);
  const receipt = { format: configured.access ? 'gnr8-native-studio-source:v2' : 'gnr8-native-studio-source:v1',
    identitySha256, bindingSha256,
    sourceManifestSha256, confirmationSha256, version: prepared.status.version,
    lumosSourceSha256: LUMOS_PIN.sourceSha256,
    astroToolchain: NATIVE_ASTRO_TOOLCHAIN_PIN,
    ...(configured.access ? { access: configured.access } : {}), files };
  if (!isDeepStrictEqual(await store.put(key, receipt), receipt)) fail();
  return { receipt, files: prepared.files, reused: false };
}

/** Verify a saved target-free package before Git staging or any other use. */
export async function readStoredVerifiedAstroStudio({ store, sourceId, site }) {
  if (typeof sourceId !== 'string' || !/^[a-f0-9]{64}$/.test(sourceId)) fail();
  const receipt = await store.read(`native-sources/${sourceId}.json`);
  return verifyStoredStudio({ store, receipt, sourceId, site });
}

async function verifyStoredStudio({ store, receipt, sourceId, site }) {
  if (!receipt || !['gnr8-native-studio-source:v1', 'gnr8-native-studio-source:v2'].includes(receipt.format)) fail();
  const access = receipt.format === 'gnr8-native-studio-source:v2' ? receipt.access : undefined;
  let configured;
  try { configured = configuration(site, access); } catch { fail(); }
  if ((receipt.format === 'gnr8-native-studio-source:v2' && !configured.access) ||
      (receipt.format === 'gnr8-native-studio-source:v1' && receipt.access !== undefined) ||
      (configured.access && !isDeepStrictEqual(receipt.access, configured.access))) fail();
  const bindingSha256 = preparationBindingSha256(site, access);
  if (
      receipt.identitySha256 !== sourceId || receipt.bindingSha256 !== bindingSha256 ||
      receipt.lumosSourceSha256 !== LUMOS_PIN.sourceSha256 ||
      !isDeepStrictEqual(receipt.astroToolchain, NATIVE_ASTRO_TOOLCHAIN_PIN) ||
      !/^[a-f0-9]{64}$/.test(receipt.sourceManifestSha256) ||
      !/^[a-f0-9]{64}$/.test(receipt.confirmationSha256) ||
      receipt.version !== STACKI_RELEASE_PIN.version ||
      digest(Buffer.from(JSON.stringify({
        sourceManifestSha256: receipt.sourceManifestSha256,
        confirmationSha256: receipt.confirmationSha256,
        bindingSha256, stackiReleaseSha256: STACKI_RELEASE_PIN.sha256,
        lumosSourceSha256: LUMOS_PIN.sourceSha256,
        astroToolchain: NATIVE_ASTRO_TOOLCHAIN_PIN,
      }))) !== sourceId) fail();
  validatePreparedEntries(receipt.files);
  const byPath = new Map(receipt.files.map(file => [file.path, file]));
  if (!REQUIRED_NATIVE_PATHS.every(path => byPath.has(path)) ||
      (configured.access && !['.stacki/roles.json', 'studio/cloudflare/wrangler.jsonc']
        .every(path => byPath.has(path))) ||
      byPath.get('source-manifest.json').sha256 !== receipt.sourceManifestSha256 ||
      byPath.get('package.json').sha256 !== NATIVE_ASTRO_TOOLCHAIN_PIN.packageSha256 ||
      byPath.get('package-lock.json').sha256 !== NATIVE_ASTRO_TOOLCHAIN_PIN.lockSha256 ||
      byPath.get('astro.config.mjs')?.sha256 !== digest(nativeAstroConfig(site)) ||
      receipt.files.some(file => file.path === 'vercel.json' ||
        file.path.startsWith('api/') || file.path.startsWith('functions/'))) fail();
  const files = [];
  for (const file of receipt.files) {
    const body = await store.getBytes(file.sha256);
    if (!Buffer.isBuffer(body) || body.length !== file.bytes || digest(body) !== file.sha256) fail();
    files.push({ path: file.path, body });
  }
  if (configured.access && [...configured.files].some(([path, expected]) =>
    !files.some(file => file.path === path && file.body.equals(Buffer.from(expected))))) fail();
  let lumosReceipt;
  try { lumosReceipt = JSON.parse(files.find(file =>
    file.path === '.gnr8/lumos-library.json').body.toString('utf8')); }
  catch { fail(); }
  if (lumosReceipt.format !== 'gnr8-lumos-library:v1' ||
      !isDeepStrictEqual(lumosReceipt.upstream, LUMOS_PIN) ||
      !Array.isArray(lumosReceipt.files) || lumosReceipt.files.length === 0 ||
      lumosReceipt.files.some(file =>
        !file || typeof file.path !== 'string' ||
        byPath.get(file.path)?.sha256 !== file.sha256)) fail();
  return { receipt, files, reused: true };
}

function validatePreparedEntries(files) {
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_PREPARED_FILES ||
      files.some(file => !file || typeof file.path !== 'string' ||
        !/^[A-Za-z0-9_@+.-]+(?:\/[A-Za-z0-9_@+.-]+)*$/.test(file.path) ||
        file.path.split('/').some(part => part === '.' || part === '..' || part === '.git' ||
          part === '.gitattributes' || part === '.gitmodules') ||
        !/^[a-f0-9]{64}$/.test(file.sha256) ||
        !Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > 12_000_000)) fail();
  if (files.reduce((n, file) => n + file.bytes, 0) > MAX_PREPARED_BYTES ||
      new Set(files.map(file => file.path)).size !== files.length) fail();
}
