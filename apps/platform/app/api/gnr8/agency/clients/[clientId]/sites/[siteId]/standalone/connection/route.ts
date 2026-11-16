import {createPublicationConnectionRoutes} from '@/gnr8/standalone/publication-connection-routes';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const {GET,POST}=createPublicationConnectionRoutes();
