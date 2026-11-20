import 'server-only';
import type { PublicationStore } from './publication-store';
import type { NativeStudioScope } from './native-studio-binding-store';
import { getOrCreateNativeStudioSiteSecrets, readNativeStudioPublishToken } from './native-studio-secret-vault';

/** Supplied only by the trusted installer; no value belongs in source or a binding receipt. */
export type NativeStudioSharedSecrets = Readonly<{
  GITHUB_PRIVATE_KEY: string;
  GITHUB_CLIENT_SECRET: string;
  AI_API_KEY: string;
}>;

export type NativeStudioRuntimeSecrets = NativeStudioSharedSecrets & Readonly<{
  SESSION_SECRET: string;
  CONTAINER_TOKEN: string;
  PUBLISH_CLOUDFLARE_API_TOKEN: string;
}>;

function requireSecret(value: unknown): value is string {
  return typeof value === 'string' && value.trim() === value && value.length >= 16 &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

/** Builds the exact upstream secret set once the per-site publish token is saved.
 * No Cloudflare write occurs here; the installer must upload and read back the
 * secrets before marking the Studio ready.
 */
export async function nativeStudioRuntimeSecrets(
  scope: NativeStudioScope,
  store: Pick<PublicationStore, 'read' | 'claim'>,
  shared: NativeStudioSharedSecrets,
  accountId: string,
  vaultKey: string,
): Promise<NativeStudioRuntimeSecrets> {
  if (!shared || !requireSecret(shared.GITHUB_CLIENT_SECRET) ||
      !requireSecret(shared.AI_API_KEY) ||
      typeof shared.GITHUB_PRIVATE_KEY !== 'string' ||
      !/^-----BEGIN (?:RSA |EC |)PRIVATE KEY-----\n[\s\S]+\n-----END (?:RSA |EC |)PRIVATE KEY-----\n?$/.test(shared.GITHUB_PRIVATE_KEY))
    throw Error('native_studio_runtime_secrets_not_configured');
  const publish = await readNativeStudioPublishToken(scope, store, accountId, vaultKey);
  if (!publish) throw Error('native_studio_publish_token_missing');
  const site = await getOrCreateNativeStudioSiteSecrets(scope, store, vaultKey);
  return {
    GITHUB_PRIVATE_KEY: shared.GITHUB_PRIVATE_KEY,
    GITHUB_CLIENT_SECRET: shared.GITHUB_CLIENT_SECRET,
    AI_API_KEY: shared.AI_API_KEY,
    SESSION_SECRET: site.SESSION_SECRET,
    CONTAINER_TOKEN: site.CONTAINER_TOKEN,
    PUBLISH_CLOUDFLARE_API_TOKEN: publish.value,
  };
}
