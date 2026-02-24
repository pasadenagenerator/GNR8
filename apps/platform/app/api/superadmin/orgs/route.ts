import { NextResponse, type NextRequest } from 'next/server'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getSuperadminPool } from '@/src/superadmin/db'

/* ================================
 * Types
 * ================================ */

type OrgRow = {
  id: string
  name: string
  created_at: string
  projects_count: string | number
}

type CreateOrgBody = {
  name?: string
  slug?: string
}

type CreatedOrgRow = {
  id: string
  name: string
  slug: string | null
  created_at: string
  updated_at: string
  trial_started_at: string | null
  trial_ends_at: string | null
}

/* ================================
 * GET /api/superadmin/orgs
 * ================================ */

export async function GET(_request: NextRequest) {
  try {
    // superadmin guard
    await requireSuperadminUserId()

    const pool = getSuperadminPool()

    const { rows } = await pool.query<OrgRow>(
      `
      select
        o.id::text as id,
        o.name::text as name,
        o.created_at::text as created_at,
        count(p.id)::text as projects_count
      from public.organizations o
      left join public.projects p
        on p.org_id = o.id
       and p.deleted_at is null
      group by o.id
      order by o.created_at desc
      limit 500
      `,
    )

    const orgs = rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      projectsCount: Number(r.projects_count ?? 0),
    }))

    return NextResponse.json({ orgs }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/* ================================
 * POST /api/superadmin/orgs
 * ================================ */

export async function POST(request: NextRequest) {
  try {
    // superadmin guard
    await requireSuperadminUserId()

    const body = (await request.json()) as CreateOrgBody

    const name = String(body.name ?? '').trim()
    const rawSlug = String(body.slug ?? '').trim().toLowerCase()

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 },
      )
    }

    // slug je optional – če ga ni, ga generiramo iz imena
    const slug =
      rawSlug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60)

    const pool = getSuperadminPool()

    const { rows } = await pool.query<CreatedOrgRow>(
      `
      insert into public.organizations (name, slug)
      values ($1, $2)
      returning
        id::text as id,
        name::text as name,
        slug::text as slug,
        created_at::text as created_at,
        updated_at::text as updated_at,
        trial_started_at::text as trial_started_at,
        trial_ends_at::text as trial_ends_at
      `,
      [name, slug || null],
    )

    const org = rows[0]

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
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const lower = String(message).toLowerCase()

    const status =
      lower.includes('forbidden') || lower.includes('unauthorized')
        ? 403
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}