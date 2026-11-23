/** Receive a verified image tar in a fresh job, then push without building. */
import { execFile } from 'node:child_process';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, sep } from 'node:path';
import { promisify } from 'node:util';
import { verifyStudioImageArchive } from './studio-image-archive.mjs';

const exec = promisify(execFile);
const ARCHIVE = 'native-studio/image-archive-v1.json';
const ATTEMPT = 'native-studio/image-push-attempt-v1.json';
const PREBUILT = 'native-studio/prebuilt-image-v1.json';
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export async function pushStudioImageArchive(input, deps = {}) {
  const { archivePath, receipt, store, trustedDocker, trustedWrangler,
    cloudflareCredential, sourceId, commit, workerId, site } = input ?? {};
  if (![archivePath, trustedDocker, trustedWrangler].every(value =>
        typeof value === 'string' && isAbsolute(value)) ||
      !TOKEN.test(cloudflareCredential) || !store ||
      typeof store.read !== 'function' || typeof store.claim !== 'function')
    throw Error('native_studio_image_push_input_invalid');
  await (deps.verifyArchive ?? verifyStudioImageArchive)(input);
  if (!same(await store.read(ARCHIVE), receipt))
    throw Error('native_studio_image_push_archive_unverified');
  const [docker, wrangler] = await Promise.all([
    realpath(trustedDocker), realpath(trustedWrangler) ]);
  const archiveDir = await realpath(join(archivePath, '..'));
  if ([docker, wrangler].some(path => path === archiveDir ||
      path.startsWith(`${archiveDir}${sep}`)))
    throw Error('native_studio_image_push_executable_untrusted');
  const existing = await store.read(PREBUILT);
  if (existing) {
    if (existing.accountId !== site.accountId ||
        existing.siteId !== site.siteId || existing.sourceId !== sourceId ||
        existing.commit !== commit || existing.workerId !== workerId ||
        !/^[a-f0-9]{64}$/.test(existing.digest))
      throw Error('native_studio_image_push_receipt_conflict');
    return existing;
  }
  const attempt = { sourceId, commit, workerId,
    archiveSha256: receipt.archive.sha256 };
  if (await store.read(ATTEMPT))
    throw Error('native_studio_image_push_pending_review');
  const privateHome = await mkdtemp(join(tmpdir(), 'gnr8-image-push-'));
  const tag = `gnr8-${site.siteId}-studio:${sourceId.slice(0, 32)}`;
  const registryTag = `registry.cloudflare.com/${site.accountId}/${tag}`;
  const invoke = deps.invoke ?? exec;
  const base = { cwd: privateHome, shell: false, windowsHide: true,
    timeout: 10 * 60_000, maxBuffer: 2 * 1024 * 1024,
    env: { PATH: '/usr/bin:/bin:/usr/local/bin', HOME: privateHome,
      TMPDIR: tmpdir(), CI: '1', WRANGLER_SEND_METRICS: 'false' } };
  try {
    await invoke(docker, ['load', '--input', archivePath], base);
    const architecture = await invoke(docker,
      ['image', 'inspect', '--format', '{{.Os}}/{{.Architecture}}', tag], base);
    if (architecture?.stdout?.trim() !== 'linux/amd64')
      throw Error('native_studio_image_push_architecture_invalid');
    if (!await store.claim(ATTEMPT, attempt))
      throw Error('native_studio_image_push_pending_review');
    const config = join(privateHome, 'wrangler.jsonc');
    await writeFile(config, JSON.stringify({ account_id: site.accountId }) + '\n',
      { flag: 'wx', mode: 0o600 });
    try {
      await invoke(wrangler, ['containers', 'push', tag,
        '--path-to-docker', docker, '--config', config], {
        ...base, timeout: 20 * 60_000,
        env: { ...base.env, CLOUDFLARE_API_TOKEN: cloudflareCredential },
      });
    } catch { throw Error('native_studio_image_push_failed'); }
    const output = await invoke(docker, ['image', 'inspect', '--format',
      '{{json .RepoDigests}}', registryTag], base);
    let digests;
    try { digests = JSON.parse(output?.stdout?.trim()); }
    catch { throw Error('native_studio_image_push_digest_unverified'); }
    const prefix = `registry.cloudflare.com/${site.accountId}/gnr8-${site.siteId}-studio@sha256:`;
    const matching = Array.isArray(digests) ? digests.filter(value =>
      typeof value === 'string' && value.startsWith(prefix) &&
      /^[a-f0-9]{64}$/.test(value.slice(prefix.length))) : [];
    if (matching.length !== 1)
      throw Error('native_studio_image_push_digest_unverified');
    const pushed = { sourceId, commit, workerId, siteId: site.siteId,
      accountId: site.accountId, digest: matching[0].slice(prefix.length) };
    await store.claim(PREBUILT, pushed);
    if (!same(await store.read(PREBUILT), pushed))
      throw Error('native_studio_image_push_receipt_conflict');
    return pushed;
  } finally {
    await rm(privateHome, { recursive: true, force: true });
  }
}
