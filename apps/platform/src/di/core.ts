import {
  AuthorizationService,
  OrganizationService,
  ProjectService,
} from '@gnr8/core'
import {
  PostgresOrganizationRepository,
  PostgresProjectRepository,
} from '@gnr8/data'

let organizationService: OrganizationService | null = null
let authorizationService: AuthorizationService | null = null
let projectService: ProjectService | null = null

export function getOrganizationService(): OrganizationService {
  if (!organizationService) {
    organizationService = new OrganizationService(
      new PostgresOrganizationRepository(),
    )
  }

  return organizationService
}

export function getAuthorizationService(): AuthorizationService {
  if (!authorizationService) {
    authorizationService = new AuthorizationService()
  }

  return authorizationService
}

export function getProjectService(): ProjectService {
  if (!projectService) {
    const projectRepository = new PostgresProjectRepository()
    projectService = new ProjectService(
      projectRepository,
      projectRepository,
      getAuthorizationService(),
    )
  }

  return projectService
}
