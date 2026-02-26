import { DomainError, NotFoundError } from '../../service-contract'
import type { Role } from '../authorization'
import { AuthorizationService } from '../authorization'
import { EntitlementService } from '../entitlement/service'
import type { OrgStatsRepository } from './repository'
import type { GetOrgStatsInput, OrgStats } from './types'

function computeTrial(window: {
  startedAt: string | null
  endsAt: string | null
}): { isActive: boolean; isExpired: boolean } {
  const startedAt = window.startedAt
  const endsAt = window.endsAt
  if (!startedAt || !endsAt) return { isActive: false, isExpired: false }

  const startMs = new Date(String(startedAt)).getTime()
  const endMs = new Date(String(endsAt)).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return { isActive: false, isExpired: false }
  }

  const now = Date.now()
  return {
    isActive: now >= startMs && now <= endMs,
    isExpired: now > endMs,
  }
}

export class OrgStatsService {
  constructor(
    private readonly orgStatsRepository: OrgStatsRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly entitlementService: EntitlementService,
  ) {}

  async getOrgStats(input: GetOrgStatsInput): Promise<OrgStats> {
    const actorUserId = String(input.actorUserId ?? '').trim()
    const orgId = String(input.orgId ?? '').trim()

    if (!actorUserId) throw new DomainError('actorUserId is required')
    if (!orgId) throw new DomainError('orgId is required')

    // 1) Membership + role (read-only)
    const role: Role | null = await this.orgStatsRepository.getActorRoleInOrg({
      actorUserId,
      orgId,
    })
    if (!role) {
      throw new NotFoundError('Actor membership not found for organization')
    }

    // 2) AuthZ (permission)
    this.authorizationService.assert(role, 'organization.read')

    // 3) Entitlement gate (paid OR trial)
    await this.entitlementService.assert(orgId, 'organization.read')

    // 4) Stats row
    const row = await this.orgStatsRepository.getOrgStatsRow({ orgId })
    if (!row) throw new NotFoundError('Organization not found')

    const trialStartedAt = row.trial_started_at ? String(row.trial_started_at) : null
    const trialEndsAt = row.trial_ends_at ? String(row.trial_ends_at) : null
    const trialState = computeTrial({ startedAt: trialStartedAt, endsAt: trialEndsAt })

    const hasBilling =
      Boolean(row.sub_plan_key) ||
      Boolean(row.sub_status) ||
      Boolean(row.sub_current_period_end) ||
      Boolean(row.sub_stripe_customer_id) ||
      Boolean(row.sub_stripe_subscription_id)

    return {
      org: {
        id: String(row.org_id),
        name: String(row.org_name),
        slug: row.org_slug ? String(row.org_slug) : null,
        createdAt: row.org_created_at ? String(row.org_created_at) : null,
        updatedAt: row.org_updated_at ? String(row.org_updated_at) : null,
      },
      trial: {
        startedAt: trialStartedAt,
        endsAt: trialEndsAt,
        isActive: trialState.isActive,
        isExpired: trialState.isExpired,
      },
      counts: {
        users: Number(row.users_cnt ?? 0),
        projectsActive: Number(row.projects_active_cnt ?? 0),
        projectsDeleted: Number(row.projects_deleted_cnt ?? 0),
      },
      billing: hasBilling
        ? {
            planKey: row.sub_plan_key ?? null,
            status: row.sub_status ?? null,
            currentPeriodEnd: row.sub_current_period_end ?? null,
            stripeCustomerId: row.sub_stripe_customer_id ?? null,
            stripeSubscriptionId: row.sub_stripe_subscription_id ?? null,
          }
        : null,
    }
  }
}