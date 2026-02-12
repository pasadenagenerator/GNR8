import { OrganizationService } from '@gnr8/core'
import { PostgresOrganizationRepository } from '@gnr8/data'

let organizationService: OrganizationService | null = null

export function getOrganizationService(): OrganizationService {
  if (!organizationService) {
    organizationService = new OrganizationService(
      new PostgresOrganizationRepository(),
    )
  }

  return organizationService
}
