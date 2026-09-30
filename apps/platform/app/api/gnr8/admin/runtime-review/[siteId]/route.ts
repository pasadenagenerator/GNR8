import { createAstroRuntimeReviewRouteHandlers } from "./runtime-review-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createAstroRuntimeReviewRouteHandlers();

export const GET = handlers.GET;
