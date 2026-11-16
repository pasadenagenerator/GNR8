import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { assertPortableRuntimeLinks } from './prepare-stacki-runtime';

test('copied relative executable links survive removal of the original checkout', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacki-portable-'));
  try {
    const source = join(root, 'source'), output = join(root, 'output');
    await mkdir(join(source, '.bin'), { recursive: true });
    await writeFile(join(source, 'cli.js'), 'export const portable = true;');
    await symlink('../cli.js', join(source, '.bin/tool'));
    await cp(source, output, { recursive: true, verbatimSymlinks: true });
    await rm(source, { recursive: true });
    await assertPortableRuntimeLinks(output);
    assert.equal(await readFile(join(output, '.bin/tool'), 'utf8'), 'export const portable = true;');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('package validation rejects absolute, escaping and broken links', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacki-links-'));
  try {
    const output = join(root, 'output'); await mkdir(output);
    await writeFile(join(root, 'outside'), 'external');
    await writeFile(join(output, 'inside'), 'internal');
    for (const target of [join(output, 'inside'), '../outside', 'missing']) {
      await symlink(target, join(output, 'link'));
      await assert.rejects(assertPortableRuntimeLinks(output));
      await rm(join(output, 'link'));
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
