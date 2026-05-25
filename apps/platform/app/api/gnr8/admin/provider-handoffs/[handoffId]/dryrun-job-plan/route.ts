import { createProviderHandoffDryRunJobPlanRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/dryrun-job-plan/provider-handoff-dryrun-job-plan-route-handlers";

const handlers = createProviderHandoffDryRunJobPlanRouteHandlers();

export const GET = handlers.GET;
