import { createSingleSiteShadowPublishRouteHandlers } from "./single-site-shadow-publish-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createSingleSiteShadowPublishRouteHandlers();

export const POST = handlers.POST;
