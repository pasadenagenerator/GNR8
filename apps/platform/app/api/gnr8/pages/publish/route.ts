import { NextResponse } from "next/server";

import { publishPage } from "@/gnr8/core/page-storage";

type PublishBody = {
  slug?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as PublishBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const slug = String(body.slug ?? "").trim();
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    await publishPage(slug);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Page not found" ? 404 :
      message === "No draft version found" ? 400 :
      500;

    return NextResponse.json({ error: message }, { status });
  }
}
