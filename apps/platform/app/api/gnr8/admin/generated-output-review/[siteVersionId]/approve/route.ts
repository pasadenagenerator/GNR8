import { createGeneratedOutputReviewRouteHandlers } from "./generated-output-review-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createGeneratedOutputReviewRouteHandlers();

export const POST = handlers.POST;
