import { createProviderHandoffReadinessSeedRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/readiness-seed/readiness-seed-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createProviderHandoffReadinessSeedRouteHandlers();

export const POST = handlers.POST;
