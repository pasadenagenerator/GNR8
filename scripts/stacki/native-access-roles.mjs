/** The narrow GNR8 bootstrap shape accepted by unchanged Stacki 1.4.20.
 * Callers must verify each identity against current agency membership and
 * the selected provider before passing it here. Format checks are not proof
 * of account ownership.
 */
const MAX_ADMINS = 200; // Stacki ROLE_LIMITS.membersMax.
const MAX_FILE_CHARS = 262_144; // Stacki ROLE_LIMITS.fileCharsMax.
const MAX_SUBJECT_CHARS = 200; // Stacki IDENTITY_LIMITS.subjectCharsMax.
const email = /^[a-z0-9][a-z0-9.!#$%&'*+/=?^_`{|}~-]*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

function principals(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_ADMINS)
    throw Error('native_access_roles_admins_invalid');
  const seen = new Set();
  for (const principal of input) {
    if (typeof principal !== 'string' || !principal.startsWith('access:') ||
        principal.slice('access:'.length).length > MAX_SUBJECT_CHARS ||
        !email.test(principal.slice('access:'.length)) ||
        seen.has(principal))
      throw Error('native_access_roles_admins_invalid');
    seen.add(principal);
  }
  return [...seen].sort();
}

const exactKeys = (value, keys) => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && Object.keys(value).sort().join() === [...keys].sort().join();

/** Validate only the bootstrap file that GNR8 generates. Native Stacki may
 * subsequently manage richer role files itself.
 */
export function validateNativeAccessRoles(source) {
  if (typeof source !== 'string' || source.length > MAX_FILE_CHARS)
    throw Error('native_access_roles_file_invalid');
  let data;
  try { data = JSON.parse(source); }
  catch { throw Error('native_access_roles_file_invalid'); }
  if (!exactKeys(data, ['version', 'defaultRole', 'roles']) ||
      data.version !== 1 || data.defaultRole !== 'client' ||
      !Array.isArray(data.roles) || data.roles.length !== 2 ||
      !exactKeys(data.roles[0], ['id', 'members']) ||
      data.roles[0].id !== 'admin' ||
      !exactKeys(data.roles[1], ['id', 'members']) ||
      data.roles[1].id !== 'client' ||
      !Array.isArray(data.roles[1].members) || data.roles[1].members.length !== 0)
    throw Error('native_access_roles_file_invalid');
  return principals(data.roles[0].members);
}

export function serializeNativeAccessRoles(verifiedPrincipals) {
  const members = principals(verifiedPrincipals);
  const source = `${JSON.stringify({ version: 1, defaultRole: 'client',
    roles: [{ id: 'admin', members }, { id: 'client', members: [] }] }, null, 2)}\n`;
  if (source.length > MAX_FILE_CHARS) throw Error('native_access_roles_file_invalid');
  validateNativeAccessRoles(source);
  return source;
}
