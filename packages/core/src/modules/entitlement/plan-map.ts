import type { EntitlementKey } from './types'

export const PLAN_ENTITLEMENTS: Record<string, EntitlementKey[]> = {
  starter: ['organization.read', 'project.create'],
  pro: [
    'organization.read',
    'organization.manage',
    'membership.manage',
    'project.create',
    'project.unlimited',
  ],
  agency: [
    'organization.read',
    'organization.manage',
    'membership.manage',
    'project.create',
    'project.unlimited',
    'billing.manage',
    'agency.mode',
  ],
}