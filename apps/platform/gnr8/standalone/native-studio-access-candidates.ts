import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listAgencyMembers, type AgencyMemberRow } from '../agency/agency-membership-service';
import type { NativeStudioScope } from './native-studio-binding-store';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NativeStudioAccessCandidate = {
  userId: string;
  principal: `access:${string}`;
  role: 'owner' | 'admin';
};

type Dependencies = {
  listMembers: (input: { agencyId: string }) => Promise<AgencyMemberRow[]>;
  now: () => number;
};

const defaults: Dependencies = { listMembers: listAgencyMembers, now: Date.now };

/** Resolve candidate Cloudflare Access principals from current GNR8 authority.
 * A confirmed Supabase email is only a candidate: Access must separately
 * attest the same email in a signed login token and enforce its own policy.
 * Call again immediately before any GitHub role write.
 */
export async function readCurrentNativeStudioAccessCandidates(
  scope: NativeStudioScope,
  client: SupabaseClient,
  deps: Dependencies = defaults,
): Promise<NativeStudioAccessCandidate[]> {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId].every(id =>
      typeof id === 'string' && UUID.test(id)) || !client ||
      typeof deps?.listMembers !== 'function' || typeof deps.now !== 'function')
    throw Error('native_studio_access_scope_invalid');

  const site = await client.from('sites').select('id').eq('id', scope.siteId)
    .eq('agency_id', scope.agencyId).eq('org_id', scope.clientId).maybeSingle();
  if (site.error || site.data?.id !== scope.siteId)
    throw Error('native_studio_access_scope_unverified');

  const members = await deps.listMembers({ agencyId: scope.agencyId });
  if (!Array.isArray(members)) throw Error('native_studio_access_members_unavailable');
  const eligible = members.filter(member => member.role === 'owner' || member.role === 'admin');
  if (!eligible.length) throw Error('native_studio_access_admin_missing');
  const seenUsers = new Set<string>();
  const seenEmails = new Set<string>();
  const candidates: NativeStudioAccessCandidate[] = [];
  const now = deps.now();
  if (!Number.isFinite(now)) throw Error('native_studio_access_clock_invalid');

  for (const member of eligible) {
    if (!UUID.test(member.user_id) || seenUsers.has(member.user_id))
      throw Error('native_studio_access_identity_conflict');
    seenUsers.add(member.user_id);
    const result = await client.auth.admin.getUserById(member.user_id);
    const user = result.data?.user;
    if (result.error || !user || user.id !== member.user_id)
      throw Error('native_studio_access_identity_unverified');
    const confirmedAt = Date.parse(user.email_confirmed_at ?? '');
    const bannedUntil = user.banned_until ? Date.parse(user.banned_until) : 0;
    const pendingEmailChange = String((user as unknown as Record<string, unknown>)
      .email_change ?? '').trim();
    const email = String(user.email ?? '').trim().toLowerCase();
    if (user.banned_until && !Number.isFinite(bannedUntil))
      throw Error('native_studio_access_identity_unverified');
    // A known ineligible member must be removed from the effective policy.
    // Failing the whole scan here would preserve access for a banned admin and
    // let an unconfirmed invitation block unrelated revocations.
    if (!Number.isFinite(confirmedAt) || confirmedAt > now ||
        (user.banned_until && bannedUntil > now) || pendingEmailChange)
      continue;
    if (!EMAIL.test(email) || seenEmails.has(email))
      throw Error('native_studio_access_identity_unverified');
    seenEmails.add(email);
    candidates.push({ userId: member.user_id, principal: `access:${email}`,
      role: member.role as 'owner' | 'admin' });
  }

  if (!candidates.length) throw Error('native_studio_access_admin_missing');
  return candidates.sort((a, b) => a.principal.localeCompare(b.principal));
}
