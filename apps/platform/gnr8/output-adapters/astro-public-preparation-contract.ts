export const PUBLIC_PREPARATION_VERSION = 'gnr8-astro-public-preparation:v1';
export const PUBLIC_PREPARATION_PRODUCER = 'astro_retained_public_preparation';
export type PublicPreparation = {
  version: typeof PUBLIC_PREPARATION_VERSION;
  host: string;
  expectedActivePointer: null;
  sourceSiteVersionId: string;
  sourceArtifactId: string;
  sourceArtifactSha256: string;
  sourceCandidateId: string;
  sourceCandidateContentSha256: string;
  sourceTechnicalEvidenceSha256: string;
};

export function readPublicPreparation(manifest: Record<string, unknown>): PublicPreparation | null {
  const p = manifest.publicPreparation as PublicPreparation | undefined;
  if (!p || p.version !== PUBLIC_PREPARATION_VERSION || p.expectedActivePointer !== null ||
    typeof p.host !== 'string' || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(p.host) ||
    ![p.sourceArtifactSha256,p.sourceCandidateContentSha256,p.sourceTechnicalEvidenceSha256].every(x=>typeof x==='string' && /^[a-f0-9]{64}$/.test(x)) ||
    !p.sourceArtifactId || !p.sourceSiteVersionId || !p.sourceCandidateId) return null;
  return p;
}

