export const PERMISSIONS = [
  'organization.manage',
  'organization.read',
  'membership.manage',
  'project.create',
  'billing.manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export type AuthorizationActor = {
  userId: string
  orgId?: string
}

export type AuthorizationContext = {
  actor: AuthorizationActor
  targetOrgId?: string
}

export type AuthorizationDecision = {
  allowed: boolean
  reason?: string
}
