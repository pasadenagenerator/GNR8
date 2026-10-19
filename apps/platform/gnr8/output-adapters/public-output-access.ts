import 'server-only';
import { requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access';
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server';
import { SupabaseAstroCandidateOwnershipResolver } from './astro-production-candidate-ownership-resolver';
import { isCanonicalUuid } from './astro-production-candidate-record';

export type PublicOutputScope = { agencyId: string; clientId: string; siteId: string };

/** Membership and the complete site/client relationship precede any artifact read. */
export async function requirePublicOutputSite(scope: PublicOutputScope, dependencies = {
  authorize: requireAgencyActionContext, client: getSupabaseServiceRoleClient,
}) {
  if (![scope.agencyId, scope.clientId, scope.siteId].every(isCanonicalUuid)) throw new Error('404|PUBLIC_OUTPUT_NOT_FOUND');
  const actor = await dependencies.authorize({ action: 'publish', requestedAgencyId: scope.agencyId });
  const client = dependencies.client();
  if (!client) throw new Error('503|PUBLIC_OUTPUT_UNAVAILABLE');
  const result = await client.from('sites').select('id').eq('id', scope.siteId)
    .eq('org_id', scope.clientId).eq('agency_id', actor.agencyId).maybeSingle();
  if (result.error || !result.data) throw new Error('404|PUBLIC_OUTPUT_NOT_FOUND');
  return actor;
}

export async function requirePublicOutputVersion(scope: PublicOutputScope, siteVersionId: string, dependencies = {
  authorizeSite: requirePublicOutputSite,
  resolve: (id: string) => new SupabaseAstroCandidateOwnershipResolver().resolve({ siteVersionId: id }),
}) {
  const actor = await dependencies.authorizeSite(scope);
  const ownership = await dependencies.resolve(siteVersionId);
  if (ownership.ownershipSiteId !== scope.siteId || ownership.organizationId !== scope.clientId || ownership.agencyId !== scope.agencyId)
    throw new Error('404|PUBLIC_OUTPUT_NOT_FOUND');
  return actor;
}

/** Retained preview assets have their own version-scoped ownership check. */
export async function requireOwnedPreviewVersion(siteVersionId: string, runtimeSiteId: string) {
  const ownership = await new SupabaseAstroCandidateOwnershipResolver().resolve({ siteVersionId, expectedRuntimeSiteId: runtimeSiteId });
  return requirePublicOutputVersion({ agencyId: ownership.agencyId, clientId: ownership.organizationId, siteId: ownership.ownershipSiteId }, siteVersionId);
}
