// apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

type PageRow = {
  id: string
  org_id: string
  slug: string
  title: string | null
  data: any
  created_at: string
  updated_at: string
}

let pool: Pool | null = null
function getPool(): Pool {
  if (pool) return pool
  const cs = process.env.DATABASE_URL
  if (!cs) throw new Error('DATABASE_URL is not set')
  pool = new Pool({ connectionString: cs })
  return pool
}

function requireInternal(req: NextRequest): { actorUserId: string } {
  const key = req.headers.get('x-gnr8-internal-key') ?? ''
  const expected = process.env.BUILDER_INTERNAL_API_KEY ?? ''
  if (!expected) throw new Error('BUILDER_INTERNAL_API_KEY is not set')

  if (!key || key !== expected) {
    // 401/403 — tukaj je OK 401
    throw new Error('Not authenticated (invalid internal key)')
  }

  const actorUserId = (req.headers.get('x-actor-user-id') ?? '').trim()
  if (!actorUserId) throw new Error('Missing x-actor-user-id')
  return { actorUserId }
}

async function requireMembership(orgId: string, actorUserId: string) {
  // Minimalen membership check glede na tvoje obstoječe tabele (memberships: user_id, org_id, role, ...)
  const client = await getPool().connect()
  try {
    const res = await client.query(
      `
      select 1
      from public.memberships
      where org_id = $1::uuid
        and user_id = $2::uuid
      limit 1
      `,
      [orgId, actorUserId],
    )
    if ((res.rows[0] ?? null) === null) {
      return false
    }
    return true
  } finally {
    client.release()
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await ctx.params
    const org = String(orgId ?? '').trim()
    if (!org) return NextResponse.json({ error: 'orgId is required' }, { status: 400 })

    const { actorUserId } = requireInternal(req)
    const ok = await requireMembership(org, actorUserId)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const client = await getPool().connect()
    try {
      const res = await client.query<PageRow>(
        `
        select
          id::text as id,
          org_id::text as org_id,
          slug::text as slug,
          title::text as title,
          data,
          created_at::text as created_at,
          updated_at::text as updated_at
        from public.builder_pages
        where org_id = $1::uuid
        order by updated_at desc
        `,
        [org],
      )

      return NextResponse.json({
        pages: res.rows.map((r) => ({
          id: r.id,
          orgId: r.org_id,
          slug: r.slug,
          title: r.title,
          data: r.data ?? {},
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
      })
    } finally {
      client.release()
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    const status = msg.includes('Forbidden') ? 403 : msg.includes('Not authenticated') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await ctx.params
    const org = String(orgId ?? '').trim()
    if (!org) return NextResponse.json({ error: 'orgId is required' }, { status: 400 })

    const { actorUserId } = requireInternal(req)
    const ok = await requireMembership(org, actorUserId)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const slug = String((body as any).slug ?? '').trim()
    if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })

    const title = (body as any).title == null ? null : String((body as any).title)
    const data = (body as any).data ?? {}

    const client = await getPool().connect()
    try {
      const res = await client.query<PageRow>(
        `
        insert into public.builder_pages (org_id, slug, title, data, updated_at)
        values ($1::uuid, $2::text, $3::text, $4::jsonb, now())
        on conflict (org_id, slug)
        do update set
          title = excluded.title,
          data = excluded.data,
          updated_at = now()
        returning
          id::text as id,
          org_id::text as org_id,
          slug::text as slug,
          title::text as title,
          data,
          created_at::text as created_at,
          updated_at::text as updated_at
        `,
        [org, slug, title, JSON.stringify(data)],
      )

      const row = res.rows[0]!
      return NextResponse.json(
        {
          page: {
            id: row.id,
            orgId: row.org_id,
            slug: row.slug,
            title: row.title,
            data: row.data ?? {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          },
        },
        { status: 200 },
      )
    } finally {
      client.release()
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    const status = msg.includes('Forbidden') ? 403 : msg.includes('Not authenticated') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}