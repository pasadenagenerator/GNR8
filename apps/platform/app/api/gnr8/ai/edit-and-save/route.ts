import { NextRequest, NextResponse } from "next/server";

import { runLayoutAgent, type LayoutAgentPlan } from "@/gnr8/ai/layout-agent";
import { getPageBySlug, publishPage, savePage } from "@/gnr8/core/page-storage";
import type { Gnr8Page } from "@/gnr8/types/page";

export const runtime = "nodejs";

type EditAndSaveRequestBody = {
  prompt: string;
  slug: string;
  title?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    if (!prompt.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const slugRaw = typeof body.slug === "string" ? body.slug : "";
    const slug = slugRaw.trim();
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const titleRaw = typeof body.title === "string" ? body.title : undefined;
    const title = titleRaw?.trim() ? titleRaw : undefined;

    const existingPage = await getPageBySlug(slug);
    if (!existingPage) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const result = runLayoutAgent({
      prompt,
      page: existingPage,
      title,
    });

    await savePage(result.page.slug, result.page);
    await publishPage(result.page.slug);

    const publishedPage = (await getPageBySlug(result.page.slug)) ?? result.page;

    const response: {
      success: true;
      page: Gnr8Page;
      plan: LayoutAgentPlan & { mode: "update" };
    } = {
      success: true,
      page: publishedPage,
      plan: { ...result.plan, mode: "update" },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

