/**
 * BUILDER API ONLY
 * This route must never be imported or used by runtime/public flows.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getBuilderPool,
  requireBuilderMembership,
  requireInternalBuilderRequest,
} from "@gnr8/builder-only/builder-api-helpers";

type PageRow = {
  id: string;
  org_id: string;
  slug: string;
  title: string | null;
  data: any;
  created_at: string;
  updated_at: string;
};

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

    const { actorUserId } = requireInternalBuilderRequest(req);
    const ok = await requireBuilderMembership({
      orgId: org,
      actorUserId,
      poolMode: "insecure_ssl",
    });
    if (!ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await getBuilderPool("insecure_ssl").connect();
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
