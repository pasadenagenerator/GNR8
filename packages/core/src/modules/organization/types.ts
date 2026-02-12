export type Organization = {
  id: string
  name: string
  slug: string
  createdAt: string
  deletedAt: string | null
}

export type MembershipRole = 'owner' | 'admin' | 'member'

export type Membership = {
  id: string
  orgId: string
  userId: string
  role: MembershipRole
  createdAt: string
  deletedAt: string | null
}

export type CreateOrganizationInput = {
  actorUserId: string
  name: string
  slug: string
}

export type CreateOrganizationResult = {
  organization: Organization
  membership: Membership
}
