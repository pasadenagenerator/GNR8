/** Upgrade only untouched upstream Studio files in a clean, disposable site checkout.
 * Site content, GNR8's Worker configuration, drafts, and native UI code are not rewritten.
 * This script performs no network request, build, commit, push, or deployment.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { STACKI_RELEASE_PIN } from './release-pin.mjs';

const OLD_RELEASES = Object.freeze({
  '1.0.22': 'c73c1a404fa87fafdbdf75734f2710609652f6f38503c56809ab8de52cb43dea',
  '1.4.2': 'c6da7fff8e50b0d06dbfcc57f36a7a2e879f35f7a86b8611949d5a930681b12c',
  '1.4.8': '9e82dc97f0998ea38cd0363a3d7a7a89396dd00cae1537bff116f316e32e86d4',
  '1.4.13': 'cab63e05ab8d56b7e0f6c756a5196a7f8324eacf7e7eea4f3a0627f9ea9ba877',
});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw Error(message); };
const validPath = path => typeof path === 'string' &&
  /^[\w.-]+(?:\/[\w.-]+)*$/.test(path) &&
  path.split('/').every(part => part !== '.' && part !== '..');

async function release(file, pin) {
  const bytes = await readFile(file);
  if (bytes.length > 32_000_000 || hash(bytes) !== pin.sha256) fail('Stacki release digest mismatch');
  const data = JSON.parse(bytes);
  if (data.format !== 1 || data.version !== pin.version || !Array.isArray(data.files)) fail('Stacki release mismatch');
  const files = new Map();
  for (const entry of data.files) {
    if (!validPath(entry.path) || typeof entry.content !== 'string' || files.has(entry.path))
      fail('Invalid Stacki release path');
    files.set(entry.path, entry.content);
  }
  return files;
}

async function regular(root, path) {
  let current = root;
  for (const part of path.split('/')) {
    current = join(current, part);
    let info;
    try { info = await lstat(current); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    if (info.isSymbolicLink()) fail(`Symlink refused: ${path}`);
    if (current === join(root, path)) {
      if (!info.isFile()) fail(`Non-file refused: ${path}`);
    } else if (!info.isDirectory()) fail(`Non-directory refused: ${path}`);
  }
  return readFile(current, 'utf8');
}

export async function upgradeNativeStudio({ project, oldReleaseFile, newReleaseFile }) {
  project = resolve(project);
  const studio = join(project, 'studio');
  if (!(await lstat(studio)).isDirectory()) fail('Studio directory required');
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: project, encoding: 'utf8' }).trim();
  if (root !== project) fail('Use the site repository root');
  if (execFileSync('git', ['status', '--porcelain', '--untracked-files=no', '--', 'studio'],
    { cwd: project, encoding: 'utf8' }).trim()) fail('Use a clean disposable checkout');
  const installed = JSON.parse(await regular(studio, 'package.json'))?.version;
  const oldDigest = Object.hasOwn(OLD_RELEASES, installed) && OLD_RELEASES[installed];
  if (!oldDigest) fail('Unsupported installed Stacki release');
  const oldFiles = await release(oldReleaseFile, { version: installed, sha256: oldDigest });
  const newFiles = await release(newReleaseFile, STACKI_RELEASE_PIN);
  if ((await regular(studio, 'package.json')) !== oldFiles.get('package.json'))
    fail(`Expected Stacki ${installed}`);

  // Inspect every affected path before the first write. Existing files from the
  // upstream bundle must be exact, including files the new release removes.
  for (const [path, content] of oldFiles) {
    if ((await regular(studio, path)) !== content) fail(`Changed native Studio file: ${path}`);
  }
  for (const path of newFiles.keys()) {
    if (!oldFiles.has(path) && await regular(studio, path) !== null)
      fail(`New native Studio path already exists: ${path}`);
  }

  let written = 0; let removed = 0;
  for (const [path, content] of newFiles) {
    if (oldFiles.get(path) === content) continue;
    const destination = join(studio, path);
    await mkdir(dirname(destination), { recursive: true });
    const temporary = `${destination}.gnr8-upgrade`;
    try {
      await writeFile(temporary, content, { flag: 'wx' });
      await rename(temporary, destination);
    } finally { await rm(temporary, { force: true }); }
    written++;
  }
  for (const path of oldFiles.keys()) {
    if (newFiles.has(path)) continue;
    await rm(join(studio, path));
    removed++;
  }
  return { from: installed, to: STACKI_RELEASE_PIN.version, written, removed,
    retainedSiteFiles: true, hosted: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [project, oldReleaseFile, newReleaseFile, ...extra] = process.argv.slice(2);
  if (!project || !oldReleaseFile || !newReleaseFile || extra.length)
    fail('Usage: node upgrade-native-studio.mjs PROJECT OLD_RELEASE_JSON NEW_RELEASE_JSON');
  console.log(JSON.stringify(await upgradeNativeStudio({ project, oldReleaseFile, newReleaseFile })));
}
