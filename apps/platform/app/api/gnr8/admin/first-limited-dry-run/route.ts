import { createFirstLimitedDryRunRouteHandlers } from "@/app/api/gnr8/admin/first-limited-dry-run/first-limited-dry-run-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createFirstLimitedDryRunRouteHandlers();

export const POST = handlers.POST;
