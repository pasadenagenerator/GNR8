import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareLumosLibrary } from './prepare-lumos-library.mjs';
const upstream = process.env.LUMOS_SOURCE_DIRECTORY;
test('pinned Lumos coexists with retained pages and native component defaults; repeat preserves edits',
  { skip: !upstream && 'Set LUMOS_SOURCE_DIRECTORY to the verified upstream checkout' }, async t => {
  const project = await mkdtemp(join(tmpdir(), 'gnr8-lumos-library-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  await mkdir(join(project, 'src/pages'), { recursive: true });
  await mkdir(join(project, '.stacki'));
  const original = '<h1>Retained customer page</h1>';
  await writeFile(join(project, 'src/pages/index.astro'), original);
  await writeFile(join(project, '.stacki/components.json'), JSON.stringify({ version: 1, components: {
    'src/components/Customer.astro': { props: { title: 'Keep' } },
  } }));
  const result = await prepareLumosLibrary({ project, upstream });
  assert.equal(result.components, 35);
  assert.equal(await readFile(join(project, 'src/pages/index.astro'), 'utf8'), original);
  await assert.rejects(readFile(join(project, 'src/lumos/pages/index.astro')), { code: 'ENOENT' });
  const defaultsPath = join(project, '.stacki/components.json');
  const defaults = JSON.parse(await readFile(defaultsPath, 'utf8'));
  assert.equal(defaults.components['src/components/Customer.astro'].props.title, 'Keep');
  defaults.components['src/lumos/components/Button.astro'].text = 'My edited default';
  await writeFile(defaultsPath, JSON.stringify(defaults));
  await prepareLumosLibrary({ project, upstream });
  assert.equal(JSON.parse(await readFile(defaultsPath, 'utf8')).components['src/lumos/components/Button.astro'].text, 'My edited default');
  await writeFile(join(project, 'src/lumos/components/Button.astro'), 'Customer edit');
  await assert.rejects(prepareLumosLibrary({ project, upstream }), /Existing Lumos file differs/);
  assert.equal(await readFile(join(project, 'src/lumos/components/Button.astro'), 'utf8'), 'Customer edit');
});
