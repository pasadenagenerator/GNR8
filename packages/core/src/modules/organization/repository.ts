import type { Membership, Organization } from './types'

export type OrganizationCreationTx = {
  profileExists(userId: string): Promise<boolean>
  createOrganization(input: { name: string; slug: string }): Promise<Organization>
  createMembership(input: {
    orgId: string
    userId: string
    role: 'owner'
  }): Promise<Membership>
  countActiveOwners(orgId: string): Promise<number>
}

export interface OrganizationRepository {
  withTransaction<T>(fn: (tx: OrganizationCreationTx) => Promise<T>): Promise<T>
}
