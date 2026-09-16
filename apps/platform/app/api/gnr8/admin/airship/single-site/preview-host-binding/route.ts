import { createAirshipPreviewHostBindingRouteHandlers } from "./airship-preview-host-binding-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createAirshipPreviewHostBindingRouteHandlers();

export const POST = handlers.POST;
