import { createOpenproviderDomainAvailabilityRouteHandlers } from "@/app/api/gnr8/admin/providers/openprovider/domain-availability/openprovider-domain-availability-route-handlers";

const handlers = createOpenproviderDomainAvailabilityRouteHandlers();

export const GET = handlers.GET;
