import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectNativeStudioAccessApplicationInventory } from './cloudflare-studio-access-inventory';

const host = 'site.app.pasadenagenerator.com';
const currentId = '11111111-1111-4111-8111-111111111111';
const foreignId = '22222222-2222-4222-8222-222222222222';
const current = { id: currentId, type: 'self_hosted', domain: `${host}/studio`,
  destinations: [{ type: 'public', uri: `${host}/studio` }] };
const previewHost = `preview.${host}`;
const internalOverride = { behavior: 'public', path_pattern: '/studio/internal/*' };
const dual = { ...current, destinations: [{ ...current.destinations[0],
  overrides: [internalOverride] },
  { type: 'public', uri: previewHost }],
  self_hosted_domains: [`${host}/studio`, previewHost] };

function inventory(apps: unknown[]) {
  return { success: true, result: apps, result_info: { page: 1,
    count: apps.length, total_count: apps.length, total_pages: 1 } };
}

test('accepts the sole exact app alongside unrelated Access applications', () => {
  const body = inventory([current,
    { id: foreignId, type: 'self_hosted', domain: `${host}/contact` },
    { id: '33333333-3333-4333-8333-333333333333', type: 'self_hosted',
      domain: 'other.app.pasadenagenerator.com/studio' },
  ]);
  assert.deepEqual(inspectNativeStudioAccessApplicationInventory(body, currentId, host),
    { state: 'observed-no-access-overlap', appId: currentId, studioHost: host,
      applicationsChecked: 3 });
});

test('dual-host inventory permits only the exact internal Worker path override', () => {
  const exact = inventory([dual, { id: foreignId, type: 'self_hosted',
    domain: 'other.example.com/studio' }]);
  assert.deepEqual(inspectNativeStudioAccessApplicationInventory(exact,
    currentId, host, previewHost), {
    state: 'observed-no-access-overlap', appId: currentId,
    studioHost: host, previewHost, applicationsChecked: 2,
  });
  for (const foreign of [
    { domain: previewHost },
    { domain: `${previewHost}/studio` },
    { domain: `*.${host}/other` },
    { destinations: [{ type: 'public', uri: `${previewHost}/api` }] },
  ]) assert.throws(() => inspectNativeStudioAccessApplicationInventory(
    inventory([dual, { id: foreignId, type: 'self_hosted', ...foreign }]),
    currentId, host, previewHost), /native_studio_access_inventory_unverified/);
  assert.throws(() => inspectNativeStudioAccessApplicationInventory(
    inventory([current]), currentId, host, previewHost),
  /native_studio_access_inventory_unverified_current_app/);
  assert.throws(() => inspectNativeStudioAccessApplicationInventory(
    inventory([{ ...dual, destinations: current.destinations.concat(dual.destinations[1]) }]),
    currentId, host, previewHost), /native_studio_access_inventory_unverified_current_app/);
  assert.throws(() => inspectNativeStudioAccessApplicationInventory(
    inventory([{ ...dual, destinations: [{ ...dual.destinations[0], overrides: [
      { behavior: 'public', path_pattern: '/studio/*' }] }, dual.destinations[1]] }]),
    currentId, host, previewHost), /native_studio_access_inventory_unverified/);
  assert.throws(() => inspectNativeStudioAccessApplicationInventory(
    inventory([dual, { ...dual, id: foreignId }]), currentId, host, previewHost),
  /native_studio_access_inventory_unverified/);
  assert.throws(() => inspectNativeStudioAccessApplicationInventory(
    inventory([{ ...dual, self_hosted_domains: [`${host}/studio`, host] }]),
    currentId, host, previewHost), /native_studio_access_inventory_unverified/);
});

test('rejects broad, overriding and wildcard routes on the editor host', () => {
  for (const domain of [host, `${host}/studio/api`, `${host}/studio*`,
    '*.app.pasadenagenerator.com/studio', `${host}/*`]) {
    assert.throws(() => inspectNativeStudioAccessApplicationInventory(
      inventory([current, { id: foreignId, type: 'self_hosted', domain }]),
      currentId, host), /native_studio_access_inventory_unverified/);
  }
  assert.throws(() => inspectNativeStudioAccessApplicationInventory(
    inventory([current, { id: foreignId, type: 'self_hosted',
      destinations: [{ type: 'public', uri: `${host}/studio/admin` }] }]),
    currentId, host), /native_studio_access_inventory_unverified/);
});

test('rejects incomplete or ambiguous inventory readback', () => {
  const single = inventory([current]);
  for (const body of [
    { ...single, result_info: { page: 1, count: 1, total_count: 2, total_pages: 2 } },
    { ...single, result_info: null },
    inventory([]), inventory([current, current]),
    inventory([current, { id: foreignId, type: 'self_hosted',
      destinations: [{ type: 'public', uri: 'http://other.example.com/studio' }] }]),
    inventory([current, { id: foreignId, type: 'self_hosted',
      domain: 'other.example.com/elsewhere',
      destinations: [{ type: 'public', uri: 'https://other.example.com/elsewhere',
        overrides: [{ behavior: 'public', path_pattern: '*' }] }] }]),
  ]) assert.throws(() => inspectNativeStudioAccessApplicationInventory(
    body, currentId, host), /native_studio_access_inventory_unverified/);
});

test('zone inventory has no bound app and rejects any overlapping zone app', () => {
  const unrelated = { id: foreignId, type: 'self_hosted',
    domain: `${host}/contact` };
  assert.deepEqual(inspectNativeStudioAccessApplicationInventory(
    inventory([unrelated]), null, host), {
    state: 'observed-no-access-overlap', appId: null, studioHost: host,
    applicationsChecked: 1,
  });
  assert.throws(() => inspectNativeStudioAccessApplicationInventory(
    inventory([unrelated, { ...current, id: currentId }]), null, host),
  /native_studio_access_inventory_unverified/);
});
