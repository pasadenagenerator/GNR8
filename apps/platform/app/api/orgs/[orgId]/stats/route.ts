// apps/platform/app/api/orgs/[orgId]/stats/route.ts

import { DomainError, NotFoundError } from '@gnr8/core'
import { NextResponse, type NextRequest } from 'next/server'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getPool } from '@gnr8/data'
import { getProjectService } from '@/src/di/core'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

type OrgRow = {
  id: string
  name: string
  slug: string | null
  created_at: string | null
  updated_at: string | null
  trial_started_at: string | null
  trial_ends_at: string | null
}

type CountRow = { cnt: string }

type SubscriptionRow = {
  id: string
  org_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string | null
  plan_key: string | null
  current_period_end: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

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

function isEntitlementGateError(message: string): boolean {
  const m = String(message || '').toLowerCase()
  return m.includes('missing required entitlement:')
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    // AuthN
    const actorUserId = await requireActorUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    // AuthZ + Entitlement enforcement (canonical, preko core service-a)
    // listProjects preveri: membership + permission organization.read + entitlement organization.read (trial fallback vključen)
    const projectService = getProjectService()
    await projectService.listProjects({ actorUserId, orgId })

    const pool = getPool()

    // Org (+ trial columns)
    const orgRes = await pool.query<OrgRow>(
      `
      select
        id::text as id,
        name,
        slug,
        created_at::text as created_at,
        updated_at::text as updated_at,
        trial_started_at::text as trial_started_at,
        trial_ends_at::text as trial_ends_at
      from public.organizations
      where id = $1
      limit 1
      `,
      [orgId],
    )

    const org = orgRes.rows[0]
    if (!org) {
      return NextResponse.json({ error: 'Org not found' }, { status: 404 })
    }

    const trialStartedAt = org.trial_started_at ? String(org.trial_started_at) : null
    const trialEndsAt = org.trial_ends_at ? String(org.trial_ends_at) : null
    const trialState = computeTrial({ startedAt: trialStartedAt, endsAt: trialEndsAt })

    // Counts (users in org)
    const usersRes = await pool.query<CountRow>(
      `
      select count(*)::text as cnt
      from public.memberships
      where org_id = $1
      `,
      [orgId],
    )

    // Counts (projects active)
    const activeRes = await pool.query<CountRow>(
      `
      select count(*)::text as cnt
      from public.projects
      where org_id = $1
        and deleted_at is null
      `,
      [orgId],
    )

    // Counts (projects deleted)
    const deletedRes = await pool.query<CountRow>(
      `
      select count(*)::text as cnt
      from public.projects
      where org_id = $1
        and deleted_at is not null
      `,
      [orgId],
    )

    // Billing snapshot (latest non-deleted subscription row)
    const subRes = await pool.query<SubscriptionRow>(
      `
      select
        id::text as id,
        org_id::text as org_id,
        stripe_customer_id,
        stripe_subscription_id,
        status,
        plan_key,
        current_period_end::text as current_period_end,
        created_at::text as created_at,
        updated_at::text as updated_at,
        deleted_at::text as deleted_at
      from public.subscriptions
      where org_id = $1
        and deleted_at is null
      order by created_at desc
      limit 1
      `,
      [orgId],
    )

    const sub = subRes.rows[0] ?? null

    return NextResponse.json(
      {
        org: {
          id: String(org.id),
          name: String(org.name),
          slug: org.slug ? String(org.slug) : null,
          createdAt: org.created_at ? String(org.created_at) : null,
          updatedAt: org.updated_at ? String(org.updated_at) : null,
        },
        trial: {
          startedAt: trialStartedAt,
          endsAt: trialEndsAt,
          isActive: trialState.isActive,
          isExpired: trialState.isExpired,
        },
        counts: {
          users: Number(usersRes.rows[0]?.cnt ?? 0),
          projectsActive: Number(activeRes.rows[0]?.cnt ?? 0),
          projectsDeleted: Number(deletedRes.rows[0]?.cnt ?? 0),
        },
        billing: sub
          ? {
              planKey: sub.plan_key ?? null,
              status: sub.status ?? null,
              currentPeriodEnd: sub.current_period_end ?? null,
              stripeCustomerId: sub.stripe_customer_id ?? null,
              stripeSubscriptionId: sub.stripe_subscription_id ?? null,
            }
          : null,
      },
      { status: 200 },
    )
  } catch (e) {
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 })
    }
    if (e instanceof DomainError) {
      const status = isEntitlementGateError(e.message) ? 403 : 400
      return NextResponse.json({ error: e.message }, { status })
    }

    const msg = e instanceof Error ? e.message : 'Internal server error'
    const lower = String(msg).toLowerCase()
    const status =
      lower.includes('unauthorized') || lower.includes('forbidden') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}