import {
  createRenderedCaptureWorkerFetchHandler,
} from "@/gnr8/rendered-capture-worker-server/fetch-handler";
import type {
  RenderedCaptureWorkerRequest,
  RenderedCaptureWorkerResponse,
} from "@/gnr8/import-rendered-capture-worker/worker-contract";

type ExecuteRequest = (input: { request: RenderedCaptureWorkerRequest }) => Promise<RenderedCaptureWorkerResponse>;

export function createWorkerRenderedCaptureRouteHandlers(input?: {
  executeRequest?: ExecuteRequest;
  sharedToken?: string;
  logger?: (event: { event: string; [key: string]: unknown }) => void;
}) {
  const handler = createRenderedCaptureWorkerFetchHandler(input);

  return {
    POST: handler,
  };
}

export const renderedCaptureWorkerRouteHandlers = createWorkerRenderedCaptureRouteHandlers();
