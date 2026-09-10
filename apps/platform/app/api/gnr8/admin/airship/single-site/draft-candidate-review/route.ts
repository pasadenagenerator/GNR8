import { createAirshipSingleSiteDraftCandidateReviewRouteHandlers } from "./airship-single-site-draft-candidate-review-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createAirshipSingleSiteDraftCandidateReviewRouteHandlers();

export const POST = handlers.POST;
