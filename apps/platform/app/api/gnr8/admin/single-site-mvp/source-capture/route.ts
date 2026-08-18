import { createSingleSiteMvpSourceCaptureRouteHandlers } from "./source-capture-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createSingleSiteMvpSourceCaptureRouteHandlers();

export const POST = handlers.POST;
