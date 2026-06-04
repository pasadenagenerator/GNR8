import { createHostingOperationsRouteHandlers } from "@/app/api/gnr8/admin/hosting-operations/[siteId]/hosting-operations-route-handlers";

const handlers = createHostingOperationsRouteHandlers();

export const GET = handlers.GET;
