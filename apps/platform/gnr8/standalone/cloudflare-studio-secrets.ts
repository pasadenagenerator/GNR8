import 'server-only';
import type { NativeStudioScope } from './native-studio-binding-store';
import type { NativeStudioRuntimeSecrets } from './native-studio-runtime-secrets';

const names = [
  'AI_API_KEY', 'CONTAINER_TOKEN', 'GITHUB_CLIENT_SECRET',
  'GITHUB_PRIVATE_KEY', 'PUBLISH_CLOUDFLARE_API_TOKEN', 'SESSION_SECRET',
] as const;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function validInput(scope: NativeStudioScope, accountId: string, token: string,
  secrets: NativeStudioRuntimeSecrets) {
  return !!scope && [scope.agencyId, scope.clientId, scope.siteId].every(value => uuid.test(value)) &&
    /^[a-f0-9]{32}$/.test(accountId) &&
    typeof token === 'string' && token.length >= 16 && !/\s/.test(token) &&
    secrets && Object.keys(secrets).sort().join() === names.join() &&
    names.every(name => typeof secrets[name] === 'string' && secrets[name].length > 0);
}

/** Installs only the exact native Worker secret set. The Worker must already
 * exist. Active-version name/type readback cannot verify secret values or
 * Container health, so this result is not a ready-site receipt.
 */
export async function installNativeStudioSecrets(
  scope: NativeStudioScope,
  accountId: string,
  setupToken: string,
  secrets: NativeStudioRuntimeSecrets,
  transport: typeof fetch = fetch,
): Promise<{ worker: string; secretNames: readonly string[]; versionId: string }> {
  if (!validInput(scope, accountId, setupToken, secrets))
    throw Error('native_studio_secret_install_invalid');
  const worker = `gnr8-${scope.siteId}-studio`;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${worker}`;
  const headers = { authorization: `Bearer ${setupToken}`, accept: 'application/json' };
  async function read(path: string): Promise<unknown> {
    const response = await transport(`${url}${path}`, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000), headers,
    });
    if (!response.ok) throw Error('native_studio_secret_readback_failed');
    let body: unknown;
    try { body = await response.json(); }
    catch { throw Error('native_studio_secret_readback_failed'); }
    if (!object(body) || body.success !== true)
      throw Error('native_studio_secret_readback_failed');
    return body.result;
  }
  async function activeVersionId(): Promise<string> {
    const deployments = await read('/deployments?per_page=1');
    if (!object(deployments) || !Array.isArray(deployments.deployments) ||
      !object(deployments.deployments[0]) ||
      !Array.isArray(deployments.deployments[0].versions) ||
      deployments.deployments[0].versions.length !== 1 ||
      !object(deployments.deployments[0].versions[0]) ||
      deployments.deployments[0].versions[0].percentage !== 100 ||
      typeof deployments.deployments[0].versions[0].version_id !== 'string' ||
      !uuid.test(deployments.deployments[0].versions[0].version_id))
      throw Error('native_studio_secret_readback_failed');
    return deployments.deployments[0].versions[0].version_id as string;
  }
  const previousVersionId = await activeVersionId();
  const patch = await transport(`${url}/secrets-bulk`, {
    method: 'PATCH', redirect: 'error', signal: AbortSignal.timeout(30_000),
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ secrets: Object.fromEntries(names.map(name =>
      [name, { name, text: secrets[name], type: 'secret_text' }])) }),
  });
  // Provider responses may contain credentials. Never surface their bodies.
  if (!patch.ok) throw Error('native_studio_secret_install_failed');
  try {
    if ((await patch.json() as { success?: unknown })?.success !== true)
      throw Error('invalid');
  } catch { throw Error('native_studio_secret_install_failed'); }
  const versionId = await activeVersionId();
  if (versionId === previousVersionId)
    throw Error('native_studio_secret_readback_failed');
  const version = await read(`/versions/${versionId}`);
  const resources = object(version) ? version.resources : null;
  if (!object(version) || version.id !== versionId || !object(resources) ||
      !Array.isArray(resources.bindings))
    throw Error('native_studio_secret_readback_failed');
  const bindings: unknown[] = resources.bindings;
  if (!names.every(name => bindings.some((item: unknown) =>
        object(item) && item.name === name && item.type === 'secret_text')))
    throw Error('native_studio_secret_readback_failed');
  return { worker, secretNames: names, versionId };
}
