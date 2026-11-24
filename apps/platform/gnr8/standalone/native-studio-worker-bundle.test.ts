import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import test from 'node:test';
import { NATIVE_STUDIO_WORKER_BUNDLE_METAFILE,
  NATIVE_STUDIO_WORKER_BUNDLE_OUTDIR,
  NATIVE_STUDIO_WORKER_BUNDLE_RECEIPT,
  NATIVE_STUDIO_PUBLIC_WORKER_BUNDLE_METAFILE,
  NATIVE_STUDIO_PUBLIC_WORKER_BUNDLE_OUTDIR,
  NATIVE_STUDIO_PUBLIC_WORKER_BUNDLE_RECEIPT,
  nativeStudioWorkerBundleScanScript,
  recordNativeStudioWorkerBundle,
  recordNativeStudioPublicWorkerBundle,
  verifyNativeStudioWorkerBundleReceipt,
  verifyNativeStudioPublicWorkerBundleReceipt } from './native-studio-worker-bundle';

const hash = (value: Buffer) => createHash('sha256').update(value).digest('hex');
const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const sourceId = 'a'.repeat(64), commit = 'b'.repeat(40),
  workerId = 'c'.repeat(32), accountId = 'd'.repeat(32);
const name = 'gnr8-image-build-44444444-4444-4444-8444-444444444444';

function fixture(body = Buffer.from('export default {fetch(){return Response.ok()}}'),
  kind: 'studio' | 'public' = 'studio') {
  const outdir = kind === 'public' ? NATIVE_STUDIO_PUBLIC_WORKER_BUNDLE_OUTDIR :
    NATIVE_STUDIO_WORKER_BUNDLE_OUTDIR;
  const metaPath = kind === 'public' ? NATIVE_STUDIO_PUBLIC_WORKER_BUNDLE_METAFILE :
    NATIVE_STUDIO_WORKER_BUNDLE_METAFILE;
  const receipts = new Map<string, unknown>();
  const bytes = new Map<string, Buffer>();
  const output = new Map([['worker.js', body]]);
  let metadata = { outputs: { 'worker.js': {
    entryPoint: kind === 'public' ? 'studio/src/cloudflare/site.ts' :
      'src/cloudflare/worker.ts' } } } as any;
  let scanFiles = [...output].map(([path, value]) => ({ path,
    bytes: value.length, sha256: hash(value) }));
  const store = { read: async (key: string) => receipts.get(key) ?? null,
    claim: async (key: string, value: unknown) => {
      if (receipts.has(key)) return false;
      receipts.set(key, value); return true;
    },
    putBytes: async (digest: string, value: Buffer) => {
      assert.equal(hash(value), digest);
      assert(value.length <= 12 * 1024 * 1024);
      bytes.set(digest, Buffer.from(value));
    },
    getBytes: async (digest: string) => bytes.get(digest) ??
      (() => { throw Error('missing bytes'); })(),
  };
  const networkPolicy = { allow: ['registry.npmjs.org'] };
  const sandbox = { name, status: 'running',
    sourceSnapshotId: 'snap_build', region: 'iad1', persistent: false,
    timeout: 90 * 60_000, networkPolicy,
    currentSession: () => ({ sessionId: 'session_1' }),
    runCommand: async ({ args, cwd }: { args: string[]; cwd: string }) => {
      assert.equal(cwd, outdir);
      if (kind === 'studio')
        assert.equal(args[2], nativeStudioWorkerBundleScanScript);
      else assert.equal(args[2].includes(outdir), true);
      const metaBody = Buffer.from(JSON.stringify(metadata));
      return { exitCode: 0, stdout: async () => JSON.stringify({
        files: scanFiles,
        metafile: { bytes: metaBody.length, sha256: hash(metaBody) },
      }) };
    },
    readFile: async ({ path }: { path: string }) => {
      const value = path === metaPath
        ? Buffer.from(JSON.stringify(metadata))
        : output.get(path.slice(outdir.length + 1));
      return value ? Readable.from([value]) : null;
    },
  };
  const input = { scope, site: { siteId: scope.siteId, accountId },
    sourceId, commit, workerId, buildSnapshotId: 'snap_build',
    sandboxName: name, sessionId: 'session_1', sandboxTimeoutMs: 90 * 60_000,
    networkPolicy, sandbox, store };
  return { input, receipts, bytes, output,
    setMetadata: (value: unknown) => { metadata = value; },
    setScan: (value: typeof scanFiles) => { scanFiles = value; } };
}

test('records exact metafile entry and content-addressed bundle bytes', async () => {
  const f = fixture();
  const receipt = await recordNativeStudioWorkerBundle(f.input as any);
  assert.equal(receipt.entryPath, 'worker.js');
  assert.equal(receipt.files.length, 1);
  assert.deepEqual(f.receipts.get(NATIVE_STUDIO_WORKER_BUNDLE_RECEIPT),
    receipt);
  assert.deepEqual(await verifyNativeStudioWorkerBundleReceipt(f.input),
    receipt);
  await assert.rejects(verifyNativeStudioWorkerBundleReceipt({ ...f.input,
    workerId: 'e'.repeat(32) }), /receipt_unverified/);
});

test('records separate scoped public Worker bundle from site entry', async () => {
  const f = fixture(undefined, 'public');
  const receipt = await recordNativeStudioPublicWorkerBundle(f.input as any);
  assert.equal(receipt.entryPath, 'worker.js');
  assert.deepEqual(f.receipts.get(NATIVE_STUDIO_PUBLIC_WORKER_BUNDLE_RECEIPT),
    receipt);
  assert.equal(f.receipts.has(NATIVE_STUDIO_WORKER_BUNDLE_RECEIPT), false);
  assert.deepEqual(await verifyNativeStudioPublicWorkerBundleReceipt(f.input),
    receipt);
  await assert.rejects(verifyNativeStudioWorkerBundleReceipt(f.input),
    /receipt_unverified/);
});

test('chunks output above private object limit and detects damaged storage', async () => {
  const f = fixture(Buffer.alloc(13 * 1024 * 1024, 65));
  const receipt = await recordNativeStudioWorkerBundle(f.input as any);
  assert.equal(receipt.files[0].chunks.length, 2);
  const digest = receipt.files[0].chunks[0].sha256;
  f.bytes.set(digest, Buffer.from('damaged'));
  await assert.rejects(verifyNativeStudioWorkerBundleReceipt(f.input),
    /storage_unverified/);
});

test('rejects traversal and ambiguous Worker entry before storing receipt', async () => {
  const traversal = fixture();
  traversal.setScan([{ path: '../worker.js', bytes: 10,
    sha256: 'a'.repeat(64) }]);
  await assert.rejects(recordNativeStudioWorkerBundle(traversal.input as any),
    /manifest_invalid/);
  assert.equal(traversal.receipts.has(NATIVE_STUDIO_WORKER_BUNDLE_RECEIPT), false);

  const ambiguous = fixture();
  ambiguous.setMetadata({ outputs: {
    'worker.js': { entryPoint: 'src/cloudflare/worker.ts' },
    'other.js': { entryPoint: 'src/cloudflare/worker.ts' },
  } });
  await assert.rejects(recordNativeStudioWorkerBundle(ambiguous.input as any),
    /metafile_invalid|entry_unverified/);
  assert.equal(ambiguous.receipts.has(NATIVE_STUDIO_WORKER_BUNDLE_RECEIPT), false);
});

test('rejects a foreign Sandbox before reading any output', async () => {
  const f = fixture();
  f.input.sandbox.sourceSnapshotId = 'snap_other';
  await assert.rejects(recordNativeStudioWorkerBundle(f.input as any),
    /sandbox_unverified/);
  assert.equal(f.bytes.size, 0);
});
