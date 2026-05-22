import { createProviderHandoffGovernanceTimelineRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/governance-timeline/provider-handoff-governance-timeline-route-handlers";

const handlers = createProviderHandoffGovernanceTimelineRouteHandlers();

export const GET = handlers.GET;
