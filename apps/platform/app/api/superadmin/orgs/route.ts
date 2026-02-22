import { NextResponse, type NextRequest } from 'next/server'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getSuperadminPool } from '@/src/superadmin/db'

type OrgRow = {
  id: string
  name: string
  created_at: string
  projects_count: string | number
}

export async function GET(_request: NextRequest) {
  try {
    // guard
    await requireSuperadminUserId()

    const pool = getSuperadminPool()

    // orgs + št. aktivnih projektov (deleted_at is null)
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
    // 403/401 logiko ima najbrž already guard; tu vrnemo sporočilo
    return NextResponse.json({ error: message }, { status: 500 })
  }
}