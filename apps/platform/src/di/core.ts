import {
  AuditLogService,
  AuthorizationService,
  BillingService,
  EntitlementService,
  OrganizationService,
  OrgStatsService,
  ProjectService,
  SuperadminBillingService,
  SuperadminOrgService,
  SuperadminTrialService,
  SuperadminUsersService,
} from '@gnr8/core'

import {
  PostgresAuditLogRepository,
  PostgresBillingRepository,
  PostgresEntitlementRepository,
  PostgresMembershipRepository,
  PostgresOrganizationRepository,
  PostgresOrgStatsRepository,
  PostgresProjectRepository,
  PostgresSuperadminBillingRepository,
  PostgresSuperadminOrgRepository,
  PostgresSuperadminTrialRepository,
  PostgresSuperadminUsersRepository,
} from '@gnr8/data'

let organizationService: OrganizationService | null = null
let authorizationService: AuthorizationService | null = null
let entitlementService: EntitlementService | null = null
let projectService: ProjectService | null = null
let billingService: BillingService | null = null
let orgStatsService: OrgStatsService | null = null
let auditLogService: AuditLogService | null = null

let superadminOrgService: SuperadminOrgService | null = null
let superadminBillingService: SuperadminBillingService | null = null
let superadminTrialService: SuperadminTrialService | null = null
let superadminUsersService: SuperadminUsersService | null = null

export function getAuthorizationService(): AuthorizationService {
  if (!authorizationService) authorizationService = new AuthorizationService()
  return authorizationService
}

export function getEntitlementService(): EntitlementService {
  if (!entitlementService) {
    entitlementService = new EntitlementService(new PostgresEntitlementRepository())
  }
  return entitlementService
}

export function getOrganizationService(): OrganizationService {
  if (!organizationService) {
    organizationService = new OrganizationService(new PostgresOrganizationRepository())
  }
  return organizationService
}

export function getProjectService(): ProjectService {
  if (!projectService) {
    projectService = new ProjectService(
      new PostgresProjectRepository(),
      new PostgresMembershipRepository(),
      getAuthorizationService(),
      getEntitlementService(),
    )
  }
  return projectService
}

export function getBillingService(): BillingService {
  if (!billingService) {
    billingService = new BillingService(
      new PostgresBillingRepository(),
      getEntitlementService(),
    )
  }
  return billingService
}

export function getOrgStatsService(): OrgStatsService {
  if (!orgStatsService) {
    orgStatsService = new OrgStatsService(
      new PostgresOrgStatsRepository(),
      getAuthorizationService(),
      getEntitlementService(),
    )
  }
  return orgStatsService
}

export function getAuditLogService(): AuditLogService {
  if (!auditLogService) {
    auditLogService = new AuditLogService(
      new PostgresAuditLogRepository(),
      getAuthorizationService(),
      getEntitlementService(),
    )
  }
  return auditLogService
}

export function getSuperadminUsersService(): SuperadminUsersService {
  if (!superadminUsersService) {
    superadminUsersService = new SuperadminUsersService(
      new PostgresSuperadminUsersRepository(),
    )
  }
  return superadminUsersService
}

export function getSuperadminTrialService(): SuperadminTrialService {
  if (!superadminTrialService) {
    superadminTrialService = new SuperadminTrialService(
      new PostgresSuperadminTrialRepository(),
    )
  }
  return superadminTrialService
}

export function getSuperadminBillingService(): SuperadminBillingService {
  if (!superadminBillingService) {
    superadminBillingService = new SuperadminBillingService(
      new PostgresSuperadminBillingRepository(),
    )
  }
  return superadminBillingService
}

export function getSuperadminOrgService(): SuperadminOrgService {
  if (!superadminOrgService) {
    superadminOrgService = new SuperadminOrgService(
      new PostgresSuperadminOrgRepository(),
    )
  }
  return superadminOrgService
}