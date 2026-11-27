import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listAgencyMembers, type AgencyMemberRow } from '../agency/agency-membership-service';
import type { NativeStudioScope } from './native-studio-binding-store';
import { getSuperadminPool } from '../../src/superadmin/db';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NativeStudioAccessCandidate = {
  userId: string;
  principal: `access:${string}`;
  role: 'owner' | 'admin';
};

type Dependencies = {
  listMembers: (input: { agencyId: string }) => Promise<AgencyMemberRow[]>;
  findGlobalSuperadmin: () => Promise<{
    user_id: string; account_email: string; access_email: string;
  } | null>;
  now: () => number;
};

async function findGlobalSuperadmin() {
  const accessEmail = (process.env.GNR8_NATIVE_STUDIO_GLOBAL_SUPERADMIN_EMAIL ?? '')
    .trim().toLowerCase();
  if (!accessEmail) return null;
  const accountEmail = (process.env.GNR8_NATIVE_STUDIO_GLOBAL_SUPERADMIN_ACCOUNT_EMAIL ?? '')
    .trim().toLowerCase();
  if (!EMAIL.test(accessEmail) || !EMAIL.test(accountEmail) ||
      accessEmail === accountEmail ||
      !(process.env.SUPERADMIN_EMAILS ?? '').split(',')
        .some(value => value.trim().toLowerCase() === accountEmail))
    throw Error('native_studio_access_global_superadmin_invalid');
  const result = await getSuperadminPool().query<{ user_id: string; email: string }>(
    `select id::text as user_id, lower(email) as email from auth.users
     where lower(email) = any($1::text[]) limit 3`, [[accountEmail, accessEmail]]);
  if (result.rows.length !== 1 || result.rows[0].email !== accountEmail)
    throw Error('native_studio_access_global_superadmin_unverified');
  return { user_id: result.rows[0].user_id,
    account_email: accountEmail, access_email: accessEmail };
}

const defaults: Dependencies = { listMembers: listAgencyMembers,
  findGlobalSuperadmin, now: Date.now };

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
      typeof deps?.listMembers !== 'function' ||
      typeof deps.findGlobalSuperadmin !== 'function' ||
      typeof deps.now !== 'function')
    throw Error('native_studio_access_scope_invalid');

  const site = await client.from('sites').select('id').eq('id', scope.siteId)
    .eq('agency_id', scope.agencyId).eq('org_id', scope.clientId).maybeSingle();
  if (site.error || site.data?.id !== scope.siteId)
    throw Error('native_studio_access_scope_unverified');

  const members = await deps.listMembers({ agencyId: scope.agencyId });
  if (!Array.isArray(members)) throw Error('native_studio_access_members_unavailable');
  const eligible = members.filter(member => member.role === 'owner' || member.role === 'admin');
  if (!eligible.length) throw Error('native_studio_access_admin_missing');
  const globalSuperadmin = await deps.findGlobalSuperadmin();
  if (globalSuperadmin && (!UUID.test(globalSuperadmin.user_id) ||
      !EMAIL.test(globalSuperadmin.account_email) ||
      !EMAIL.test(globalSuperadmin.access_email)))
    throw Error('native_studio_access_global_superadmin_unverified');
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

  if (globalSuperadmin) {
    const result = await client.auth.admin.getUserById(globalSuperadmin.user_id);
    const user = result.data?.user;
    if (result.error || !user || user.id !== globalSuperadmin.user_id ||
        String(user.email ?? '').trim().toLowerCase() !==
          globalSuperadmin.account_email)
      throw Error('native_studio_access_global_superadmin_unverified');
    const confirmedAt = Date.parse(user.email_confirmed_at ?? '');
    const bannedUntil = user.banned_until ? Date.parse(user.banned_until) : 0;
    const pendingEmailChange = String((user as unknown as Record<string, unknown>)
      .email_change ?? '').trim();
    if (user.banned_until && !Number.isFinite(bannedUntil))
      throw Error('native_studio_access_global_superadmin_unverified');
    if (Number.isFinite(confirmedAt) && confirmedAt <= now &&
        (!user.banned_until || bannedUntil <= now) && !pendingEmailChange) {
      if (seenEmails.has(globalSuperadmin.access_email))
        throw Error('native_studio_access_identity_conflict');
      candidates.push({ userId: globalSuperadmin.user_id,
        principal: `access:${globalSuperadmin.access_email}`, role: 'admin' });
    }
  }

  if (!candidates.length) throw Error('native_studio_access_admin_missing');
  return candidates.sort((a, b) => a.principal.localeCompare(b.principal));
}
