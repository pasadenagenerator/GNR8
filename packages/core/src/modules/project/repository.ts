import type { Role } from '../authorization'
import type { Project } from './types'

export interface ProjectTransaction {
  createProject(input: {
    orgId: string
    name: string
    slug: string
  }): Promise<Project>

  countActiveProjects(input: { orgId: string }): Promise<number>

  findProjectById(input: {
    orgId: string
    projectId: string
  }): Promise<Project | null>

  softDeleteProject(input: {
    orgId: string
    projectId: string
  }): Promise<void>

  restoreProject(input: {
    orgId: string
    projectId: string
  }): Promise<void>

  listProjectsByOrgId(input: { orgId: string }): Promise<Project[]>

  listDeletedProjectsByOrgId(input: { orgId: string }): Promise<Project[]>

  /**
   * Audit log zapis v isti transakciji (atomarno skupaj z delete/restore/create).
   *
   * Opomba: `metadata` je `unknown` (lahko je objekt, array, string, ...).
   * V Postgres implementaciji to normaliziramo z `JSON.stringify(input.metadata ?? {})`.
   */
  writeAuditLog(input: {
    orgId: string
    actorUserId: string
    action: string
    entityType: string
    entityId: string
    metadata?: unknown
  }): Promise<void>
}

export interface ProjectRepository {
  withTransaction<T>(fn: (tx: ProjectTransaction) => Promise<T>): Promise<T>
}

export interface MembershipRepository {
  getActorRoleInOrg(input: {
    tx: ProjectTransaction
    actorUserId: string
    orgId: string
  }): Promise<Role | null>
}