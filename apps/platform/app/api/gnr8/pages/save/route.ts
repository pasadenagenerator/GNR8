import { NextResponse } from "next/server";

import { savePage } from "@/gnr8/core/page-storage";
import type { Gnr8Page } from "@/gnr8/types/page";

type SaveBody = {
  slug?: string;
  page?: Gnr8Page;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as SaveBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const slug = String(body.slug ?? "").trim();
    const page = body.page;

    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    if (!page || typeof page !== "object") {
      return NextResponse.json({ error: "page is required" }, { status: 400 });
    }

    await savePage(slug, page);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
