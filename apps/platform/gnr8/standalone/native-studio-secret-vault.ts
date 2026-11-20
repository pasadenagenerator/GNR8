import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { PublicationStore } from './publication-store';
import { fingerprint } from './publication-contract';
import type { NativeStudioScope } from './native-studio-binding-store';

const KEY = 'native-studio/site-secrets-v1.json';
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export type NativeStudioSiteSecrets = Readonly<{
  SESSION_SECRET: string;
  CONTAINER_TOKEN: string;
}>;
type Sealed = Readonly<{ version: 1; iv: string; tag: string; body: string }>;

function vaultKey(value: string) {
  if (!/^[a-f0-9]{64}$/.test(value)) throw Error('native_studio_vault_not_configured');
  return Buffer.from(value, 'hex');
}

function assertScope(scope: NativeStudioScope) {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId].every(value => UUID.test(value)))
    throw Error('native_studio_vault_scope_invalid');
}

function validSecrets(value: unknown): value is NativeStudioSiteSecrets {
  const v = value as NativeStudioSiteSecrets;
  return !!v && typeof v === 'object' && !Array.isArray(v) &&
    Object.keys(v).sort().join() === 'CONTAINER_TOKEN,SESSION_SECRET' &&
    TOKEN.test(v.SESSION_SECRET) && TOKEN.test(v.CONTAINER_TOKEN) &&
    v.SESSION_SECRET !== v.CONTAINER_TOKEN;
}

function seal(value: NativeStudioSiteSecrets, scope: NativeStudioScope, key: Buffer): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(fingerprint(scope)));
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { version: 1, iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'), body: body.toString('base64url') };
}

function open(value: Sealed, scope: NativeStudioScope, key: Buffer): NativeStudioSiteSecrets {
  try {
    if (!value || Object.keys(value).sort().join() !== 'body,iv,tag,version' ||
        value.version !== 1 || typeof value.iv !== 'string' ||
        typeof value.tag !== 'string' || typeof value.body !== 'string')
      throw Error('invalid');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64url'));
    decipher.setAAD(Buffer.from(fingerprint(scope)));
    decipher.setAuthTag(Buffer.from(value.tag, 'base64url'));
    const result = JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(value.body, 'base64url')), decipher.final(),
    ]).toString('utf8')) as unknown;
    if (!validSecrets(result)) throw Error('invalid');
    return result;
  } catch { throw Error('native_studio_vault_integrity'); }
}

/** CAS in the existing private per-site artifact store keeps retries stable.
 * Secrets are decrypted only in the trusted provisioning process and never
 * returned to a browser, source repository or receipt.
 */
export async function getOrCreateNativeStudioSiteSecrets(
  scope: NativeStudioScope,
  store: Pick<PublicationStore, 'read' | 'claim'>,
  masterKey = process.env.GNR8_NATIVE_STUDIO_VAULT_KEY ?? '',
): Promise<NativeStudioSiteSecrets> {
  assertScope(scope);
  const key = vaultKey(masterKey);
  let saved = await store.read<Sealed>(KEY);
  if (!saved) {
    const secrets = { SESSION_SECRET: randomBytes(32).toString('base64url'),
      CONTAINER_TOKEN: randomBytes(32).toString('base64url') };
    if (!validSecrets(secrets)) throw Error('native_studio_vault_generation_failed');
    await store.claim(KEY, seal(secrets, scope, key));
    saved = await store.read<Sealed>(KEY);
  }
  if (!saved) throw Error('native_studio_vault_write_unconfirmed');
  return open(saved, scope, key);
}
