import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NativeStudioScope } from './native-studio-binding-store';
import { readCurrentNativeStudioAccessCandidates } from './native-studio-access-candidates';
import { requireAgencyBackgroundActor } from '../../src/auth/agency-background-action';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

/** An in-process authority for the separately gated, payload-free scheduled
 * Worker. Symbols cannot be serialized into an external Inngest event. */
export const SCHEDULED_NATIVE_STUDIO_RECONCILIATION =
  Symbol('scheduled-native-studio-reconciliation');
export type NativeStudioReconciliationActor =
  string | typeof SCHEDULED_NATIVE_STUDIO_RECONCILIATION;

const defaults = {
  scheduledEnabled: () => process.env.GNR8_NATIVE_STUDIO_ACCESS_SCHEDULED_ENABLED === '1',
  candidates: readCurrentNativeStudioAccessCandidates,
  human: requireAgencyBackgroundActor,
};

export function isNativeStudioReconciliationActor(
  actor: unknown,
): actor is NativeStudioReconciliationActor {
  return actor === SCHEDULED_NATIVE_STUDIO_RECONCILIATION ||
    typeof actor === 'string' && UUID.test(actor);
}

/** System authority is restricted to the current scoped site and at least
 * one currently confirmed owner/admin. Each caller must still prove the
 * exact bound app, policy, source and repository before its provider write. */
export async function requireNativeStudioReconciliationAuthority(
  client: SupabaseClient,
  input: { actor: NativeStudioReconciliationActor; scope: NativeStudioScope },
  deps = defaults,
) {
  if (!client || !input?.scope ||
      Object.keys(input.scope).sort().join() !== 'agencyId,clientId,siteId' ||
      ![input.scope.agencyId, input.scope.clientId, input.scope.siteId]
        .every(value => typeof value === 'string' && UUID.test(value)) ||
      !isNativeStudioReconciliationActor(input.actor))
    throw Error('native_studio_reconciliation_authority_invalid');
  if (input.actor === SCHEDULED_NATIVE_STUDIO_RECONCILIATION) {
    if (!deps.scheduledEnabled())
      throw Error('native_studio_reconciliation_schedule_disabled');
    const candidates = await deps.candidates(input.scope, client);
    if (!candidates.length)
      throw Error('native_studio_reconciliation_admin_missing');
    return { kind: 'system' as const };
  }
  await deps.human(client, { userId: input.actor,
    agencyId: input.scope.agencyId, action: 'publish' });
  return { kind: 'human' as const, userId: input.actor };
}
