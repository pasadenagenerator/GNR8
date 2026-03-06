// apps/platform/src/pages/public-pages.ts

import 'server-only'
import { getSuperadminPool } from "@/src/superadmin/db";

type PublicPageRow = {
  id: string;
  org_id: string;
  slug: string;
  title: string | null;
  data: any;
  created_at: string | null;
  updated_at: string | null;
};

export type PublicPage = {
  id: string;
  orgId: string;
  slug: string;
  title: string | null;
  data: any;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function getPublicPageByOrgAndSlug(input: {
  orgId: string;
  slug: string;
  host?: string | null;
}): Promise<PublicPage | null> {
  const orgId = String(input.orgId ?? "").trim();
  const slug = String(input.slug ?? "").trim() || "/";

  if (!orgId) return null;

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    const res = await client.query<PublicPageRow>(
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
      [orgId, slug],
    );

    const row = res.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      orgId: row.org_id,
      slug: row.slug,
      title: row.title ?? null,
      data: row.data ?? {},
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    };
  } finally {
    client.release();
  }
}