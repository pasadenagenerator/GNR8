import { createSingleSitePublishOperatorDryRunRouteHandlers } from "./single-site-publish-operator-dry-run-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createSingleSitePublishOperatorDryRunRouteHandlers();

export const POST = handlers.POST;
