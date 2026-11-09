import 'server-only';
import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseServiceRoleClient} from '@/src/supabase/service-role-server';
import {ASTRO_CANDIDATE_OBJECT_BUCKET_ENV} from '../output-adapters/astro-production-candidate-object-store';
import type {AstroExportResource} from '../output-adapters/astro-export-resources';
import type {writeGeneratedArtifactGitArchive} from './generated-artifact-git-archive';
import {stableStringify} from '../runtime/deterministic';

export type GeneratedGitRef=Awaited<ReturnType<typeof writeGeneratedArtifactGitArchive>>;
type FileRef={path:string;bytes:number;sha256:string};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const digest=/^[a-f0-9]{64}$/;
const commit=/^[a-f0-9]{40}$/;
const hash=(body:Uint8Array)=>createHash('sha256').update(body).digest('hex');
function invalid():never{throw Error('GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED');}
function withoutWorkspaceBodies(manifest:Record<string,unknown>):Record<string,unknown>{
  const {cmsSlotSources:_cmsSlotSources,sourceMigrationPayload:_sourceMigrationPayload,
    ...withoutSlotSources}=manifest;
  const workspace=withoutSlotSources.generatedOutputSourceWorkspace;
  if(!workspace||typeof workspace!=='object'||Array.isArray(workspace))return withoutSlotSources;
  const files=(workspace as Record<string,unknown>).files;
  if(!Array.isArray(files))return withoutSlotSources;
  return {...withoutSlotSources,generatedOutputSourceWorkspace:{...workspace,files:files.map(file=>{
    if(!file||typeof file!=='object'||Array.isArray(file))invalid();
    const {contents:_contents,base64:_base64,...metadata}=file as Record<string,unknown>;
    return metadata;
  })}};
}
function canonical(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b))
    .map(([key,entry])=>`${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`;
  return JSON.stringify(value);
}

/** Store route identity only after the immutable Git descriptor matches every
 * byte. The caller keeps the full manifest's non-file metadata separately. */
export function generatedArtifactReferenceColumns(input:{siteVersionId:string;
  htmlByPath:Record<string,string>;compiledTokenStyles:string;manifest:Record<string,unknown>}){
  const ref=input.manifest.generatedGitArchive as GeneratedGitRef|undefined;
  if(!ref)return {htmlByPath:input.htmlByPath,compiledTokenStyles:input.compiledTokenStyles,
    manifest:input.manifest};
  if(Object.hasOwn(input.manifest,'sourceMigrationPayload')){
    const payload=input.manifest.sourceMigrationPayload;
    if(!payload||typeof payload!=='object'||Array.isArray(payload)||
      input.manifest.sourceMigrationPayloadSha256!==hash(Buffer.from(stableStringify(payload))))invalid();
  }
  if(ref.manifestPath!==`generated/${input.siteVersionId}/.gnr8-generated-manifest.json`||
    !Array.isArray(ref.routes)||ref.routes.length!==Object.keys(input.htmlByPath).length||
    new Set(ref.routes.map(file=>file.route)).size!==ref.routes.length)invalid();
  const htmlByPath:Record<string,string>={};
  for(const file of ref.routes){
    if(!Object.hasOwn(input.htmlByPath,file.route)||
      file.path!==`generated/${input.siteVersionId}/html/${hash(Buffer.from(file.route))}.html`||
      file.bytes!==Buffer.byteLength(input.htmlByPath[file.route])||
      file.sha256!==hash(Buffer.from(input.htmlByPath[file.route])))invalid();
    htmlByPath[file.route]=file.sha256;
  }
  if(ref.styles.path!==`generated/${input.siteVersionId}/compiled-token-styles.css`||
    ref.styles.bytes!==Buffer.byteLength(input.compiledTokenStyles)||
    ref.styles.sha256!==hash(Buffer.from(input.compiledTokenStyles)))invalid();
  const {generatedGitArchive:_ref,...manifestWithoutRef}=input.manifest;
  const manifestBody=Buffer.from(JSON.stringify(manifestWithoutRef));
  if(ref.runtimeManifest.path!==`generated/${input.siteVersionId}/runtime-manifest.json`||
    ref.runtimeManifest.bytes!==manifestBody.length||
    ref.runtimeManifest.sha256!==hash(manifestBody))invalid();
  return {htmlByPath,compiledTokenStyles:'',manifest:withoutWorkspaceBodies(input.manifest)};
}

/** Private serving derivative of one verified generated Git commit. */
export class GeneratedArtifactGitCache{
  private bucketPromise?:Promise<ReturnType<SupabaseClient['storage']['from']>>;
  constructor(private client:Pick<SupabaseClient,'storage'>|null=getSupabaseServiceRoleClient(),
    private bucketName=process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV]??''){}
  private key(ref:GeneratedGitRef,versionId:string,file:FileRef){
    if(!uuid.test(versionId)||!uuid.test(ref.scope?.agencyId??'')||
      !uuid.test(ref.scope?.clientId??'')||!uuid.test(ref.scope?.siteId??'')||
      !commit.test(ref.commit)||!digest.test(ref.manifestSha256)||
      ref.manifestPath!==`generated/${versionId}/.gnr8-generated-manifest.json`||
      !digest.test(file.sha256)||!Number.isSafeInteger(file.bytes)||
      file.bytes<0||file.bytes>128*1024*1024||
      !file.path.startsWith(`generated/${versionId}/`))invalid();
    const {agencyId,clientId,siteId}=ref.scope;
    return `generated-git-cache/v1/${agencyId}/${clientId}/${siteId}/${versionId}/${ref.commit}/${file.sha256}`;
  }
  private async bucket(){
    this.bucketPromise??=(async()=>{
      if(!this.client||!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(this.bucketName))invalid();
      const info=await this.client.storage.getBucket(this.bucketName);
      if(info.error||info.data?.public!==false)invalid();
      return this.client.storage.from(this.bucketName);
    })();
    return this.bucketPromise;
  }
  async read(ref:GeneratedGitRef,versionId:string,file:FileRef):Promise<Buffer>{
    const key=this.key(ref,versionId,file);
    const result=await (await this.bucket()).download(key);
    if(result.error||!result.data||result.data.size!==file.bytes)invalid();
    const body=Buffer.from(await result.data.arrayBuffer());
    if(body.length!==file.bytes||hash(body)!==file.sha256)invalid();
    return body;
  }
  async readRoute(ref:GeneratedGitRef,versionId:string,route:string):Promise<string>{
    const file=ref.routes.find(entry=>entry.route===route);
    if(!file||ref.routes.filter(entry=>entry.route===route).length!==1||
      file.path!==`generated/${versionId}/html/${hash(Buffer.from(route))}.html`)invalid();
    return (await this.read(ref,versionId,file)).toString('utf8');
  }
  async hydrate(ref:GeneratedGitRef,versionId:string,requestedRoute?:string){
    if(!Array.isArray(ref.routes)||ref.routes.length<1||ref.routes.length>10000||
      new Set(ref.routes.map(file=>file.route)).size!==ref.routes.length)invalid();
    const routes=requestedRoute===undefined ? ref.routes.map(file=>file.route)
      : [ref.routes.some(file=>file.route===requestedRoute)?requestedRoute:'/'];
    const htmlByPath:Record<string,string>={};
    for(let offset=0;offset<routes.length;offset+=8){
      const loaded=await Promise.all(routes.slice(offset,offset+8).map(async route=>
        [route,await this.readRoute(ref,versionId,route)] as const));
      for(const [route,html] of loaded)htmlByPath[route]=html;
    }
    const compiledTokenStyles=(await this.read(ref,versionId,ref.styles)).toString('utf8');
    return {htmlByPath,compiledTokenStyles};
  }
  async hydrateResources(ref:GeneratedGitRef,versionId:string):Promise<AstroExportResource[]>{
    if(!ref.resources?.length||new Set(ref.resources.map(file=>file.sourcePath)).size!==ref.resources.length)invalid();
    const files:AstroExportResource[]=[];
    for(let offset=0;offset<ref.resources.length;offset+=8){
      const loaded=await Promise.all(ref.resources.slice(offset,offset+8).map(async file=>{
        if(file.path!==`generated/${versionId}/resources/${Buffer.from(file.sourcePath).toString('base64url')}-${file.sha256}`)invalid();
        const body=await this.read(ref,versionId,file);
        return {path:file.sourcePath,mediaType:file.mediaType,sizeBytes:file.bytes,
          sha256:file.sha256,base64:body.toString('base64')};
      }));
      files.push(...loaded);
    }
    return files;
  }
  async restoreManifest(ref:GeneratedGitRef,versionId:string,stored:Record<string,unknown>){
    if(ref.runtimeManifest.path!==`generated/${versionId}/runtime-manifest.json`)invalid();
    let original:unknown;
    try{original=JSON.parse((await this.read(ref,versionId,ref.runtimeManifest)).toString('utf8'));}
    catch{invalid();}
    if(!original||typeof original!=='object'||Array.isArray(original))invalid();
    const {generatedGitArchive:storedRef,...storedWithoutRef}=stored;
    if(canonical(storedRef)!==canonical(ref)||
      canonical(withoutWorkspaceBodies(original as Record<string,unknown>))!==canonical(storedWithoutRef))invalid();
    return {...original,generatedGitArchive:ref} as Record<string,unknown>;
  }
  async prepare(ref:GeneratedGitRef,versionId:string,input:{htmlByPath:Record<string,string>;
    compiledTokenStyles:string;manifest:Record<string,unknown>;exportedFiles?:AstroExportResource[]}):Promise<void>{
    if(ref.routes.length!==Object.keys(input.htmlByPath).length||
      new Set(ref.routes.map(file=>file.route)).size!==ref.routes.length)invalid();
    const files:Array<{file:FileRef;body:Buffer}>=ref.routes.map(file=>{
      if(!Object.hasOwn(input.htmlByPath,file.route))invalid();
      return {file,body:Buffer.from(input.htmlByPath[file.route],'utf8')};
    });
    files.push({file:ref.styles,body:Buffer.from(input.compiledTokenStyles,'utf8')});
    files.push({file:ref.runtimeManifest,body:Buffer.from(JSON.stringify(input.manifest))});
    if(Boolean(ref.resources)!==Boolean(input.exportedFiles)||
      (ref.resources?.length??0)!==(input.exportedFiles?.length??0))invalid();
    for(const resource of input.exportedFiles??[]){
      const file=ref.resources?.find(entry=>entry.sourcePath===resource.path);
      if(!file||ref.resources?.filter(entry=>entry.sourcePath===resource.path).length!==1||
        file.path!==`generated/${versionId}/resources/${Buffer.from(resource.path).toString('base64url')}-${resource.sha256}`||
        file.mediaType!==resource.mediaType||file.bytes!==resource.sizeBytes||file.sha256!==resource.sha256)invalid();
      files.push({file,body:Buffer.from(resource.base64,'base64')});
    }
    const bucket=await this.bucket();
    const seen=new Set<string>();
    const unique:Array<{file:FileRef;body:Buffer;key:string}>=[];
    for(const {file,body} of files){
      const key=this.key(ref,versionId,file);
      if(body.length!==file.bytes||hash(body)!==file.sha256)invalid();
      if(seen.has(key))continue;
      seen.add(key);
      unique.push({file,body,key});
    }
    for(let offset=0;offset<unique.length;offset+=8){
      const results=await Promise.allSettled(unique.slice(offset,offset+8).map(async({file,body,key})=>{
        let uploadFailure='';
        for(let attempt=0;attempt<3;attempt++){
          // A cache object can exist with stale bytes. Repair it only after
          // exact readback fails; Git remains the immutable source of truth.
          try{
            const result=await bucket.upload(key,body,{upsert:attempt>0,contentType:'application/octet-stream',cacheControl:'3600'});
            uploadFailure=result.error?.message??'';
          }catch(error){uploadFailure=error instanceof Error?error.message:String(error);}
          try{await this.read(ref,versionId,file);return;}catch{
            if(attempt<2)await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
          }
        }
        throw Error(`GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED:${file.path}:${uploadFailure||'readback_failed'}`);
      }));
      for(const result of results)if(result.status==='rejected')throw result.reason;
    }
  }
}
