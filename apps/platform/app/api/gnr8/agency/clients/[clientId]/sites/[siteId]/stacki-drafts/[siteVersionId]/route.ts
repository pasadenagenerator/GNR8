import { createConfiguredStackiDraftRoutes } from "@/gnr8/stacki/stacki-draft-composition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handlers = createConfiguredStackiDraftRoutes();
export const GET = handlers.GET;
export const POST = handlers.POST;
