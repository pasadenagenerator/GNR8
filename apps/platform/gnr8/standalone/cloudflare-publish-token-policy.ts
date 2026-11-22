import 'server-only';

const hex32 = /^[a-f0-9]{32}$/;

export type CloudflarePublishTokenPolicy = Readonly<{
  effect: 'allow' | 'deny';
  permissionGroups: readonly Readonly<{ id: string; name: string }>[];
  resources: Readonly<Record<string, unknown>>;
}>;

export type CloudflarePublishTokenDetail = Readonly<{
  id: string;
  name: string;
  status: 'active' | 'disabled' | 'expired';
  policies: readonly CloudflarePublishTokenPolicy[];
  hasRestrictions: boolean;
}>;

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Read policy metadata for one known account token. Keep the provider response
 * inside the trusted provisioner; token values and error bodies are discarded.
 */
export async function readCloudflarePublishTokenDetail(
  accountId: string,
  tokenId: string,
  setupToken: string,
  transport: typeof fetch = fetch,
): Promise<CloudflarePublishTokenDetail> {
  if (!hex32.test(accountId) || !hex32.test(tokenId) ||
      typeof setupToken !== 'string' || setupToken.length < 16 || /\s/.test(setupToken))
    throw Error('native_studio_publish_policy_input_invalid');
  const response = await transport(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens/${tokenId}`,
    { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${setupToken}`, accept: 'application/json' } },
  );
  if (!response.ok) throw Error('native_studio_publish_policy_read_failed');
  let body: unknown;
  try { body = await response.json(); }
  catch { throw Error('native_studio_publish_policy_read_failed'); }
  if (!object(body) || body.success !== true || !object(body.result) ||
      body.result.id !== tokenId || typeof body.result.name !== 'string' ||
      !['active', 'disabled', 'expired'].includes(String(body.result.status)) ||
      !Array.isArray(body.result.policies))
    throw Error('native_studio_publish_policy_invalid');
  const policies = body.result.policies.map((policy: unknown) => {
    if (!object(policy) || !['allow', 'deny'].includes(String(policy.effect)) ||
        !Array.isArray(policy.permission_groups) || !object(policy.resources) ||
        policy.permission_groups.some((group: unknown) => !object(group) ||
          typeof group.id !== 'string' || !hex32.test(group.id) ||
          typeof group.name !== 'string'))
      throw Error('native_studio_publish_policy_invalid');
    return {
      effect: policy.effect as 'allow' | 'deny',
      permissionGroups: policy.permission_groups.map((group: { id: string; name: string }) =>
        ({ id: group.id, name: group.name })),
      resources: policy.resources,
    };
  });
  return { id: tokenId, name: body.result.name,
    status: body.result.status as CloudflarePublishTokenDetail['status'], policies,
    // A token that works from the provisioner may fail in the Studio Worker
    // when IP or time restrictions exist. Only null/absent means unrestricted.
    hasRestrictions: body.result.condition != null ||
      body.result.expires_on != null || body.result.not_before != null };
}
