import { createAirshipOpenAIProviderRouteHandlers } from "./airship-openai-provider-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createAirshipOpenAIProviderRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
