import assert from 'node:assert/strict';
import test from 'node:test';
import { buildNativeStudioImageDrivePhase,
  pushNativeStudioImageDrivePhase } from './native-studio-image-drive-phase';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const receipt = { sourceId: 'a'.repeat(64), commit: 'b'.repeat(40),
  workerId: 'c'.repeat(32), scope, siteId: scope.siteId,
  accountId: 'd'.repeat(32),
  archive: { bytes: 17, sha256: 'e'.repeat(64) } };

function fixture() {
  const events: string[] = [];
  const records = new Map<string, unknown>();
  let drive: any;
  const store = { read: async (key: string) => records.get(key) ?? null,
    claim: async (key: string, value: unknown) => {
      events.push(`claim:${key}`);
      if (records.has(key)) return false;
      records.set(key, value); return true;
    } };
  const sdk = { drive: {
    getOrCreate: async (config: { name: string; maxSize: number }) => {
      events.push('create-drive');
      drive = { name: config.name, driveId: 'drive_abc',
        projectId: 'prj_abc', region: 'iad1', maxSize: config.maxSize,
        currentSessionId: undefined,
        snapshot: () => { events.push('snapshot');
          return { drive: config.name, mode: 'snapshot' }; },
        delete: async () => { events.push('delete-drive'); } };
      return drive;
    },
    get: async ({ name }: { name: string }) => {
      events.push('get-drive');
      assert.equal(name, drive.name);
      return drive;
    },
  }, sandbox: { create: async (config: any) => {
    events.push('create-sandbox');
    return { stop: async () => { events.push('stop-sandbox'); } };
  } } } as any;
  const identity = { sourceId: receipt.sourceId, commit: receipt.commit,
    workerId: receipt.workerId, scope,
    site: { siteId: receipt.siteId, accountId: receipt.accountId },
    buildSnapshotId: 'snap_build', pushSnapshotId: 'snap_push', store };
  return { events, records, sdk, identity, getDrive: () => drive };
}

test('two invocations transfer one private Drive, verify before key, then delete', async () => {
  const f = fixture();
  const transfer = await buildNativeStudioImageDrivePhase({ ...f.identity,
    buildNetworkPolicy: { allow: ['registry.npmjs.org'] },
    build: async (_sandbox, path) => {
      f.events.push('build'); assert.equal(path, '/gnr8-image/image.tar');
      return receipt;
    },
  }, f.sdk);
  assert.equal(transfer.driveId, 'drive_abc');
  assert.equal(f.events.includes('delete-drive'), false);
  const pushed = await pushNativeStudioImageDrivePhase({ ...f.identity,
    project: '/verified/checkout',
    pushNetworkPolicy: { allow: ['api.cloudflare.com'] },
    loadCredential: async () => { f.events.push('credential'); return 'token'; },
    push: async (_sandbox, path, value, credential) => {
      f.events.push('push'); assert.equal(path, '/gnr8-image/image.tar');
      assert.deepEqual(value, receipt); assert.equal(credential, 'token');
      return 'digest';
    },
  }, f.sdk, {
    verify: async (_sandbox, path, value) => {
      f.events.push('verify'); assert.equal(path, '/gnr8-image/image.tar');
      assert.deepEqual(value, receipt); return value;
    },
    record: async ({ receipt: value }: any) => {
      f.events.push('record'); return value;
    },
  } as any);
  assert.equal(pushed, 'digest');
  assert.ok(f.events.indexOf('stop-sandbox') < f.events.indexOf('verify'));
  assert.ok(f.events.indexOf('verify') < f.events.indexOf('record'));
  assert.ok(f.events.indexOf('record') < f.events.indexOf('credential'));
  assert.deepEqual(f.events.slice(-6),
    ['verify', 'record', 'credential', 'push', 'stop-sandbox', 'delete-drive']);
});

test('receiver refuses changed Drive identity before loading credentials', async () => {
  const f = fixture();
  await buildNativeStudioImageDrivePhase({ ...f.identity,
    buildNetworkPolicy: { allow: ['registry.npmjs.org'] },
    build: async () => receipt,
  }, f.sdk);
  f.getDrive().driveId = 'drive_foreign';
  await assert.rejects(pushNativeStudioImageDrivePhase({ ...f.identity,
    project: '/verified/checkout',
    pushNetworkPolicy: { allow: ['api.cloudflare.com'] },
    loadCredential: async () => { f.events.push('credential'); return 'token'; },
    push: async () => 'unexpected',
  }, f.sdk, {
    verify: async () => { f.events.push('verify'); return receipt; },
    record: async () => receipt,
  } as any), /drive_unverified/);
  assert.equal(f.events.includes('credential'), false);
  assert.equal(f.events.includes('snapshot'), false);
});

test('failed build deletes Drive and cannot silently start another attempt', async () => {
  const f = fixture();
  const input = { ...f.identity,
    buildNetworkPolicy: { allow: ['registry.npmjs.org'] },
    build: async () => { throw Error('build failed'); } };
  await assert.rejects(buildNativeStudioImageDrivePhase(input, f.sdk),
    /build failed/);
  assert.equal(f.events.at(-1), 'delete-drive');
  await assert.rejects(buildNativeStudioImageDrivePhase(input, f.sdk),
    /pending_review/);
});

test('failed receiver hash never loads the Cloudflare credential', async () => {
  const f = fixture();
  await buildNativeStudioImageDrivePhase({ ...f.identity,
    buildNetworkPolicy: { allow: ['registry.npmjs.org'] },
    build: async () => receipt,
  }, f.sdk);
  await assert.rejects(pushNativeStudioImageDrivePhase({ ...f.identity,
    project: '/verified/checkout',
    pushNetworkPolicy: { allow: ['api.cloudflare.com'] },
    loadCredential: async () => { f.events.push('credential'); return 'token'; },
    push: async () => { f.events.push('push'); return 'unexpected'; },
  }, f.sdk, {
    verify: async () => { f.events.push('verify'); throw Error('hash mismatch'); },
    record: async () => { f.events.push('record'); return receipt; },
  } as any), /hash mismatch/);
  assert.equal(f.events.includes('credential'), false);
  assert.equal(f.events.includes('record'), false);
  assert.equal(f.events.at(-1), 'delete-drive');
});
