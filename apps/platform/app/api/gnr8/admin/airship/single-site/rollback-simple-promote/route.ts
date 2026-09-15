import { createAirshipSimplePromoteRollbackRouteHandlers } from "./airship-simple-promote-rollback-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createAirshipSimplePromoteRollbackRouteHandlers();

export const POST = handlers.POST;
