import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectNativeStudioAccessPolicyReadback } from './cloudflare-studio-access-policy';

const principals = ['access:owner@example.com', 'access:admin@example.com'];
function readback(policy: Record<string, unknown> = {}) {
  return { success: true, result_info: { page: 1, count: 1, total_count: 1,
    total_pages: 1 }, result: [{ decision: 'allow',
    include: [{ email: { email: 'admin@example.com' } },
      { email: { email: 'owner@example.com' } }],
    require: [], exclude: [], ...policy }] };
}

test('accepts one complete exact-email Allow policy', () => {
  assert.deepEqual(inspectNativeStudioAccessPolicyReadback(readback(), principals),
    { state: 'observed-exact-access-policy', memberCount: 2 });
});

test('rejects incomplete list, extra policies and broad or bypass rules', () => {
  for (const body of [
    { ...readback(), result_info: { page: 1, count: 1, total_count: 2 } },
    { ...readback(), result: [...readback().result, { decision: 'bypass' }] },
    readback({ decision: 'bypass' }),
    readback({ include: [{ everyone: {} }] }),
    readback({ include: [{ email_domain: { domain: 'example.com' } }] }),
    readback({ include: [{ email: { email: 'owner@example.com' } },
      { email: { email: 'outsider@example.com' } }] }),
  ]) assert.throws(() => inspectNativeStudioAccessPolicyReadback(body, principals),
    /native_studio_access_policy_unverified/);
});

test('rejects extra conditions, manual approvals and ambiguous identities', () => {
  for (const policy of [
    { exclude: [{ email: { email: 'admin@example.com' } }] },
    { require: [{ country: { country_code: 'SI' } }] },
    { approval_required: true },
    { approval_groups: [{}] },
    { purpose_justification_required: true },
    { include: [{ email: { email: 'owner@example.com' } },
      { email: { email: 'owner@example.com' } }] },
  ]) assert.throws(() => inspectNativeStudioAccessPolicyReadback(readback(policy), principals),
    /native_studio_access_policy_unverified/);
  for (const invalid of [[], ['access:owner@example.com', 'access:owner@example.com'],
    ['owner@example.com'], ['access:Owner@example.com']])
    assert.throws(() => inspectNativeStudioAccessPolicyReadback(readback(), invalid),
      /native_studio_access_policy_unverified/);
});
