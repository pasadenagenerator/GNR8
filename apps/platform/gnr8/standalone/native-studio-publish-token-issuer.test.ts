import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensureNativeStudioPublishToken, type PublishTokenMetadata,
  type PublishTokenProvider, type PublishTokenTarget } from './native-studio-publish-token-issuer';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32);
const zoneId = 'b'.repeat(32);
const tokenId = 'c'.repeat(32);
const master = 'd'.repeat(64);
const value = 'cfat_' + 'V'.repeat(45);

function fixture() {
  const saved = new Map<string, unknown>();
  const store = {
    read: async <T>(key: string) => (saved.get(key) as T) ?? null,
    claim: async (key: string, data: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, data);
      return true;
    },
  };
  let live: PublishTokenMetadata | null = null;
  let currentValue = '';
  let creates = 0;
  let rolls = 0;
  let loseResponse = false;
  let createNothing = false;
  let extraPermission = false;
  let duplicate = false;
  const provider: PublishTokenProvider = {
    assertWorker: async (target) => assert.equal(target.worker, `gnr8-${scope.siteId}-site`),
    findByName: async () => live ? Array.from({ length: duplicate ? 2 : 1 }, () => ({ ...live,
      permissions: extraPermission ? [...live.permissions, 'Workers Admin'] : live.permissions })) : [],
    create: async (target: PublishTokenTarget) => {
      creates++;
      if (createNothing) throw Error('provider unavailable');
      live = { ...target, id: tokenId, status: 'active',
        permissions: ['Individual Workers Editor', 'Workers Routes Write'] };
      currentValue = value;
      if (loseResponse) throw Error('response lost');
      return { id: tokenId, value };
    },
    roll: async (_target, id) => {
      assert.equal(id, tokenId);
      rolls++;
      currentValue = 'cfat_' + 'R'.repeat(45);
      return currentValue;
    },
    verifyValue: async (_target, id, secret) => id === tokenId && secret === currentValue,
  };
  return { store, saved, provider, setLost: () => { loseResponse = true; },
    setNothing: () => { createNothing = true; },
    setExtra: () => { extraPermission = true; },
    setDuplicate: () => { duplicate = true; },
    creates: () => creates, rolls: () => rolls };
}

test('creates once, seals the value and verifies exact provider scope on retry', async () => {
  const f = fixture();
  const first = await ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, master, f.provider, () => 1000);
  assert.equal(first.value, value);
  assert.equal(first.worker, `gnr8-${scope.siteId}-site`);
  assert.equal(f.creates(), 1);
  assert.equal(f.rolls(), 0);
  assert(!JSON.stringify([...f.saved.values()]).includes(value));
  assert.deepEqual(await ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, master, f.provider, () => 2000), first);
  assert.equal(f.creates(), 1);
});

test('lost create response reconciles one exact token after in-flight window', async () => {
  const f = fixture();
  f.setLost();
  await assert.rejects(ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, master, f.provider, () => 1000), /native_studio_publish_token_pending/);
  await assert.rejects(ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, master, f.provider, () => 2000), /native_studio_publish_token_pending/);
  const recovered = await ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, master, f.provider, () => 301001);
  assert.equal(recovered.value, 'cfat_' + 'R'.repeat(45));
  assert.equal(f.creates(), 1);
  assert.equal(f.rolls(), 1);
});

test('missing provider token never triggers a blind second create', async () => {
  const f = fixture();
  f.setNothing();
  await assert.rejects(ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, master, f.provider, () => 1000), /native_studio_publish_token_pending/);
  await assert.rejects(ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, master, f.provider, () => 301001), /native_studio_publish_token_pending/);
  assert.equal(f.creates(), 1);
  assert.equal(f.rolls(), 0);
});

test('permission expansion prevents use of an otherwise valid saved token', async () => {
  const f = fixture();
  await ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, master, f.provider, () => 1000);
  f.setExtra();
  await assert.rejects(ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, master, f.provider, () => 2000), /native_studio_publish_token_scope_mismatch/);
});

test('duplicate provider token names cannot be reconciled', async () => {
  const f = fixture();
  await ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, master, f.provider, () => 1000);
  f.setDuplicate();
  await assert.rejects(ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, master, f.provider, () => 2000), /native_studio_publish_token_ambiguous/);
});
