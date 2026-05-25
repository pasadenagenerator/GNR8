import { createProviderHandoffAuthorizationRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/authorization/provider-handoff-authorization-route-handlers";

const handlers = createProviderHandoffAuthorizationRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
