import { createProviderHandoffWorkerEnvelopePreviewRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/worker-envelope-preview/provider-handoff-worker-envelope-preview-route-handlers";

const handlers = createProviderHandoffWorkerEnvelopePreviewRouteHandlers();

export const GET = handlers.GET;
