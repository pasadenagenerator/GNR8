import { createHostingDomainRecheckRouteHandlers } from "@/app/api/gnr8/admin/hosting-operations/[siteId]/domains/[domainId]/recheck/hosting-domain-recheck-route-handlers";

const handlers = createHostingDomainRecheckRouteHandlers();

export const POST = handlers.POST;
