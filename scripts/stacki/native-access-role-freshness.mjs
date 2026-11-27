import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { join } from 'node:path';
import { serializeNativeAccessRoles, validateNativeAccessRoles } from './native-access-roles.mjs';

const invalid = () => { throw Error('native_access_roles_snapshot_stale'); };

/** Compare the exact prepared root role file with freshly authorized principals.
 * Call immediately before the credentialed first push, after source verification.
 * No provider access or file mutation occurs here.
 */
export async function verifyNativeAccessRoleFreshness({ project, principals }) {
  if (typeof project !== 'string' || !project || !Array.isArray(principals)) invalid();
  const directory = join(project, '.stacki');
  const file = join(directory, 'roles.json');
  let handle;
  try {
    const [root, folder, entry] = await Promise.all([
      lstat(project), lstat(directory), lstat(file),
    ]);
    if (!root.isDirectory() || root.isSymbolicLink() ||
        !folder.isDirectory() || folder.isSymbolicLink() ||
        !entry.isFile() || entry.isSymbolicLink() || entry.size > 262_144)
      invalid();
    handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== entry.dev || opened.ino !== entry.ino ||
        opened.size !== entry.size) invalid();
    const source = await handle.readFile({ encoding: 'utf8' });
    const expected = serializeNativeAccessRoles(principals);
    validateNativeAccessRoles(source);
    if (source !== expected) invalid();
    const current = await lstat(file);
    if (!current.isFile() || current.isSymbolicLink() ||
        current.dev !== opened.dev || current.ino !== opened.ino ||
        current.size !== opened.size) invalid();
    return { state: 'current', principals: [...principals].sort() };
  } catch { invalid(); }
  finally { await handle?.close(); }
}

/** The first Git Data push has no checkout. Its committed role bytes were
 * verified against the immutable source before this current-authority check. */
export function verifyNativeAccessRoleBytesFreshness({ rolesBytes, principals }) {
  if (!Buffer.isBuffer(rolesBytes) || rolesBytes.length > 262_144 ||
      !Array.isArray(principals)) invalid();
  try {
    const source = new TextDecoder('utf-8', { fatal: true }).decode(rolesBytes);
    validateNativeAccessRoles(source);
    if (source !== serializeNativeAccessRoles(principals)) invalid();
    return { state: 'current', principals: [...principals].sort() };
  } catch { invalid(); }
}
