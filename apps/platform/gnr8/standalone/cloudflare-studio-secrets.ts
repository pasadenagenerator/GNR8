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
): Promise<{ worker: string; secretNames: readonly string[];
  versionId: string; previousVersionId: string }> {
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
  const previousVersion = await read(`/versions/${previousVersionId}`);
  if (!object(previousVersion) || previousVersion.id !== previousVersionId ||
      !object(previousVersion.resources) ||
      !Array.isArray(previousVersion.resources.bindings))
    throw Error('native_studio_secret_readback_failed');
  // This first-install path cannot recover the value of an existing secret.
  // Existing Studios need a separate, verified migration before replacement.
  if (previousVersion.resources.bindings.some((item: unknown) =>
    object(item) && item.name === 'PUBLISH_CLOUDFLARE_API_TOKEN'))
    throw Error('native_studio_existing_publish_secret_requires_cutover');
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
  return { worker, secretNames: names, versionId, previousVersionId };
}

/** Read-only binding inventory for the version captured before secret upload.
 * Complete bindings make it a recovery candidate, not a proven rollback or
 * working native Publish. Secret values are never returned by this endpoint.
 */
export async function inspectNativeStudioRecoveryBindings(
  scope: NativeStudioScope,
  accountId: string,
  setupToken: string,
  previousVersionId: string | null,
  expected: Readonly<{ workerId: string; domain: string; repository: string }>,
  transport: typeof fetch = fetch,
) {
  if (!scope || [scope.agencyId, scope.clientId, scope.siteId]
      .some(value => typeof value !== 'string' || !uuid.test(value)) ||
      !/^[a-f0-9]{32}$/.test(accountId) ||
      typeof setupToken !== 'string' || setupToken.length < 16 || /\s/.test(setupToken) ||
      !expected || !/^[a-f0-9]{32}$/.test(expected.workerId) ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(expected.domain) ||
      !/^[A-Za-z0-9-]{1,39}\/[a-z0-9][a-z0-9-]{0,62}$/.test(expected.repository) ||
      (previousVersionId !== null &&
        (typeof previousVersionId !== 'string' || !uuid.test(previousVersionId))))
    throw Error('native_studio_recovery_inspection_invalid');
  const worker = `gnr8-${scope.siteId}-studio`;
  if (previousVersionId === null)
    return { state: 'no-reference' as const, worker };
  async function read(path: string, allowMissing = false): Promise<unknown> {
    const response = await transport(`https://api.cloudflare.com/client/v4` +
      `/accounts/${accountId}${path}`, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${setupToken}`, accept: 'application/json' },
    });
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) throw Error('native_studio_recovery_inspection_failed');
    let body: unknown;
    try { body = await response.json(); }
    catch { throw Error('native_studio_recovery_inspection_failed'); }
    if (!object(body) || body.success !== true)
      throw Error('native_studio_recovery_inspection_failed');
    return body.result;
  }
  const identity = await read(`/workers/workers/${worker}`);
  if (!object(identity) || identity.name !== worker || identity.id !== expected.workerId ||
      !object(identity.subdomain) || identity.subdomain.enabled !== false ||
      identity.subdomain.previews_enabled !== false)
    throw Error('native_studio_recovery_inspection_failed');
  const version = await read(`/workers/scripts/${worker}/versions/${previousVersionId}`, true);
  if (version === null)
    return { state: 'version-missing' as const, worker, versionId: previousVersionId };
  if (!object(version) || version.id !== previousVersionId ||
      !object(version.resources) || !Array.isArray(version.resources.bindings))
    throw Error('native_studio_recovery_inspection_failed');
  const bindings: unknown[] = version.resources.bindings;
  const missingSecretNames = names.filter(name => {
    const matches = bindings.filter(item => object(item) && item.name === name);
    return matches.length !== 1 || !object(matches[0]) ||
      matches[0].type !== 'secret_text';
  });
  const exact = (name: string, matches: (binding: Record<string, unknown>) => boolean) => {
    const found = bindings.filter(item => object(item) && item.name === name);
    return found.length === 1 && object(found[0]) && matches(found[0]);
  };
  const required = [
    ['DRAFTS', (item: Record<string, unknown>) => item.type === 'r2_bucket' &&
      item.bucket_name === `gnr8-${scope.siteId}-drafts`],
    ['PREVIEW', (item: Record<string, unknown>) =>
      item.type === 'durable_object_namespace' && item.class_name === 'PreviewContainer' &&
      (item.script_name === undefined || item.script_name === worker)],
    ['ASSETS', (item: Record<string, unknown>) => item.type === 'assets'],
    ['STUDIO_ORIGIN', (item: Record<string, unknown>) =>
      item.type === 'plain_text' && item.text === `https://${expected.domain}`],
    ['PREVIEW_ORIGIN', (item: Record<string, unknown>) =>
      item.type === 'plain_text' && item.text === `https://preview.${expected.domain}`],
    ['SITE_DEPLOYMENT_URL', (item: Record<string, unknown>) =>
      item.type === 'plain_text' && item.text === `https://${expected.domain}/__studio-deployment`],
    ['EDITOR_ACCESS', (item: Record<string, unknown>) =>
      item.type === 'plain_text' && item.text === 'repository'],
    ['EDITOR_GITHUB_IDS', (item: Record<string, unknown>) =>
      item.type === 'plain_text' && item.text === ''],
    ['GITHUB_REPOSITORY', (item: Record<string, unknown>) =>
      item.type === 'plain_text' && item.text === expected.repository],
  ] as const;
  const missingBindingNames = required.filter(([name, match]) => !exact(name, match))
    .map(([name]) => name);
  return { state: missingSecretNames.length === 0 && missingBindingNames.length === 0
    ? 'complete-bindings' as const : 'incomplete-bindings' as const,
    worker, versionId: previousVersionId, missingSecretNames, missingBindingNames };
}
