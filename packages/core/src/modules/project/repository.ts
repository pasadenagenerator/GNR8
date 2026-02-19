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

  /**
   * Najde projekt v okviru organizacije.
   * Vrne tudi deletan projekt (deletedAt != null), če obstaja.
   */
  findProjectById(input: { orgId: string; projectId: string }): Promise<Project | null>

  /**
   * Soft delete (nastavi deleted_at). Ne brišemo fizično.
   */
  softDeleteProject(input: { orgId: string; projectId: string }): Promise<void>
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