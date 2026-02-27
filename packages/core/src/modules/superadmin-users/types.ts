export type SuperadminOrgUser = {
  userId: string
  email: string | null
  role: string
  membershipCreatedAt: string | null
  userCreatedAt: string | null
  lastSignInAt: string | null
}

export type ListSuperadminOrgUsersInput = {
  orgId: string
}

export type ListSuperadminOrgUsersOutput = {
  users: SuperadminOrgUser[]
}