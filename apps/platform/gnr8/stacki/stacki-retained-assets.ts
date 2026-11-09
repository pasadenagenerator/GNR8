import { createHash } from 'node:crypto';
import { StackiDraftError, type StackiDraftFile } from './stacki-draft-contract';
import type { StackiSourceAsset } from './stacki-source-project';

/** Captured assets are immutable source dependencies, not editable checkpoint
 * files. Their original version/path/hash remains the publication authority. */
export type StackiRuntimeAsset = { name: string; body: Buffer };
export const STACKI_RETAINED_DIRECTORY = 'node_modules/.gnr8-retained-assets';
export function retainedAssetName(path: string) { return createHash('sha256').update(path).digest('hex'); }

export function projectStackiRetainedAssets(files: StackiDraftFile[], assets: StackiSourceAsset[]): StackiDraftFile[] {
  const original = 'import { defineConfig } from "astro/config";\n\nexport default defineConfig({\n  output: "static",\n});\n';
  const config = files.find(file => file.path === 'astro.config.mjs');
  if (!config || Buffer.from(config.base64,'base64').toString() !== original)
    throw new StackiDraftError(422,'STACKI_RETAINED_CONFIG_UNSUPPORTED');
  const routes = Object.fromEntries(assets.map(asset => [asset.path,{name:retainedAssetName(asset.path),mediaType:asset.mediaType}]));
  const source = `import {defineConfig} from 'astro/config';
import {readFile} from 'node:fs/promises';
const retained = ${JSON.stringify(routes)};
export default defineConfig({output:'static',vite:{plugins:[{
 name:'gnr8-retained-assets-v1',apply:'serve',
 configureServer(server){server.middlewares.use(async(req,res,next)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  const asset=Object.hasOwn(retained,path)?retained[path]:null;
  if(!asset)return next();
  if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;return res.end();}
  try{const body=await readFile(new URL('./${STACKI_RETAINED_DIRECTORY}/'+asset.name,import.meta.url));
   res.setHeader('Content-Type',asset.mediaType);res.setHeader('X-Content-Type-Options','nosniff');
   res.setHeader('Cache-Control','private, no-store');res.end(req.method==='HEAD'?undefined:body);
  }catch{res.statusCode=503;res.end('Retained asset unavailable');}
 });}
}]}});\n`;
  return files.map(file => file.path === config.path ? {...file,base64:Buffer.from(source).toString('base64')} : file);
}
