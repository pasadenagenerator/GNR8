/**
 * BUILDER API ONLY
 * This route must never be imported or used by runtime/public flows.
 */
import { NextRequest, NextResponse } from "next/server";
import { getBuilderPool, requireBuilderMembership, requireInternalBuilderRequest } from "@gnr8/builder-only/builder-api-helpers";

type PageRow = {
  id: string;
  org_id: string;
  slug: string;
  title: string | null;
  data: any;
  created_at: string;
  updated_at: string;
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await ctx.params;
    const org = String(orgId ?? "").trim();
    if (!org) return NextResponse.json({ error: "orgId is required" }, { status: 400 });

    const { actorUserId } = requireInternalBuilderRequest(req);
    const ok = await requireBuilderMembership({ orgId: org, actorUserId });
    if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const client = await getBuilderPool().connect();
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
      );

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
      });
    } finally {
      client.release();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : msg.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await ctx.params;
    const org = String(orgId ?? "").trim();
    if (!org) return NextResponse.json({ error: "orgId is required" }, { status: 400 });

    const { actorUserId } = requireInternalBuilderRequest(req);
    const ok = await requireBuilderMembership({ orgId: org, actorUserId });
    if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const slug = String((body as any).slug ?? "").trim();
    if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });

    const title = (body as any).title == null ? null : String((body as any).title);
    const data = (body as any).data ?? {};

    const client = await getBuilderPool().connect();
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
      );

      const row = res.rows[0]!;
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
      );
    } finally {
      client.release();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg.includes("Forbidden") ? 403 : msg.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
