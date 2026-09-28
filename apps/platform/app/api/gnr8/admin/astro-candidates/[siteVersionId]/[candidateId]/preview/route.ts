import { createAstroProductionCandidatePreviewRouteHandlers } from "./astro-candidate-preview-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createAstroProductionCandidatePreviewRouteHandlers();

export const GET = handlers.GET;
