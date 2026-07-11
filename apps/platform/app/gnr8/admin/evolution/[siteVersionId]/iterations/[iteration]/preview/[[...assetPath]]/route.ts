import { createGenerationEvolutionPreviewRouteHandlers } from "./generation-evolution-preview-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createGenerationEvolutionPreviewRouteHandlers();

export const GET = handlers.GET;
