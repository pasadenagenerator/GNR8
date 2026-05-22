import { createProviderHandoffOperatorReviewsRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/reviews/provider-handoff-operator-reviews-route-handlers";

const handlers = createProviderHandoffOperatorReviewsRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
