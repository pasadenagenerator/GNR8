import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assertStudioCheckoutClean } from './prepare-git-branch.mjs';

test('handoff admits only untracked generated output in a real Git checkout', async t => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-studio-git-status-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args],
    { stdio: 'pipe' });
  git('init', '-q');
  await writeFile(join(root, 'package.json'), '{}');
  git('add', 'package.json');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.com',
    'commit', '-q', '-m', 'source');
  const trustedGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
  const previous = process.env.GNR8_NATIVE_STUDIO_TRUSTED_GIT;
  try {
    process.env.GNR8_NATIVE_STUDIO_TRUSTED_GIT = 'relative/git';
    assert.throws(() => assertStudioCheckoutClean(root), /trusted Git executable invalid/);
    assert.doesNotThrow(() => assertStudioCheckoutClean(root, { trustedGit }));
    assert.throws(() => assertStudioCheckoutClean(root,
      { trustedGit: 'relative/git' }), /trusted Git executable invalid/);
  } finally {
    if (previous === undefined) delete process.env.GNR8_NATIVE_STUDIO_TRUSTED_GIT;
    else process.env.GNR8_NATIVE_STUDIO_TRUSTED_GIT = previous;
  }
  assert.doesNotThrow(() => assertStudioCheckoutClean(root));
  await mkdir(join(root, 'studio/dist'), { recursive: true });
  await mkdir(join(root, 'dist'));
  await writeFile(join(root, 'dist/index.html'), '<main>site</main>');
  await writeFile(join(root, 'studio/dist/studio.js'), 'built');
  assert.throws(() => assertStudioCheckoutClean(root), /local changes/);
  assert.doesNotThrow(() => assertStudioCheckoutClean(root,
    { allowBuildOutputs: true }));
  await writeFile(join(root, 'studio/src.js'), 'unmanaged');
  assert.throws(() => assertStudioCheckoutClean(root,
    { allowBuildOutputs: true }), /local changes/);
  await rm(join(root, 'studio/src.js'));
  await writeFile(join(root, 'package.json'), '{"changed":true}');
  assert.throws(() => assertStudioCheckoutClean(root,
    { allowBuildOutputs: true }), /local changes/);
});
