import { parseAcceptedFunctionalReductions } from '@gnr8/runtime-contracts'
import type { PublicRuntimeArtifactResolution } from '../runtime/runtime-store'
import { readContactSchema } from './contact-form'
import type { PublishedContact } from './contact-submission'

export function publishedContactFromResolution(result: PublicRuntimeArtifactResolution, path: string): PublishedContact | null {
  if (result.outcome !== 'artifact_hit' || !['domain_match','host_match'].includes(result.siteResolution) ||
    !result.ownershipSiteId || result.resolvedPath !== path || result.normalizedPath !== path ||
    result.artifact.siteId !== result.siteId || result.artifact.siteVersionId !== result.activeSiteVersionId ||
    result.artifact.publishStage !== 'production' || result.artifact.shadowRestricted ||
    (result.hostBindingKind && ['shadow','canary','preview','candidate_preview','preview_host'].includes(result.hostBindingKind.trim().toLowerCase()))) return null
  if (result.siteResolution === 'host_match' ? result.hostBindingStatus !== 'ACTIVE' : result.domainBindingStatus !== 'active') return null
  const workspace = result.artifact.manifest.generatedOutputSourceWorkspace as Record<string,unknown> | undefined
  const stored = workspace?.acceptedFunctionalReductions as Record<string,unknown> | undefined
  if (!stored || stored.scope !== 'generation-action' || typeof stored.acceptedByActor !== 'string' || !stored.acceptedByActor) return null
  const {scope: _scope, acceptedByActor: _actor, acceptedAt: _at, limitations: _limits, ...configuration} = stored
  const settings = parseAcceptedFunctionalReductions(configuration)
  const schema = readContactSchema(result.html)
  if (settings?.kind !== 'retained-presentation-v1' || !settings.contact || !schema) return null
  return {...schema,siteId:result.siteId,siteVersionId:result.activeSiteVersionId,pagePath:path,recipient:settings.contact.recipient}
}
