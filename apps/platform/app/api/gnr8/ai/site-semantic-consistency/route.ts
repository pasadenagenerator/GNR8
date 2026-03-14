import { NextRequest, NextResponse } from "next/server";

import type { Gnr8Page } from "@/gnr8/types/page";
import { getPageBySlug } from "@/gnr8/core/page-storage";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSlug(slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return "";
  if (s === "/") return "/";
  return s.startsWith("/") ? s : `/${s}`;
}

function isGnr8Page(value: unknown): value is Gnr8Page {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim()) return false;
  if (typeof value.slug !== "string" || !value.slug.trim()) return false;
  if (!Array.isArray(value.sections)) return false;
  if (typeof value.title !== "undefined" && typeof value.title !== "string") return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const pagesRaw = body.pages;
    if (!Array.isArray(pagesRaw)) {
      return NextResponse.json({ error: "pages must be an array" }, { status: 400 });
    }
    if (pagesRaw.length < 1) {
      return NextResponse.json({ error: "At least 1 page is required" }, { status: 400 });
    }

    const normalizedInputPages: Array<{ slug: string; page?: Gnr8Page }> = [];
    for (let i = 0; i < pagesRaw.length; i += 1) {
      const item = pagesRaw[i] as unknown;
      if (!isRecord(item)) {
        return NextResponse.json({ error: `Invalid pages[${i}] item` }, { status: 400 });
      }

      const slugRaw = typeof item.slug === "string" ? item.slug : "";
      const slug = normalizeSlug(slugRaw);
      if (!slug) {
        return NextResponse.json({ error: `pages[${i}].slug is required` }, { status: 400 });
      }

      if (typeof item.page !== "undefined" && !isRecord(item.page)) {
        return NextResponse.json({ error: `pages[${i}].page must be an object` }, { status: 400 });
      }

      const page = typeof item.page === "undefined" ? undefined : item.page;

      normalizedInputPages.push({
        slug,
        page: isGnr8Page(page) ? (page as Gnr8Page) : undefined,
      });
    }

    const resolvedPages: Array<{ slug: string; page: Gnr8Page }> = [];
    const unresolvedPages: string[] = [];

    for (const p of normalizedInputPages) {
      if (p.page) {
        const normalizedInline: Gnr8Page = {
          ...p.page,
          slug: p.slug,
        };
        resolvedPages.push({ slug: p.slug, page: normalizedInline });
        continue;
      }

      const loaded = await getPageBySlug(p.slug).catch(() => null);
      if (!loaded) {
        unresolvedPages.push(p.slug);
        continue;
      }

      const normalizedLoaded: Gnr8Page = {
        ...loaded,
        slug: p.slug,
      };
      resolvedPages.push({ slug: p.slug, page: normalizedLoaded });
    }

    const siteSemanticConsistency = buildSiteSemanticConsistency({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
    });

    return NextResponse.json(
      { success: true, resolvedPages, unresolvedPages, siteSemanticConsistency },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

