import { createOpenproviderDnsRouteHandlers } from "@/app/api/gnr8/admin/providers/openprovider/dns/openprovider-dns-route-handlers";

const handlers = createOpenproviderDnsRouteHandlers();

export const GET = handlers.GET;
