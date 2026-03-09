import { NextResponse } from "next/server";

import { getPageBySlug } from "@/gnr8/core/page-storage";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const normalizedSlug = String(slug ?? "").trim();

    if (!normalizedSlug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const page = await getPageBySlug(normalizedSlug);

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
