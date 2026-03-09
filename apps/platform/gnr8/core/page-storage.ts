import "server-only";

import type { PoolClient } from "pg";

import { getSuperadminPool } from "@/src/superadmin/db";
import type { Gnr8Page } from "@/gnr8/types/page";

type PageVersionRow = {
  data: Gnr8Page;
};

type PageIdRow = {
  id: string;
};

let tablesReady: Promise<void> | null = null;

// Temporary MVP behavior: table creation here should be replaced by proper DB migrations.
async function ensureTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      const pool = getSuperadminPool();
      const client = await pool.connect();

      try {
        await client.query(`
          create table if not exists public.gnr8_pages (
            id uuid primary key default gen_random_uuid(),
            org_id uuid,
            slug text not null unique,
            title text,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          )
        `);

        await client.query(`
          create table if not exists public.gnr8_page_versions (
            id uuid primary key default gen_random_uuid(),
            page_id uuid not null references public.gnr8_pages(id) on delete cascade,
            version integer not null,
            data jsonb not null,
            created_at timestamptz not null default now(),
            published boolean not null default false,
            unique (page_id, version)
          )
        `);
      } finally {
        client.release();
      }
    })();
  }

  await tablesReady;
}

function normalizeSlug(slug: string): string {
  return String(slug ?? "").trim();
}

async function getOrCreatePageId(client: PoolClient, slug: string, title?: string): Promise<string> {
  const existing = await client.query<PageIdRow>(
    `
    select id::text as id
    from public.gnr8_pages
    where slug = $1::text
    limit 1
    `,
    [slug],
  );

  const existingId = existing.rows[0]?.id;
  if (existingId) {
    await client.query(
      `
      update public.gnr8_pages
      set
        title = $2::text,
        updated_at = now()
      where id = $1::uuid
      `,
      [existingId, title ?? null],
    );

    return existingId;
  }

  const inserted = await client.query<PageIdRow>(
    `
    insert into public.gnr8_pages (slug, title)
    values ($1::text, $2::text)
    returning id::text as id
    `,
    [slug, title ?? null],
  );

  return inserted.rows[0]!.id;
}

export async function getPageBySlug(slug: string): Promise<Gnr8Page | null> {
  await ensureTables();

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return null;

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    const res = await client.query<PageVersionRow>(
      `
      select v.data as data
      from public.gnr8_pages p
      join public.gnr8_page_versions v
        on v.page_id = p.id
      where p.slug = $1::text
        and v.published = true
      order by v.version desc
      limit 1
      `,
      [normalizedSlug],
    );

    return res.rows[0]?.data ?? null;
  } finally {
    client.release();
  }
}

export async function savePage(slug: string, page: Gnr8Page): Promise<void> {
  await ensureTables();

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    throw new Error("slug is required");
  }
  const normalizedPage: Gnr8Page = {
    ...page,
    slug: normalizedSlug,
  };

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const pageId = await getOrCreatePageId(client, normalizedSlug, page.title);

    const versionRes = await client.query<{ next_version: number }>(
      `
      select coalesce(max(version), 0) + 1 as next_version
      from public.gnr8_page_versions
      where page_id = $1::uuid
      `,
      [pageId],
    );

    const nextVersion = versionRes.rows[0]?.next_version ?? 1;

    await client.query(
      `
      insert into public.gnr8_page_versions (page_id, version, data, published)
      values ($1::uuid, $2::int, $3::jsonb, false)
      `,
      [pageId, nextVersion, JSON.stringify(normalizedPage)],
    );

    await client.query(
      `
      update public.gnr8_pages
      set updated_at = now()
      where id = $1::uuid
      `,
      [pageId],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function publishPage(slug: string): Promise<void> {
  await ensureTables();

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    throw new Error("slug is required");
  }

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const pageRes = await client.query<PageIdRow>(
      `
      select id::text as id
      from public.gnr8_pages
      where slug = $1::text
      limit 1
      `,
      [normalizedSlug],
    );

    const pageId = pageRes.rows[0]?.id;
    if (!pageId) {
      throw new Error("Page not found");
    }

    const draftRes = await client.query<{ id: string }>(
      `
      select id::text as id
      from public.gnr8_page_versions
      where page_id = $1::uuid
        and published = false
      order by version desc
      limit 1
      `,
      [pageId],
    );

    const draftId = draftRes.rows[0]?.id;
    if (!draftId) {
      throw new Error("No draft version found");
    }

    await client.query(
      `
      update public.gnr8_page_versions
      set published = false
      where page_id = $1::uuid
      `,
      [pageId],
    );

    await client.query(
      `
      update public.gnr8_page_versions
      set published = true
      where id = $1::uuid
      `,
      [draftId],
    );

    await client.query(
      `
      update public.gnr8_pages
      set updated_at = now()
      where id = $1::uuid
      `,
      [pageId],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
