import { createMvp28ChsPackageRouteHandlers } from "./mvp28-chs-package-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createMvp28ChsPackageRouteHandlers();

export const POST = handlers.POST;
