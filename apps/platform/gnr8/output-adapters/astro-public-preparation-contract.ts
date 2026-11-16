import { isContactEmail } from '@gnr8/runtime-contracts';
import { stableStringify } from '@/gnr8/runtime/deterministic';

export const PUBLIC_PREPARATION_VERSION = 'gnr8-astro-public-preparation:v1';
export const PUBLIC_CONTACT_UPDATE_VERSION = 'gnr8-astro-public-contact-update:v1';
export const PUBLIC_PREPARATION_PRODUCER = 'astro_retained_public_preparation';
export type PublicPreparation = {
  version: typeof PUBLIC_PREPARATION_VERSION | typeof PUBLIC_CONTACT_UPDATE_VERSION;
  host: string;
  expectedActivePointer: null | { siteVersionId: string; artifactId: string };
  contactRecipientChange?: { from: string; to: string; requestedByActor: string };
  sourceSiteVersionId: string;
  sourceArtifactId: string;
  sourceArtifactSha256: string;
  sourceCandidateId: string;
  sourceCandidateContentSha256: string;
  sourceTechnicalEvidenceSha256: string;
};

export function readPublicPreparation(manifest: Record<string, unknown>): PublicPreparation | null {
  const p = manifest.publicPreparation as PublicPreparation | undefined;
  if (!p || ![PUBLIC_PREPARATION_VERSION,PUBLIC_CONTACT_UPDATE_VERSION].includes(p.version) ||
    typeof p.host !== 'string' || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(p.host) ||
    ![p.sourceArtifactSha256,p.sourceCandidateContentSha256,p.sourceTechnicalEvidenceSha256].every(x=>typeof x==='string' && /^[a-f0-9]{64}$/.test(x)) ||
    !p.sourceArtifactId || !p.sourceSiteVersionId || !p.sourceCandidateId) return null;
  if (p.version === PUBLIC_PREPARATION_VERSION) {
    if (p.expectedActivePointer !== null || p.contactRecipientChange !== undefined) return null;
  } else {
    const change = p.contactRecipientChange;
    if (!p.expectedActivePointer || p.expectedActivePointer.siteVersionId !== p.sourceSiteVersionId ||
      p.expectedActivePointer.artifactId !== p.sourceArtifactId || !change ||
      !isContactEmail(change.from) || !isContactEmail(change.to) || change.from === change.to ||
      typeof change.requestedByActor !== 'string' || !change.requestedByActor.trim()) return null;
  }
  return p;
}

/** Only the declared recipient may differ. Original acceptance provenance stays intact;
 * the new request actor is recorded separately and does not stand in for artifact review. */
export function publicPreparationWorkspace(source: unknown, preparation: PublicPreparation): unknown {
  const copy = structuredClone(source);
  if (!preparation.contactRecipientChange) return copy;
  const workspace = copy as {acceptedFunctionalReductions?: {contact?: {recipient: string; recipientConfirmed: boolean}}} | undefined;
  const contact = workspace?.acceptedFunctionalReductions?.contact;
  if (!contact || contact.recipientConfirmed !== true || contact.recipient !== preparation.contactRecipientChange.from)
    throw new Error('public_contact_update_source_recipient_mismatch');
  contact.recipient = preparation.contactRecipientChange.to;
  return copy;
}

export function publicPreparationWorkspaceMatches(source: unknown, target: unknown, preparation: PublicPreparation): boolean {
  try { return stableStringify(publicPreparationWorkspace(source,preparation)) === stableStringify(target); }
  catch { return false; }
}

