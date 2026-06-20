import { createCandidateReviewActionRouteHandlers } from "./candidate-review-action-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createCandidateReviewActionRouteHandlers();

export const POST = handlers.POST;
