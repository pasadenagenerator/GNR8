import 'server-only';
import type { Sandbox } from '@vercel/sandbox';
import { verifyStudioImageArchiveIdentity } from '../../../../scripts/stacki/studio-image-archive.mjs';

const ARCHIVE = 'native-studio/image-archive-v1.json';
const ATTEMPT = 'native-studio/image-push-attempt-v1.json';
const PREBUILT = 'native-studio/prebuilt-image-v1.json';
const CONFIG = '/vercel/sandbox/gnr8-image-push/wrangler.jsonc';
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const SHA = /^[a-f0-9]{64}$/;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type Receipt = { sourceId: string; commit: string; workerId: string;
  scope: { agencyId: string; clientId: string; siteId: string };
  siteId: string; accountId: string;
  archive: { bytes: number; sha256: string } };
type Store = { read: (key: string) => Promise<unknown>;
  claim: (key: string, value: unknown) => Promise<boolean> };
type Input = { archivePath: string; receipt: Receipt; store: Store;
  cloudflareCredential: string; dockerPath: string; wranglerPath: string;
  site: { siteId: string; accountId: string } };

async function run(sandbox: Pick<Sandbox, 'runCommand'>, cmd: string,
  args: string[], timeoutMs = 10 * 60_000, credential?: string) {
  const result = await sandbox.runCommand({ cmd, args,
    timeoutMs, env: { CI: '1', WRANGLER_SEND_METRICS: 'false',
      ...(credential ? { CLOUDFLARE_API_TOKEN: credential } : {}) } });
  if (result.exitCode !== 0) throw Error('native_studio_drive_image_push_command_failed');
  return (await result.stdout()).trim();
}

/** Load and inspect untrusted image bytes without credentials. Claim one
 * attempt before exposing the Cloudflare token to the pinned Wrangler binary. */
export async function pushNativeStudioDriveImage(
  sandbox: Pick<Sandbox, 'runCommand' | 'writeFiles'>, input: Input,
) {
  const { receipt, store, archivePath, site, dockerPath, wranglerPath,
    cloudflareCredential } = input ?? {} as Input;
  if (!store || typeof store.read !== 'function' ||
      typeof store.claim !== 'function' || !TOKEN.test(cloudflareCredential) ||
      !/^\/(?:usr|opt)\/[A-Za-z0-9_+./-]+$/.test(dockerPath) ||
      !/^\/(?:usr|opt)\/[A-Za-z0-9_+./-]+$/.test(wranglerPath) ||
      dockerPath.includes('..') || wranglerPath.includes('..') ||
      !site || site.siteId !== receipt?.siteId ||
      site.accountId !== receipt.accountId)
    throw Error('native_studio_drive_image_push_input_invalid');
  verifyStudioImageArchiveIdentity({ sourceId: receipt.sourceId,
    commit: receipt.commit, workerId: receipt.workerId,
    scope: receipt.scope, site, archivePath, receipt });
  if (!same(await store.read(ARCHIVE), receipt))
    throw Error('native_studio_drive_image_push_archive_unverified');
  const existing = await store.read(PREBUILT) as Record<string, unknown> | null;
  if (existing) {
    if (existing.accountId !== site.accountId ||
        existing.siteId !== site.siteId ||
        existing.sourceId !== receipt.sourceId ||
        existing.commit !== receipt.commit ||
        existing.workerId !== receipt.workerId ||
        typeof existing.digest !== 'string' || !SHA.test(existing.digest))
      throw Error('native_studio_drive_image_push_receipt_conflict');
    return existing;
  }
  if (await store.read(ATTEMPT))
    throw Error('native_studio_drive_image_push_pending_review');
  const tag = `gnr8-${site.siteId}-studio:${receipt.sourceId.slice(0, 32)}`;
  const registryTag = `registry.cloudflare.com/${site.accountId}/${tag}`;
  await run(sandbox, dockerPath, ['load', '--input', archivePath]);
  const architecture = await run(sandbox, dockerPath,
    ['image', 'inspect', '--format', '{{.Os}}/{{.Architecture}}', tag]);
  if (architecture !== 'linux/amd64')
    throw Error('native_studio_drive_image_push_architecture_invalid');
  const clean = await sandbox.runCommand({ cmd: 'node', args: [
    '--input-type=module', '-e',
    `import{lstat}from'node:fs/promises';try{await lstat(${JSON.stringify(CONFIG)});process.exit(2)}catch(e){if(e.code!=='ENOENT')throw e}`],
    timeoutMs: 30_000, env: { CI: '1' } });
  if (clean.exitCode !== 0)
    throw Error('native_studio_drive_image_push_snapshot_dirty');
  await sandbox.writeFiles([{ path: CONFIG,
    content: Buffer.from(JSON.stringify({ account_id: site.accountId }) + '\n') }]);
  const attempt = { sourceId: receipt.sourceId, commit: receipt.commit,
    workerId: receipt.workerId, archiveSha256: receipt.archive.sha256 };
  if (!await store.claim(ATTEMPT, attempt))
    throw Error('native_studio_drive_image_push_pending_review');
  try {
    await run(sandbox, wranglerPath, ['containers', 'push', tag,
      '--path-to-docker', dockerPath, '--config', CONFIG],
    20 * 60_000, cloudflareCredential);
  } catch { throw Error('native_studio_drive_image_push_failed'); }
  const output = await run(sandbox, dockerPath, ['image', 'inspect',
    '--format', '{{json .RepoDigests}}', registryTag]);
  let digests: unknown;
  try { digests = JSON.parse(output); }
  catch { throw Error('native_studio_drive_image_push_digest_unverified'); }
  const prefix = `registry.cloudflare.com/${site.accountId}/gnr8-${site.siteId}-studio@sha256:`;
  const matching = Array.isArray(digests) ? digests.filter(value =>
    typeof value === 'string' && value.startsWith(prefix) &&
    SHA.test(value.slice(prefix.length))) : [];
  if (matching.length !== 1)
    throw Error('native_studio_drive_image_push_digest_unverified');
  const pushed = { sourceId: receipt.sourceId, commit: receipt.commit,
    workerId: receipt.workerId, siteId: site.siteId,
    accountId: site.accountId, digest: matching[0].slice(prefix.length) };
  await store.claim(PREBUILT, pushed);
  if (!same(await store.read(PREBUILT), pushed))
    throw Error('native_studio_drive_image_push_receipt_conflict');
  return pushed;
}
