import { createProviderHandoffExecutionSafetyManifestRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/execution-safety-manifest/provider-handoff-execution-safety-manifest-route-handlers";

const handlers = createProviderHandoffExecutionSafetyManifestRouteHandlers();

export const GET = handlers.GET;
