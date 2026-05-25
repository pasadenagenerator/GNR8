import { createProviderHandoffExecutionRemediationPlanRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/execution-remediation-plan/provider-handoff-execution-remediation-plan-route-handlers";

const handlers = createProviderHandoffExecutionRemediationPlanRouteHandlers();

export const GET = handlers.GET;
