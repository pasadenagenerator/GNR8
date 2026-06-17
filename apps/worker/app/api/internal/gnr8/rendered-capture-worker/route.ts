import { renderedCaptureWorkerRouteHandlers } from "@/gnr8/rendered-capture-worker-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const POST = renderedCaptureWorkerRouteHandlers.POST;
