import { createConfiguredStackiSessionRoutes } from "@/gnr8/stacki/stacki-session-composition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const POST = createConfiguredStackiSessionRoutes().POST;
