import {existsSync} from 'node:fs';
import {join} from 'node:path';
import { inngest } from '@/gnr8/inngest/client';
export const standalonePublicationJob=inngest.createFunction({id:'standalone-publication-job',retries:0,concurrency:{limit:1,key:'event.data.input.selection.scope.siteId'}},{event:'gnr8/standalone.prepare.requested'},async({event})=>{
 const npm=[join(process.cwd(),'node_modules/npm/bin/npm-cli.js'),join(process.cwd(),'apps/worker/node_modules/npm/bin/npm-cli.js')].find(existsSync);
 if(!npm)throw Error('standalone_npm_not_packaged');
 process.env.GNR8_NPM_CLI_PATH=npm;
 const {runStandalonePublication}=await import('@/gnr8/standalone/publication-worker');
 return runStandalonePublication(event.data);
});
