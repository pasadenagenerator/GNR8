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

  // sprememba: vrne Project (po soft-delete) ali null, če ni nič posodobilo
  softDeleteProject(input: {
    orgId: string
    projectId: string
  }): Promise<Project | null>
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