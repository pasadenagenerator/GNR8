import { createAirshipSingleSiteDraftCandidateRouteHandlers } from "./airship-single-site-draft-candidate-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createAirshipSingleSiteDraftCandidateRouteHandlers();

export const POST = handlers.POST;
