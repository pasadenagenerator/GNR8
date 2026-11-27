import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serializeNativeAccessRoles } from './native-access-roles.mjs';
import { verifyNativeAccessRoleFreshness } from './native-access-role-freshness.mjs';

const admins = ['access:owner@example.com', 'access:admin@example.com'];

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-role-freshness-'));
  try {
    await mkdir(join(root, '.stacki'));
    await run(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('accepts the exact current role snapshot independent of candidate order', async () => {
  await fixture(async project => {
    await writeFile(join(project, '.stacki', 'roles.json'),
      serializeNativeAccessRoles(admins));
    assert.deepEqual(await verifyNativeAccessRoleFreshness({ project,
      principals: [...admins].reverse() }), {
      state: 'current', principals: [...admins].sort(),
    });
  });
});

test('rejects missing, stale and permissive role files', async () => {
  await fixture(async project => {
    const file = join(project, '.stacki', 'roles.json');
    await assert.rejects(verifyNativeAccessRoleFreshness({ project, principals: admins }),
      /native_access_roles_snapshot_stale/);
    await writeFile(file, serializeNativeAccessRoles([admins[0]]));
    await assert.rejects(verifyNativeAccessRoleFreshness({ project, principals: admins }),
      /native_access_roles_snapshot_stale/);
    const permissive = JSON.parse(serializeNativeAccessRoles(admins));
    permissive.defaultRole = 'admin';
    await writeFile(file, JSON.stringify(permissive));
    await assert.rejects(verifyNativeAccessRoleFreshness({ project, principals: admins }),
      /native_access_roles_snapshot_stale/);
  });
});

test('rejects a linked role file or linked roles directory', async () => {
  await fixture(async project => {
    const folder = join(project, '.stacki');
    const target = join(project, 'roles-target.json');
    await writeFile(target, serializeNativeAccessRoles(admins));
    await symlink(target, join(folder, 'roles.json'));
    await assert.rejects(verifyNativeAccessRoleFreshness({ project, principals: admins }),
      /native_access_roles_snapshot_stale/);
  });
  const root = await mkdtemp(join(tmpdir(), 'gnr8-role-dir-'));
  try {
    const actual = join(root, 'actual');
    await mkdir(actual);
    await writeFile(join(actual, 'roles.json'), serializeNativeAccessRoles(admins));
    await symlink(actual, join(root, '.stacki'));
    await assert.rejects(verifyNativeAccessRoleFreshness({ project: root, principals: admins }),
      /native_access_roles_snapshot_stale/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
