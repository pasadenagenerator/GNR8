import type { SiteAstroGenerationRequestedPayload } from '@gnr8/runtime-contracts';
import { parseStackiScope, type StackiDraftScope } from './stacki-draft-contract';
import { parseStackiCandidateSelection, type StackiCandidateSelection } from './stacki-candidate-selection';

/** Shared by the existing authenticated site action; transports alone are injectable. */
export async function queueStackiPreparation(input: {
  siteId: string; agencyId: string; actor: string; actionId: string; requestedAt: string;
  stackiBaseline?: StackiDraftScope; stackiRevision?: StackiCandidateSelection;
  acceptedFunctionalReductions?: unknown;
}, deps: {
  enabled: () => boolean;
  authorize: (scope: StackiDraftScope) => Promise<{userId: string; agencyId: string}>;
  source: (versionId: string) => Promise<{versionId:string;runtimeSiteId:string;artifactId:string;sha256:string} | null>;
  emit: (payload: SiteAstroGenerationRequestedPayload) => Promise<unknown>;
}) {
  if (!deps.enabled()) throw new Error('409|STACKI_CANDIDATES_DISABLED');
  if (!!input.stackiBaseline === !!input.stackiRevision || input.acceptedFunctionalReductions)
    throw new Error('409|STACKI_CANDIDATE_SCOPE_MISMATCH');
  const selected = input.stackiRevision ? parseStackiCandidateSelection(input.stackiRevision) : undefined;
  const scope = selected?.scope ?? parseStackiScope(input.stackiBaseline);
  if (scope.siteId !== input.siteId || scope.agencyId !== input.agencyId)
    throw new Error('409|STACKI_CANDIDATE_SCOPE_MISMATCH');
  const authorized = await deps.authorize(scope);
  if (authorized.agencyId !== scope.agencyId ||
    (input.actor !== `user:${authorized.userId}` && input.actor !== authorized.userId))
    throw new Error('403|STACKI_ACTOR_CHANGED');
  const source = await deps.source(scope.siteVersionId);
  if (!source || source.versionId !== scope.siteVersionId) throw new Error('409|STACKI_SOURCE_PROJECT_UNAVAILABLE');
  await deps.emit({actionId:input.actionId,requestedAt:input.requestedAt,ownershipSiteId:scope.siteId,
    runtimeSiteId:source.runtimeSiteId,sourceSiteVersionId:source.versionId,sourceArtifactId:source.artifactId,
    actor:authorized.userId,requestedAdapterId:'astro-static-site',stackiSourceArtifactSha256:source.sha256,
    strategy:selected ? 'stacki_saved_revision' : 'stacki_astro7_baseline',
    ...(selected ? {stackiRevision:selected} : {stackiBaseline:scope})});
  return {resultSummary:selected ? `Preparing saved Stacki revision ${selected.revision}.` : 'Preparing an editable Astro 7 baseline.',
    diagnostics:selected ? [`stacki-revision:${selected.revision}`,`stacki-sha256:${selected.sha256}`] : ['stacki-astro7-baseline',`source-artifact:${source.artifactId}`]};
}
