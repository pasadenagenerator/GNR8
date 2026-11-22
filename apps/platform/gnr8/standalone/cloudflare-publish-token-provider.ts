import 'server-only';
import { fingerprint } from './publication-contract';
import { readCloudflarePublishTokenDetail } from './cloudflare-publish-token-policy';
import type { PublishTokenMetadata, PublishTokenProvider,
  PublishTokenTarget } from './native-studio-publish-token-issuer';

// Confirmed from the JSON review of an existing GNR8 account token on
// 2026-11-21. The Worker resource uses its immutable Cloudflare ID, not name.
const ROUTES_WRITE = '28f4b596e7d643029c524985477ae49a';
const WORKER_EDITOR = '7e79ec33834341f28dd431ab73884400';
const HEX32 = /^[a-f0-9]{32}$/;
const WORKER = /^gnr8-[a-f0-9-]{36}-site$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validate(target: PublishTokenTarget, accountId: string) {
  if (!target || target.accountId !== accountId || !HEX32.test(target.accountId) ||
      !HEX32.test(target.zoneId) || !WORKER.test(target.worker) ||
      target.name !== `${target.worker.slice(0, -5)}-native-publish-v2`)
    throw Error('native_studio_publish_provider_target_invalid');
}

function expectedPolicies(target: PublishTokenTarget, workerId: string) {
  return [
    { effect: 'allow', permission_groups: [{ id: ROUTES_WRITE }],
      resources: { [`com.cloudflare.api.account.zone.${target.zoneId}`]: '*' } },
    { effect: 'allow', permission_groups: [{ id: WORKER_EDITOR }],
      resources: { [`com.cloudflare.api.account.${target.accountId}`]:
        { [`com.cloudflare.edge.worker.script.${workerId}`]: '*' } } },
  ] as const;
}

/** Account token management and Worker metadata use separate setup credentials.
 * Neither credential is installed in a customer's native Studio Worker.
 */
export class CloudflarePublishTokenProvider implements PublishTokenProvider {
  constructor(
    private readonly accountId: string,
    private readonly tokenManagerCredential: string,
    private readonly workerReadCredential: string,
    private readonly transport: typeof fetch = fetch,
  ) {
    if (!HEX32.test(accountId) || !TOKEN.test(tokenManagerCredential) ||
        !TOKEN.test(workerReadCredential))
      throw Error('native_studio_publish_provider_setup_invalid');
  }

  private async request(path: string, credential: string, method = 'GET', body?: unknown) {
    const response = await this.transport(`https://api.cloudflare.com/client/v4${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${credential}`, accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw Error('native_studio_publish_provider_request_failed');
    let data: unknown;
    try { data = await response.json(); }
    catch { throw Error('native_studio_publish_provider_response_invalid'); }
    if (!object(data) || data.success !== true)
      throw Error('native_studio_publish_provider_response_invalid');
    return data;
  }

  private async workerId(target: PublishTokenTarget): Promise<string> {
    validate(target, this.accountId);
    const data = await this.request(`/accounts/${this.accountId}/workers/workers/${target.worker}`,
      this.workerReadCredential);
    if (!object(data.result) || data.result.name !== target.worker ||
        typeof data.result.id !== 'string' || !HEX32.test(data.result.id))
      throw Error('native_studio_publish_worker_mismatch');
    return data.result.id;
  }

  async assertWorker(target: PublishTokenTarget): Promise<void> {
    await this.workerId(target);
  }

  private async exactDetail(target: PublishTokenTarget, tokenId: string,
    workerId: string): Promise<PublishTokenMetadata> {
    const detail = await readCloudflarePublishTokenDetail(this.accountId,
      tokenId, this.tokenManagerCredential, this.transport);
    const expected = expectedPolicies(target, workerId);
    if (detail.name !== target.name || detail.hasRestrictions ||
        detail.policies.length !== 2 ||
        !expected.every(policy => detail.policies.some(actual =>
          actual.effect === policy.effect && actual.permissionGroups.length === 1 &&
          actual.permissionGroups[0]?.id === policy.permission_groups[0].id &&
          actual.permissionGroups[0]?.name ===
            (policy.permission_groups[0].id === ROUTES_WRITE ?
              'Workers Routes Write' : 'Individual Workers Editor') &&
          fingerprint(actual.resources) === fingerprint(policy.resources))))
      throw Error('native_studio_publish_token_scope_mismatch');
    return { ...target, id: tokenId, status: detail.status,
      permissions: ['Workers Routes Write', 'Individual Workers Editor'] };
  }

  async findByName(target: PublishTokenTarget): Promise<readonly PublishTokenMetadata[]> {
    const workerId = await this.workerId(target);
    const matches: string[] = [];
    for (let page = 1; page <= 20; page++) {
      const data = await this.request(
        `/accounts/${this.accountId}/tokens?page=${page}&per_page=50`,
        this.tokenManagerCredential);
      if (!Array.isArray(data.result) || !object(data.result_info) ||
          !Number.isSafeInteger(data.result_info.total_count) ||
          (data.result_info.total_count as number) < 0)
        throw Error('native_studio_publish_token_list_invalid');
      for (const item of data.result) {
        if (!object(item)) throw Error('native_studio_publish_token_list_invalid');
        if (item.name === target.name) {
          if (typeof item.id !== 'string' || !HEX32.test(item.id))
            throw Error('native_studio_publish_token_list_invalid');
          matches.push(item.id);
        }
      }
      if (page * 50 >= (data.result_info.total_count as number)) break;
      if (page === 20) throw Error('native_studio_publish_token_list_incomplete');
    }
    if (matches.length > 1) throw Error('native_studio_publish_token_ambiguous');
    return Promise.all(matches.map(id => this.exactDetail(target, id, workerId)));
  }

  async create(target: PublishTokenTarget): Promise<{ id: string; value: string }> {
    const workerId = await this.workerId(target);
    const data = await this.request(`/accounts/${this.accountId}/tokens`,
      this.tokenManagerCredential, 'POST',
      { name: target.name, policies: expectedPolicies(target, workerId) });
    if (!object(data.result) || typeof data.result.id !== 'string' ||
        !HEX32.test(data.result.id) || typeof data.result.value !== 'string' ||
        !TOKEN.test(data.result.value))
      throw Error('native_studio_publish_token_create_unconfirmed');
    return { id: data.result.id, value: data.result.value };
  }

  async roll(target: PublishTokenTarget, id: string): Promise<string> {
    validate(target, this.accountId);
    if (!HEX32.test(id)) throw Error('native_studio_publish_token_id_invalid');
    const live = await this.findByName(target);
    if (live.length !== 1 || live[0]?.id !== id || live[0].status !== 'active')
      throw Error('native_studio_publish_token_scope_mismatch');
    const data = await this.request(`/accounts/${this.accountId}/tokens/${id}/value`,
      this.tokenManagerCredential, 'PUT');
    if (typeof data.result !== 'string' || !TOKEN.test(data.result))
      throw Error('native_studio_publish_token_roll_unconfirmed');
    return data.result;
  }

  async verifyValue(target: PublishTokenTarget, id: string, value: string): Promise<boolean> {
    validate(target, this.accountId);
    if (!HEX32.test(id) || !TOKEN.test(value)) return false;
    try {
      const data = await this.request(`/accounts/${this.accountId}/tokens/verify`, value);
      return object(data.result) && data.result.id === id && data.result.status === 'active';
    } catch { return false; }
  }
}
