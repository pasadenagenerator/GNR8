import 'server-only';

const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{16,256}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const PAGE_SIZE = 1000;
const MAX_PAGES = 100;

/** Read every account or zone Access app page before overlap inspection.
 * A partial inventory is an error, never evidence that the route is free.
 */
export async function readCompleteCloudflareAccessAppInventory(
  scope: 'accounts' | 'zones', id: string, credential: string,
  transport: typeof fetch = fetch,
) {
  if (!['accounts', 'zones'].includes(scope) || !HEX32.test(id) ||
      !TOKEN.test(credential) || typeof transport !== 'function')
    throw Error('native_studio_access_inventory_input_invalid');
  const result: unknown[] = [];
  let totalPages: number | null = null;
  let totalCount: number | null = null;
  for (let page = 1; page <= (totalPages ?? 1); page++) {
    const url = `https://api.cloudflare.com/client/v4/${scope}/${id}` +
      `/access/apps?page=${page}&per_page=${PAGE_SIZE}`;
    let response: Response;
    try {
      response = await transport(url, { method: 'GET', redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers: { authorization: `Bearer ${credential}`, accept: 'application/json' } });
    } catch { throw Error(`native_studio_access_inventory_${scope}_transport_unavailable`); }
    if (!response.ok) {
      let providerCode = '';
      try {
        const failure: unknown = await response.json();
        if (object(failure) && Array.isArray(failure.errors)) {
          const first = failure.errors[0];
          if (object(first) && Number.isSafeInteger(first.code) &&
              (first.code as number) >= 0)
            providerCode = `_cf_${first.code}`;
        }
      } catch { /* Preserve the HTTP status when no JSON error is available. */ }
      throw Error(`native_studio_access_inventory_${scope}_http_${response.status}${providerCode}`);
    }
    let body: unknown;
    try { body = await response.json(); }
    catch { throw Error(`native_studio_access_inventory_${scope}_response_unavailable`); }
    if (!object(body) || body.success !== true || !Array.isArray(body.result) ||
        !object(body.result_info))
      throw Error('native_studio_access_inventory_unverified');
    const info = body.result_info;
    if (info.page !== page || info.count !== body.result.length ||
        !Number.isSafeInteger(info.total_pages) || !Number.isSafeInteger(info.total_count) ||
        (info.total_pages as number) < 0 || (info.total_pages as number) > MAX_PAGES ||
        (info.total_count as number) < 0 ||
        (info.total_pages === 0 && (info.total_count !== 0 || body.result.length !== 0)) ||
        (totalPages !== null && info.total_pages !== totalPages) ||
        (totalCount !== null && info.total_count !== totalCount))
      throw Error('native_studio_access_inventory_unverified');
    totalPages = info.total_pages as number;
    totalCount = info.total_count as number;
    result.push(...body.result);
    if (result.length > totalCount)
      throw Error('native_studio_access_inventory_unverified');
  }
  if (totalCount === null || result.length !== totalCount)
    throw Error('native_studio_access_inventory_unverified');
  return { success: true, result, result_info: { page: 1,
    count: result.length, total_count: result.length, total_pages: 1 } };
}
