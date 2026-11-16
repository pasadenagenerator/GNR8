import { createStandaloneRoutes } from '@/gnr8/standalone/publication-routes';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export const {GET,POST}=createStandaloneRoutes();
