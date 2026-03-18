import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { resolvePreviewBundleRequest } from "../../../../../../gnr8/migration/temporary-preview-hosting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  previewKey: string;
  previewPath?: string[];
};

function contentTypeFor(absolutePath: string): string {
  const ext = path.extname(absolutePath).toLowerCase();
  if (ext === ".html" || ext === ".htm") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js" || ext === ".mjs") return "text/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".ico") return "image/x-icon";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

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

  const bundleExists = await fs
    .stat(resolved.outputRootPath)
    .then((s) => s.isDirectory())
    .catch(() => false);
  if (!bundleExists) {
    return notFoundResponse({
      code: "MISSING_BUNDLE_ROOT",
      message: "Preview bundle root is missing or no longer available.",
      previewKey: params.previewKey,
      previewPath: params.previewPath,
    });
  }

  const file = await fs
    .readFile(resolved.absolutePath)
    .then((bytes) => ({ ok: true as const, bytes }))
    .catch((err: unknown) => {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT") {
        return { ok: false as const, code: "MISSING_EXPORTED_FILE", message: "Requested exported file was not found in preview bundle." };
      }
      return { ok: false as const, code: "PREVIEW_READ_FAILED", message: "Failed to read requested preview file." };
    });

  if (!file.ok) {
    return notFoundResponse({
      code: file.code,
      message: file.message,
      previewKey: params.previewKey,
      previewPath: params.previewPath,
    });
  }

  return new Response(file.bytes, {
    status: 200,
    headers: {
      "content-type": contentTypeFor(resolved.absolutePath),
      "cache-control": "no-store",
    },
  });
}
