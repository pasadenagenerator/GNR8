import assert from 'node:assert/strict';
import test from 'node:test';
import { readCompleteCloudflareAccessAppInventory } from './cloudflare-studio-access-inventory-readback';

const id = 'a'.repeat(32), credential = 'read-token-value-1234567890';

test('reads every Access application page in the selected scope', async () => {
  const seen: string[] = [];
  const transport = (async (url: string, init: RequestInit) => {
    seen.push(url);
    assert.equal(init.method, 'GET');
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${credential}`);
    const page = Number(new URL(url).searchParams.get('page'));
    return Response.json({ success: true, result: [{ id: String(page) }],
      result_info: { page, count: 1, total_count: 2, total_pages: 2 } });
  }) as typeof fetch;
  assert.deepEqual(await readCompleteCloudflareAccessAppInventory(
    'accounts', id, credential, transport), { success: true,
    result: [{ id: '1' }, { id: '2' }], result_info: {
      page: 1, count: 2, total_count: 2, total_pages: 1 } });
  assert.deepEqual(seen, [1, 2].map(page =>
    `https://api.cloudflare.com/client/v4/accounts/${id}/access/apps?page=${page}&per_page=1000`));
});

test('rejects incomplete pages and provider errors without repeating writes', async () => {
  const partial = (async () => Response.json({ success: true, result: [],
    result_info: { page: 1, count: 0, total_count: 1, total_pages: 1 } })) as typeof fetch;
  await assert.rejects(readCompleteCloudflareAccessAppInventory(
    'zones', id, credential, partial), /inventory_unverified/);
  const broken = (async () => { throw Error('secret provider detail'); }) as typeof fetch;
  await assert.rejects(readCompleteCloudflareAccessAppInventory(
    'zones', id, credential, broken), error => {
    assert.equal((error as Error).message, 'native_studio_access_inventory_zones_transport_unavailable');
    return true;
  });
  const forbidden = (async () => new Response(null, { status: 403 })) as typeof fetch;
  await assert.rejects(readCompleteCloudflareAccessAppInventory(
    'accounts', id, credential, forbidden),
    /native_studio_access_inventory_accounts_http_403/);
  const coded = (async () => Response.json({ success: false,
    errors: [{ code: 9109, message: 'secret provider detail' }] },
  { status: 403 })) as typeof fetch;
  await assert.rejects(readCompleteCloudflareAccessAppInventory(
    'zones', id, credential, coded), error => {
    assert.equal((error as Error).message,
      'native_studio_access_inventory_zones_http_403_cf_9109');
    return true;
  });
});

test('accepts an empty zone inventory with zero reported pages', async () => {
  const empty = (async () => Response.json({ success: true, result: [],
    result_info: { page: 1, count: 0, total_count: 0, total_pages: 0 } })) as typeof fetch;
  assert.equal((await readCompleteCloudflareAccessAppInventory(
    'zones', id, credential, empty)).result.length, 0);
});
