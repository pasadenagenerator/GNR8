import type { Role } from '../authorization'
import type { Project } from './types'

export interface ProjectTransaction {
  createProject(input: {
    orgId: string
    name: string
    slug: string
  }): Promise<Project>

  /**
   * Vrne število aktivnih (ne-deletanih) projektov v organizaciji.
   * Uporablja se za plan limit logiko (Starter = 1, Pro = unlimited).
   */
  countActiveProjects(input: { orgId: string }): Promise<number>
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