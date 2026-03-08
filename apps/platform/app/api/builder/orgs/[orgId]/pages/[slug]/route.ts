import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

type PageRow = {
  id: string;
  org_id: string;
  slug: string;
  title: string | null;
  data: any;
  created_at: string;
  updated_at: string;
};

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL is not set");

  pool = new Pool({
    connectionString: cs,
    ssl: { rejectUnauthorized: false },
  });

  return pool;
}

function requireInternal(req: NextRequest): { actorUserId: string } {
  const key = req.headers.get("x-gnr8-internal-key") ?? "";
  const expected = process.env.BUILDER_INTERNAL_API_KEY ?? "";

  if (!expected) throw new Error("BUILDER_INTERNAL_API_KEY is not set");
  if (!key || key !== expected) throw new Error("Not authenticated (invalid internal key)");

  const actorUserId = (req.headers.get("x-actor-user-id") ?? "").trim();
  if (!actorUserId) throw new Error("Missing x-actor-user-id");

  return { actorUserId };
}

async function requireMembership(orgId: string, actorUserId: string) {
  const client = await getPool().connect();
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
    );

    return !!res.rows[0];
  } finally {
    client.release();
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ orgId: string; slug: string }> },
) {
  try {
    const { orgId, slug } = await ctx.params;
    const org = String(orgId ?? "").trim();
    const pageSlug = "/" + decodeURIComponent(String(slug ?? "").replace(/^\/+/, ""));

    if (!org) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const { actorUserId } = requireInternal(req);
    const ok = await requireMembership(org, actorUserId);
    if (!ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await getPool().connect();
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
          and slug = $2::text
        limit 1
        `,
        [org, pageSlug],
      );

      const row = res.rows[0];
      if (!row) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }

      return NextResponse.json({
        page: {
          id: row.id,
          orgId: row.org_id,
          slug: row.slug,
          title: row.title,
          data: row.data ?? {},
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      });
    } finally {
      client.release();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status =
      msg.includes("Forbidden") ? 403 :
      msg.includes("Not authenticated") ? 401 :
      500;

    return NextResponse.json({ error: msg }, { status });
  }
}