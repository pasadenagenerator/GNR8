import { createPublicOutputRouteHandlers } from '@/gnr8/output-adapters/public-output-route-handlers';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const handlers = createPublicOutputRouteHandlers();
export const GET = handlers.preview;
