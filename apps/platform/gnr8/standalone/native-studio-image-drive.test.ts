import assert from 'node:assert/strict';
import test from 'node:test';
import { withNativeStudioImageDrive } from './native-studio-image-drive';

const input = { siteId: '33333333-3333-4333-8333-333333333333',
  sourceId: 'a'.repeat(64), buildSnapshotId: 'snap_dockerbuild',
  pushSnapshotId: 'snap_dockerpush',
  buildNetworkPolicy: { allow: ['registry.npmjs.org', 'deb.debian.org'] },
  pushNetworkPolicy: { allow: ['api.cloudflare.com', 'registry.cloudflare.com'] },
};

function fixture() {
  const events: string[] = [];
  const configs: Record<string, any>[] = [];
  const drive = { name: 'isolated-drive',
    snapshot: () => { events.push('snapshot');
      return { drive: 'isolated-drive', mode: 'snapshot' }; },
    delete: async () => { events.push('delete'); } };
  const sdk = { drive: { getOrCreate: async (config: Record<string, unknown>) => {
    configs.push(config); events.push('drive'); return drive;
  } }, sandbox: { create: async (config: Record<string, unknown>) => {
    configs.push(config); events.push('create');
    return { stop: async () => { events.push('stop'); } };
  } } } as any;
  return { events, configs, sdk, drive };
}

test('build stops before credential load and receiving Drive mount is read-only', async () => {
  const f = fixture();
  const result = await withNativeStudioImageDrive({ ...input,
    build: async (_sandbox, path) => {
      f.events.push('build'); assert.equal(path, '/gnr8-image/image.tar');
      return { hash: 'verified' };
    },
    verify: async (_sandbox, path, receipt) => {
      f.events.push('verify'); assert.equal(path, '/gnr8-image/image.tar');
      assert.deepEqual(receipt, { hash: 'verified' });
      return { hash: 'checked-again' };
    },
    loadCredential: async () => { f.events.push('credential'); return 'token'; },
    push: async (_sandbox, path, verified, credential) => {
      f.events.push('push'); assert.equal(path, '/gnr8-image/image.tar');
      assert.deepEqual(verified, { hash: 'checked-again' });
      assert.equal(credential, 'token'); return 'recorded';
    },
  }, f.sdk);
  assert.equal(result, 'recorded');
  assert.deepEqual(f.events,
    ['drive', 'create', 'build', 'stop', 'snapshot', 'create', 'verify',
      'credential', 'push', 'stop', 'delete']);
  assert.equal(f.configs[0]?.region, 'iad1');
  assert.equal(f.configs[0]?.maxSize, 12 * 1024 * 1024 * 1024);
  assert.equal(f.configs[1]?.env, undefined);
  assert.equal(f.configs[1]?.mounts['/gnr8-image'], f.drive);
  assert.deepEqual(f.configs[2]?.mounts['/gnr8-image'],
    { drive: 'isolated-drive', mode: 'snapshot' });
  assert.equal(f.configs[2]?.env, undefined);
});

test('build failure deletes the Drive without loading credentials', async () => {
  const f = fixture();
  await assert.rejects(withNativeStudioImageDrive({ ...input,
    build: async () => { f.events.push('build'); throw Error('build failed'); },
    verify: async () => { f.events.push('verify'); return {}; },
    loadCredential: async () => { f.events.push('credential'); return 'token'; },
    push: async () => { f.events.push('push'); return 'unexpected'; },
  }, f.sdk), /build failed/);
  assert.deepEqual(f.events, ['drive', 'create', 'build', 'stop', 'delete']);
});

test('push failure stops the receiver and deletes the Drive', async () => {
  const f = fixture();
  await assert.rejects(withNativeStudioImageDrive({ ...input,
    build: async () => { f.events.push('build'); return { hash: 'verified' }; },
    verify: async () => { f.events.push('verify'); return { hash: 'verified' }; },
    loadCredential: async () => { f.events.push('credential'); return 'token'; },
    push: async () => { f.events.push('push'); throw Error('push failed'); },
  }, f.sdk), /push failed/);
  assert.deepEqual(f.events,
    ['drive', 'create', 'build', 'stop', 'snapshot', 'create', 'verify',
      'credential', 'push', 'stop', 'delete']);
});

test('archive verification failure never loads a credential', async () => {
  const f = fixture();
  await assert.rejects(withNativeStudioImageDrive({ ...input,
    build: async () => { f.events.push('build'); return { hash: 'claimed' }; },
    verify: async () => { f.events.push('verify'); throw Error('hash mismatch'); },
    loadCredential: async () => { f.events.push('credential'); return 'token'; },
    push: async () => { f.events.push('push'); return 'unexpected'; },
  }, f.sdk), /hash mismatch/);
  assert.deepEqual(f.events,
    ['drive', 'create', 'build', 'stop', 'snapshot', 'create',
      'verify', 'stop', 'delete']);
});

test('an unrestricted build policy is rejected before a Drive is created', async () => {
  const f = fixture();
  await assert.rejects(withNativeStudioImageDrive({ ...input,
    buildNetworkPolicy: 'allow-all' as any,
    build: async () => ({}), verify: async () => ({}),
    loadCredential: async () => 'token',
    push: async () => 'unexpected',
  }, f.sdk), /input_invalid/);
  assert.deepEqual(f.events, []);
});
