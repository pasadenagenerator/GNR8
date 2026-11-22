import 'server-only';
import { createPrivateKey, sign } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import type { NativeStudioScope } from './native-studio-binding-store';
import { isGitHubInstallationToken } from './github-native-studio-head';

type Environment = Record<string, string | undefined>;
type Site = Awaited<ReturnType<typeof configuredNativeStudioBootstrapSite>>;
type SiteReader = typeof configuredNativeStudioBootstrapSite;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const positiveId = (value: string) => /^[1-9][0-9]*$/.test(value) &&
  Number.isSafeInteger(Number(value));

function appJwt(appId: string, privateKey: string, now: number): string {
  if (!positiveId(appId) || !/^-----BEGIN (?:RSA )?PRIVATE KEY-----\n/.test(privateKey))
    throw Error('native_studio_github_token_not_configured');
  try {
    const key = createPrivateKey(privateKey);
    if (key.asymmetricKeyType !== 'rsa') throw Error('invalid_key');
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const message = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
      iat: Math.floor(now / 1000) - 60,
      exp: Math.floor(now / 1000) + 540,
      iss: appId,
    })}`;
    return `${message}.${sign('RSA-SHA256', Buffer.from(message), key).toString('base64url')}`;
  } catch { throw Error('native_studio_github_token_not_configured'); }
}

/** Trusted post-build credential for one verified site repository. The private
 * App key stays in the central runner; neither site source nor Studio receives it.
 */
export async function issueConfiguredNativeStudioGitHubToken(
  scope: NativeStudioScope, client: SupabaseClient,
  env: Environment = process.env, transport: typeof fetch = fetch,
  readSite: SiteReader = configuredNativeStudioBootstrapSite,
  now = Date.now(),
  contentsPermission: 'read' | 'write' = 'write',
): Promise<{ token: string; repositoryId: string; expiresAt: string }> {
  const site: Site = await readSite(scope, client, env);
  if (!positiveId(site.installationId) || !positiveId(site.repositoryId) ||
      !Number.isFinite(now) ||
      !['read', 'write'].includes(contentsPermission))
    throw Error('native_studio_github_token_target_invalid');
  const jwt = appJwt(site.appId, env.GNR8_NATIVE_STUDIO_GITHUB_PRIVATE_KEY ?? '', now);
  let response: Response;
  try {
    response = await transport(
      `https://api.github.com/app/installations/${site.installationId}/access_tokens`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { authorization: `Bearer ${jwt}`,
          accept: 'application/vnd.github+json',
          'content-type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28' },
        body: JSON.stringify({ repository_ids: [Number(site.repositoryId)],
          permissions: { contents: contentsPermission } }),
      });
  } catch { throw Error('native_studio_github_token_unavailable'); }
  if (!response.ok) throw Error('native_studio_github_token_unavailable');
  let value: unknown;
  try { value = await response.json(); }
  catch { throw Error('native_studio_github_token_invalid'); }
  if (!object(value) || typeof value.token !== 'string' ||
      !isGitHubInstallationToken(value.token) ||
      typeof value.expires_at !== 'string' ||
      !Array.isArray(value.repositories) || value.repositories.length !== 1 ||
      !object(value.repositories[0]) ||
      value.repositories[0].id !== Number(site.repositoryId) ||
      !object(value.permissions) || value.permissions.contents !== contentsPermission ||
      Object.entries(value.permissions).some(([name, permission]) =>
        name !== 'contents' && !(name === 'metadata' && permission === 'read')) ||
      !Number.isFinite(Date.parse(value.expires_at)) ||
      Date.parse(value.expires_at) <= now ||
      Date.parse(value.expires_at) > now + 60 * 60 * 1000)
    throw Error('native_studio_github_token_invalid');
  const current = await readSite(scope, client, env);
  if (JSON.stringify(current) !== JSON.stringify(site))
    throw Error('native_studio_github_token_target_changed');
  return { token: value.token, repositoryId: site.repositoryId,
    expiresAt: value.expires_at };
}
