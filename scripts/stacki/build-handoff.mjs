/** Immutable, provider-free handoff of generated files between isolated jobs.
 * The trusted caller retains this receipt outside the untrusted build job.
 */
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { verifyCommittedStudioSource } from './prepare-git-branch.mjs';

const KEY = 'native-studio/build-handoff-v1.json';
const ROOTS = ['dist', 'studio/dist'];
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const MAX_FILES = 20_000;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value);

function target(site) {
  const keys = ['siteId', 'repository', 'branch', 'studioOrigin', 'accountId'];
  if (!site || keys.some(key => typeof site[key] !== 'string' || !site[key]))
    throw Error('native_studio_build_handoff_input_invalid');
  return Object.fromEntries(keys.map(key => [key, site[key]]));
}

export async function scanStudioBuildOutputs(project) {
  const files = [];
  let total = 0;
  async function walk(relative) {
    const absolute = join(project, relative);
    const info = await lstat(absolute).catch(error => {
      if (error.code === 'ENOENT') throw Error('native_studio_build_handoff_missing');
      throw error;
    });
    if (info.isSymbolicLink()) throw Error('native_studio_build_handoff_symlink');
    if (info.isDirectory()) {
      for (const name of (await readdir(absolute)).sort()) {
        if (name === '.' || name === '..' || name.includes('/') || name.includes('\\'))
          throw Error('native_studio_build_handoff_path_invalid');
        await walk(`${relative}/${name}`);
      }
      return;
    }
    if (!info.isFile() || info.size > MAX_FILE_BYTES || files.length >= MAX_FILES)
      throw Error('native_studio_build_handoff_limit');
    total += info.size;
    if (total > MAX_TOTAL_BYTES) throw Error('native_studio_build_handoff_limit');
    const bytes = await readFile(absolute);
    if (bytes.length !== info.size) throw Error('native_studio_build_handoff_changed');
    files.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) });
  }
  for (const root of ROOTS) await walk(root);
  if (!ROOTS.every(root => files.some(file => file.path.startsWith(`${root}/`))))
    throw Error('native_studio_build_handoff_missing');
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function source(input, verifySource) {
  const { project, store, sourceId, commit, site, scope, workerId } = input ?? {};
  const boundSite = target(site);
  if (typeof project !== 'string' || !project || !store ||
      typeof store.read !== 'function' || typeof store.claim !== 'function' ||
      !SHA.test(sourceId) || !COMMIT.test(commit) || !HEX32.test(workerId) ||
      !scope || Object.keys(scope).sort().join() !== 'agencyId,clientId,siteId' ||
      ![scope.agencyId, scope.clientId, scope.siteId]
        .every(value => typeof value === 'string' && UUID.test(value)) ||
      scope.siteId !== site.siteId || typeof verifySource !== 'function')
    throw Error('native_studio_build_handoff_input_invalid');
  const checkout = resolve(project);
  const real = await lstat(checkout);
  if (!real.isDirectory() || real.isSymbolicLink())
    throw Error('native_studio_build_handoff_input_invalid');
  const checked = await verifySource({ project: checkout, store, sourceId, site,
    allowBuildOutputs: true });
  if (checked.sourceId !== sourceId || checked.commit !== commit ||
      checked.repository !== site.repository || checked.branch !== site.branch)
    throw Error('native_studio_build_handoff_source_unverified');
  return { checkout, identity: { sourceId, commit, scope, workerId,
    site: boundSite } };
}

/** Call only after the build job ends. The stored receipt cannot be replaced. */
export async function recordStudioBuildHandoff(input, deps = {}) {
  const { checkout, identity } = await source(input,
    deps.verifySource ?? verifyCommittedStudioSource);
  const files = await scanStudioBuildOutputs(checkout);
  await source(input, deps.verifySource ?? verifyCommittedStudioSource);
  const receipt = { ...identity, files };
  const prior = await input.store.read(KEY);
  if (prior) {
    if (canonical(prior) !== canonical(receipt))
      throw Error('native_studio_build_handoff_conflict');
    return receipt;
  }
  await input.store.claim(KEY, receipt);
  if (canonical(await input.store.read(KEY)) !== canonical(receipt))
    throw Error('native_studio_build_handoff_conflict');
  return receipt;
}

/** Run in a fresh deployment job, after copying only receipt-listed files. */
export async function verifyStudioBuildHandoff(input, deps = {}) {
  const { checkout, identity } = await source(input,
    deps.verifySource ?? verifyCommittedStudioSource);
  const receipt = await input.store.read(KEY);
  if (!receipt || canonical({ sourceId: receipt.sourceId, commit: receipt.commit,
    scope: receipt.scope, workerId: receipt.workerId,
    site: receipt.site }) !== canonical(identity) || !Array.isArray(receipt.files))
    throw Error('native_studio_build_handoff_conflict');
  const files = await scanStudioBuildOutputs(checkout);
  if (canonical(files) !== canonical(receipt.files))
    throw Error('native_studio_build_handoff_changed');
  await source(input, deps.verifySource ?? verifyCommittedStudioSource);
  return receipt;
}
