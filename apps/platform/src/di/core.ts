import {
  AuthorizationService,
  BillingService,
  EntitlementService,
  OrganizationService,
  ProjectService,
  OrgStatsService,
} from '@gnr8/core'
import {
  PostgresBillingRepository,
  PostgresEntitlementRepository,
  PostgresMembershipRepository,
  PostgresOrganizationRepository,
  PostgresProjectRepository,
  PostgresOrgStatsRepository,
} from '@gnr8/data'

let organizationService: OrganizationService | null = null
let authorizationService: AuthorizationService | null = null
let entitlementService: EntitlementService | null = null
let projectService: ProjectService | null = null
let billingService: BillingService | null = null
let orgStatsService: OrgStatsService | null = null

export function getOrganizationService(): OrganizationService {
  if (!organizationService) {
    organizationService = new OrganizationService(new PostgresOrganizationRepository())
  }
  return organizationService
}

export function getAuthorizationService(): AuthorizationService {
  if (!authorizationService) {
    authorizationService = new AuthorizationService()
  }
  return authorizationService
}

export function getEntitlementService(): EntitlementService {
  if (!entitlementService) {
    entitlementService = new EntitlementService(new PostgresEntitlementRepository())
  }
  return entitlementService
}

export function getProjectService(): ProjectService {
  if (!projectService) {
    const projectRepository = new PostgresProjectRepository()
    const membershipRepository = new PostgresMembershipRepository()

    projectService = new ProjectService(
      projectRepository,
      membershipRepository,
      getAuthorizationService(),
      getEntitlementService(),
    )
  }
  return projectService
}

export function getBillingService(): BillingService {
  if (!billingService) {
    const billingRepository = new PostgresBillingRepository()
    billingService = new BillingService(billingRepository, getEntitlementService())
  }
  return billingService
}

export function getOrgStatsService(): OrgStatsService {
  if (!orgStatsService) {
    orgStatsService = new OrgStatsService(
      new PostgresOrgStatsRepository(),
      new PostgresMembershipRepository(),
      getAuthorizationService(),
      getEntitlementService(),
    )
  }
  return orgStatsService
}