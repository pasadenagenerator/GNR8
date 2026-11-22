import 'server-only';
import { fingerprint } from './publication-contract';

const HEX32 = /^[a-f0-9]{32}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const ROUTES_WRITE = '28f4b596e7d643029c524985477ae49a';
const WORKER_EDITOR = '7e79ec33834341f28dd431ab73884400';
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export type LegacyPublishTokenTarget = Readonly<{
  siteId: string;
  accountId: string;
  zoneId: string;
  workerId: string;
  tokenId: string;
}>;

type Status = 'active' | 'disabled';
type Policy = Readonly<{
  id: string;
  effect: 'allow';
  permission_groups: readonly Readonly<{ id: string }>[];
  resources: Readonly<Record<string, unknown>>;
}>;
type Definition = Readonly<{
  name: string;
  policies: readonly Policy[];
  condition?: Readonly<{ request_ip: Readonly<{ in?: readonly string[];
    not_in?: readonly string[] }> }>;
  expires_on?: string;
  not_before?: string;
}>;

function validTarget(target: LegacyPublishTokenTarget) {
  return !!target && UUID.test(target.siteId) && HEX32.test(target.accountId) &&
    HEX32.test(target.zoneId) && HEX32.test(target.workerId) && HEX32.test(target.tokenId);
}

function expectedPolicies(target: LegacyPublishTokenTarget) {
  return [
    { effect: 'allow', permission_groups: [{ id: ROUTES_WRITE }],
      resources: { [`com.cloudflare.api.account.zone.${target.zoneId}`]: '*' } },
    { effect: 'allow', permission_groups: [{ id: WORKER_EDITOR }],
      resources: { [`com.cloudflare.api.account.${target.accountId}`]:
        { [`com.cloudflare.edge.worker.script.${target.workerId}`]: '*' } } },
  ];
}

function copyDefinition(raw: unknown, target: LegacyPublishTokenTarget,
  status: Status): Definition {
  const name = `gnr8-${target.siteId}-native-publish`;
  if (!object(raw) || raw.id !== target.tokenId || raw.name !== name ||
      raw.status !== status || !Array.isArray(raw.policies) ||
      raw.policies.length !== 2)
    throw Error('native_studio_legacy_token_scope_mismatch');
  const expected = expectedPolicies(target);
  const policies: Policy[] = raw.policies.map((entry: unknown) => {
    if (!object(entry) || !HEX32.test(String(entry.id)) || entry.effect !== 'allow' ||
        !Array.isArray(entry.permission_groups) || entry.permission_groups.length !== 1 ||
        !object(entry.permission_groups[0]) ||
        !HEX32.test(String(entry.permission_groups[0].id)) ||
        !object(entry.resources) ||
        Object.keys(entry).sort().join() !== 'effect,id,permission_groups,resources')
      throw Error('native_studio_legacy_token_scope_mismatch');
    return { id: entry.id as string, effect: 'allow',
      permission_groups: [{ id: entry.permission_groups[0].id as string }],
      resources: entry.resources };
  });
  if (!expected.every(value => policies.some(policy =>
    policy.permission_groups[0]?.id === value.permission_groups[0]?.id &&
    fingerprint(policy.resources) === fingerprint(value.resources))))
    throw Error('native_studio_legacy_token_scope_mismatch');
  const definition: {
    name: string; policies: Policy[]; condition?: Definition['condition'];
    expires_on?: string; not_before?: string;
  } = { name, policies };
  if (raw.condition != null) {
    const condition = raw.condition;
    if (!object(condition) || Object.keys(condition).join() !== 'request_ip' ||
        !object(condition.request_ip))
      throw Error('native_studio_legacy_token_scope_mismatch');
    const requestIp = condition.request_ip;
    if (Object.keys(requestIp).some(key => !['in', 'not_in'].includes(key)) ||
        !['in', 'not_in'].some(key => Array.isArray(requestIp[key])) ||
        ['in', 'not_in'].some(key => requestIp[key] !== undefined &&
          (!Array.isArray(requestIp[key]) ||
            !requestIp[key].every((cidr: unknown) =>
              typeof cidr === 'string' && cidr.length > 0))))
      throw Error('native_studio_legacy_token_scope_mismatch');
    definition.condition = { request_ip: Object.fromEntries(
      ['in', 'not_in'].filter(key => requestIp[key] !== undefined)
        .map(key => [key, [...(requestIp[key] as string[])]])) as {
          in?: string[]; not_in?: string[] } };
  }
  for (const key of ['expires_on', 'not_before'] as const) {
    const value = raw[key];
    if (value != null) {
      if (typeof value !== 'string' || Number.isNaN(Date.parse(value)))
        throw Error('native_studio_legacy_token_scope_mismatch');
      definition[key] = value;
    }
  }
  return definition;
}

/** One reviewed state change. A failed/ambiguous response remains pending for
 * read-only reconciliation, never an automatic retry. No token value is read.
 */
export async function transitionLegacyPublishTokenStatus(
  target: LegacyPublishTokenTarget,
  desired: Status,
  tokenManagerCredential: string,
  workerReadCredential: string,
  transport: typeof fetch = fetch,
  expectedDefinitionSha256?: string,
): Promise<{ tokenId: string; status: Status; definitionSha256: string }> {
  if (!validTarget(target) || !['active', 'disabled'].includes(desired) ||
      !TOKEN.test(tokenManagerCredential) || !TOKEN.test(workerReadCredential) ||
      (desired === 'active' &&
        (typeof expectedDefinitionSha256 !== 'string' ||
          !/^[a-f0-9]{64}$/.test(expectedDefinitionSha256))) ||
      (desired === 'disabled' && expectedDefinitionSha256 !== undefined))
    throw Error('native_studio_legacy_token_transition_invalid');
  const worker = `gnr8-${target.siteId}-site`;
  const base = `https://api.cloudflare.com/client/v4/accounts/${target.accountId}`;
  async function request(path: string, credential: string, method = 'GET', body?: unknown) {
    let response: Response;
    try {
      response = await transport(`${base}${path}`, {
        method, redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { authorization: `Bearer ${credential}`, accept: 'application/json',
          ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch { throw Error('native_studio_legacy_token_transition_pending_review'); }
    if (!response.ok) throw Error('native_studio_legacy_token_transition_pending_review');
    let data: unknown;
    try { data = await response.json(); }
    catch { throw Error('native_studio_legacy_token_transition_pending_review'); }
    if (!object(data) || data.success !== true || !object(data.result))
      throw Error('native_studio_legacy_token_transition_pending_review');
    return data.result;
  }
  const identity = await request(`/workers/workers/${worker}`, workerReadCredential);
  if (identity.name !== worker || identity.id !== target.workerId)
    throw Error('native_studio_legacy_token_scope_mismatch');
  const path = `/tokens/${target.tokenId}`;
  const current = desired === 'disabled' ? 'active' : 'disabled';
  const definition = copyDefinition(await request(path, tokenManagerCredential), target, current);
  if (desired === 'active' && fingerprint(definition) !== expectedDefinitionSha256)
    throw Error('native_studio_legacy_token_scope_mismatch');
  await request(path, tokenManagerCredential, 'PUT', { ...definition, status: desired });
  const after = copyDefinition(await request(path, tokenManagerCredential), target, desired);
  if (fingerprint(after) !== fingerprint(definition))
    throw Error('native_studio_legacy_token_transition_pending_review');
  return { tokenId: target.tokenId, status: desired,
    definitionSha256: fingerprint(definition) };
}
