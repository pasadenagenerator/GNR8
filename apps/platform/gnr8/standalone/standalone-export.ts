import 'server-only';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import postcss, {type Root} from 'postcss';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { type StackiCandidateSelection } from '../stacki/stacki-candidate-selection';
import { selectStackiCandidateSource } from '../stacki/stacki-candidate-source';
import { isOwnedRetainedRuntimeScript } from '../../src/public-site/owned-retained-runtime';
import { readContactSchema, CONTACT_ACTION } from '../contact/contact-form';
import type { PublishedContact } from '../contact/contact-submission';
import { isContactEmail } from '@gnr8/runtime-contracts';
import { STANDALONE_TRANSFORM_VERSION, parsePublicationSourceSelection, type StoredSourceSelection, type ContactPolicy } from './publication-contract';
import { createAstroStaticSiteSourceSnapshot } from '../output-adapters/astro-static-site-workspace-preparation';
import { stableStringify } from '../runtime/deterministic';

export type ExportFile = { path:string; body:Buffer };
export type RetainedExportAsset = {path:string;sourceSha256:string;mediaType:string;body:Buffer};
export const STANDALONE_EXPORT_VERSION='gnr8-standalone:v3';
// Bump when exporter logic changes bytes without changing a retained template.

const sha=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
export type StandaloneExportInput = Parameters<typeof selectStackiCandidateSource>[0] & {
 selection:StackiCandidateSelection;
 sourceArtifact:{id:string;sha256:string};
 assets:RetainedExportAsset[];
 contact?:{recipient:string;confirmed:true;policy?:ContactPolicy};
};

/** Called after existing source/capture ownership checks. No generation, URL
 * fetches, draft-head selection, provider writes or secrets enter this export. */
export type StoredStandaloneExportInput = Pick<StandaloneExportInput,'baseline'|'sourceArtifact'|'assets'|'contact'> & {selection:StoredSourceSelection};
export async function exportStandaloneProject(input:StandaloneExportInput|StoredStandaloneExportInput) {
 const selection=parsePublicationSourceSelection(input.selection);
 let selected:{files:ExportFile[];sourceSnapshot:ReturnType<typeof createAstroStaticSiteSourceSnapshot>;binding:{canonicalRelation:string}};
 if('checkpoint' in input){
 if(stableStringify(selection.scope)!==stableStringify(input.scope)||selection.revision!==input.expectedRevision||selection.sha256!==input.expectedSha256)
  throw Error('standalone_selection_mismatch');
 selected=selectStackiCandidateSource(input);
 }else {
 const files=input.baseline.map(f=>({path:f.path,body:Buffer.from(f.base64,'base64')}));
 selected={files,sourceSnapshot:createAstroStaticSiteSourceSnapshot(files),binding:{canonicalRelation:'stored-generated-source:v1'}};
 }
 if(input.contact&&(!input.contact.confirmed||!isContactEmail(input.contact.recipient)))throw Error('standalone_contact_unconfirmed');
 const sourcePackage=selected.files.find(f=>f.path==='package.json');
 if(!sourcePackage)throw Error('standalone_toolchain_unverified');
 let sourceToolchain:{dependencies?:{astro?:string};engines?:{node?:string}};
 try{sourceToolchain=JSON.parse(sourcePackage.body.toString('utf8'));}catch{throw Error('standalone_toolchain_unverified');}
 const astro7=sourceToolchain.dependencies?.astro==='7.4.4'&&sourceToolchain.engines?.node==='26.13.0';
 if(!astro7&&sourceToolchain.dependencies?.astro!=='5.18.2')throw Error('standalone_toolchain_transform_unsupported');
 const nodeMajor=astro7?'26':'22';
 const templateRoot=[join(process.cwd(),'gnr8/standalone/templates'),join(process.cwd(),'apps/platform/gnr8/standalone/templates'),join(process.cwd(),'../platform/gnr8/standalone/templates')].find(p=>existsSync(join(p,'contact-runtime.mjs')));
 if(!templateRoot)throw Error('standalone_templates_not_packaged');
 const templates=await Promise.all(['package.json','package-lock.json','optimize.mjs'].map(async name=>({name,body:await readFile(join(templateRoot,astro7&&name!=='optimize.mjs'?name.replace('.json','.astro7.json'):name))})));
 const runtimeSource=await readFile(join(templateRoot,'contact-runtime.mjs'));
 const identity=sha(stableStringify({version:STANDALONE_EXPORT_VERSION,transformVersion:STANDALONE_TRANSFORM_VERSION,selection,source:input.sourceArtifact,contact:input.contact??null,
  sourceSnapshot:selected.sourceSnapshot,templates:templates.map(t=>({name:t.name,sha256:sha(t.body)})),runtime:sha(Buffer.from(runtimeSource)),
  assets:input.assets.map(a=>({path:a.path,sourceSha256:a.sourceSha256,sha256:sha(a.body),mediaType:a.mediaType})).sort((a,b)=>a.path.localeCompare(b.path))}));
 const assets=new Map<string,RetainedExportAsset>();
 for(const asset of input.assets){
  if(!/^\/api\/gnr8\/runtime\/preview-assets\/[A-Za-z0-9_-]+\/[a-f0-9-]+\/(?:[A-Za-z0-9_@+.-]+\/)*[A-Za-z0-9_@+.-]+$/.test(asset.path)||asset.path.split('/').some(s=>s==='.'||s==='..')||assets.has(asset.path)||! /^[a-f0-9]{64}$/.test(asset.sourceSha256)||asset.body.length>12*1024*1024)throw Error('standalone_asset_invalid');
  assets.set(asset.path,asset);
 }
 const mapping=new Map([...assets].map(([path,a])=>[path,`/_assets/${identity}/${sha(path)}${a.mediaType.split(';')[0]==='text/css'?'.css':extension(path)}`]));
 // Inline materialized captures (small sites) use exactly the same identity map.
 for(const f of input.baseline.filter(f=>f.path.startsWith('public/api/gnr8/runtime/preview-assets/'))){
  const path=f.path.slice(6);if(!mapping.has(path)){const body=Buffer.from(f.base64,'base64');assets.set(path,{path,body,sourceSha256:sha(body),mediaType:path.endsWith('.css')?'text/css':'application/octet-stream'});mapping.set(path,`/_assets/${identity}/${sha(path)}${extension(path)}`);}
 }
 // Generated (non-Stacki) themes and local public files share the same closed,
 // versioned asset map as retained capture dependencies.
 for(const file of selected.files.filter(f=>f.path.startsWith('public/')&&!f.path.startsWith('public/api/'))){
  if(!/^public\/(?:[A-Za-z0-9_@+.-]+\/)*[A-Za-z0-9_@+.-]+\.(?:css|js|json|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|avif)$/i.test(file.path)||file.path.split('/').some(p=>p==='.'||p==='..'))throw Error('standalone_file_not_allowed');
  const path='/'+file.path.slice(7),mediaType=file.path.endsWith('.css')?'text/css':file.path.endsWith('.js')?'application/javascript':file.path.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
  assets.set(path,{path,body:file.body,sourceSha256:sha(file.body),mediaType});mapping.set(path,`/_assets/${identity}/${sha(path)}${extension(path)}`);
 }
 const rewrite=(text:string)=>{
  for(const [from,to] of [...mapping].sort((a,b)=>b[0].length-a[0].length))text=text.split(from).join(to);
  text=text.split(CONTACT_ACTION).join('/api/contact');
  if(/\/api\/gnr8\//.test(text)||/node_modules\/\.gnr8-retained-assets/.test(text))throw Error('standalone_unresolved_gnr8_dependency');
  return text;
 };
 const sourceText=selected.files.filter(f=>f.path.endsWith('.astro')).map(f=>f.body.toString()).join('\n');
 const prunedCss:Array<{path:string;selector:string;property:string}>=[];
 const correctedCss:Array<{path:string;property:string;before:string;after:string}>=[];
 const files:ExportFile[]=[];const forms:Record<string,PublishedContact>={};const routes:string[]=[];
 for(const file of selected.files){
  if(['astro.config.mjs','package.json','package-lock.json','pnpm-lock.yaml'].includes(file.path))continue;
  if(file.path.startsWith('public/'))continue;
  if(!/^(src\/pages\/(?:[A-Za-z0-9_@+-]+\/)*index\.astro|(?:public\/)?src\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:png|jpe?g|webp|svg)|public\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:png|jpe?g|webp|svg))$/.test(file.path))throw Error('standalone_file_not_allowed');
  if(file.path.endsWith('.astro')){
   const path='/'+file.path.slice(10).replace(/index\.astro$/,'').replace(/\/$/,'');routes.push(path);
   const original=file.body.toString('utf8');const schema=readContactSchema(original);
   if(original.includes('data-gnr8-contact="v1"')&&!schema)throw Error('standalone_contact_schema_invalid');
   if(schema&&!input.contact)throw Error('standalone_contact_unconfirmed');
   // Retained assets still use the protected GNR8 preview URL in editable
   // source. Classify functions only after the verified asset map has replaced
   // those URLs; an image is not a dynamic API dependency.
   const mappedHtml=rewrite(original);
   const exportedHtml=mappedHtml.replace(/(\bwidth\s*:\s*)66,666%/g,(_match,prefix:string)=>{
    correctedCss.push({path:file.path,property:'width',before:'66,666%',after:'66.666%'});
    return prefix+'66.666%';
   });
   rejectUnsupportedFunctions(exportedHtml);
   if(schema)forms[path]={...schema,pagePath:path,recipient:input.contact!.recipient,siteId:selection.scope.siteId,siteVersionId:selection.scope.siteVersionId,artifactId:input.sourceArtifact.id,artifactSha256:input.sourceArtifact.sha256};
   files.push({path:file.path,body:Buffer.from(exportedHtml)});
  }else files.push(file);
 }
 for(const [path,asset] of assets){
  const textAsset=/^(text\/|application\/(javascript|json)|image\/svg)/.test(asset.mediaType)||/\.(css|svg|js)$/.test(path);
  let text=asset.body.toString('utf8');
  if(asset.mediaType.split(';')[0]==='text/css'){
   const sheet=postcss.parse(text);
   preserveMonoContactEmailStyles(sheet);
   sheet.walkDecls('background-image',decl=>{
    const selector=decl.parent?.type==='rule'?decl.parent.selector:'';
    const inactiveLeaflet=/^\.leaflet-(?:control-layers-toggle|retina \.leaflet-control-layers-toggle|control-geocoder-icon|control-geocoder-throbber \.leaflet-control-geocoder-icon)$/.test(selector)&&!/(?:class=["'][^"']*leaflet-|L\.map\(|leaflet\.js)/.test(sourceText);
    const inactiveGoogle=selector==='.map .infoWindow .directions:before,.osmap .infoWindow .directions:before'&&!/infoWindow|google\.maps/.test(sourceText);
    if(inactiveLeaflet||inactiveGoogle){prunedCss.push({path,selector,property:decl.prop});decl.remove();}
   });text=sheet.toString();
  }
  files.push({path:'public'+mapping.get(path)!,body:textAsset?Buffer.from(rewrite(text)):asset.body});
 }
 const contactRequired=Object.keys(forms).length>0;
 files.push(...templates.map(t=>({path:t.name==='optimize.mjs'?'scripts/optimize.mjs':t.name,body:t.body})));
 // Astro 7's default LightningCSS minifier rejects retained legacy CSS hacks.
 // Keep retained legacy CSS syntax buildable without discarding declarations.
 files.push({path:'astro.config.mjs',body:Buffer.from(`import {defineConfig} from "astro/config";\nexport default defineConfig({output:"static",compressHTML:true${astro7?',vite:{build:{cssMinify:false}}':''}});\n`)});
 // Bundling may rename the export binding. Import the retained runtime via a
 // literal relative module, letting Vercel bundle the two dependency-free files.
 if(contactRequired){
 files.push({path:'server/contact-runtime.mjs',body:Buffer.from(runtimeSource)});
 files.push({path:'api/contact.mjs',body:Buffer.from(`import {createStandaloneContactHandler} from '../server/contact-runtime.mjs';\nexport default {fetch:createStandaloneContactHandler(${JSON.stringify({siteKey:selection.scope.siteId,forms,...(input.contact?.policy?{policy:input.contact.policy}:{})})})};\n`)});
 }
 files.push({path:'vercel.json',body:Buffer.from(JSON.stringify({framework:'astro',installCommand:'npm ci --no-audit --no-fund',buildCommand:'npm run build',outputDirectory:'dist',git:{deploymentEnabled:false},regions:['fra1'],...(contactRequired?{functions:{'api/contact.mjs':{maxDuration:30}}}:{}),headers:[{source:'/_assets/(.*)',headers:[{key:'Cache-Control',value:'public,max-age=31536000,immutable'}]},{source:'/_media/(.*)',headers:[{key:'Cache-Control',value:'public,max-age=31536000,immutable'}]},{source:'/api/contact',headers:[{key:'Cache-Control',value:'private,no-store'}]}]},null,2))});
 files.push({path:'.gitignore',body:Buffer.from('node_modules/\ndist/\n.astro/\n.vercel/\n.env*\noptimization-report.json\n')});
 files.push({path:'README.md',body:Buffer.from(`# Standalone website\n\nBuild: Node ${nodeMajor}, npm ci, npm run build. All captured inputs are in this repository. No GNR8 access or credentials are needed.\n\n${contactRequired?`Contact policy: ${input.contact?.policy?JSON.stringify(input.contact.policy):'legacy owner policy; CONTACT_MAX_CLAIMS is required'}. Payload retention is configured separately from permanent deduplication status/hash. Mailbox/provider retention remains the owner responsibility. Contact requires an owner-controlled durable Upstash Redis database (no eviction), an independently authorized Resend sender/key, and production environment variables CONTACT_REDIS_URL, CONTACT_REDIS_TOKEN, CONTACT_RATE_SECRET, CONTACT_RESEND_KEY, CONTACT_FROM and CONTACT_ALLOWED_HOSTS${input.contact?.policy?'':', plus CONTACT_MAX_CLAIMS (legacy lifetime cap; maximum 99999)' }. Secrets are entered only in Vercel, never Git. No automatic retry of pending/unknown mail. Contact storage includes personal form data; the owner must define access and retention before activation. No service is provisioned by this export.`:'This site has no contact function and requires no contact secrets or services.'}\n\nVercel: dedicated project, Node ${nodeMajor}, production variables, automatic Git deployments disabled. Verify project autoAssignCustomDomains=false before creating the production staged deployment. For REST creation, use the verified projectSettings and exact Git SHA; do not send the unsupported skipAutoAssignDomains field. Review its exact ID, commit and configuration/environment fingerprint. Publish promotes that deployment without a rebuild. A rebuild or configuration/environment change requires another review.\n\nRecovery without GNR8: in Vercel select the previously serving production deployment and Instant Rollback. Keep its environment and external contact resources available. The first domain transfer between projects additionally requires restoring the previous project domain binding; Instant Rollback alone does not reverse a project transfer. DNS/TLS/wildcard prerequisites must be verified before transfer.\n`)});
 validateStaticClosure(files,routes);
 const manifest={format:STANDALONE_EXPORT_VERSION,selection,sourceArtifact:input.sourceArtifact,sourceSnapshot:selected.sourceSnapshot,canonicalRelation:selected.binding.canonicalRelation,transformIdentity:identity,prunedCss,correctedCss,routes:routes.sort(),contact:contactRequired?{recipient:input.contact!.recipient,paths:Object.keys(forms),...(input.contact?.policy?{policy:input.contact.policy}:{})}:null,assets:[...assets.values()].map(a=>({sourcePath:a.path,sourceSha256:a.sourceSha256,verifiedResponseSha256:sha(a.body),exportPath:'public'+mapping.get(a.path)!})),files:files.map(f=>({path:f.path,sha256:sha(f.body),bytes:f.body.length})).sort((a,b)=>a.path.localeCompare(b.path))};
 const manifestBytes=Buffer.from(stableStringify(manifest));const manifestSha256=sha(manifestBytes);
 files.push({path:'source-manifest.json',body:manifestBytes});
 return {files,manifest,manifestSha256,contactRequired};
}
function extension(path:string){const value=path.match(/\.[a-zA-Z0-9]{1,8}$/)?.[0];return value??'.bin';}
/** Mono captured email as type=text. The supported contact projection changes
 * it to type=email for native validation; retain its source styles at the same
 * specificity, only within the projected form. Keep declaration order intact. */
export function preserveMonoContactEmailStyles(sheet:Root){
 sheet.walkRules(rule=>{
  const additions=rule.selectors.filter(selector=>/^\.form input\[type=(?:"text"|'text'|text)\](?::(?:focus|hover|active|disabled))?$/.test(selector))
   .map(selector=>selector.replace('.form ','.form:where([data-gnr8-contact="v1"]) ').replace(/\[type=(?:"text"|'text'|text)\]/,'[type="email"]'));
  if(additions.length)rule.selectors=[...new Set([...rule.selectors,...additions])];
 });
}
/** Reject missing local dependency closure before a byte reaches GitHub. */
export function validateStaticClosure(files:ExportFile[],routes:string[]){
 const paths=new Set(files.filter(f=>f.path.startsWith('public/')).map(f=>'/'+f.path.slice(7)));
 const check=(value:string,base='/')=>{
  if(!value||/^(data:|#|mailto:|tel:)/.test(value))return;
  const url=new URL(value,'https://standalone.invalid'+base);
  if(url.origin!=='https://standalone.invalid')throw Error('standalone_external_loaded_dependency:'+url.hostname);
  if(url.pathname==='/api/contact'||paths.has(decodeURI(url.pathname))||routes.includes(url.pathname.replace(/\/$/,'')||'/'))return;
  throw Error('standalone_missing_dependency:'+url.pathname);
 };
 for(const file of files){
  const text=file.body.toString('utf8');
  if(file.path.endsWith('.astro')){
   const visit=(node:DefaultTreeAdapterMap['node'])=>{
    if('tagName' in node){for(const a of node.attrs){if(['src','poster','action'].includes(a.name)||a.name==='href'&&['link','use'].includes(node.tagName))check(a.value);if(a.name==='srcset')for(const v of a.value.split(','))check(v.trim().split(/\s+/)[0]!);}}
    if('childNodes'in node)node.childNodes.forEach(visit);
   };visit(parse(text));
  }
  if(file.path.endsWith('.css'))for(const m of text.matchAll(/@import\s+["']([^"']+)["']/g))check(m[1]!,file.path.startsWith('public/')?'/'+file.path.slice(7):'/');
  if(file.path.endsWith('.css')||file.path.endsWith('.astro'))for(const m of text.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g))check(m[1]!,file.path.startsWith('public/')?'/'+file.path.slice(7):'/');
 }
}

/** Do not silently export unsupported forms or server endpoints. The generated
 * source was already validated by the source loader; this checks publication capability. */
export function rejectUnsupportedFunctions(html:string){
 let forms=0;
 const visit=(node:DefaultTreeAdapterMap['node'])=>{
  if('tagName' in node){
   if(node.tagName==='script'&&!isOwnedRetainedRuntimeScript(node))throw Error('standalone_unsupported_dynamic_feature');
   if(node.attrs.some(a=>/^on[a-z]/i.test(a.name)||['href','src','action'].includes(a.name)&&/^\s*javascript:/i.test(a.value)))throw Error('standalone_unsupported_dynamic_feature');
   if(node.tagName==='form')forms++;
   if(node.tagName==='form'&&!node.attrs.some(a=>a.name==='data-gnr8-contact'&&a.value==='v1'))throw Error('standalone_unsupported_form');
   if(node.attrs.some(a=>['src','action'].includes(a.name)&&/\/(?:api|auth|checkout|cart)(?:\/|\?|$)/i.test(a.value)&&
    !(node.tagName==='form'&&a.name==='action'&&[CONTACT_ACTION,'/api/contact'].includes(a.value.split('?')[0]!))))throw Error('standalone_unsupported_dynamic_feature');
  }
  if('childNodes' in node)node.childNodes.forEach(visit);
 };visit(parse(html));
 if(forms&&!readContactSchema(html))throw Error('standalone_contact_schema_invalid');
}
