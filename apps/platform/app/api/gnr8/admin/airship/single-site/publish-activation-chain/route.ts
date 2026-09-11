import { createAirshipPublishActivationChainRouteHandlers } from "./airship-publish-activation-chain-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createAirshipPublishActivationChainRouteHandlers();

export const POST = handlers.POST;
