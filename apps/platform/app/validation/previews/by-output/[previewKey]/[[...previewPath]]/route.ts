import { NextResponse } from "next/server";

import { readPreviewBundleFile, resolvePreviewBundleRequest } from "../../../../../../gnr8/migration/temporary-preview-hosting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  previewKey: string;
  previewPath?: string[];
};

function notFoundResponse(input: { code: string; message: string; previewKey: string; previewPath: string[] | undefined }) {
  return NextResponse.json(
    {
      kind: "temporary_preview_not_found_v1",
      ok: false,
      code: input.code,
      message: input.message,
      previewKey: input.previewKey,
      previewPath: input.previewPath ?? [],
    },
    { status: 404 },
  );
}

export async function GET(_req: Request, ctx: { params: Promise<RouteParams> }) {
  const params = await ctx.params;
  const resolved = resolvePreviewBundleRequest({
    previewKey: params.previewKey,
    previewPath: params.previewPath,
  });
  if (!resolved.ok) {
    return notFoundResponse({
      code: resolved.code,
      message: resolved.message,
      previewKey: params.previewKey,
      previewPath: params.previewPath,
    });
  }

  const file = await readPreviewBundleFile({ resolved });

  if (!file.ok) {
    return notFoundResponse({
      code: file.code,
      message: file.message,
      previewKey: params.previewKey,
      previewPath: params.previewPath,
    });
  }

  return new Response(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "content-type": file.contentType,
      "cache-control": "no-store",
    },
  });
}
