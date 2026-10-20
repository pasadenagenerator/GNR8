import 'server-only';
import { isContactEmail } from '@gnr8/runtime-contracts';
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server';
import { readGeneratedOutputReviewModel, approveGeneratedOutputReview, createEvidenceBoundRuntimePublisher } from './generated-output-publication-composition';
import { prepareRetainedAstroPublicArtifact } from './astro-public-preparation';
import { requirePublicOutputSite, requirePublicOutputVersion, type PublicOutputScope } from './public-output-access';

export type PublicOutputSelection = { siteVersionId: string; artifactId: string; artifactBundleSha256: string };
const defaults = {
  authorizeSite: requirePublicOutputSite,
  authorizeVersion: requirePublicOutputVersion,
  read: readGeneratedOutputReviewModel,
  prepare: prepareRetainedAstroPublicArtifact,
  approve: approveGeneratedOutputReview,
  publish: createEvidenceBoundRuntimePublisher({ requireExactSelection: true }),
};

export function createPublicOutputService(deps = defaults) {
  async function read(scope: PublicOutputScope, selection: PublicOutputSelection) {
    await deps.authorizeVersion(scope, selection.siteVersionId);
    const model = await deps.read(selection.siteVersionId);
    if (model.artifactId !== selection.artifactId || model.artifactBundleSha256 !== selection.artifactBundleSha256)
      throw new Error('409|PUBLIC_OUTPUT_SELECTION_STALE');
    return model;
  }
  return {
    read,
    async act(scope: PublicOutputScope, input: PublicOutputSelection & { action: string; host?: string; confirmation?: string; technicalEvaluationSha256?: string; recipient?: string }) {
      const actor = await deps.authorizeVersion(scope, input.siteVersionId);
      const model = await read(scope, input);
      if (input.action === 'prepare') {
        // A prepared artifact is a target, never an implicit new source.
        if (model.publicPreparation) throw new Error('409|PUBLIC_OUTPUT_ALREADY_PREPARED');
        return deps.prepare({ sourceSiteVersionId: model.siteVersionId, sourceArtifactId: model.artifactId,
          expectedSourceArtifactSha256: model.artifactBundleSha256, expectedSourceCandidateId: model.candidateId,
          host: String(input.host ?? '').trim().toLowerCase(), actor: actor.userId });
      }
      if (!model.publicPreparation || model.publicPreparation.host !== input.host) throw new Error('409|PUBLIC_OUTPUT_HOST_MISMATCH');
      if (input.action === 'change-recipient') {
        if (input.confirmation !== 'confirm-contact-recipient' || !isContactEmail(input.recipient))
          throw new Error('422|PUBLIC_OUTPUT_RECIPIENT_CONFIRMATION_REQUIRED');
        if (!model.contactRecipient || model.state !== 'PUBLISHED' || !model.activePublication)
          throw new Error('409|PUBLIC_OUTPUT_ACTIVE_CONTACT_REQUIRED');
        if (input.recipient === model.contactRecipient) return model;
        return deps.prepare({ sourceSiteVersionId: model.siteVersionId, sourceArtifactId: model.artifactId,
          expectedSourceArtifactSha256: model.artifactBundleSha256, expectedSourceCandidateId: model.candidateId,
          host: input.host!, actor: actor.userId, contactRecipientChange: { from: model.contactRecipient, to: input.recipient } });
      }
      if (input.action === 'approve') {
        if (input.technicalEvaluationSha256 !== model.decision.technical.evidenceSha256) throw new Error('409|PUBLIC_OUTPUT_SELECTION_STALE');
        if (input.confirmation !== 'approve-exact-generated-output-artifact') throw new Error('422|PUBLIC_OUTPUT_CONFIRMATION_REQUIRED');
        await deps.approve({ siteVersionId: model.siteVersionId, reviewerActorId: actor.userId,
          expectedArtifactId: model.artifactId, expectedArtifactBundleSha256: model.artifactBundleSha256,
          expectedCandidateId: model.candidateId, expectedCandidateContentSha256: model.candidateContentSha256,
          expectedContentManifestSha256: model.contentManifestSha256, expectedTechnicalEvaluationSha256: model.decision.technical.evidenceSha256 });
      } else if (input.action === 'publish') {
        await deps.publish({ siteVersionId: model.siteVersionId, actor: actor.userId,
          expectedArtifact: { artifactId: model.artifactId, bundleSha256: model.artifactBundleSha256, host: input.host } });
      } else throw new Error('422|PUBLIC_OUTPUT_ACTION_INVALID');
      return read(scope, input);
    },
  };
}

/** List identities only; load expensive evidence for the explicit selection. */
export async function listPublicOutputVersions(scope: PublicOutputScope) {
  await requirePublicOutputSite(scope);
  const client = getSupabaseServiceRoleClient();
  if (!client) throw new Error('503|PUBLIC_OUTPUT_UNAVAILABLE');
  const versions = await client.from('gnr8_runtime_site_versions').select('id,version_no,state,artifact_id')
    .eq('ownership_site_id', scope.siteId).order('version_no', { ascending: false });
  if (versions.error) throw new Error('503|PUBLIC_OUTPUT_UNAVAILABLE');
  const ids = (versions.data ?? []).map(v => v.artifact_id).filter(Boolean);
  if (!ids.length) return [];
  const artifacts = await client.from('gnr8_runtime_artifacts').select('id,site_version_id,bundle_sha256,build:manifest->generatedOutputBuildEvidence,preparation:manifest->publicPreparation').in('id', ids);
  if (artifacts.error) throw new Error('503|PUBLIC_OUTPUT_UNAVAILABLE');
  return (versions.data ?? []).flatMap(v => {
    const a = artifacts.data?.find(a => a.id === v.artifact_id && a.site_version_id === v.id);
    if (!a?.build) return [];
    return [{ siteVersionId: v.id, artifactId: a.id, artifactBundleSha256: a.bundle_sha256, versionNo: v.version_no, state: v.state,
      host: (a.preparation as {host?: string} | null)?.host ?? null }];
  });
}
