import { createAirshipGovernedDryRunRouteHandlers } from "./airship-governed-dry-run-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createAirshipGovernedDryRunRouteHandlers();

export const POST = handlers.POST;
