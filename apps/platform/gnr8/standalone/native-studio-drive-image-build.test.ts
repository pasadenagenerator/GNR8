import assert from 'node:assert/strict';
import test from 'node:test';
import { buildNativeStudioDriveImage } from './native-studio-drive-image-build';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const input = { sourceId: 'a'.repeat(64), commit: 'b'.repeat(40),
  workerId: 'c'.repeat(32), scope,
  site: { siteId: scope.siteId, accountId: 'd'.repeat(32) },
  files: [
    { path: 'package.json', body: Buffer.from('{}') },
    { path: 'package-lock.json', body: Buffer.from('{}') },
    { path: 'studio/Dockerfile', body: Buffer.from('FROM node:22-bookworm-slim\nCOPY .studio-image/site /opt/site\n') },
    { path: 'studio/package.json', body: Buffer.from('{}') },
  ] };
const archivePath = '/gnr8-image/image.tar';

function fixture(changeSource = false) {
  const calls: { cmd: string; args: string[]; cwd?: string; env?: object }[] = [];
  let checks = 0;
  const sandbox = {
    writeFiles: async (files: unknown[]) => { calls.push({ cmd: 'writeFiles', args: [String(files.length)] }); },
    runCommand: async (call: { cmd: string; args: string[]; cwd?: string; env?: object }) => {
      calls.push(call);
      if (call.cmd === 'node' && call.args[2]?.includes("console.log('verified')")) {
        checks += 1;
        return { exitCode: 0, stdout: async () => changeSource && checks === 2 ? 'changed' : 'verified' };
      }
      if (call.cmd === 'node' && call.args[2]?.includes('console.log(JSON.stringify({bytes:n'))
        return { exitCode: 0,
          stdout: async () => JSON.stringify({ bytes: 123, sha256: 'e'.repeat(64) }) };
      return { exitCode: 0, stdout: async () => '' };
    },
  };
  return { sandbox, calls };
}

test('build writes verified source and exports one scoped image without credentials', async () => {
  const f = fixture();
  const receipt = await buildNativeStudioDriveImage(f.sandbox as any,
    archivePath, input);
  assert.equal(receipt.archive.bytes, 123);
  assert.equal(receipt.sourceId, input.sourceId);
  assert.deepEqual(f.calls.map(call => call.cmd),
    ['node', 'writeFiles', 'node', 'docker', 'docker', 'node', 'node']);
  assert.deepEqual(f.calls.filter(call => call.cmd === 'docker')
    .map(call => call.args[0]), ['build', 'save']);
  assert.ok(f.calls.filter(call => call.cmd === 'node')
    .every(call => call.args[2].length < 5_000));
  assert.ok(f.calls.every(call => !call.env ||
    !Object.hasOwn(call.env, 'CLOUDFLARE_API_TOKEN')));
});

test('changed source after Docker build cannot return an archive receipt', async () => {
  const f = fixture(true);
  await assert.rejects(buildNativeStudioDriveImage(f.sandbox as any,
    archivePath, input), /source_changed/);
  assert.deepEqual(f.calls.filter(call => call.cmd === 'docker')
    .map(call => call.args[0]), ['build', 'save']);
  assert.equal(f.calls.filter(call => call.cmd === 'node').length, 3);
});

test('untrusted Docker context is rejected before any Sandbox command', async () => {
  const f = fixture();
  await assert.rejects(buildNativeStudioDriveImage(f.sandbox as any,
    archivePath, { ...input, files: [...input.files,
      { path: 'studio/.studio-image/site/extra', body: Buffer.from('bad') }] }),
  /context_invalid/);
  assert.equal(f.calls.length, 0);
});

test('large verified source keeps every command argument bounded', async () => {
  const f = fixture();
  const files = [...input.files, ...Array.from({ length: 2500 }, (_, index) => ({
    path: `studio/src/page-${index}.ts`, body: Buffer.from(`export default ${index}`),
  }))];
  await buildNativeStudioDriveImage(f.sandbox as any, archivePath,
    { ...input, files });
  assert.ok(f.calls.filter(call => call.cmd === 'node')
    .every(call => call.args[2].length < 5_000));
  assert.equal(f.calls.find(call => call.cmd === 'writeFiles')?.args[0],
    String(files.length + 3));
});
