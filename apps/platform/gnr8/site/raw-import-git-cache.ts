import 'server-only';
import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseServiceRoleClient} from '@/src/supabase/service-role-server';
import {ASTRO_CANDIDATE_OBJECT_BUCKET_ENV} from '../output-adapters/astro-production-candidate-object-store';
import type {RawImportedSiteArtifactMetadata} from '../runtime/types';
import {readStandaloneGit,RAW_IMPORT_GIT_MAX_BYTES} from '../standalone/publication-git';
import {resolvedGitHubTarget} from '../stacki/stacki-github-config';
import {GitHubStackiStore} from '../stacki/stacki-github-store';

type Ref=NonNullable<RawImportedSiteArtifactMetadata['gitArchive']>;
type Recovery={resolveTarget:typeof resolvedGitHubTarget;
  verifyTarget:(scope:Ref['scope'] & {siteVersionId:string},
    target:NonNullable<Awaited<ReturnType<typeof resolvedGitHubTarget>>>)=>Promise<void>;
  read:typeof readStandaloneGit};
const recovery:Recovery={resolveTarget:resolvedGitHubTarget,
  verifyTarget:async(scope,target)=>new GitHubStackiStore(scope,target).verifyTarget(),read:readStandaloneGit};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const sha=/^[a-f0-9]{64}$/;
const commit=/^[a-f0-9]{40}$/;
const hash=(body:Uint8Array)=>createHash('sha256').update(body).digest('hex');
function invalid():never{throw Error('RAW_IMPORT_CACHE_INTEGRITY_FAILED');}
function key(ref:Ref,versionId:string,sha256:string){
  if(!ref||!uuid.test(versionId)||!uuid.test(ref.scope?.agencyId??'')||
    !uuid.test(ref.scope?.clientId??'')||!uuid.test(ref.scope?.siteId??'')||
    Object.keys(ref.scope??{}).length!==3||!commit.test(ref.commit)||!sha.test(ref.manifestSha256)||
    !sha.test(sha256)||ref.manifestPath!==`raw-import/${versionId}/.gnr8-import-manifest.json`||
    !/^[A-Za-z0-9-]{1,39}\/[a-z0-9][a-z0-9-]{0,62}$/.test(ref.repository))invalid();
  const {agencyId,clientId,siteId}=ref.scope;
  return `raw-import-cache/v1/${agencyId}/${clientId}/${siteId}/${versionId}/${ref.commit}/${sha256}`;
}
/** Disposable private serving copy of bytes already verified against Git. */
export class RawImportGitCache{
  private bucketPromise?:Promise<ReturnType<SupabaseClient['storage']['from']>|null>;
  private archives=new Map<string,Promise<{files:Map<string,Buffer>;manifest:{files:Array<{path:string;bytes:number;sha256:string}>}}>>();
  constructor(private client:Pick<SupabaseClient,'storage'>|null=getSupabaseServiceRoleClient(),
    private bucketName=process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV]??'',
    private git:Recovery=recovery){}
  private async bucket(){
    this.bucketPromise??=(async()=>{
      if(!this.client||!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(this.bucketName))return null;
      const service=this.client.storage;
      let info:Awaited<ReturnType<typeof service.getBucket>>;
      try{info=await service.getBucket(this.bucketName);}catch{return null;}
      if(info.data?.public===true)invalid();
      if(info.error||info.data?.public!==false)return null;
      try{return service.from(this.bucketName);}catch{return null;}
    })();
    return this.bucketPromise;
  }
  private async archive(ref:Ref,versionId:string){
    const archiveKey=JSON.stringify([ref.scope,ref.repository,ref.commit,ref.manifestSha256,versionId]);
    let pending=this.archives.get(archiveKey);
    if(pending)return pending;
    pending=this.loadArchive(ref,versionId);
    this.archives.set(archiveKey,pending);
    return pending;
  }
  private async loadArchive(ref:Ref,versionId:string){
    try{
      const scope={...ref.scope,siteVersionId:versionId};
      const target=await this.git.resolveTarget(scope);
      if(!target||`${target.owner}/${target.repository}`!==ref.repository)invalid();
      await this.git.verifyTarget(scope,target);
      const archive=await this.git.read({owner:target.owner,repository:target.repository,
        branch:`imports/${versionId}`,commit:ref.commit,token:target.token},fetch,
        {maxBytes:RAW_IMPORT_GIT_MAX_BYTES,timeoutMs:180_000});
      if(archive.commit!==ref.commit||archive.parentCount!==1||!archive.parent)invalid();
      const manifestBody=archive.files.get(ref.manifestPath);
      if(!manifestBody||hash(manifestBody)!==ref.manifestSha256)invalid();
      const manifest=JSON.parse(manifestBody.toString('utf8')) as {format?:string;scope?:Ref['scope'];
        siteVersionId?:string;files?:Array<{path:string;bytes:number;sha256:string}>};
      if(manifest.format!=='gnr8-raw-import-git:v1'||manifest.siteVersionId!==versionId||
        manifest.scope?.agencyId!==ref.scope.agencyId||manifest.scope?.clientId!==ref.scope.clientId||
        manifest.scope?.siteId!==ref.scope.siteId||!Array.isArray(manifest.files)||
        manifest.files.length<1||manifest.files.length>10000)invalid();
      const paths=manifest.files.map(entry=>`raw-import/${versionId}/${entry.path}`);
      if(new Set(paths).size!==paths.length||archive.files.size!==paths.length+1||
        paths.some(path=>!archive.files.has(path)))invalid();
      return {files:archive.files,manifest:{files:manifest.files}};
    }catch{invalid();}
  }
  private async recover(ref:Ref,versionId:string,file:{sha256:string;sizeBytes:number}):Promise<Buffer>{
    try{
      const archive=await this.archive(ref,versionId);
      const manifest=archive.manifest;
      const matches=manifest.files.filter(entry=>entry.sha256===file.sha256&&entry.bytes===file.sizeBytes);
      if(!matches.length)invalid();
      const body=archive.files.get(`raw-import/${versionId}/${matches[0]!.path}`);
      if(!body||body.length!==file.sizeBytes||hash(body)!==file.sha256)invalid();
      return body;
    }catch{invalid();}
  }
  async read(ref:Ref,versionId:string,file:{sha256:string;sizeBytes:number}):Promise<Buffer>{
    const objectKey=key(ref,versionId,file.sha256);
    if(!Number.isSafeInteger(file.sizeBytes)||file.sizeBytes<0||file.sizeBytes>128*1024*1024)invalid();
    const bucket=await this.bucket();
    let result:Awaited<ReturnType<NonNullable<typeof bucket>['download']>>|null=null;
    if(bucket)try{result=await bucket.download(objectKey);}catch{/* Recover from pinned Git. */}
    if(result?.data){
      if(result.error||result.data.size!==file.sizeBytes)invalid();
      let cached:Buffer|null=null;
      try{cached=Buffer.from(await result.data.arrayBuffer());}catch{/* Recover from pinned Git. */}
      if(cached){
        if(cached.length!==file.sizeBytes||hash(cached)!==file.sha256)invalid();
        return cached;
      }
      result=null;
    }
    if(!result?.data){
      const bytes=await this.recover(ref,versionId,file);
      if(!bucket)return bytes;
      try{await bucket.upload(objectKey,bytes,{upsert:false,contentType:'application/octet-stream',cacheControl:'3600'});}
      catch{/* Exact readback reconciles an ambiguous upload. */}
      let restored:Awaited<ReturnType<typeof bucket.download>>;
      try{restored=await bucket.download(objectKey);}catch{return bytes;}
      // Git is the verified source of truth. A disposable cache outage must not
      // make a pinned, integrity-checked import unreadable.
      if(restored.error||!restored.data)return bytes;
      if(restored.data.size!==file.sizeBytes)invalid();
      let cached:Buffer;
      try{cached=Buffer.from(await restored.data.arrayBuffer());}catch{return bytes;}
      if(cached.length!==file.sizeBytes||hash(cached)!==file.sha256)invalid();
      return cached;
    }
    invalid();
  }
}
