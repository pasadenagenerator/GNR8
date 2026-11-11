import 'server-only';
import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseServiceRoleClient} from '@/src/supabase/service-role-server';
import {ASTRO_CANDIDATE_OBJECT_BUCKET_ENV} from '../output-adapters/astro-production-candidate-object-store';
import type {RawImportedSiteArtifactMetadata} from '../runtime/types';

type Ref=NonNullable<RawImportedSiteArtifactMetadata['gitArchive']>;
type File={path:string;mediaType:string;sizeBytes:number;sha256:string;bytes:Buffer};
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
function storage(client:Pick<SupabaseClient,'storage'>|null,bucketName:string){
  if(!client||!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(bucketName))invalid();
  return client.storage;
}

/** Disposable private serving copy of bytes already verified against Git. */
export class RawImportGitCache{
  private bucketPromise?:Promise<ReturnType<SupabaseClient['storage']['from']>>;
  constructor(private client:Pick<SupabaseClient,'storage'>|null=getSupabaseServiceRoleClient(),
    private bucketName=process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV]??''){}
  private async bucket(){
    this.bucketPromise??=(async()=>{
      const service=storage(this.client,this.bucketName);
      const info=await service.getBucket(this.bucketName);
      if(info.error||info.data?.public!==false)invalid();
      return service.from(this.bucketName);
    })();
    return this.bucketPromise;
  }
  async read(ref:Ref,versionId:string,file:{sha256:string;sizeBytes:number}):Promise<Buffer>{
    const objectKey=key(ref,versionId,file.sha256);
    if(!Number.isSafeInteger(file.sizeBytes)||file.sizeBytes<0||file.sizeBytes>128*1024*1024)invalid();
    const result=await (await this.bucket()).download(objectKey);
    if(result.error||!result.data||result.data.size!==file.sizeBytes)invalid();
    const bytes=Buffer.from(await result.data.arrayBuffer());
    if(bytes.length!==file.sizeBytes||hash(bytes)!==file.sha256)invalid();
    return bytes;
  }
  async prepare(ref:Ref,versionId:string,files:File[]):Promise<void>{
    const bucket=await this.bucket();
    const seen=new Set<string>();
    const unique:File[]=[];
    for(const file of files){
      const objectKey=key(ref,versionId,file.sha256);
      if(!Buffer.isBuffer(file.bytes)||file.bytes.length!==file.sizeBytes||hash(file.bytes)!==file.sha256)invalid();
      if(seen.has(objectKey))continue;
      seen.add(objectKey);
      unique.push(file);
    }
    const batchSize=8;
    for(let offset=0;offset<unique.length;offset+=batchSize){
      const results=await Promise.allSettled(unique.slice(offset,offset+batchSize).map(async file=>{
        const objectKey=key(ref,versionId,file.sha256);
        let uploadFailure='';
        for(let attempt=0;attempt<3;attempt++){
          // A failed upload may have committed. Exact readback reconciles it.
          try{
            // The cache is disposable and content-addressed. Replace an existing
            // object only after exact readback has failed, repairing stale bytes.
            const result=await bucket.upload(objectKey,file.bytes,{upsert:attempt>0,contentType:file.mediaType,cacheControl:'3600'});
            uploadFailure=result.error?.message??'';
          }catch(error){uploadFailure=error instanceof Error?error.message:String(error);}
          try{await this.read(ref,versionId,file);return;}catch{
            if(attempt<2)await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
          }
        }
        throw Error(`RAW_IMPORT_CACHE_INTEGRITY_FAILED:${file.path}:${uploadFailure||'readback_failed'}`);
      }));
      for(const result of results)if(result.status==='rejected')throw result.reason;
      console.info('[raw-import-cache] prepared', {completed:Math.min(offset+batchSize,unique.length),total:unique.length});
    }
  }
}
