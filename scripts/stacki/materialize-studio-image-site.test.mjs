import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { materializeStudioImageSite } from './materialize-studio-image-site.mjs';

const sourceId = 'a'.repeat(64), commit = 'b'.repeat(40);
const site = { repository: 'example/site', branch: 'codex/native-stacki' };

async function fixture(t) {
  const project = await mkdtemp(join(tmpdir(), 'gnr8-image-site-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  await mkdir(join(project, 'studio'));
  await writeFile(join(project, 'package.json'), '{"name":"site"}\n');
  await writeFile(join(project, 'package-lock.json'), '{"lockfileVersion":3}\n');
  await writeFile(join(project, 'studio/Dockerfile'),
    'FROM node:22\nCOPY .studio-image/site /opt/site\n');
  return { project, store: { read: async () => null }, sourceId,
    commit, site };
}

const deps = { verifySource: async () => ({ sourceId, commit,
  repository: site.repository, branch: site.branch }) };

test('Docker context gets exact verified root manifests only', async t => {
  const input = await fixture(t);
  assert.deepEqual(await materializeStudioImageSite(input, deps),
    { files: 2, sourceId, commit });
  for (const name of ['package.json', 'package-lock.json'])
    assert.deepEqual(await readFile(join(input.project,
      'studio/.studio-image/site', name)),
    await readFile(join(input.project, name)));
  await assert.rejects(materializeStudioImageSite(input, deps),
    /destination_conflict/);
});

test('stale image directory and changed Dockerfile fail closed', async t => {
  const input = await fixture(t);
  await symlink(input.project, join(input.project, 'studio/.studio-image'));
  await assert.rejects(materializeStudioImageSite(input, deps),
    /destination_conflict/);
  await rm(join(input.project, 'studio/.studio-image'));
  await writeFile(join(input.project, 'studio/Dockerfile'), 'FROM node:22\n');
  await assert.rejects(materializeStudioImageSite(input, deps),
    /dockerfile_unverified/);
});

test('changed source identity cannot create Docker context', async t => {
  const input = await fixture(t);
  await assert.rejects(materializeStudioImageSite(input, {
    verifySource: async () => ({ ...await deps.verifySource(),
      commit: 'c'.repeat(40) }),
  }), /source_unverified/);
  await assert.rejects(readFile(join(input.project,
    'studio/.studio-image/site/package.json')), { code: 'ENOENT' });
});
