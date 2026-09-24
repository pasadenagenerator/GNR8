import { createAirshipOnlineBuilderWorkerRouteHandlers } from "../airship-online-builder-worker-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createAirshipOnlineBuilderWorkerRouteHandlers();

export async function POST(request: Request): Promise<Response> {
  return handlers.heartbeat(request);
}
