/** Provider-free transfer of only receipt-listed build output between jobs. */
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { recordStudioBuildHandoff, scanStudioBuildOutputs,
  verifyStudioBuildHandoff } from './build-handoff.mjs';
import { verifyCommittedStudioSource } from './prepare-git-branch.mjs';

const HANDOFF = 'native-studio/build-handoff-v1.json';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function safeFile(root, relative) {
  let path = root;
  for (const part of relative.split('/')) {
    if (!part || part === '.' || part === '..')
      throw Error('native_studio_build_artifact_path_invalid');
    path = join(path, part);
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw Error('native_studio_build_artifact_symlink');
  }
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > 64 * 1024 * 1024)
      throw Error('native_studio_build_artifact_invalid');
    const bytes = await handle.readFile();
    if (bytes.length !== info.size)
      throw Error('native_studio_build_artifact_changed');
    return bytes;
  } finally { await handle.close(); }
}

function requireBytes(bytes, entry) {
  if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256)
    throw Error('native_studio_build_artifact_changed');
}

/** Install the finished Sandbox output into an already verified, credential-free
 * source checkout and record the immutable handoff. The Sandbox has stopped
 * before this function runs; no build command is executed in this checkout.
 */
export async function recordStudioSandboxBuildArtifact(input, deps = {}) {
  const { project, artifactDir, files, sourceId, store, site } = input ?? {};
  if (typeof project !== 'string' || !project ||
      typeof artifactDir !== 'string' || !artifactDir ||
      resolve(artifactDir) === resolve(project) ||
      resolve(artifactDir).startsWith(`${resolve(project)}/`) ||
      !Array.isArray(files) || !store || !site || typeof sourceId !== 'string')
    throw Error('native_studio_build_artifact_input_invalid');
  const artifactRoot = await lstat(artifactDir);
  if (!artifactRoot.isDirectory() || artifactRoot.isSymbolicLink() ||
      (await readdir(artifactDir)).sort().join() !== 'dist,studio' ||
      (await readdir(join(artifactDir, 'studio'))).join() !== 'dist' ||
      !same(await scanStudioBuildOutputs(artifactDir), files))
    throw Error('native_studio_build_artifact_unverified');
  const verifySource = deps.verifySource ?? verifyCommittedStudioSource;
  const checked = await verifySource({ project, store, sourceId, site });
  if (checked.sourceId !== sourceId || checked.commit !== input.commit ||
      checked.repository !== site.repository || checked.branch !== site.branch)
    throw Error('native_studio_build_artifact_source_unverified');
  for (const root of ['dist', 'studio/dist']) {
    const exists = await lstat(join(project, root)).then(() => true,
      error => error.code === 'ENOENT' ? false : Promise.reject(error));
    if (exists) throw Error('native_studio_build_artifact_destination_conflict');
  }
  try {
    for (const entry of files) {
      const bytes = await safeFile(resolve(artifactDir), entry.path);
      requireBytes(bytes, entry);
      const path = join(project, entry.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
    }
    if (!same(await scanStudioBuildOutputs(project), files))
      throw Error('native_studio_build_artifact_changed');
    return await (deps.recordHandoff ?? recordStudioBuildHandoff)(input,
      { verifySource });
  } catch (error) {
    await rm(join(project, 'dist'), { recursive: true, force: true });
    await rm(join(project, 'studio/dist'), { recursive: true, force: true });
    throw error;
  }
}

/** Run after recording the durable handoff, before uploading an artifact
 * directory. The destination must be absent and outside the build checkout.
 */
export async function exportStudioBuildArtifactDirectory(input, deps = {}) {
  const { project, artifactDir } = input ?? {};
  if (typeof project !== 'string' || !project ||
      typeof artifactDir !== 'string' || !artifactDir ||
      resolve(artifactDir) === resolve(project) ||
      resolve(artifactDir).startsWith(`${resolve(project)}/`))
    throw Error('native_studio_build_artifact_input_invalid');
  const receipt = await (deps.verifyHandoff ?? verifyStudioBuildHandoff)(input,
    { verifySource: deps.verifySource ?? verifyCommittedStudioSource });
  await mkdir(artifactDir, { mode: 0o700 });
  try {
    for (const entry of receipt.files) {
      const bytes = await safeFile(resolve(project), entry.path);
      requireBytes(bytes, entry);
      const path = join(artifactDir, entry.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
    }
    if (!same(await scanStudioBuildOutputs(artifactDir), receipt.files))
      throw Error('native_studio_build_artifact_changed');
    return { files: receipt.files.length, sourceId: receipt.sourceId,
      commit: receipt.commit };
  } catch (error) {
    await rm(artifactDir, { recursive: true, force: true });
    throw error;
  }
}

/** Run in a fresh deployment checkout. No source, dependency tree, process or
 * arbitrary build-job file is copied from the artifact directory.
 */
export async function restoreStudioBuildArtifactDirectory(input, deps = {}) {
  const { project, artifactDir, store, sourceId, commit, scope, site, workerId } = input ?? {};
  if (typeof project !== 'string' || !project ||
      typeof artifactDir !== 'string' || !artifactDir ||
      !store || typeof store.read !== 'function' ||
      !site || !scope || typeof sourceId !== 'string' ||
      typeof commit !== 'string' || typeof workerId !== 'string')
    throw Error('native_studio_build_artifact_input_invalid');
  const artifactRoot = await lstat(artifactDir);
  if (!artifactRoot.isDirectory() || artifactRoot.isSymbolicLink())
    throw Error('native_studio_build_artifact_unverified');
  const checked = await (deps.verifySource ?? verifyCommittedStudioSource)(
    { project, store, sourceId, site });
  if (checked.sourceId !== sourceId || checked.commit !== commit ||
      checked.repository !== site.repository || checked.branch !== site.branch)
    throw Error('native_studio_build_artifact_source_unverified');
  const receipt = await store.read(HANDOFF);
  if (!receipt || receipt.sourceId !== sourceId || receipt.commit !== commit ||
      receipt.workerId !== workerId || !same(receipt.scope, scope) ||
      !same(receipt.site, { siteId: site.siteId, repository: site.repository,
        branch: site.branch, studioOrigin: site.studioOrigin,
        accountId: site.accountId }) || !Array.isArray(receipt.files))
    throw Error('native_studio_build_artifact_receipt_conflict');
  if ((await readdir(artifactDir)).sort().join() !== 'dist,studio' ||
      (await readdir(join(artifactDir, 'studio'))).join() !== 'dist' ||
      !same(await scanStudioBuildOutputs(artifactDir), receipt.files))
    throw Error('native_studio_build_artifact_unverified');
  for (const root of ['dist', 'studio/dist']) {
    const path = join(project, root);
    const exists = await lstat(path).then(() => true,
      error => error.code === 'ENOENT' ? false : Promise.reject(error));
    if (exists) throw Error('native_studio_build_artifact_destination_conflict');
  }
  try {
    for (const entry of receipt.files) {
      const bytes = await safeFile(resolve(artifactDir), entry.path);
      requireBytes(bytes, entry);
      const path = join(project, entry.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
    }
    await (deps.verifyHandoff ?? verifyStudioBuildHandoff)(input,
      { verifySource: deps.verifySource ?? verifyCommittedStudioSource });
  } catch (error) {
    await rm(join(project, 'dist'), { recursive: true, force: true });
    await rm(join(project, 'studio/dist'), { recursive: true, force: true });
    throw error;
  }
  return { files: receipt.files.length, sourceId, commit };
}
