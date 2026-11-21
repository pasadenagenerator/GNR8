import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from './route';

const context = { params: Promise.resolve({
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333',
}) };
const url = 'https://gnr8.example/api/gnr8/agency/clients/a/sites/b/native-studio/resources';

test('resource retry cannot queue when the feature is disabled', async () => {
  const previous = process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED;
  delete process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED;
  try {
    const response = await POST(new Request(url, { method: 'POST',
      headers: { origin: 'https://gnr8.example', 'content-type': 'application/json' },
      body: JSON.stringify({ agencyId: '11111111-1111-4111-8111-111111111111' }),
    }), context);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      ok: false, error: 'native_studio_resource_reservation_disabled',
    });
  } finally {
    if (previous === undefined) delete process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED;
    else process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED = previous;
  }
});

test('resource retry rejects another origin before site or provider access', async () => {
  const previous = process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED;
  process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED = '1';
  try {
    const response = await POST(new Request(url, { method: 'POST',
      headers: { origin: 'https://another.example', 'content-type': 'application/json' },
      body: JSON.stringify({ agencyId: '11111111-1111-4111-8111-111111111111' }),
    }), context);
    assert.equal(response.status, 403);
  } finally {
    if (previous === undefined) delete process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED;
    else process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED = previous;
  }
});

test('resource retry accepts only agency scope in the request body', async () => {
  const previous = process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED;
  process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED = '1';
  try {
    const response = await POST(new Request(url, { method: 'POST',
      headers: { origin: 'https://gnr8.example', 'content-type': 'application/json' },
      body: JSON.stringify({ agencyId: '11111111-1111-4111-8111-111111111111',
        accountId: 'attacker-chosen' }),
    }), context);
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      ok: false, error: 'native_studio_resource_reservation_request_invalid',
    });
  } finally {
    if (previous === undefined) delete process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED;
    else process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED = previous;
  }
});
