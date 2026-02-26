import { DomainError, NotFoundError } from '../../service-contract'
import type { SuperadminOrgRepository } from './repository'
import type { GetSuperadminOrgInput, SuperadminOrgDetails } from './types'

export class SuperadminOrgService {
  constructor(private readonly repo: SuperadminOrgRepository) {}

  async getOrgDetails(input: GetSuperadminOrgInput): Promise<SuperadminOrgDetails> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) throw new DomainError('orgId is required')

    const org = await this.repo.getOrgById({ orgId })
    if (!org) throw new NotFoundError('Org not found')

    const [active, deleted] = await Promise.all([
      this.repo.listProjectsByOrgId({ orgId, deleted: false }),
      this.repo.listProjectsByOrgId({ orgId, deleted: true }),
    ])

    return {
      org: {
        id: String(org.id),
        name: String(org.name),
        createdAt: org.created_at ? String(org.created_at) : null,
        trialStartedAt: org.trial_started_at ? String(org.trial_started_at) : null,
        trialEndsAt: org.trial_ends_at ? String(org.trial_ends_at) : null,
      },
      projects: active.map((r) => ({
        id: String(r.id),
        orgId: String(r.org_id),
        name: String(r.name),
        slug: String(r.slug),
        createdAt: r.created_at ? String(r.created_at) : null,
        deletedAt: r.deleted_at ? String(r.deleted_at) : null,
      })),
      deletedProjects: deleted.map((r) => ({
        id: String(r.id),
        orgId: String(r.org_id),
        name: String(r.name),
        slug: String(r.slug),
        createdAt: r.created_at ? String(r.created_at) : null,
        deletedAt: r.deleted_at ? String(r.deleted_at) : null,
      })),
    }
  }
}