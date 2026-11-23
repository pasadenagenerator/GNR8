import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgencyMemberRow } from '../agency/agency-membership-service';
import { readCurrentNativeStudioAccessCandidates } from './native-studio-access-candidates';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const ownerId = '44444444-4444-4444-8444-444444444444';
const adminId = '55555555-5555-4555-8555-555555555555';
const memberId = '66666666-6666-4666-8666-666666666666';
const now = Date.parse('2026-11-23T12:00:00Z');

function member(userId: string, role: AgencyMemberRow['role']): AgencyMemberRow {
  return { membership_id: userId, user_id: userId, role, email: 'display-only@example.com',
    name: null, status: 'active', invited_at: null, last_sign_in_at: null };
}

function fixture(options: {
  members?: AgencyMemberRow[];
  users?: Record<string, Record<string, unknown>>;
  site?: string | null;
  error?: boolean;
} = {}) {
  const reads: string[] = [];
  const members = options.members ?? [member(ownerId, 'owner'), member(adminId, 'admin'),
    member(memberId, 'member')];
  const users = options.users ?? {
    [ownerId]: { id: ownerId, email: 'Owner@Example.com',
      email_confirmed_at: '2026-11-20T00:00:00Z' },
    [adminId]: { id: adminId, email: 'admin@example.com',
      email_confirmed_at: '2026-11-20T00:00:00Z' },
  };
  const filters: Record<string, string> = {};
  const query = { eq(column: string, value: string) { filters[column] = value; return query; },
    async maybeSingle() {
      assert.deepEqual(filters, { id: scope.siteId, agency_id: scope.agencyId,
        org_id: scope.clientId });
      return { error: options.error ? { message: 'down' } : null,
        data: options.site === null ? null : { id: options.site ?? scope.siteId } };
    } };
  const client = { from(name: string) { assert.equal(name, 'sites');
    return { select(columns: string) { assert.equal(columns, 'id'); return query; } }; },
  auth: { admin: { async getUserById(id: string) { reads.push(id);
    return { error: null, data: { user: users[id] ?? null } }; } } } } as unknown as SupabaseClient;
  const deps = { listMembers: async ({ agencyId }: { agencyId: string }) => {
    assert.equal(agencyId, scope.agencyId); return members; }, now: () => now };
  return { client, deps, reads };
}

test('returns only current owner/admin Access candidates from confirmed auth email', async () => {
  const f = fixture();
  assert.deepEqual(await readCurrentNativeStudioAccessCandidates(scope, f.client, f.deps), [
    { userId: adminId, principal: 'access:admin@example.com', role: 'admin' },
    { userId: ownerId, principal: 'access:owner@example.com', role: 'owner' },
  ]);
  assert.deepEqual(f.reads.sort(), [ownerId, adminId].sort());
});

test('rejects a changed site scope or an unavailable site before reading identities', async () => {
  for (const options of [{ site: null }, { site: memberId }, { error: true }]) {
    const f = fixture(options);
    await assert.rejects(readCurrentNativeStudioAccessCandidates(scope, f.client, f.deps),
      /native_studio_access_scope_unverified/);
    assert.deepEqual(f.reads, []);
  }
});

test('excludes known ineligible admins while retaining confirmed owners', async () => {
  const owner = { id: ownerId, email: 'owner@example.com',
    email_confirmed_at: '2026-11-20T00:00:00Z' };
  const admin = { id: adminId, email: 'admin@example.com',
    email_confirmed_at: '2026-11-20T00:00:00Z' };
  for (const changed of [
    { email_confirmed_at: null, last_sign_in_at: '2026-11-22T00:00:00Z' },
    { email_confirmed_at: null, email: '' },
    { email_confirmed_at: null, email: 'OWNER@example.com' },
    { banned_until: '2026-11-24T00:00:00Z' },
    { email_change: 'new@example.com' },
  ]) {
    const f = fixture({ users: { [ownerId]: owner,
      [adminId]: { ...admin, ...changed } } });
    assert.deepEqual(await readCurrentNativeStudioAccessCandidates(scope, f.client, f.deps), [
      { userId: ownerId, principal: 'access:owner@example.com', role: 'owner' },
    ]);
  }
});

test('rejects invalid identities and requires one eligible administrator', async () => {
  const base = { id: ownerId, email: 'owner@example.com',
    email_confirmed_at: '2026-11-20T00:00:00Z' };
  for (const changed of [
    { banned_until: 'invalid' },
    { email: 'bad address' },
    { id: adminId },
  ]) {
    const f = fixture({ members: [member(ownerId, 'owner')],
      users: { [ownerId]: { ...base, ...changed } } });
    await assert.rejects(readCurrentNativeStudioAccessCandidates(scope, f.client, f.deps),
      /native_studio_access_identity_unverified/);
  }
  const duplicate = fixture({ members: [member(ownerId, 'owner'), member(adminId, 'admin')],
    users: { [ownerId]: base, [adminId]: { id: adminId, email: 'OWNER@example.com',
      email_confirmed_at: '2026-11-20T00:00:00Z' } } });
  await assert.rejects(readCurrentNativeStudioAccessCandidates(scope,
    duplicate.client, duplicate.deps), /native_studio_access_identity_unverified/);
  const repeated = fixture({ members: [member(ownerId, 'owner'), member(ownerId, 'admin')] });
  await assert.rejects(readCurrentNativeStudioAccessCandidates(scope,
    repeated.client, repeated.deps), /native_studio_access_identity_conflict/);
  for (const changed of [
    { email_confirmed_at: null },
    { banned_until: '2026-11-24T00:00:00Z' },
    { email_change: 'new@example.com' },
  ]) {
    const onlyOwner = fixture({ members: [member(ownerId, 'owner')],
      users: { [ownerId]: { ...base, ...changed } } });
    await assert.rejects(readCurrentNativeStudioAccessCandidates(scope,
      onlyOwner.client, onlyOwner.deps), /native_studio_access_admin_missing/);
  }
});

test('requires at least one eligible administrator and does not grant ordinary members', async () => {
  const f = fixture({ members: [member(memberId, 'member')] });
  await assert.rejects(readCurrentNativeStudioAccessCandidates(scope, f.client, f.deps),
    /native_studio_access_admin_missing/);
  assert.deepEqual(f.reads, []);
});
