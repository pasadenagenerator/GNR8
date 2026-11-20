import assert from 'node:assert/strict';
import test from 'node:test';
import { getOrCreateNativeStudioSiteSecrets } from './native-studio-secret-vault';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const master = 'a'.repeat(64);

function store() {
  const saved = new Map<string, unknown>();
  return { saved,
    async read<T>(key: string): Promise<T | null> { return (saved.get(key) as T) ?? null; },
    async claim(key: string, value: unknown): Promise<boolean> {
      if (saved.has(key)) return false;
      saved.set(key, value);
      return true;
    },
  };
}

test('concurrent first installs reuse two independent site secrets without storing plaintext', async () => {
  const vault = store();
  const [first, second] = await Promise.all([
    getOrCreateNativeStudioSiteSecrets(scope, vault, master),
    getOrCreateNativeStudioSiteSecrets(scope, vault, master),
  ]);
  assert.deepEqual(first, second);
  assert.notEqual(first.SESSION_SECRET, first.CONTAINER_TOKEN);
  assert(first.SESSION_SECRET.length >= 32 && first.CONTAINER_TOKEN.length >= 32);
  const stored = JSON.stringify([...vault.saved.values()]);
  assert(!stored.includes(first.SESSION_SECRET));
  assert(!stored.includes(first.CONTAINER_TOKEN));
  assert.deepEqual(await getOrCreateNativeStudioSiteSecrets(scope, vault, master), first);
});

test('a foreign site or altered ciphertext cannot reuse another site secret', async () => {
  const vault = store();
  await getOrCreateNativeStudioSiteSecrets(scope, vault, master);
  await assert.rejects(getOrCreateNativeStudioSiteSecrets({ ...scope,
    siteId: '44444444-4444-4444-8444-444444444444' }, vault, master),
  /native_studio_vault_integrity/);
  const [name, value] = [...vault.saved.entries()][0] as [string, { body: string }];
  vault.saved.set(name, { ...value, body: (value.body[0] === 'A' ? 'B' : 'A') + value.body.slice(1) });
  await assert.rejects(getOrCreateNativeStudioSiteSecrets(scope, vault, master),
    /native_studio_vault_integrity/);
});

test('missing master key and malformed scope fail before writing', async () => {
  const vault = store();
  await assert.rejects(getOrCreateNativeStudioSiteSecrets(scope, vault, ''),
    /native_studio_vault_not_configured/);
  await assert.rejects(getOrCreateNativeStudioSiteSecrets({ ...scope, siteId: '../foreign' }, vault, master),
    /native_studio_vault_scope_invalid/);
  assert.equal(vault.saved.size, 0);
});
