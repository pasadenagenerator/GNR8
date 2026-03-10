import { NextRequest, NextResponse } from "next/server";
import { runLayoutAgent } from "@/gnr8/ai/layout-agent";
import type { Gnr8Page } from "@/gnr8/types/page";

export const runtime = "nodejs";

type LayoutRequestBody = {
  prompt: string;
  slug?: string;
  title?: string;
  page?: Gnr8Page;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isValidPage(value: unknown): value is Gnr8Page {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || typeof value.slug !== "string") return false;
  if (value.title != null && typeof value.title !== "string") return false;
  if (!Array.isArray(value.sections)) return false;
  for (const s of value.sections) {
    if (!isRecord(s)) return false;
    if (typeof s.id !== "string" || typeof s.type !== "string") return false;
    if (s.props != null && !isRecord(s.props)) return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    const slug = typeof body.slug === "string" ? body.slug : undefined;
    const title = typeof body.title === "string" ? body.title : undefined;
    const page = body.page == null ? undefined : body.page;

    if (!prompt.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    if (page != null && !isValidPage(page)) {
      return NextResponse.json({ error: "page is invalid" }, { status: 400 });
    }

    const result = runLayoutAgent({ prompt, slug, title, page });

    const response: {
      success: true;
      page: Gnr8Page;
      plan: {
        mode: "create" | "update";
        requestedSectionTypes: string[];
        notes: string[];
      };
    } = {
      success: true,
      page: result.page,
      plan: result.plan,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

