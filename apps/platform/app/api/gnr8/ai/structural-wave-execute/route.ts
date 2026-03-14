import { NextRequest, NextResponse } from "next/server";

import { executeStrategicStructuralWaveExecutionV1 } from "@/gnr8/ai/structural-wave-executor";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const pages = (body as any).pages as unknown;
    if (!Array.isArray(pages)) {
      return NextResponse.json({ error: "pages must be an array" }, { status: 400 });
    }
    if (pages.length < 1) {
      return NextResponse.json({ error: "At least 1 page is required" }, { status: 400 });
    }
    for (let i = 0; i < pages.length; i += 1) {
      const item = pages[i] as unknown;
      if (!isRecord(item)) {
        return NextResponse.json({ error: `Invalid pages[${i}] item` }, { status: 400 });
      }
      const slug = typeof (item as any).slug === "string" ? String((item as any).slug).trim() : "";
      if (!slug) {
        return NextResponse.json({ error: `pages[${i}].slug is required` }, { status: 400 });
      }
    }

    const waveId = typeof (body as any).waveId === "string" ? String((body as any).waveId).trim() : "";
    if (!waveId) {
      return NextResponse.json({ error: "waveId is required" }, { status: 400 });
    }

    const applyRaw = "apply" in (body as any) ? (body as any).apply : undefined;
    if (applyRaw !== undefined && typeof applyRaw !== "boolean") {
      return NextResponse.json({ error: "apply must be a boolean" }, { status: 400 });
    }

    const { strategicStructuralWaveExecution } = await executeStrategicStructuralWaveExecutionV1({
      pages: pages as any,
      waveId,
      apply: applyRaw === true,
    });

    return NextResponse.json({ success: true, strategicStructuralWaveExecution }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

