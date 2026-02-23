import { NextResponse, type NextRequest } from 'next/server'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getPool } from '@gnr8/data'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

type OrgRow = {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string | null
}

type SubRow = {
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
    await requireSuperadminUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const pool = getPool()

    // 1) Org snapshot
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

    // 2) Subscription snapshot (latest non-deleted row)
    const subRes = await pool.query<SubRow>(
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
      order by coalesce(updated_at, created_at) desc nulls last
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
          slug: String(org.slug),
          createdAt: String(org.created_at),
          updatedAt: org.updated_at ? String(org.updated_at) : null,
        },
        subscription: sub
          ? {
              id: String(sub.id),
              orgId: String(sub.org_id),
              stripeCustomerId: sub.stripe_customer_id,
              stripeSubscriptionId: sub.stripe_subscription_id,
              status: sub.status,
              planKey: sub.plan_key,
              currentPeriodEnd: sub.current_period_end,
              createdAt: sub.created_at,
              updatedAt: sub.updated_at,
            }
          : null,
      },
      { status: 200 },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    const lower = String(msg).toLowerCase()
    const status =
      lower.includes('forbidden') || lower.includes('unauthorized') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}