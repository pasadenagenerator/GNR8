import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyNativeStudioDriveArchive } from './native-studio-drive-archive-verify';

const archivePath = '/gnr8-image/image.tar';
const receipt = { archive: { bytes: 17, sha256: 'a'.repeat(64) } };

function sandbox(output: unknown, exitCode = 0) {
  const commands: unknown[] = [];
  return { commands, runCommand: async (command: unknown) => {
    commands.push(command);
    return { exitCode, stdout: async () => JSON.stringify(output) };
  } };
}

test('receiver hashes the read-only archive before accepting its receipt', async () => {
  const receiver = sandbox(receipt.archive);
  assert.equal(await verifyNativeStudioDriveArchive(receiver as any,
    archivePath, receipt), receipt);
  assert.equal(receiver.commands.length, 1);
  assert.deepEqual((receiver.commands[0] as any).args.slice(0, 2),
    ['--input-type=module', '-e']);
  assert.match((receiver.commands[0] as any).args[2], /O_NOFOLLOW/);
});

test('receiver rejects a changed or unreadable snapshot', async () => {
  await assert.rejects(verifyNativeStudioDriveArchive(
    sandbox({ ...receipt.archive, bytes: 18 }) as any,
    archivePath, receipt), /archive_changed/);
  await assert.rejects(verifyNativeStudioDriveArchive(
    sandbox(receipt.archive, 2) as any,
    archivePath, receipt), /archive_unreadable/);
  const receiver = sandbox(receipt.archive);
  await assert.rejects(verifyNativeStudioDriveArchive(receiver as any,
    '/other/image.tar', receipt), /input_invalid/);
  assert.equal(receiver.commands.length, 0);
});
