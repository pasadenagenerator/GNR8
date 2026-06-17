import { createRenderedCaptureWorkerReadinessRouteHandlers } from "@/app/api/gnr8/admin/rendered-capture-worker/readiness/rendered-capture-worker-readiness-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createRenderedCaptureWorkerReadinessRouteHandlers();

export const GET = handlers.GET;
