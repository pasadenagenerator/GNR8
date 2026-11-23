/** Build an image without deployment credentials and export one checked tar.
 * The caller must run this in a disposable build environment with no secrets.
 */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { chmod, lstat, mkdir, open, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { verifyStudioBuildHandoff } from './build-handoff.mjs';
import { verifyStudioImageSite } from './materialize-studio-image-site.mjs';

const exec = promisify(execFile);
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const MAX_ARCHIVE = 8 * 1024 * 1024 * 1024;
const ARCHIVE = 'native-studio/image-archive-v1.json';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function archiveDigest(path) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 1 ||
      info.size > MAX_ARCHIVE)
    throw Error('native_studio_image_archive_invalid');
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const hash = createHash('sha256');
    let bytes = 0;
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      bytes += chunk.length;
      if (bytes > MAX_ARCHIVE) throw Error('native_studio_image_archive_limit');
      hash.update(chunk);
    }
    if (bytes !== info.size)
      throw Error('native_studio_image_archive_changed');
    return { bytes, sha256: hash.digest('hex') };
  } finally {
    await handle.close();
  }
}

function identity(input) {
  const { sourceId, commit, workerId, scope, site } = input ?? {};
  if (!SHA.test(sourceId) || !COMMIT.test(commit) || !HEX32.test(workerId) ||
      !scope || ![scope.agencyId, scope.clientId, scope.siteId]
        .every(value => typeof value === 'string' && UUID.test(value)) ||
      !site || site.siteId !== scope.siteId ||
      !HEX32.test(site.accountId))
    throw Error('native_studio_image_archive_input_invalid');
  return { sourceId, commit, workerId, scope,
    siteId: site.siteId, accountId: site.accountId };
}

export function verifyStudioImageArchiveIdentity(input) {
  const expected = identity(input);
  const { archivePath, receipt } = input;
  if (typeof archivePath !== 'string' || !isAbsolute(archivePath) ||
      !receipt || Object.keys(receipt).sort().join() !==
        'accountId,archive,commit,scope,siteId,sourceId,workerId' ||
      !same(Object.fromEntries(Object.keys(expected).map(key =>
        [key, receipt[key]])), expected) ||
      !receipt.archive || Object.keys(receipt.archive).sort().join() !==
        'bytes,sha256' || !SHA.test(receipt.archive.sha256) ||
      !Number.isSafeInteger(receipt.archive.bytes) ||
      receipt.archive.bytes < 1 || receipt.archive.bytes > MAX_ARCHIVE)
    throw Error('native_studio_image_archive_receipt_invalid');
  return receipt;
}

export async function verifyStudioImageArchive(input) {
  const receipt = verifyStudioImageArchiveIdentity(input);
  if (!same(await archiveDigest(input.archivePath), receipt.archive))
    throw Error('native_studio_image_archive_changed');
  return receipt;
}

/** Trusted receiving job records the transferred bytes only after rechecking
 * the exact source/build handoff. The private store is outside the build VM.
 */
export async function recordStudioImageArchiveHandoff(input, deps = {}) {
  const { project, store, receipt, sourceId, commit, workerId, scope } = input ?? {};
  if (typeof project !== 'string' || !isAbsolute(project) ||
      !store || typeof store.read !== 'function' ||
      typeof store.claim !== 'function')
    throw Error('native_studio_image_archive_input_invalid');
  verifyStudioImageArchiveIdentity(input);
  const verified = await (deps.verifyArchive ?? verifyStudioImageArchive)(input);
  if (!same(verified, receipt))
    throw Error('native_studio_image_archive_changed');
  const handoff = await (deps.verifyHandoff ?? verifyStudioBuildHandoff)(input);
  const image = await (deps.verifyImage ?? verifyStudioImageSite)({ project });
  if (handoff?.sourceId !== sourceId || handoff.commit !== commit ||
      handoff.workerId !== workerId || !same(handoff.scope, scope) ||
      image?.files !== 2)
    throw Error('native_studio_image_archive_source_unverified');
  const prior = await store.read(ARCHIVE);
  if (prior && !same(prior, receipt))
    throw Error('native_studio_image_archive_receipt_conflict');
  if (!prior) await store.claim(ARCHIVE, receipt);
  if (!same(await store.read(ARCHIVE), receipt))
    throw Error('native_studio_image_archive_receipt_conflict');
  return receipt;
}

export async function buildStudioImageArchive(input, deps = {}) {
  const expected = identity(input);
  const { project, outputDir, trustedDocker, store, site } = input;
  if (![project, outputDir, trustedDocker].every(value =>
        typeof value === 'string' && isAbsolute(value)) ||
      !store || typeof store.read !== 'function' ||
      resolve(outputDir) === resolve(project) ||
      resolve(outputDir).startsWith(`${resolve(project)}${sep}`))
    throw Error('native_studio_image_archive_input_invalid');
  const checkout = await realpath(project);
  const docker = await realpath(trustedDocker);
  const outputParent = await realpath(dirname(outputDir));
  if (docker === checkout || docker.startsWith(`${checkout}${sep}`))
    throw Error('native_studio_image_archive_untrusted_docker');
  if (outputParent === checkout || outputParent.startsWith(`${checkout}${sep}`))
    throw Error('native_studio_image_archive_output_invalid');
  const handoff = await (deps.verifyHandoff ?? verifyStudioBuildHandoff)(input);
  const image = await (deps.verifyImage ?? verifyStudioImageSite)({ project: checkout });
  if (handoff?.sourceId !== expected.sourceId ||
      handoff.commit !== expected.commit ||
      handoff.workerId !== expected.workerId ||
      !same(handoff.scope, expected.scope) || image?.files !== 2)
    throw Error('native_studio_image_archive_source_unverified');
  await mkdir(outputDir, { mode: 0o700 });
  const archivePath = join(outputDir, 'image.tar');
  const tag = `gnr8-${site.siteId}-studio:${expected.sourceId.slice(0, 32)}`;
  const env = { PATH: '/usr/bin:/bin:/usr/local/bin',
    HOME: outputDir, TMPDIR: tmpdir(), CI: '1' };
  const invoke = deps.invoke ?? exec;
  try {
    await invoke(docker, ['build', '--platform', 'linux/amd64',
      '--file', 'Dockerfile', '--tag', tag, '.'],
      { cwd: join(checkout, 'studio'), shell: false, windowsHide: true,
        timeout: 20 * 60_000, maxBuffer: 2 * 1024 * 1024, env });
    await invoke(docker, ['save', '--output', archivePath, tag],
      { cwd: join(checkout, 'studio'), shell: false, windowsHide: true,
        timeout: 10 * 60_000, maxBuffer: 2 * 1024 * 1024, env });
    const after = await (deps.verifyHandoff ?? verifyStudioBuildHandoff)(input);
    const afterImage = await (deps.verifyImage ?? verifyStudioImageSite)(
      { project: checkout });
    if (!same(after, handoff) || afterImage?.files !== 2)
      throw Error('native_studio_image_archive_source_changed');
    const archive = await archiveDigest(archivePath);
    await chmod(archivePath, 0o600);
    const receipt = { ...expected, archive };
    await verifyStudioImageArchive({ ...input, archivePath, receipt });
    return { archivePath, receipt };
  } catch (error) {
    await rm(outputDir, { recursive: true, force: true });
    throw error;
  }
}
