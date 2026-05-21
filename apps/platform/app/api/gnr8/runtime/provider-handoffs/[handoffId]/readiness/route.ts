import { createProviderHandoffReadinessRouteHandlers } from "@/app/api/gnr8/runtime/provider-handoffs/[handoffId]/readiness/provider-handoff-readiness-route-handlers";

const handlers = createProviderHandoffReadinessRouteHandlers();

export const GET = handlers.GET;
