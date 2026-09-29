import { createAstroCandidatePromotionRouteHandlers } from "./astro-candidate-promotion-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createAstroCandidatePromotionRouteHandlers();

export const POST = handlers.POST;
