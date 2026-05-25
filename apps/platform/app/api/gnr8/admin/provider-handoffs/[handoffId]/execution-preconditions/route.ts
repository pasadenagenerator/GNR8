import { createProviderHandoffExecutionPreconditionsRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/execution-preconditions/provider-handoff-execution-preconditions-route-handlers";

const handlers = createProviderHandoffExecutionPreconditionsRouteHandlers();

export const GET = handlers.GET;
