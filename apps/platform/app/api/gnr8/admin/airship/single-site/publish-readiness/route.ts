import { createAirshipSingleSitePublishReadinessRouteHandlers } from "./airship-single-site-publish-readiness-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createAirshipSingleSitePublishReadinessRouteHandlers();

export const POST = handlers.POST;
