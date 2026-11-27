/** A verified Astro toolchain for the native Stacki derivative only. */
import { createHash } from 'node:crypto';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const NATIVE_ASTRO_TOOLCHAIN_PIN = Object.freeze({
  version: '7.4.7',
  packageSha256: '9ba9aa1641063a0cb043dbea651f0da26a9566f576f6ff7695ecd7e0059a6943',
  lockSha256: 'f4ef9bd667fcf5a978f3a4f18383db6377023c095aadd3892adb207ddcb0d261',
});

async function pinnedTemplate(name, sha256) {
  // Next can bundle this module into a route chunk while tracing the JSON
  // files to the original scripts/stacki directory. Try only those layouts.
  const locations = [new URL(`./${name}`, import.meta.url),
    join(process.cwd(), 'scripts/stacki', name),
    join(process.cwd(), '../../scripts/stacki', name)];
  for (const location of locations) {
    let bytes;
    try { bytes = await readFile(location); }
    catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') continue;
      throw error;
    }
    if (digest(bytes) !== sha256)
      throw Error('Native Astro toolchain template digest mismatch');
    return bytes;
  }
  throw Error('Native Astro toolchain template unavailable');
}

export async function prepareNativeAstroToolchain({ project }) {
  const root = resolve(project);
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw Error('Native Astro project must be a real directory');
  const packagePath = join(root, 'package.json');
  const lockPath = join(root, 'package-lock.json');
  for (const path of [packagePath, lockPath]) {
    const file = await lstat(path);
    if (!file.isFile() || file.isSymbolicLink())
      throw Error('Native Astro toolchain path invalid');
  }
  const [packageBytes, lockBytes, sourcePackageBytes, sourceLockBytes] =
    await Promise.all([pinnedTemplate('native-astro-7.4.7-package.json',
      NATIVE_ASTRO_TOOLCHAIN_PIN.packageSha256),
      pinnedTemplate('native-astro-7.4.7-package-lock.json',
        NATIVE_ASTRO_TOOLCHAIN_PIN.lockSha256),
      readFile(packagePath), readFile(lockPath)]);
  let nextPackage, nextLock, sourcePackage, sourceLock;
  try {
    nextPackage = JSON.parse(packageBytes.toString('utf8'));
    nextLock = JSON.parse(lockBytes.toString('utf8'));
    sourcePackage = JSON.parse(sourcePackageBytes.toString('utf8'));
    sourceLock = JSON.parse(sourceLockBytes.toString('utf8'));
  } catch { throw Error('Native Astro toolchain JSON invalid'); }
  const sourceVersion = sourcePackage.dependencies?.astro;
  if (!['5.18.2', '7.4.4', '7.4.7'].includes(sourceVersion) ||
      sourceLock.packages?.['']?.dependencies?.astro !== sourceVersion ||
      nextPackage.dependencies?.astro !== NATIVE_ASTRO_TOOLCHAIN_PIN.version ||
      nextLock.packages?.['']?.dependencies?.astro !== NATIVE_ASTRO_TOOLCHAIN_PIN.version ||
      nextLock.packages?.['node_modules/astro']?.version !== NATIVE_ASTRO_TOOLCHAIN_PIN.version ||
      nextLock.name !== nextPackage.name ||
      nextLock.packages?.['']?.name !== nextPackage.name)
    throw Error('Native Astro toolchain mismatch');
  await writeFile(packagePath, packageBytes);
  await writeFile(lockPath, lockBytes);
  return { from: sourceVersion, version: NATIVE_ASTRO_TOOLCHAIN_PIN.version };
}
