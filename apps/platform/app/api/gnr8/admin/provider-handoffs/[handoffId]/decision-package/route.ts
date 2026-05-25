import { createProviderHandoffDecisionPackageRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/decision-package/provider-handoff-decision-package-route-handlers";

const handlers = createProviderHandoffDecisionPackageRouteHandlers();

export const GET = handlers.GET;
