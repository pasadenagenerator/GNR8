import { createAirshipSingleSiteDraftsRouteHandlers } from "./airship-single-site-drafts-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createAirshipSingleSiteDraftsRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
