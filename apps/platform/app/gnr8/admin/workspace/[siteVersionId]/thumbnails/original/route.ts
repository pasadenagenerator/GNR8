import { createWebsiteVersionThumbnailRouteHandlers } from "../website-version-thumbnail-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createWebsiteVersionThumbnailRouteHandlers();

export const GET = handlers.GET;
