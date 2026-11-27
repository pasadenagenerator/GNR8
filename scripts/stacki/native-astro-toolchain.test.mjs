import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareNativeAstroToolchain } from './native-astro-toolchain.mjs';

test('native source upgrades an older locked Astro export to the shared version', async t => {
  const project = await mkdtemp(join(tmpdir(), 'gnr8-native-astro-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  await writeFile(join(project, 'package.json'), JSON.stringify({
    dependencies: { astro: '5.18.2' }, scripts: { build: 'astro build' },
  }));
  await writeFile(join(project, 'package-lock.json'), JSON.stringify({
    packages: { '': { dependencies: { astro: '5.18.2' } } },
  }));
  assert.deepEqual(await prepareNativeAstroToolchain({ project }),
    { from: '5.18.2', version: '7.4.7' });
  const pkg = JSON.parse(await readFile(join(project, 'package.json')));
  const lock = JSON.parse(await readFile(join(project, 'package-lock.json')));
  assert.equal(pkg.dependencies.astro, '7.4.7');
  assert.equal(pkg.scripts.build, 'astro build');
  assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
  assert.equal(lock.packages['node_modules/astro'].version, '7.4.7');
  assert.deepEqual(await prepareNativeAstroToolchain({ project }),
    { from: '7.4.7', version: '7.4.7' });
});

test('native toolchain rejects a source package and lock mismatch', async t => {
  const project = await mkdtemp(join(tmpdir(), 'gnr8-native-astro-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  await writeFile(join(project, 'package.json'), JSON.stringify({
    dependencies: { astro: '5.18.2' },
  }));
  await writeFile(join(project, 'package-lock.json'), JSON.stringify({
    packages: { '': { dependencies: { astro: '7.4.4' } } },
  }));
  await assert.rejects(prepareNativeAstroToolchain({ project }), /mismatch/);
});
