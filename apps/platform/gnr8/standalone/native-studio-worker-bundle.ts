import 'server-only';
import { createHash } from 'node:crypto';
import { isAbsolute, relative, resolve } from 'node:path';
import type { Sandbox, NetworkPolicy } from '@vercel/sandbox';

export const NATIVE_STUDIO_WORKER_BUNDLE_OUTDIR =
  '/vercel/sandbox/gnr8-worker-bundle';
export const NATIVE_STUDIO_WORKER_BUNDLE_METAFILE =
  '/vercel/sandbox/gnr8-worker-bundle-meta.json';
export const NATIVE_STUDIO_WORKER_BUNDLE_RECEIPT =
  'native-studio/worker-bundle-v1.json';
const MAX_FILES = 256;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const CHUNK_BYTES = 8 * 1024 * 1024;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const hash = (value: Buffer | string) =>
  createHash('sha256').update(value).digest('hex');

type Scope = { agencyId: string; clientId: string; siteId: string };
type Site = { siteId: string; accountId: string };
type ScannedFile = { path: string; bytes: number; sha256: string };
type Chunk = { bytes: number; sha256: string };
export type NativeStudioWorkerBundleReceipt = {
  scope: Scope; siteId: string; accountId: string;
  sourceId: string; commit: string; workerId: string;
  buildSnapshotId: string; sandboxName: string; sessionId: string;
  manifestSha256: string; metafileSha256: string; entryPath: string;
  files: Array<ScannedFile & { chunks: Chunk[] }>;
};
type Store = { read: (key: string) => Promise<unknown>;
  claim?: (key: string, value: unknown) => Promise<boolean>;
  putBytes?: (hash: string, bytes: Buffer) => Promise<void>;
  getBytes?: (hash: string) => Promise<Buffer> };
export type NativeStudioWorkerBundleIdentity = {
  scope: Scope; site: Site; sourceId: string; commit: string;
  workerId: string; buildSnapshotId: string; sandboxName: string;
  sessionId: string; store: Store;
};
export type NativeStudioWorkerBundleInput = NativeStudioWorkerBundleIdentity & {
  sandboxTimeoutMs: number;
  networkPolicy: NetworkPolicy;
  sandbox: Pick<Sandbox, 'name' | 'status' | 'sourceSnapshotId' |
    'region' | 'persistent' | 'timeout' | 'networkPolicy' |
    'currentSession' | 'runCommand' | 'readFile'>;
};

function safePath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 300 &&
    !value.includes('\\') && !value.includes('\0') && !value.startsWith('/') &&
    value.split('/').every(part => part && part !== '.' && part !== '..' &&
      /^[A-Za-z0-9._-]+$/.test(part));
}

/** The script is read-only and uses a fixed output directory. Its independent
 * lstat and size checks reject symlinks and oversized files before transfer. */
export const nativeStudioWorkerBundleScanScript = `
import { lstat, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const root = ${JSON.stringify(NATIVE_STUDIO_WORKER_BUNDLE_OUTDIR)};
const metaPath = ${JSON.stringify(NATIVE_STUDIO_WORKER_BUNDLE_METAFILE)};
const files = []; let total = 0;
async function walk(relative) {
  const path = relative ? join(root, relative) : root;
  const info = await lstat(path);
  if (info.isSymbolicLink()) throw Error('symlink');
  if (info.isDirectory()) {
    for (const name of (await readdir(path)).sort()) {
      if (!/^[A-Za-z0-9._-]+$/.test(name) || name === '.' || name === '..')
        throw Error('path');
      await walk(relative ? relative + '/' + name : name);
    }
    return;
  }
  if (!info.isFile() || info.size > ${MAX_FILE_BYTES} ||
      files.length >= ${MAX_FILES}) throw Error('limit');
  total += info.size;
  if (total > ${MAX_TOTAL_BYTES}) throw Error('limit');
  const body = await readFile(path);
  if (body.length !== info.size) throw Error('changed');
  files.push({ path: relative, bytes: body.length,
    sha256: createHash('sha256').update(body).digest('hex') });
}
await walk('');
const metaInfo = await lstat(metaPath);
if (!metaInfo.isFile() || metaInfo.isSymbolicLink() ||
    metaInfo.size < 1 || metaInfo.size > 1024 * 1024) throw Error('metafile');
const metaBody = await readFile(metaPath);
if (metaBody.length !== metaInfo.size) throw Error('changed');
console.log(JSON.stringify({ files, metafile: { bytes: metaBody.length,
  sha256: createHash('sha256').update(metaBody).digest('hex') } }));`;

function validateIdentity(input: NativeStudioWorkerBundleIdentity) {
  if (!input || !input.scope ||
      ![input.scope.agencyId, input.scope.clientId, input.scope.siteId]
        .every(value => typeof value === 'string' && UUID.test(value)) ||
      input.site?.siteId !== input.scope.siteId ||
      !HEX32.test(input.site.accountId) ||
      !SHA.test(input.sourceId) || !COMMIT.test(input.commit) ||
      !HEX32.test(input.workerId) || !SNAPSHOT.test(input.buildSnapshotId) ||
      typeof input.sandboxName !== 'string' ||
      !/^gnr8-image-build-[a-f0-9-]{36}$/.test(input.sandboxName) ||
      !ID.test(input.sessionId) ||
      !input.store || typeof input.store.read !== 'function')
    throw Error('native_studio_worker_bundle_input_invalid');
}

function validateInput(input: NativeStudioWorkerBundleInput) {
  validateIdentity(input);
  if (!Number.isSafeInteger(input.sandboxTimeoutMs) ||
      input.sandboxTimeoutMs < 60 * 60_000 ||
      input.sandboxTimeoutMs > 90 * 60_000 ||
      !input.networkPolicy || !input.sandbox ||
      typeof input.store.claim !== 'function' ||
      typeof input.store.putBytes !== 'function' ||
      typeof input.store.getBytes !== 'function')
    throw Error('native_studio_worker_bundle_input_invalid');
  const sandbox = input.sandbox;
  if (sandbox.name !== input.sandboxName || sandbox.status !== 'running' ||
      sandbox.currentSession().sessionId !== input.sessionId ||
      sandbox.sourceSnapshotId !== input.buildSnapshotId ||
      sandbox.region !== 'iad1' || sandbox.persistent !== false ||
      sandbox.timeout !== input.sandboxTimeoutMs ||
      !same(sandbox.networkPolicy, input.networkPolicy))
    throw Error('native_studio_worker_bundle_sandbox_unverified');
}

function scannedFiles(value: unknown): ScannedFile[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_FILES)
    throw Error('native_studio_worker_bundle_manifest_invalid');
  const seen = new Set<string>();
  let total = 0;
  const files: ScannedFile[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
        Object.keys(entry).sort().join() !== 'bytes,path,sha256')
      throw Error('native_studio_worker_bundle_manifest_invalid');
    const file = entry as ScannedFile;
    if (!safePath(file.path) ||
        !Number.isSafeInteger(file.bytes) || file.bytes < 1 ||
        file.bytes > MAX_FILE_BYTES || !SHA.test(file.sha256) ||
        seen.has(file.path))
      throw Error('native_studio_worker_bundle_manifest_invalid');
    seen.add(file.path);
    total += file.bytes;
    if (total > MAX_TOTAL_BYTES)
      throw Error('native_studio_worker_bundle_manifest_invalid');
    files.push(file);
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  if (!files.some(file => file.path.endsWith('.js')))
    throw Error('native_studio_worker_bundle_entry_missing');
  return files;
}

function entryFromMetafile(raw: Buffer, files: ScannedFile[]): string {
  let metafile: unknown;
  try { metafile = JSON.parse(raw.toString()); }
  catch { throw Error('native_studio_worker_bundle_metafile_invalid'); }
  if (!metafile || typeof metafile !== 'object' || Array.isArray(metafile))
    throw Error('native_studio_worker_bundle_metafile_invalid');
  const outputs = (metafile as { outputs?: unknown }).outputs;
  if (!outputs || typeof outputs !== 'object' || Array.isArray(outputs))
    throw Error('native_studio_worker_bundle_metafile_invalid');
  const outputFiles = Object.keys(outputs).map(path => {
    const roots = isAbsolute(path) ? ['/'] :
      [NATIVE_STUDIO_WORKER_BUNDLE_OUTDIR,
        '/vercel/sandbox', '/vercel/sandbox/gnr8-image-source/studio'];
    const candidates = roots.map(root => relative(
      NATIVE_STUDIO_WORKER_BUNDLE_OUTDIR, resolve(root, path)))
      .filter(candidate => safePath(candidate) &&
        files.some(file => file.path === candidate));
    if (candidates.length !== 1)
      throw Error('native_studio_worker_bundle_metafile_invalid');
    return candidates[0];
  });
  if (new Set(outputFiles).size !== files.length ||
      files.some(file => !outputFiles.includes(file.path)))
    throw Error('native_studio_worker_bundle_metafile_invalid');
  const entries = Object.entries(outputs).filter(([, value]) =>
    value && typeof value === 'object' && !Array.isArray(value) &&
    typeof (value as { entryPoint?: unknown }).entryPoint === 'string');
  if (entries.length !== 1)
    throw Error('native_studio_worker_bundle_entry_unverified');
  const [outputPath, output] = entries[0];
  const source = (output as { entryPoint: string }).entryPoint.replaceAll('\\', '/');
  if (source !== 'src/cloudflare/worker.ts' &&
      source !== 'studio/src/cloudflare/worker.ts' &&
      source !== '/vercel/sandbox/gnr8-image-source/studio/src/cloudflare/worker.ts')
    throw Error('native_studio_worker_bundle_entry_unverified');
  const entryPath = outputFiles[Object.keys(outputs).indexOf(outputPath)];
  if (!safePath(entryPath) || !entryPath.endsWith('.js') ||
      !files.some(file => file.path === entryPath))
    throw Error('native_studio_worker_bundle_entry_unverified');
  return entryPath;
}

async function readBounded(sandbox: NativeStudioWorkerBundleInput['sandbox'],
  path: string, size: number, exact = true): Promise<Buffer> {
  const stream = await sandbox.readFile({ path },
    { signal: AbortSignal.timeout(60_000) });
  if (!stream) throw Error('native_studio_worker_bundle_file_missing');
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    if (total > size || total > MAX_FILE_BYTES)
      throw Error('native_studio_worker_bundle_file_changed');
    chunks.push(bytes);
  }
  if (exact && total !== size)
    throw Error('native_studio_worker_bundle_file_changed');
  return Buffer.concat(chunks);
}

/** Persist only verified bundle bytes while the credential-free builder is
 * still attested and running. The receipt can be reused after its Sandbox stops. */
export async function recordNativeStudioWorkerBundle(
  input: NativeStudioWorkerBundleInput): Promise<NativeStudioWorkerBundleReceipt> {
  validateInput(input);
  const scan = await input.sandbox.runCommand({ cmd: 'node',
    args: ['--input-type=module', '-e', nativeStudioWorkerBundleScanScript],
    cwd: NATIVE_STUDIO_WORKER_BUNDLE_OUTDIR, timeoutMs: 60_000,
    env: { CI: '1' } });
  if (scan.exitCode !== 0)
    throw Error('native_studio_worker_bundle_scan_failed');
  const raw = await scan.stdout();
  if (raw.length > 128 * 1024)
    throw Error('native_studio_worker_bundle_manifest_invalid');
  let scanResult: unknown;
  try { scanResult = JSON.parse(raw); }
  catch { throw Error('native_studio_worker_bundle_manifest_invalid'); }
  if (!scanResult || typeof scanResult !== 'object' ||
      Array.isArray(scanResult) ||
      Object.keys(scanResult).sort().join() !== 'files,metafile')
    throw Error('native_studio_worker_bundle_manifest_invalid');
  const result = scanResult as { files: unknown; metafile: unknown };
  const files = scannedFiles(result.files);
  const metaScan = result.metafile as Pick<ScannedFile, 'bytes' | 'sha256'> | null;
  if (!metaScan || typeof metaScan !== 'object' ||
      Object.keys(metaScan).sort().join() !== 'bytes,sha256' ||
      !Number.isSafeInteger(metaScan.bytes) || metaScan.bytes < 1 ||
      metaScan.bytes > 1024 * 1024 || !SHA.test(metaScan.sha256))
    throw Error('native_studio_worker_bundle_manifest_invalid');
  const metafile = await readBounded(input.sandbox,
    NATIVE_STUDIO_WORKER_BUNDLE_METAFILE, metaScan.bytes);
  if (hash(metafile) !== metaScan.sha256)
    throw Error('native_studio_worker_bundle_metafile_changed');
  const entryPath = entryFromMetafile(metafile, files);
  const metafileSha256 = hash(metafile);
  await input.store.putBytes!(metafileSha256, metafile);
  const stored: NativeStudioWorkerBundleReceipt['files'] = [];
  for (const file of files) {
    const body = await readBounded(input.sandbox,
      `${NATIVE_STUDIO_WORKER_BUNDLE_OUTDIR}/${file.path}`, file.bytes);
    if (hash(body) !== file.sha256)
      throw Error('native_studio_worker_bundle_file_changed');
    const chunks: Chunk[] = [];
    for (let offset = 0; offset < body.length; offset += CHUNK_BYTES) {
      const part = body.subarray(offset, offset + CHUNK_BYTES);
      const chunk = { bytes: part.length, sha256: hash(part) };
      await input.store.putBytes!(chunk.sha256, part);
      chunks.push(chunk);
    }
    stored.push({ ...file, chunks });
  }
  validateInput(input);
  const receipt: NativeStudioWorkerBundleReceipt = {
    scope: input.scope, siteId: input.site.siteId,
    accountId: input.site.accountId, sourceId: input.sourceId,
    commit: input.commit, workerId: input.workerId,
    buildSnapshotId: input.buildSnapshotId,
    sandboxName: input.sandboxName, sessionId: input.sessionId,
    manifestSha256: hash(JSON.stringify(files)), metafileSha256,
    entryPath, files: stored,
  };
  const prior = await input.store.read(
    NATIVE_STUDIO_WORKER_BUNDLE_RECEIPT) as NativeStudioWorkerBundleReceipt | null;
  if (prior && !same(prior, receipt))
    throw Error('native_studio_worker_bundle_receipt_conflict');
  if (!prior) await input.store.claim!(NATIVE_STUDIO_WORKER_BUNDLE_RECEIPT,
    receipt);
  if (!same(await input.store.read(NATIVE_STUDIO_WORKER_BUNDLE_RECEIPT),
    receipt))
    throw Error('native_studio_worker_bundle_receipt_conflict');
  await verifyNativeStudioWorkerBundleReceipt(input);
  return receipt;
}

/** Verify the private receipt and every stored chunk without starting a
 * Sandbox. Call before image transfer and before a deploy consumes it. */
export async function verifyNativeStudioWorkerBundleReceipt(
  input: NativeStudioWorkerBundleIdentity): Promise<NativeStudioWorkerBundleReceipt> {
  validateIdentity(input);
  if (typeof input.store.getBytes !== 'function')
    throw Error('native_studio_worker_bundle_storage_unavailable');
  const receipt = await input.store.read(
    NATIVE_STUDIO_WORKER_BUNDLE_RECEIPT) as NativeStudioWorkerBundleReceipt | null;
  if (!receipt || !same(receipt.scope, input.scope) ||
      receipt.siteId !== input.site.siteId ||
      receipt.accountId !== input.site.accountId ||
      receipt.sourceId !== input.sourceId || receipt.commit !== input.commit ||
      receipt.workerId !== input.workerId ||
      receipt.buildSnapshotId !== input.buildSnapshotId ||
      receipt.sandboxName !== input.sandboxName ||
      receipt.sessionId !== input.sessionId ||
      !SHA.test(receipt.manifestSha256) ||
      !SHA.test(receipt.metafileSha256) ||
      !safePath(receipt.entryPath) ||
      !Array.isArray(receipt.files) ||
      receipt.files.length < 1 || receipt.files.length > MAX_FILES)
    throw Error('native_studio_worker_bundle_receipt_unverified');
  const files = scannedFiles(receipt.files.map(file => ({
    path: file.path, bytes: file.bytes, sha256: file.sha256 })));
  if (hash(JSON.stringify(files)) !== receipt.manifestSha256 ||
      !files.some(file => file.path === receipt.entryPath))
    throw Error('native_studio_worker_bundle_receipt_unverified');
  const meta = await input.store.getBytes(receipt.metafileSha256);
  if (!Buffer.isBuffer(meta) || !meta.length || meta.length > 1024 * 1024 ||
      hash(meta) !== receipt.metafileSha256 ||
      entryFromMetafile(meta, files) !== receipt.entryPath)
    throw Error('native_studio_worker_bundle_receipt_unverified');
  for (const file of receipt.files) {
    if (!Array.isArray(file.chunks) || !file.chunks.length ||
        file.chunks.length > Math.ceil(MAX_FILE_BYTES / CHUNK_BYTES) + 1)
      throw Error('native_studio_worker_bundle_receipt_unverified');
    const parts: Buffer[] = [];
    let reconstructedBytes = 0;
    for (const chunk of file.chunks) {
      if (!Number.isSafeInteger(chunk.bytes) || chunk.bytes < 1 ||
          chunk.bytes > CHUNK_BYTES || !SHA.test(chunk.sha256))
        throw Error('native_studio_worker_bundle_receipt_unverified');
      reconstructedBytes += chunk.bytes;
      if (reconstructedBytes > file.bytes)
        throw Error('native_studio_worker_bundle_receipt_unverified');
      const bytes = await input.store.getBytes(chunk.sha256);
      if (!Buffer.isBuffer(bytes) || bytes.length !== chunk.bytes ||
          hash(bytes) !== chunk.sha256)
        throw Error('native_studio_worker_bundle_storage_unverified');
      parts.push(bytes);
    }
    if (reconstructedBytes !== file.bytes ||
        hash(Buffer.concat(parts, file.bytes)) !== file.sha256)
      throw Error('native_studio_worker_bundle_storage_unverified');
  }
  return receipt;
}
