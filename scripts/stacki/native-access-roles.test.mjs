import assert from 'node:assert/strict';
import test from 'node:test';
import { serializeNativeAccessRoles, validateNativeAccessRoles } from './native-access-roles.mjs';

test('serializes a restrictive, deterministic Stacki Access bootstrap file', () => {
  const source = serializeNativeAccessRoles(['access:zoe@example.com', 'access:ana@example.com']);
  assert.deepEqual(JSON.parse(source), {
    version: 1, defaultRole: 'client', roles: [
      { id: 'admin', members: ['access:ana@example.com', 'access:zoe@example.com'] },
      { id: 'client', members: [] },
    ],
  });
  assert.deepEqual(validateNativeAccessRoles(source),
    ['access:ana@example.com', 'access:zoe@example.com']);
});

test('rejects missing admins, broad or ambiguous identities and oversized lists', () => {
  for (const members of [[], ['ana@example.com'], ['access:Ana@example.com'],
    ['access:ana@example.com', 'access:ana@example.com'],
    ['access:ana@example.com', 'google:ana@example.com'],
    ['access:ana@localhost'], [`access:${'a'.repeat(195)}@example.com`],
    Array(201).fill('access:ana@example.com')])
    assert.throws(() => serializeNativeAccessRoles(members), /native_access_roles_admins_invalid/);
});

test('rejects a permissive or malformed bootstrap file', () => {
  const good = JSON.parse(serializeNativeAccessRoles(['access:ana@example.com']));
  for (const changed of [
    { ...good, defaultRole: 'admin' },
    { ...good, roles: [] },
    { ...good, roles: [{ id: 'admin', members: [] }, good.roles[1]] },
    { ...good, roles: [good.roles[0], { id: 'client', members: ['access:other@example.com'] }] },
    { ...good, roles: [good.roles[0], good.roles[1]], extra: true },
  ]) assert.throws(() => validateNativeAccessRoles(JSON.stringify(changed)), /native_access_roles_/);
  assert.throws(() => validateNativeAccessRoles('{'), /native_access_roles_file_invalid/);
});
