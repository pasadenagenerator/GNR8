import { createProviderHandoffExecutionJobPreviewRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/execution-job-preview/provider-handoff-execution-job-preview-route-handlers";

const handlers = createProviderHandoffExecutionJobPreviewRouteHandlers();

export const GET = handlers.GET;
