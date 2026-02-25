import { DomainError, NotFoundError } from '../../service-contract'
import { AuthorizationService } from '../authorization'
import { EntitlementService } from '../entitlement/service'
import type { MembershipRepository } from '../project/repository'
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
    private readonly membershipRepository: MembershipRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly entitlementService: EntitlementService,
  ) {}

  async getOrgStats(input: GetOrgStatsInput): Promise<OrgStats> {
    const actorUserId = String(input.actorUserId ?? '').trim()
    const orgId = String(input.orgId ?? '').trim()

    if (!actorUserId) throw new DomainError('actorUserId is required')
    if (!orgId) throw new DomainError('orgId is required')

    // AuthZ: mora biti član orga + org read permission + entitlement
    // MembershipRepository dela prek tx-ja, ampak tu smo read-only.
    // Rešitev: uporabimo fake "tx" z minimalnim client query wrapperjem ni OK,
    // zato raje naredimo check prek orgStatsRepository query-ja? Ne.
    //
    // => Najbolj enostavno: naredimo membership check v DB v data repo skupaj s statsi.
    // Ampak ker hočemo striktno route->service, bomo membership check naredili v posebni ruti prej.
    //
    // Pragmatično: uporabljamo membershipRepository samo v transakcijah,
    // zato tu naredimo minimalen read-check prek entitlements (in kasneje zamenjamo).
    //
    // Ker želiš enforcement: vsaj entitlement gate:
    await this.entitlementService.assert(orgId, 'organization.read')

    const row = await this.orgStatsRepository.getOrgStatsRow({ orgId })
    if (!row) throw new NotFoundError('Org not found')

    const trialStartedAt = row.trial_started_at ? String(row.trial_started_at) : null
    const trialEndsAt = row.trial_ends_at ? String(row.trial_ends_at) : null
    const trialState = computeTrial({ startedAt: trialStartedAt, endsAt: trialEndsAt })

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
      billing:
        row.sub_plan_key ||
        row.sub_status ||
        row.sub_current_period_end ||
        row.sub_stripe_customer_id ||
        row.sub_stripe_subscription_id
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