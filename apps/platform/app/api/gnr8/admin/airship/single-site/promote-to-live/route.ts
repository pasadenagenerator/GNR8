import { createAirshipSimplePromoteToLiveRouteHandlers } from "./airship-simple-promote-to-live-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createAirshipSimplePromoteToLiveRouteHandlers();

export const POST = handlers.POST;
