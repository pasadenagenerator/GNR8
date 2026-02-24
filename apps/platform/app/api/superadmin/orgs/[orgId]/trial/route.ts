import { NextResponse, type NextRequest } from 'next/server'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getSuperadminPool } from '@/src/superadmin/db'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

type Body = {
  // če podaš to, direktno nastavimo trial_ends_at = now() + days
  days?: number

  // ali pa eksplicitno:
  trialStartedAt?: string | null
  trialEndsAt?: string | null
}

type OrgTrialRow = {
  id: string
  trial_started_at: string | null
  trial_ends_at: string | null
  updated_at: string
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireSuperadminUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const body = (await request.json()) as Body

    const pool = getSuperadminPool()

    // 1) “days” varianta (najbolj praktična)
    if (typeof body.days === 'number') {
      const days = Math.floor(body.days)
      if (!Number.isFinite(days) || days < 0 || days > 365) {
        return NextResponse.json(
          { error: 'days must be a number between 0 and 365' },
          { status: 400 },
        )
      }

      // days=0 lahko pomeni “disable trial” (ends_at = now())
      const { rows } = await pool.query<OrgTrialRow>(
        `
        update public.organizations
        set
          trial_started_at = now(),
          trial_ends_at = (now() + ($2::int || ' days')::interval),
          updated_at = now()
        where id = $1
        returning
          id::text as id,
          trial_started_at::text as trial_started_at,
          trial_ends_at::text as trial_ends_at,
          updated_at::text as updated_at
        `,
        [orgId, days],
      )

      const org = rows[0]
      if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

      return NextResponse.json(
        {
          org: {
            id: org.id,
            trialStartedAt: org.trial_started_at,
            trialEndsAt: org.trial_ends_at,
            updatedAt: org.updated_at,
          },
        },
        { status: 200 },
      )
    }

    // 2) eksplicitna varianta (če želiš ročno datume)
    const started = body.trialStartedAt ?? null
    const ends = body.trialEndsAt ?? null

    const { rows } = await pool.query<OrgTrialRow>(
      `
      update public.organizations
      set
        trial_started_at = $2::timestamptz,
        trial_ends_at = $3::timestamptz,
        updated_at = now()
      where id = $1
      returning
        id::text as id,
        trial_started_at::text as trial_started_at,
        trial_ends_at::text as trial_ends_at,
        updated_at::text as updated_at
      `,
      [orgId, started, ends],
    )

    const org = rows[0]
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

    return NextResponse.json(
      {
        org: {
          id: org.id,
          trialStartedAt: org.trial_started_at,
          trialEndsAt: org.trial_ends_at,
          updatedAt: org.updated_at,
        },
      },
      { status: 200 },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    const lower = String(msg).toLowerCase()
    const status = lower.includes('forbidden') || lower.includes('unauthorized') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}