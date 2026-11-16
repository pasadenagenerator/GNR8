/** Pure local bridge from the existing confirmed standalone release contract.
 * Caller supplies bytes read from the existing immutable release store.
 */
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { loadPinnedRelease } from './load-pinned-release.mjs';
import { configuration, prepareNativeStudio, STACKI_RELEASE_PIN } from './prepare-native-studio.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = () => { throw new Error('Confirmed export or Studio binding mismatch'); };
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
export async function prepareFromVerifiedAstroExport({ exported, selection, confirmationSha256, releaseFile, site }) {
  const expectedFiles = verifyAstroExport({ exported, selection, confirmationSha256, site });
  return prepareVerifiedAstroFiles({ files: exported.files, expectedFiles,
    manifestSha256: exported.manifestSha256, selection, confirmationSha256, releaseFile, site });
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

async function prepareVerifiedAstroFiles({ files, expectedFiles, manifestSha256, selection, confirmationSha256, releaseFile, site }) {
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
    const status = await prepareNativeStudio({ project: root, releaseFile, site });
    const added = [];
    async function collect(directory, prefix = '') {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) await collect(join(directory, entry.name), path);
        else if (!files.some(file => file.path === path)) added.push({ path, body: await readFile(join(directory, entry.name)) });
      }
    }
    await collect(root);
    // Runtime draft/update directories and local receipt are not Git source.
    const output = [...files.filter(file => file.path !== 'vercel.json' && file.path !== 'README.md'),
      ...added.filter(file => file.path.startsWith('studio/') || file.path === 'cloudflare/site.wrangler.json')];
    output.push({ path: 'README.native-studio.md', body: Buffer.from(
      `# Native Stacki site\n\nSource export: ${manifestSha256}\nStacki: ${status.version}\n` +
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
  const bindingSha256 = digest(Buffer.from(JSON.stringify(site)));
  const key = `releases/${releaseId}/native-studio-${bindingSha256}.json`;
  const existing = await store.read(key);
  if (existing) {
    if (existing.format !== 'gnr8-native-studio-derivative:v1' ||
        existing.releaseId !== releaseId || existing.bindingSha256 !== bindingSha256 ||
        !/^[a-f0-9]{64}$/.test(existing.sourceManifestSha256) ||
        existing.version !== STACKI_RELEASE_PIN.version || !Array.isArray(existing.files) ||
        existing.files.length > 3000 ||
        existing.files.reduce((n, file) => n + file.bytes, 0) > 64_000_000 ||
        new Set(existing.files.map(file => file.path)).size !== existing.files.length) fail();
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
  if (files.length > 3000 || files.reduce((total, file) => total + file.bytes, 0) > 64_000_000) fail();
  for (const file of prepared.files) await store.putBytes(digest(file.body), file.body);
  const receipt = { format: 'gnr8-native-studio-derivative:v1', releaseId, bindingSha256,
    sourceManifestSha256: prepared.sourceManifestSha256, version: prepared.status.version, files };
  await store.put(key, receipt);
  return { receipt, files: prepared.files, reused: false };
}

/** Target-free immutable derivative. The caller must first verify current
 * capture/Brand/technical acceptance and pass its confirmation SHA. */
export async function persistVerifiedAstroStudio({ store, exported, selection, confirmationSha256, site,
  releaseFile, getReleaseFile = () => loadPinnedRelease({ directory: join(tmpdir(), 'gnr8-pinned-stacki') }) }) {
  verifyAstroExport({ exported, selection, confirmationSha256, site });
  const bindingSha256 = digest(Buffer.from(JSON.stringify(configuration(site).site)));
  const sourceManifestSha256 = exported.manifestSha256;
  const identitySha256 = digest(Buffer.from(JSON.stringify({
    sourceManifestSha256, confirmationSha256, bindingSha256, stackiReleaseSha256: STACKI_RELEASE_PIN.sha256,
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
    releaseFile: releaseFile ?? await getReleaseFile() });
  const files = prepared.files.map(file => ({ path: file.path, sha256: digest(file.body), bytes: file.body.length }));
  validatePreparedEntries(files);
  for (const file of prepared.files) await store.putBytes(digest(file.body), file.body);
  const receipt = { format: 'gnr8-native-studio-source:v1', identitySha256, bindingSha256,
    sourceManifestSha256, confirmationSha256, version: prepared.status.version, files };
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
  const bindingSha256 = digest(Buffer.from(JSON.stringify(configuration(site).site)));
  if (!receipt || receipt.format !== 'gnr8-native-studio-source:v1' ||
      receipt.identitySha256 !== sourceId || receipt.bindingSha256 !== bindingSha256 ||
      !/^[a-f0-9]{64}$/.test(receipt.sourceManifestSha256) ||
      !/^[a-f0-9]{64}$/.test(receipt.confirmationSha256) ||
      receipt.version !== STACKI_RELEASE_PIN.version ||
      digest(Buffer.from(JSON.stringify({
        sourceManifestSha256: receipt.sourceManifestSha256,
        confirmationSha256: receipt.confirmationSha256,
        bindingSha256, stackiReleaseSha256: STACKI_RELEASE_PIN.sha256,
      }))) !== sourceId) fail();
  validatePreparedEntries(receipt.files);
  const byPath = new Map(receipt.files.map(file => [file.path, file]));
  if (!['source-manifest.json', 'package.json', 'package-lock.json',
      'studio/src/cloudflare/site.ts', 'cloudflare/site.wrangler.json']
      .every(path => byPath.has(path)) ||
      byPath.get('source-manifest.json').sha256 !== receipt.sourceManifestSha256 ||
      receipt.files.some(file => file.path === 'vercel.json' ||
        file.path.startsWith('api/') || file.path.startsWith('functions/'))) fail();
  const files = [];
  for (const file of receipt.files) {
    const body = await store.getBytes(file.sha256);
    if (!Buffer.isBuffer(body) || body.length !== file.bytes || digest(body) !== file.sha256) fail();
    files.push({ path: file.path, body });
  }
  return { receipt, files, reused: true };
}

function validatePreparedEntries(files) {
  if (!Array.isArray(files) || files.length === 0 || files.length > 3000 ||
      files.some(file => !file || typeof file.path !== 'string' ||
        !/^[A-Za-z0-9_@+.-]+(?:\/[A-Za-z0-9_@+.-]+)*$/.test(file.path) ||
        file.path.split('/').some(part => part === '.' || part === '..' || part === '.git' ||
          part === '.gitattributes' || part === '.gitmodules') ||
        !/^[a-f0-9]{64}$/.test(file.sha256) ||
        !Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > 12_000_000)) fail();
  if (files.reduce((n, file) => n + file.bytes, 0) > 64_000_000 ||
      new Set(files.map(file => file.path)).size !== files.length) fail();
}
