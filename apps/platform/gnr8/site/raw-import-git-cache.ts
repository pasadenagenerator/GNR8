import 'server-only';
import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseServiceRoleClient} from '@/src/supabase/service-role-server';
import {ASTRO_CANDIDATE_OBJECT_BUCKET_ENV} from '../output-adapters/astro-production-candidate-object-store';
import type {RawImportedSiteArtifactMetadata} from '../runtime/types';
import {readStandaloneGit} from '../standalone/publication-git';
import {resolvedGitHubTarget} from '../stacki/stacki-github-config';
import {GitHubStackiStore} from '../stacki/stacki-github-store';

type Ref=NonNullable<RawImportedSiteArtifactMetadata['gitArchive']>;
type Recovery={resolveTarget:typeof resolvedGitHubTarget;
  verifyTarget:(scope:Ref['scope'] & {siteVersionId:string},
    target:NonNullable<Awaited<ReturnType<typeof resolvedGitHubTarget>>>)=>Promise<void>;
  read:typeof readStandaloneGit;
  transport?:typeof fetch};
const recovery:Recovery={resolveTarget:resolvedGitHubTarget,
  verifyTarget:async(scope,target)=>new GitHubStackiStore(scope,target).verifyTarget(),read:readStandaloneGit,
  transport:fetch};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const sha=/^[a-f0-9]{64}$/;
const commit=/^[a-f0-9]{40}$/;
const hash=(body:Uint8Array)=>createHash('sha256').update(body).digest('hex');
const blobHash=(body:Uint8Array)=>createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
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
  private indexes=new Map<string,Promise<{target:NonNullable<Awaited<ReturnType<typeof resolvedGitHubTarget>>>;
    files:Map<string,{path:string;blob:string;bytes:number;sha256:string}>}>>();
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
        branch:`imports/${versionId}`,commit:ref.commit,token:target.token});
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
  private async requestGit(target:NonNullable<Awaited<ReturnType<typeof resolvedGitHubTarget>>>,path:string){
    const response=await this.git.transport!(`https://api.github.com/repos/${target.owner}/${target.repository}${path}`,{
      redirect:'error',signal:AbortSignal.timeout(30_000),
      headers:{authorization:`Bearer ${target.token}`,accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28'},
    });
    if(!response.ok)invalid();
    return await response.json() as Record<string,unknown>;
  }
  private async gitBlob(target:NonNullable<Awaited<ReturnType<typeof resolvedGitHubTarget>>>,oid:string){
    if(!commit.test(oid))invalid();
    const result=await this.requestGit(target,`/git/blobs/${oid}`);
    if(result.sha!==oid||result.encoding!=='base64'||typeof result.content!=='string'||
      typeof result.size!=='number'||!Number.isSafeInteger(result.size)||result.size>128*1024*1024)invalid();
    const body=Buffer.from(result.content.replace(/\s/g,''),'base64');
    if(body.length!==result.size||blobHash(body)!==oid)invalid();
    return body;
  }
  private async pinnedIndex(ref:Ref,versionId:string){
    const archiveKey=JSON.stringify([ref.scope,ref.repository,ref.commit,ref.manifestSha256,versionId]);
    let pending=this.indexes.get(archiveKey);
    if(pending)return pending;
    pending=(async()=>{
      const scope={...ref.scope,siteVersionId:versionId};
      const target=await this.git.resolveTarget(scope);
      if(!target||`${target.owner}/${target.repository}`!==ref.repository)invalid();
      await this.git.verifyTarget(scope,target);
      const branch=await this.requestGit(target,`/git/ref/heads/imports/${versionId}`);
      if((branch.object as {sha?:unknown}|undefined)?.sha!==ref.commit)invalid();
      const node=await this.requestGit(target,`/git/commits/${ref.commit}`);
      const treeSha=(node.tree as {sha?:unknown}|undefined)?.sha;
      if(node.sha!==ref.commit||!Array.isArray(node.parents)||node.parents.length!==1||
        !commit.test(String(treeSha??'')))invalid();
      const tree=await this.requestGit(target,`/git/trees/${treeSha}?recursive=1`);
      if(tree.truncated!==false||!Array.isArray(tree.tree))invalid();
      const blobs=new Map<string,{path:string;sha:string;size:number}>();
      for(const item of tree.tree as Array<{path?:unknown;sha?:unknown;size?:unknown;type?:unknown}>){
        if(item.type!=='blob')continue;
        if(typeof item.path!=='string'||!commit.test(String(item.sha??''))||
          typeof item.size!=='number'||!Number.isSafeInteger(item.size)||item.size<0||blobs.has(item.path))invalid();
        blobs.set(item.path,{path:item.path,sha:String(item.sha),size:Number(item.size)});
      }
      const manifestEntry=blobs.get(ref.manifestPath);
      if(!manifestEntry)invalid();
      const manifestBody=await this.gitBlob(target,manifestEntry.sha);
      if(manifestBody.length!==manifestEntry.size||hash(manifestBody)!==ref.manifestSha256)invalid();
      const manifest=JSON.parse(manifestBody.toString('utf8')) as {format?:unknown;scope?:Ref['scope'];
        siteVersionId?:unknown;files?:Array<{path:string;bytes:number;sha256:string}>};
      if(manifest.format!=='gnr8-raw-import-git:v1'||manifest.siteVersionId!==versionId||
        manifest.scope?.agencyId!==ref.scope.agencyId||manifest.scope?.clientId!==ref.scope.clientId||
        manifest.scope?.siteId!==ref.scope.siteId||!Array.isArray(manifest.files)||
        manifest.files.length<1||manifest.files.length>10000||blobs.size!==manifest.files.length+1)invalid();
      const files=new Map<string,{path:string;blob:string;bytes:number;sha256:string}>();
      for(const entry of manifest.files){
        if(typeof entry.path!=='string'||!entry.path||entry.path.includes('\\')||
          entry.path.split('/').some(part=>!part||part==='.'||part==='..')||
          !Number.isSafeInteger(entry.bytes)||entry.bytes<0||!sha.test(entry.sha256))invalid();
        const path=`raw-import/${versionId}/${entry.path}`;
        const blob=blobs.get(path);
        if(!blob||blob.size!==entry.bytes||files.has(path))invalid();
        files.set(path,{path,blob:blob.sha,bytes:entry.bytes,sha256:entry.sha256});
      }
      if([...blobs.keys()].some(path=>path!==ref.manifestPath&&!files.has(path)))invalid();
      return {target,files};
    })();
    this.indexes.set(archiveKey,pending);
    return pending;
  }
  private async recoverPinned(ref:Ref,versionId:string,file:{sha256:string;sizeBytes:number}){
    const index=await this.pinnedIndex(ref,versionId);
    const match=[...index.files.values()].find(entry=>entry.sha256===file.sha256&&entry.bytes===file.sizeBytes);
    if(!match)invalid();
    const body=await this.gitBlob(index.target,match.blob);
    if(body.length!==file.sizeBytes||hash(body)!==file.sha256)invalid();
    return body;
  }
  private async recover(ref:Ref,versionId:string,file:{sha256:string;sizeBytes:number}):Promise<Buffer>{
    try{
      if(this.git.transport)return await this.recoverPinned(ref,versionId,file);
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
      let cached:Buffer|null=null;
      if(!result.error&&result.data.size===file.sizeBytes)
        try{cached=Buffer.from(await result.data.arrayBuffer());}catch{/* Recover from pinned Git. */}
      if(cached&&cached.length===file.sizeBytes&&hash(cached)===file.sha256){
        return cached;
      }
    }
    const bytes=await this.recover(ref,versionId,file);
    if(!bucket)return bytes;
    // The private cache is disposable. Repair a stale copy when possible, but
    // never make a verified Git read depend on cache write availability.
    try{await bucket.upload(objectKey,bytes,{upsert:!!result?.data,
      contentType:'application/octet-stream',cacheControl:'3600'});}
    catch{/* The verified Git bytes remain usable. */}
    return bytes;
  }
}
