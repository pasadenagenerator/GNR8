import type { EntitlementKey } from './types'

export const PLAN_ENTITLEMENTS: Record<string, EntitlementKey[]> = {
  // canonical keys (če boš kasneje dal lookup_key ali metadata.plan_key)
  starter: [
    'organization.read', 
    'project.create'
  ],
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

  // fallback: Stripe price.id (ker resolvePlanKey pade na price.id in potem toLowerCase)
  'price_1t15sdjhsqupbm8aegquq1pv': ['organization.read', 'project.create'],
}