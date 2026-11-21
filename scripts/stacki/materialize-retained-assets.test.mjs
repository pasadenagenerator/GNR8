import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createStackiRecord } from '../../apps/platform/gnr8/stacki/stacki-draft-contract.ts';
import { retainedAssetName } from '../../apps/platform/gnr8/stacki/stacki-retained-assets.ts';
import { materializeRetainedAssets } from './materialize-retained-assets.mjs';
const id = '11111111-1111-4111-8111-111111111111';
const sha = b => createHash('sha256').update(b).digest('hex');
const blob = b => createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
test('verified Git source -> unchanged linked CSS/image URLs -> native static assets; corrupt input writes nothing', async t => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-retained-static-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const prefix = `/api/gnr8/runtime/preview-assets/site_retained/${id}`;
  const assets = [
    { path: prefix + '/css/main.css', mediaType: 'text/css', body: Buffer.from('a{background:url(../image.svg)}') },
    { path: prefix + '/image.svg', mediaType: 'image/svg+xml', body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') },
  ];
  const routes = Object.fromEntries(assets.map(a => [a.path, { name: retainedAssetName(a.path), mediaType: a.mediaType }]));
  const files = [
    { path: 'package.json', base64: Buffer.from('{"scripts":{"build":"astro build"},"dependencies":{"astro":"7.4.4"}}').toString('base64') },
    { path: 'astro.config.mjs', base64: Buffer.from(`const retained = ${JSON.stringify(routes)};\nexport default {};`).toString('base64') },
    { path: 'src/pages/index.astro', base64: Buffer.from(`<link rel="stylesheet" href="${prefix}/css/main.css"><h1>Saved page</h1>`).toString('base64') },
  ];
  const scope = { agencyId: id, clientId: id, siteId: id, siteVersionId: id };
  const record = createStackiRecord(scope, id, { expectedRevision: 0, files });
  const entries = record.files.map(f => { const b = Buffer.from(f.base64, 'base64'); return { path:f.path, sha256:sha(b), bytes:b.length, blob:blob(b) }; });
  const refs = assets.map(a => ({ name:retainedAssetName(a.path), sha256:sha(a.body), bytes:a.body.length, blob:blob(a.body) }));
  await mkdir(join(root, 'gnr8-retained'));
  for (const f of record.files) { await mkdir(dirname(join(root,f.path)),{recursive:true}); await writeFile(join(root,f.path),Buffer.from(f.base64,'base64')); }
  for (const [i,a] of assets.entries()) await writeFile(join(root,'gnr8-retained',refs[i].name),a.body);
  await writeFile(join(root,'.gnr8-stacki.json'),JSON.stringify({...record,format:'gnr8-stacki-git:v1',files:entries,assets:refs}));
  await writeFile(join(root,'gnr8-retained',refs[1].name),'tampered');
  await assert.rejects(materializeRetainedAssets({project:root,siteId:id}),/mismatch/);
  await assert.rejects(readFile(join(root,'public',assets[0].path)),{code:'ENOENT'});
  await writeFile(join(root,'gnr8-retained',refs[1].name),assets[1].body);
  assert.equal((await materializeRetainedAssets({project:root,siteId:id})).staticAssets,2);
  for (const a of assets) assert.deepEqual(await readFile(join(root,'public'+a.path)),a.body);
  await materializeRetainedAssets({project:root,siteId:id});
  await assert.rejects(materializeRetainedAssets({project:root,siteId:'other'}),/mismatch/);
  await writeFile(join(root,'public'+assets[0].path),'Customer edit');
  await assert.rejects(materializeRetainedAssets({project:root,siteId:id}),/mismatch/);
  assert.equal(await readFile(join(root,'public'+assets[0].path),'utf8'),'Customer edit');
});
