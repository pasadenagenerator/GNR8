import type { Role } from '../authorization'
import type { Project } from './types'

export interface ProjectTransaction {
  createProject(input: {
    orgId: string
    name: string
    slug: string
  }): Promise<Project>

  countActiveProjects(input: { orgId: string }): Promise<number>

  findProjectById(input: { orgId: string; projectId: string }): Promise<Project | null>

  softDeleteProject(input: { orgId: string; projectId: string }): Promise<void>

  // NEW: list active projects (deleted_at is null)
  listProjectsByOrgId(input: { orgId: string }): Promise<Project[]>

  // NEW: list deleted projects (deleted_at is not null)
  listDeletedProjectsByOrgId(input: { orgId: string }): Promise<Project[]>

  // NEW: restore soft-deleted project
  restoreProject(input: { orgId: string; projectId: string }): Promise<void>
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