import { createProviderHandoffExecutionReadinessGateRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/execution-readiness-gate/provider-handoff-execution-readiness-gate-route-handlers";

const handlers = createProviderHandoffExecutionReadinessGateRouteHandlers();

export const GET = handlers.GET;
