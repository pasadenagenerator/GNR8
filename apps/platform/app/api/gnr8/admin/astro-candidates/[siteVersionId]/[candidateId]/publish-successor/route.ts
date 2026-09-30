import { createAstroSuccessorPublicationRouteHandlers } from "./astro-successor-publication-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createAstroSuccessorPublicationRouteHandlers();

export const POST = handlers.POST;
