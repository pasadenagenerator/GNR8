import { NextRequest, NextResponse } from "next/server";

import type { Gnr8Page } from "@/gnr8/types/page";
import { runAutonomousExecutionRuntimeLoopV1 } from "@/gnr8/ai/autonomous-execution-runtime-loop";

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

    const pagesRaw = (body as any).pages as unknown;
    if (!Array.isArray(pagesRaw)) {
      return NextResponse.json({ error: "pages must be an array" }, { status: 400 });
    }
    if (pagesRaw.length < 1) {
      return NextResponse.json({ error: "At least 1 page is required" }, { status: 400 });
    }

    const pages: Array<{ slug: string; page?: Gnr8Page }> = [];
    for (let i = 0; i < pagesRaw.length; i += 1) {
      const item = pagesRaw[i] as unknown;
      if (!isRecord(item)) {
        return NextResponse.json({ error: `Invalid pages[${i}] item` }, { status: 400 });
      }

      const slugRaw = typeof (item as any).slug === "string" ? (item as any).slug : "";
      const slug = normalizeSlug(slugRaw);
      if (!slug) {
        return NextResponse.json({ error: `pages[${i}].slug is required` }, { status: 400 });
      }

      if (typeof (item as any).page !== "undefined" && !isRecord((item as any).page)) {
        return NextResponse.json({ error: `pages[${i}].page must be an object` }, { status: 400 });
      }

      const page = typeof (item as any).page === "undefined" ? undefined : (item as any).page;
      pages.push({ slug, page: isGnr8Page(page) ? (page as Gnr8Page) : undefined });
    }

    const waveIdRaw = typeof (body as any).waveId === "string" ? String((body as any).waveId).trim() : "";

    const applyRaw = "apply" in (body as any) ? (body as any).apply : undefined;
    if (applyRaw !== undefined && typeof applyRaw !== "boolean") {
      return NextResponse.json({ error: "apply must be a boolean" }, { status: 400 });
    }

    const result = await runAutonomousExecutionRuntimeLoopV1({
      pages,
      waveId: waveIdRaw || undefined,
      apply: applyRaw === true,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

