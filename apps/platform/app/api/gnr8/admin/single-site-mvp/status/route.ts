import { createSingleSiteMvpOperatorActionRouteHandlers } from "../single-site-mvp-operator-action-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createSingleSiteMvpOperatorActionRouteHandlers();

export const GET = handlers.GET;
