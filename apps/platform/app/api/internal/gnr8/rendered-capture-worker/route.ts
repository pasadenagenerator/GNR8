import { NextResponse } from "next/server";

import {
  executeRenderedCaptureWorkerRequest,
  parseRenderedCaptureWorkerRequestDetailed,
} from "@/gnr8/import-rendered-capture-worker/worker-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function workerAuthorized(req: Request): boolean {
  const expected = normalizeText(process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN);
  if (!expected) return false;
  const provided = normalizeText(req.headers.get("x-gnr8-rendered-capture-worker-token"));
  return provided.length > 0 && provided === expected;
}

export async function POST(req: Request) {
  if (!workerAuthorized(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNAUTHORIZED_WORKER_REQUEST",
          message: "Rendered capture worker authorization failed.",
        },
      },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = parseRenderedCaptureWorkerRequestDetailed(body);
  if (!parsed.request) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error,
      },
      { status: 400 },
    );
  }

  const response = await executeRenderedCaptureWorkerRequest({ request: parsed.request });
  return NextResponse.json(response, { status: 200 });
}
