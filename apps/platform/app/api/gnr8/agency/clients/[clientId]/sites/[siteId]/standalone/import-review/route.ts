import { createImportReviewRoutes } from '@/gnr8/standalone/import-review-routes';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const {GET,POST}=createImportReviewRoutes();
