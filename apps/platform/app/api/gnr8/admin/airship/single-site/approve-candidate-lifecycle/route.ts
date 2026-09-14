import { createAirshipCandidateLifecycleApprovalRouteHandlers } from "./airship-candidate-lifecycle-approval-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createAirshipCandidateLifecycleApprovalRouteHandlers();

export const POST = handlers.POST;
