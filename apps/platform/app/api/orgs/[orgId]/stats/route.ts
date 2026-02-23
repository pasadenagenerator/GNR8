import { NextResponse, type NextRequest } from 'next/server'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getPool } from '@gnr8/data'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

type OrgRow = {
  id: string
  name: string
  slug: string | null
  created_at: string | null
  updated_at: string | null
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

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // AuthN
    await requireActorUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const pool = getPool()

    // Org
    const orgRes = await pool.query<OrgRow>(
      `
      select
        id::text as id,
        name,
        slug,
        created_at::text as created_at,
        updated_at::text as updated_at
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
    const msg = e instanceof Error ? e.message : 'Internal server error'
    // requireActorUserId običajno vrže "Unauthorized" / "Forbidden"
    const lower = String(msg).toLowerCase()
    const status = lower.includes('unauthorized') || lower.includes('forbidden') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}