import { NextResponse } from "next/server";

import { processVersionScopedFormSubmission } from "@/gnr8/runtime/forms-runtime-bridge";

type Body = {
  siteId?: string;
  siteVersionId?: string;
  pagePath?: string;
  formId?: string;
  payload?: Record<string, unknown>;
  actor?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const siteId = String(body.siteId ?? "").trim();
    const siteVersionId = String(body.siteVersionId ?? "").trim();
    const pagePath = String(body.pagePath ?? "").trim();
    const formId = String(body.formId ?? "").trim();
    const actor = String(body.actor ?? "runtime:form").trim() || "runtime:form";

    if (!siteId || !siteVersionId || !pagePath || !formId) {
      return NextResponse.json(
        { error: "siteId, siteVersionId, pagePath, and formId are required" },
        { status: 400 },
      );
    }

    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

    const result = await processVersionScopedFormSubmission({
      siteId,
      siteVersionId,
      pagePath,
      formId,
      payload,
      actor,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
