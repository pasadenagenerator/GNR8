import 'server-only';
import type { Sandbox } from '@vercel/sandbox';

const SHA = /^[a-f0-9]{64}$/;
const MAX_ARCHIVE = 8 * 1024 * 1024 * 1024;
const ARCHIVE_PATH = '/gnr8-image/image.tar';

type ArchiveReceipt = { archive: { bytes: number; sha256: string } };

/** Hash the read-only Drive snapshot in the receiving Sandbox, without moving
 * the image into the function or loading a deployment credential. */
export async function verifyNativeStudioDriveArchive(
  sandbox: Pick<Sandbox, 'runCommand'>, archivePath: string,
  receipt: ArchiveReceipt,
): Promise<ArchiveReceipt> {
  if (archivePath !== ARCHIVE_PATH || !receipt?.archive ||
      !Number.isSafeInteger(receipt.archive.bytes) ||
      receipt.archive.bytes < 1 || receipt.archive.bytes > MAX_ARCHIVE ||
      !SHA.test(receipt.archive.sha256))
    throw Error('native_studio_drive_archive_input_invalid');
  const script = `import{createHash}from'node:crypto';import{constants}from'node:fs';import{lstat,open}from'node:fs/promises';
const p=${JSON.stringify(ARCHIVE_PATH)};const s=await lstat(p);
if(!s.isFile()||s.isSymbolicLink()||s.size<1||s.size>${MAX_ARCHIVE})process.exit(2);
const h=createHash('sha256');let n=0;const f=await open(p,constants.O_RDONLY|constants.O_NOFOLLOW);
try{for await(const c of f.createReadStream({autoClose:false})){n+=c.length;
if(n>${MAX_ARCHIVE})process.exit(2);h.update(c)}}finally{await f.close()}
if(n!==s.size)process.exit(2);console.log(JSON.stringify({bytes:n,sha256:h.digest('hex')}))`;
  const result = await sandbox.runCommand({ cmd: 'node',
    args: ['--input-type=module', '-e', script], timeoutMs: 10 * 60_000 });
  if (result.exitCode !== 0)
    throw Error('native_studio_drive_archive_unreadable');
  let observed: unknown;
  try { observed = JSON.parse((await result.stdout()).trim()); }
  catch { throw Error('native_studio_drive_archive_unreadable'); }
  if (!observed || typeof observed !== 'object' ||
      Object.keys(observed).sort().join() !== 'bytes,sha256' ||
      (observed as ArchiveReceipt['archive']).bytes !== receipt.archive.bytes ||
      (observed as ArchiveReceipt['archive']).sha256 !== receipt.archive.sha256)
    throw Error('native_studio_drive_archive_changed');
  return receipt;
}
