import type { EntitlementKey } from './types'

export const PLAN_ENTITLEMENTS: Record<string, EntitlementKey[]> = {
  starter: ['organization.read', 'project.create'],

  // Stripe fallback: če lookup_key ni nastavljen, tvoja koda uporablja price.id kot planKey
  // Dodamo alias za starter price id (oboje, ker lahko pride v različnih casingih)
  price_1T15SdJhsQUpBM8AEGQUQ1pV: ['organization.read', 'project.create'],
  price_1t15sdjhsqupbm8aegquq1pv: ['organization.read', 'project.create'],

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