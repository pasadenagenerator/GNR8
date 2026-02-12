import {
  ConflictError,
  DomainError,
  NotFoundError,
} from '../../service-contract'
import type { OrganizationRepository } from './repository'
import type { CreateOrganizationInput, CreateOrganizationResult } from './types'

export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}

  async createOrganization(
    input: CreateOrganizationInput,
  ): Promise<CreateOrganizationResult> {
    const actorUserId = input.actorUserId.trim()
    const name = input.name.trim()
    const slug = input.slug.trim().toLowerCase()

    if (!actorUserId) {
      throw new DomainError('actorUserId is required')
    }

    if (!name) {
      throw new DomainError('Organization name is required')
    }

    if (!slug) {
      throw new DomainError('Organization slug is required')
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new DomainError(
        'Organization slug must contain only lowercase letters, numbers, and hyphens',
      )
    }

    return this.repository.withTransaction(async (tx) => {
      const profileExists = await tx.profileExists(actorUserId)
      if (!profileExists) {
        throw new NotFoundError('Actor profile does not exist')
      }

      const organization = await tx.createOrganization({ name, slug })

      const membership = await tx.createMembership({
        orgId: organization.id,
        userId: actorUserId,
        role: 'owner',
      })

      const ownerCount = await tx.countActiveOwners(organization.id)
      if (ownerCount < 1) {
        throw new ConflictError('Organization must have at least one owner')
      }

      return { organization, membership }
    })
  }
}
