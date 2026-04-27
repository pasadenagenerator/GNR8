import { createPreviewAssetsRouteHandlers } from "@/app/api/gnr8/runtime/preview-assets/[siteId]/[siteVersionId]/[...assetPath]/preview-assets-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createPreviewAssetsRouteHandlers();

export const GET = handlers.GET;
