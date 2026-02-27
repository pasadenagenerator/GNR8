import { DomainError, NotFoundError } from '../../service-contract'
import type { SuperadminBillingRepository } from './repository'
import type { GetSuperadminBillingInput, SuperadminBillingOutput } from './types'

export class SuperadminBillingService {
  constructor(private readonly repo: SuperadminBillingRepository) {}

  async getBillingSnapshot(input: GetSuperadminBillingInput): Promise<SuperadminBillingOutput> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) throw new DomainError('orgId is required')

    const org = await this.repo.getOrgSnapshot({ orgId })
    if (!org) throw new NotFoundError('Org not found')

    const sub = await this.repo.getLatestActiveSubscriptionSnapshot({ orgId })

    return {
      org: {
        id: String(org.id),
        name: String(org.name),
        slug: org.slug ? String(org.slug) : null,
        createdAt: org.created_at ? String(org.created_at) : null,
        updatedAt: org.updated_at ? String(org.updated_at) : null,
      },
      subscription: sub
        ? {
            id: String(sub.id),
            orgId: String(sub.org_id),
            stripeCustomerId: sub.stripe_customer_id ?? null,
            stripeSubscriptionId: sub.stripe_subscription_id ?? null,
            status: sub.status ?? null,
            planKey: sub.plan_key ?? null,
            currentPeriodEnd: sub.current_period_end ?? null,
            createdAt: sub.created_at ?? null,
            updatedAt: sub.updated_at ?? null,
          }
        : null,
    }
  }
}