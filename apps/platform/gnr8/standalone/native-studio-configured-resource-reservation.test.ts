import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredNativeStudioResourceReservation } from './native-studio-configured-resource-reservation';

const valid = {
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER: 'r'.repeat(40),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_WORKER_CREATOR: 'w'.repeat(40),
};

test('resource reservation requires both central provider capabilities', () => {
  for (const key of Object.keys(valid)) {
    const env = { ...valid } as Record<string, string>;
    delete env[key];
    assert.throws(() => configuredNativeStudioResourceReservation(env),
      /native_studio_resource_reservation_not_configured/);
  }
  assert.deepEqual(configuredNativeStudioResourceReservation(valid), {
    accountId: valid.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID,
    r2Manager: valid.GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER,
    workerCreator: valid.GNR8_NATIVE_STUDIO_CLOUDFLARE_WORKER_CREATOR,
  });
});
