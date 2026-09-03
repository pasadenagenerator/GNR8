import { createAirshipAICommandRouteHandlers } from "./airship-ai-command-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createAirshipAICommandRouteHandlers();

export const POST = handlers.POST;
