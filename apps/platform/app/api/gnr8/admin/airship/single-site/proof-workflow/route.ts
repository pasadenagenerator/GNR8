import { createAirshipProofWorkflowRouteHandlers } from "./airship-proof-workflow-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createAirshipProofWorkflowRouteHandlers();

export const POST = handlers.POST;
