import { createBrandGuideRoutes } from '@/gnr8/brand/brand-guide-routes';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export const {GET,POST}=createBrandGuideRoutes();
