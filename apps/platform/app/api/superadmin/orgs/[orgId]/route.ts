import { NextResponse, type NextRequest } from 'next/server'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getPool } from '@gnr8/data'

type OrgRow = {
  id: string
  name: string
  created_at: string
  trial_started_at: string | null
  trial_ends_at: string | null
}

type ProjectRow = {
  id: string
  org_id: string
  name: string
  slug: string
  created_at: string
  deleted_at: string | null
}

export async function GET(_request: NextRequest, context: any) {
  try {
    await requireSuperadminUserId()

    const orgId = String(context.params?.orgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const pool = getPool()

    const orgRes = await pool.query<OrgRow>(
      `select
         id::text as id,
         name::text as name,
         created_at::text as created_at,
         trial_started_at::text as trial_started_at,
         trial_ends_at::text as trial_ends_at
       from public.organizations
       where id = $1
       limit 1`,
      [orgId],
    )

    const org = orgRes.rows[0]
    if (!org) {
      return NextResponse.json({ error: 'Org not found' }, { status: 404 })
    }

    const activeRes = await pool.query<ProjectRow>(
      `select id, org_id, name, slug, created_at, deleted_at
       from public.projects
       where org_id = $1 and deleted_at is null
       order by created_at desc`,
      [orgId],
    )

    const deletedRes = await pool.query<ProjectRow>(
      `select id, org_id, name, slug, created_at, deleted_at
       from public.projects
       where org_id = $1 and deleted_at is not null
       order by deleted_at desc`,
      [orgId],
    )

    return NextResponse.json(
      {
        org: {
          id: String(org.id),
          name: String(org.name),
          createdAt: String(org.created_at),
          trialStartedAt: org.trial_started_at ? String(org.trial_started_at) : null,
          trialEndsAt: org.trial_ends_at ? String(org.trial_ends_at) : null,
        },
        projects: activeRes.rows.map((r) => ({
          id: String(r.id),
          orgId: String(r.org_id),
          name: String(r.name),
          slug: String(r.slug),
          createdAt: String(r.created_at),
          deletedAt: r.deleted_at ? String(r.deleted_at) : null,
        })),
        deletedProjects: deletedRes.rows.map((r) => ({
          id: String(r.id),
          orgId: String(r.org_id),
          name: String(r.name),
          slug: String(r.slug),
          createdAt: String(r.created_at),
          deletedAt: r.deleted_at ? String(r.deleted_at) : null,
        })),
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