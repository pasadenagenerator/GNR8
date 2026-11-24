/** Immutable byte handoff for the two generated output trees. */
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, mkdtemp, open, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { scanStudioBuildOutputs } from './build-handoff.mjs';

export const NATIVE_STUDIO_BUILD_OUTPUT_BYTES =
  'native-studio/build-output-bytes-v1.json';
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const CHUNK = 8 * 1024 * 1024;
const MAX_FILES = 20_000;
const MAX_TOTAL = 512 * 1024 * 1024;
const MAX_FILE = 64 * 1024 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = () => { throw Error('native_studio_build_output_bytes_unverified'); };

function safePath(path) {
  return typeof path === 'string' && path.length <= 300 &&
    /^(?:dist|studio\/dist)\/[A-Za-z0-9_@+.-]+(?:\/[A-Za-z0-9_@+.-]+)*$/.test(path) &&
    !path.split('/').some(part => part === '.' || part === '..');
}
function identity(input) {
  const { scope, site, sourceId, commit, workerId } = input ?? {};
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
        .every(value => typeof value === 'string' && UUID.test(value)) ||
      site?.siteId !== scope.siteId || !HEX32.test(site.accountId) ||
      typeof site.repository !== 'string' || !site.repository ||
      typeof site.branch !== 'string' || !site.branch ||
      typeof site.studioOrigin !== 'string' || !site.studioOrigin ||
      !SHA.test(sourceId) || !COMMIT.test(commit) || !HEX32.test(workerId) ||
      !input.store || typeof input.store.read !== 'function' ||
      typeof input.store.getBytes !== 'function') fail();
  return { sourceId, commit, workerId, scope,
    site: { siteId: site.siteId, accountId: site.accountId,
      repository: site.repository, branch: site.branch,
      studioOrigin: site.studioOrigin } };
}
function validFiles(files) {
  if (!Array.isArray(files) || files.length < 2 || files.length > MAX_FILES) fail();
  let total = 0;
  const seen = new Set();
  for (const file of files) {
    if (!file || !safePath(file.path) || seen.has(file.path) ||
        !Number.isSafeInteger(file.bytes) || file.bytes < 0 ||
        file.bytes > MAX_FILE || !SHA.test(file.sha256)) fail();
    total += file.bytes;
    if (total > MAX_TOTAL) fail();
    seen.add(file.path);
  }
  if (!files.some(file => file.path.startsWith('dist/')) ||
      !files.some(file => file.path.startsWith('studio/dist/'))) fail();
  return [...files].sort((a, b) => a.path.localeCompare(b.path));
}
async function safeBytes(root, file) {
  let path = root;
  for (const part of file.path.split('/')) {
    path = join(path, part);
    const info = await lstat(path);
    if (info.isSymbolicLink()) fail();
  }
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size !== file.bytes) fail();
    const bytes = await handle.readFile();
    if (bytes.length !== file.bytes || hash(bytes) !== file.sha256) fail();
    return bytes;
  } finally { await handle.close(); }
}
function receiptFiles(receipt) {
  if (!receipt || !Array.isArray(receipt.files)) fail();
  const files = validFiles(receipt.files.map(file => ({
    path: file.path, bytes: file.bytes, sha256: file.sha256 })));
  if (hash(Buffer.from(JSON.stringify(files))) !== receipt.manifestSha256 ||
      !same(receipt.files.map(file => ({ path: file.path,
        bytes: file.bytes, sha256: file.sha256 })), files)) fail();
  return files;
}
async function verifiedReceipt(input) {
  const expected = identity(input);
  const receipt = await input.store.read(NATIVE_STUDIO_BUILD_OUTPUT_BYTES);
  if (!receipt || !same({ sourceId: receipt.sourceId,
    commit: receipt.commit, workerId: receipt.workerId,
    scope: receipt.scope, site: receipt.site }, expected)) fail();
  const files = receiptFiles(receipt);
  for (const file of receipt.files) {
    if (!Array.isArray(file.chunks) ||
        file.chunks.length !== Math.ceil(file.bytes / CHUNK)) fail();
    let size = 0;
    const digest = createHash('sha256');
    for (const part of file.chunks) {
      if (!part || !SHA.test(part.sha256) ||
          !Number.isSafeInteger(part.bytes) || part.bytes < 1 ||
          part.bytes > CHUNK) fail();
      const bytes = await input.store.getBytes(part.sha256);
      if (!Buffer.isBuffer(bytes) || bytes.length !== part.bytes ||
          hash(bytes) !== part.sha256) fail();
      size += bytes.length;
      if (size > file.bytes) fail();
      digest.update(bytes);
    }
    if (size !== file.bytes || digest.digest('hex') !== file.sha256) fail();
  }
  return { receipt, files };
}

export async function recordNativeStudioBuildOutputBytes(input) {
  const expected = identity(input);
  if (typeof input.artifactDir !== 'string' ||
      !isAbsolute(input.artifactDir) ||
      typeof input.store.claim !== 'function' ||
      typeof input.store.putBytes !== 'function') fail();
  const root = resolve(input.artifactDir);
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink()) fail();
  const files = validFiles(input.files);
  if (!same(await scanStudioBuildOutputs(root), files) ||
      (await readdir(root)).sort().join() !== 'dist,studio' ||
      (await readdir(join(root, 'studio'))).join() !== 'dist') fail();
  const stored = [];
  for (const file of files) {
    const body = await safeBytes(root, file);
    const chunks = [];
    for (let offset = 0; offset < body.length; offset += CHUNK) {
      const part = body.subarray(offset, offset + CHUNK);
      const chunk = { bytes: part.length, sha256: hash(part) };
      await input.store.putBytes(chunk.sha256, part);
      chunks.push(chunk);
    }
    stored.push({ ...file, chunks });
  }
  const receipt = { ...expected,
    manifestSha256: hash(Buffer.from(JSON.stringify(files))), files: stored };
  const prior = await input.store.read(NATIVE_STUDIO_BUILD_OUTPUT_BYTES);
  if (prior && !same(prior, receipt)) fail();
  if (!prior) await input.store.claim(NATIVE_STUDIO_BUILD_OUTPUT_BYTES, receipt);
  if (!same(await input.store.read(NATIVE_STUDIO_BUILD_OUTPUT_BYTES), receipt)) fail();
  await verifiedReceipt(input);
  return receipt;
}

/** Restore only verified build output bytes; no Git or site script is run. */
export async function restoreNativeStudioBuildOutputBytes(input) {
  const { receipt, files } = await verifiedReceipt(input);
  const root = await mkdtemp(join(tmpdir(), 'gnr8-build-output-'));
  try {
    for (const file of receipt.files) {
      const path = join(root, file.path);
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      const handle = await open(path, 'wx', 0o600);
      try {
        for (const part of file.chunks)
          await handle.writeFile(await input.store.getBytes(part.sha256));
      } finally { await handle.close(); }
    }
    if (!same(await scanStudioBuildOutputs(root), files)) fail();
    return { artifactDir: root, files, receipt,
      cleanup: () => rm(root, { recursive: true, force: true }) };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}
