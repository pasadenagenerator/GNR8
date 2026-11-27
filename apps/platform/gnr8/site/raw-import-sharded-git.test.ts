import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { packRawImportShards, ShardedRawImportReader, writeShardedRawImportArchive } from './raw-import-sharded-git';

const hash = (body: Buffer) => createHash('sha256').update(body).digest('hex');
const blobOid = (body: Buffer) => createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const siteVersionId = '44444444-4444-4444-8444-444444444444';
const parent = 'a'.repeat(40);
const commit = 'b'.repeat(40);
const treeOid = 'c'.repeat(40);

test('large raw import is committed as verified Git shards and restores exact source bytes', async () => {
  const html = Buffer.from('<h1>GNR8</h1>');
  const image = Buffer.alloc(17 * 1024 * 1024, 37);
  const files = [
    { path: 'index.html', mediaType: 'text/html', bytes: html, sizeBytes: html.length, sha256: hash(html) },
    { path: 'assets/image.bin', mediaType: 'application/octet-stream', bytes: image,
      sizeBytes: image.length, sha256: hash(image) },
  ];
  const input = { scope, runtimeSiteId: 'site_123', siteVersionId, files,
    target: { owner: 'owner', repository: 'site', token: 'local-fake' },
    parent };
  const expected = packRawImportShards(input);
  assert.equal(expected.manifest.shards.length, 2);
  const blobs = new Map<string, Buffer>();
  let tree: Array<{path:string;sha:string;type:string}> = [];
  let ref: string | null = null;
  const transport: typeof fetch = async (url, options) => {
    const path = new URL(String(url)).pathname.replace('/repos/owner/site', '');
    const body = options?.body ? JSON.parse(String(options.body)) as any : null;
    const result = (() => {
      if (path === '/git/blobs' && options?.method === 'POST') {
        const bytes = Buffer.from(body.content, 'base64');
        const oid = blobOid(bytes); blobs.set(oid, bytes); return { sha: oid };
      }
      if (path === '/git/trees' && options?.method === 'POST') {
        tree = body.tree; return { sha: treeOid };
      }
      if (path === '/git/commits' && options?.method === 'POST') {
        assert.deepEqual(body.parents, [parent]); return { sha: commit };
      }
      if (path === '/git/refs' && options?.method === 'POST') {
        ref = body.sha; return { ref: body.ref };
      }
      if (path === `/git/ref/heads/imports/${siteVersionId}`) return { object: { sha: ref } };
      if (path === `/git/commits/${commit}`) return { tree: { sha: treeOid }, parents: [{ sha: parent }] };
      if (path === `/git/trees/${treeOid}`) return { truncated: false, tree };
      if (path.startsWith('/git/blobs/')) {
        const bytes = blobs.get(path.slice('/git/blobs/'.length));
        assert(bytes); return { encoding: 'base64', content: bytes.toString('base64'), size: bytes.length };
      }
      throw Error(`Unexpected Git API path ${path}`);
    })();
    return new Response(JSON.stringify(result), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const written = await writeShardedRawImportArchive(input, transport);
  assert.equal(written.commit, commit);
  assert.equal(written.archiveFormat, 'sharded-v1');
  assert.equal(written.manifestSha256, expected.manifestSha256);
  const reader = new ShardedRawImportReader({ scope, repository: 'owner/site', commit,
    manifestPath: written.manifestPath, manifestSha256: written.manifestSha256 },
    siteVersionId, input.target, transport);
  assert.deepEqual(await reader.read({ sha256: files[0]!.sha256, sizeBytes: html.length }), html);
  assert.deepEqual(await reader.read({ sha256: files[1]!.sha256, sizeBytes: image.length }), image);
  assert.equal(blobs.size, 3, 'two shards and one manifest are the only Git blobs');
  blobs.set(expected.manifest.shards[0]!.oid, Buffer.from('corrupt'));
  const corrupted = new ShardedRawImportReader({ scope, repository: 'owner/site', commit,
    manifestPath: written.manifestPath, manifestSha256: written.manifestSha256 },
    siteVersionId, input.target, transport);
  await assert.rejects(corrupted.read({ sha256: files[1]!.sha256, sizeBytes: image.length }),
    /RAW_IMPORT_GIT_ARCHIVE_INVALID/);
});
