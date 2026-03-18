import { NextResponse } from "next/server";

import type { ExecutionMode } from "@/gnr8/migration/execution-plan-model";
import { runUrlImportOperatorFlow, URL_IMPORT_OPERATOR_EXECUTION_MODES } from "@/src/validation-shell/url-import-operator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type UrlImportBody = {
  url?: unknown;
  executionMode?: unknown;
  requestId?: unknown;
  outputRootDir?: unknown;
  cleanOutputRoot?: unknown;
};

function parseExecutionMode(input: unknown): ExecutionMode {
  if (typeof input !== "string") return "simulation";
  return URL_IMPORT_OPERATOR_EXECUTION_MODES.includes(input as ExecutionMode) ? (input as ExecutionMode) : "simulation";
}

function readOperatorToken(req: Request): string {
  return (req.headers.get("x-gnr8-validation-operator-key") ?? "").trim();
}

function operatorAuthorized(req: Request): boolean {
  const expected = (process.env.GNR8_VALIDATION_OPERATOR_KEY ?? "").trim();
  if (!expected) return true;
  const provided = readOperatorToken(req);
  return provided.length > 0 && provided === expected;
}

export async function POST(req: Request) {
  if (!operatorAuthorized(req)) {
    return NextResponse.json(
      {
        kind: "url_import_operator_response_v1",
        ok: false,
        sourceKind: "imported_url_snapshot",
        error: {
          code: "UNAUTHORIZED_OPERATOR",
          message:
            "Operator authorization failed. Provide x-gnr8-validation-operator-key header or set GNR8_VALIDATION_OPERATOR_KEY for strict operator-only access.",
        },
      },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as UrlImportBody | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sourceUrl = typeof body.url === "string" ? body.url.trim() : "";
  if (!sourceUrl) return NextResponse.json({ error: "url is required" }, { status: 400 });

  const executionMode = parseExecutionMode(body.executionMode);
  const requestId = typeof body.requestId === "string" && body.requestId.trim() ? body.requestId.trim() : undefined;
  const outputRootDir = typeof body.outputRootDir === "string" && body.outputRootDir.trim() ? body.outputRootDir.trim() : undefined;
  const cleanOutputRoot = body.cleanOutputRoot === true;

  const response = await runUrlImportOperatorFlow(
    {
      sourceUrl,
      executionMode,
    },
    {
      requestId,
      outputRootDir,
      cleanOutputRoot,
    },
  );

  return NextResponse.json(response, {
    status: response.ok ? 200 : 422,
  });
}
