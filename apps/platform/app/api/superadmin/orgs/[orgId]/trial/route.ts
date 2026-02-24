import { NextResponse, type NextRequest } from 'next/server'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getPool } from '@gnr8/data'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

type Body =
  | { action?: 'start' | 'extend' | 'end'; days?: number }
  | { trialEndsAt?: string | null; trialStartedAt?: string | null }

type OrgRow = {
  id: string
  name: string
  slug: string | null
  created_at: string | null
  updated_at: string | null
  trial_started_at: string | null
  trial_ends_at: string | null
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireSuperadminUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const pool = getPool()
    const body = (await request.json()) as Body

    // --- Direct set variant: { trialEndsAt, trialStartedAt? }
    if ('trialEndsAt' in body && body.trialEndsAt !== undefined) {
      const trialEndsAt = body.trialEndsAt
      const trialStartedAt =
        'trialStartedAt' in body ? (body.trialStartedAt ?? null) : null

      if (trialEndsAt !== null) {
        const ms = new Date(String(trialEndsAt)).getTime()
        if (Number.isNaN(ms)) {
          return NextResponse.json(
            { error: 'trialEndsAt must be a valid ISO date string or null' },
            { status: 400 },
          )
        }
      }
      if (trialStartedAt !== null) {
        const ms = new Date(String(trialStartedAt)).getTime()
        if (Number.isNaN(ms)) {
          return NextResponse.json(
            { error: 'trialStartedAt must be a valid ISO date string or null' },
            { status: 400 },
          )
        }
      }

      const { rows } = await pool.query<OrgRow>(
        `
        update public.organizations
           set trial_started_at = coalesce($2::timestamptz, trial_started_at),
               trial_ends_at    = $3::timestamptz,
               updated_at       = now()
         where id = $1::uuid
         returning
           id::text as id,
           name::text as name,
           slug::text as slug,
           created_at::text as created_at,
           updated_at::text as updated_at,
           trial_started_at::text as trial_started_at,
           trial_ends_at::text as trial_ends_at
        `,
        [orgId, trialStartedAt, trialEndsAt],
      )

      const org = rows[0]
      if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

      return NextResponse.json(
        {
          org: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            createdAt: org.created_at,
            updatedAt: org.updated_at,
            trialStartedAt: org.trial_started_at,
            trialEndsAt: org.trial_ends_at,
          },
        },
        { status: 200 },
      )
    }

    // --- Action variant: { action, days? }
    const action = ('action' in body ? body.action : undefined) ?? null
    const daysRaw = 'days' in body ? body.days : undefined
    const days = Number.isFinite(daysRaw as number) ? Number(daysRaw) : 14

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action (start|extend|end) or trialEndsAt' },
        { status: 400 },
      )
    }

    if ((action === 'start' || action === 'extend') && (!Number.isFinite(days) || days <= 0)) {
      return NextResponse.json({ error: 'days must be a positive number' }, { status: 400 })
    }

    let sql = ''
    let params: any[] = [orgId, days]

    if (action === 'start') {
      sql = `
        update public.organizations
           set trial_started_at = now(),
               trial_ends_at    = now() + ($2::int * interval '1 day'),
               updated_at       = now()
         where id = $1::uuid
         returning
           id::text as id,
           name::text as name,
           slug::text as slug,
           created_at::text as created_at,
           updated_at::text as updated_at,
           trial_started_at::text as trial_started_at,
           trial_ends_at::text as trial_ends_at
      `
    } else if (action === 'extend') {
      // ključ: če je trial_ends_at v prihodnosti, dodamo na obstoječi end
      sql = `
        update public.organizations
           set trial_started_at = coalesce(trial_started_at, now()),
               trial_ends_at    = case
                 when trial_ends_at is null then now() + ($2::int * interval '1 day')
                 when trial_ends_at < now() then now() + ($2::int * interval '1 day')
                 else trial_ends_at + ($2::int * interval '1 day')
               end,
               updated_at       = now()
         where id = $1::uuid
         returning
           id::text as id,
           name::text as name,
           slug::text as slug,
           created_at::text as created_at,
           updated_at::text as updated_at,
           trial_started_at::text as trial_started_at,
           trial_ends_at::text as trial_ends_at
      `
    } else {
      sql = `
        update public.organizations
           set trial_ends_at = now(),
               updated_at    = now()
         where id = $1::uuid
         returning
           id::text as id,
           name::text as name,
           slug::text as slug,
           created_at::text as created_at,
           updated_at::text as updated_at,
           trial_started_at::text as trial_started_at,
           trial_ends_at::text as trial_ends_at
      `
      params = [orgId]
    }

    const { rows } = await pool.query<OrgRow>(sql, params)
    const org = rows[0]
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

    return NextResponse.json(
      {
        org: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          createdAt: org.created_at,
          updatedAt: org.updated_at,
          trialStartedAt: org.trial_started_at,
          trialEndsAt: org.trial_ends_at,
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