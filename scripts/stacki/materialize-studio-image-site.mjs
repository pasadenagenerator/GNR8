/** Assemble only the two root manifests required by upstream Stacki's
 * Dockerfile. Run after the Git artifact handoff, before deploy credentials.
 */
import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { verifyCommittedStudioSource } from './prepare-git-branch.mjs';

const SHA = /^[a-f0-9]{40,64}$/;
const SOURCE = /^[a-f0-9]{64}$/;
const MANIFESTS = [
  ['package.json', 1024 * 1024],
  ['package-lock.json', 16 * 1024 * 1024],
];

async function regularBytes(path, limit) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > limit)
    throw Error('native_studio_image_manifest_invalid');
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const bytes = await handle.readFile();
    if (bytes.length !== info.size)
      throw Error('native_studio_image_manifest_changed');
    return bytes;
  } finally { await handle.close(); }
}

export async function materializeStudioImageSite(input, deps = {}) {
  const { project, store, sourceId, commit, site } = input ?? {};
  if (typeof project !== 'string' || !project || !store ||
      typeof store.read !== 'function' || !SOURCE.test(sourceId) ||
      !SHA.test(commit) || !site)
    throw Error('native_studio_image_input_invalid');
  const checked = await (deps.verifySource ?? verifyCommittedStudioSource)({
    project, store, sourceId, site, allowBuildOutputs: true });
  if (checked.sourceId !== sourceId || checked.commit !== commit ||
      checked.repository !== site.repository || checked.branch !== site.branch)
    throw Error('native_studio_image_source_unverified');
  const studio = join(project, 'studio');
  const studioInfo = await lstat(studio);
  if (!studioInfo.isDirectory() || studioInfo.isSymbolicLink())
    throw Error('native_studio_image_studio_invalid');
  const dockerfile = await regularBytes(join(studio, 'Dockerfile'), 1024 * 1024);
  if (!dockerfile.toString('utf8').split(/\r?\n/)
      .some(line => /^COPY \.studio-image\/site \/opt\/site\s*$/.test(line)))
    throw Error('native_studio_image_dockerfile_unverified');
  const manifests = await Promise.all(MANIFESTS.map(async ([name, limit]) =>
    [name, await regularBytes(join(project, name), limit)]));
  const image = join(studio, '.studio-image');
  await mkdir(image, { mode: 0o700 }).catch(error => {
    if (error?.code === 'EEXIST')
      throw Error('native_studio_image_destination_conflict');
    throw error;
  });
  try {
    const siteDir = join(image, 'site');
    await mkdir(siteDir, { mode: 0o700 });
    for (const [name, bytes] of manifests)
      await writeFile(join(siteDir, name), bytes, { flag: 'wx', mode: 0o600 });
    for (const [name, bytes] of manifests) {
      const copied = await readFile(join(siteDir, name));
      if (!copied.equals(bytes) ||
          !(await regularBytes(join(project, name),
            MANIFESTS.find(([entry]) => entry === name)[1])).equals(bytes))
        throw Error('native_studio_image_manifest_changed');
    }
    return { files: manifests.length, sourceId, commit };
  } catch (error) {
    await rm(image, { recursive: true, force: true });
    throw error;
  }
}
