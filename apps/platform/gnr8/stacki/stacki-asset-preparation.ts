import { createHash } from 'node:crypto';
import { StackiDraftError } from './stacki-draft-contract';
import type { StackiStorageClient } from './stacki-draft-store';
import type { StackiRuntimeAsset } from './stacki-retained-assets';

export type StackiAssetPlan = {
  identity: string;
  entries: Array<{path:string;name:string;sha256:string;bytes:number}>;
  read(entries: StackiAssetPlan['entries']): Promise<StackiRuntimeAsset[]>;
};
export type StackiAssetProgress = { identity:string; completed:number; total:number; ready:boolean };
const hash = (bytes:Uint8Array|string) => createHash('sha256').update(bytes).digest('hex');
const MAX_PART = 13*1024*1024;
function fail():never { throw new StackiDraftError(503,'STACKI_ASSET_PREPARATION_UNAVAILABLE'); }

/** Disposable immutable transport cache in the existing private bucket. It is
 * not a canonical model, checkpoint or publication authority. The authorized
 * source plan is rebuilt on each request; a different scope/source/transform
 * selects different keys. No partial cache can authorize a runtime start. */
export class StackiAssetPreparation {
  constructor(private client:StackiStorageClient,private bucket:string) {}
  private async storage() {
    if(!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(this.bucket))fail();
    const result=await this.client.storage.getBucket(this.bucket);
    if(result.error||result.data?.public!==false)fail();
    return this.client.storage.from(this.bucket);
  }
  private groups(plan:StackiAssetPlan) {
    if(!/^[a-f0-9]{64}$/.test(plan.identity)||plan.entries.length>2000)fail();
    const groups:Array<StackiAssetPlan['entries']>=[];
    let group:StackiAssetPlan['entries']=[],bytes=0,total=0;
    const names=new Set<string>();
    for(const entry of plan.entries){
      if(!/^[a-f0-9]{64}$/.test(entry.name)||!/^[a-f0-9]{64}$/.test(entry.sha256)||names.has(entry.name)||
          !Number.isSafeInteger(entry.bytes)||entry.bytes<0||entry.bytes>12*1024*1024)fail();
      names.add(entry.name);total+=entry.bytes;if(total>128*1024*1024)fail();
      if(group.length&&(group.length>=32||bytes+entry.bytes>4*1024*1024)){groups.push(group);group=[];bytes=0;}
      group.push(entry);bytes+=entry.bytes;
    }
    if(group.length)groups.push(group);
    return groups;
  }
  private key(plan:StackiAssetPlan,index:number){return `stacki-asset-preparation/v1/${plan.identity}/${index}.json`;}
  private async readPart(bucket:ReturnType<StackiStorageClient['storage']['from']>,plan:StackiAssetPlan,index:number,entries:StackiAssetPlan['entries']) {
    const result=await bucket.download(this.key(plan,index));
    if(result.error){
      const error=result.error as {statusCode?:string|number;originalError?:unknown};
      if(String(error.statusCode)==='404')return null;
      if(error.originalError instanceof Response){
        if(error.originalError.status===404)return null;
        if(error.originalError.status===400){const body=await error.originalError.json().catch(()=>null);if(body?.code==='NoSuchKey'||String(body?.statusCode)==='404')return null;}
      }
      fail();
    }
    if(!result.data||result.data.size>MAX_PART)fail();
    const buffer=Buffer.from(await result.data.arrayBuffer());
    if(buffer.length<4)fail();
    const length=buffer.readUInt32BE(0);if(length>64*1024||length+4>buffer.length)fail();
    let header:any;try{header=JSON.parse(buffer.subarray(4,4+length).toString());}catch{fail();}
    if(header.format!=='stacki-asset-part:v1'||header.identity!==plan.identity||header.index!==index||!Array.isArray(header.files)||header.files.length!==entries.length)fail();
    let offset=4+length;const assets:StackiRuntimeAsset[]=[];
    for(let i=0;i<entries.length;i++){
      const file=header.files[i],entry=entries[i];
      if(file.name!==entry.name||file.sourceSha256!==entry.sha256||!Number.isSafeInteger(file.bytes)||file.bytes<0||file.bytes>12*1024*1024||offset+file.bytes>buffer.length)fail();
      const body=buffer.subarray(offset,offset+file.bytes);offset+=file.bytes;
      if(hash(body)!==file.sha256)fail();
      assets.push({name:entry.name,body});
    }
    if(offset!==buffer.length)fail();
    return assets;
  }
  /** One bounded group per user-initiated request. Repeated steps reuse exact
   * verified bytes. Failed/ambiguous uploads reconcile without overwriting. */
  async step(plan:StackiAssetPlan,index:number,confirm:()=>Promise<void>):Promise<StackiAssetProgress> {
    let phase:'plan'|'bucket'|'existing-read'|'source-read'|'upload'|'readback'|'confirm'='plan';
    let uploadStatus:number|null=null;
    try {
      const groups=this.groups(plan);
      if(!Number.isInteger(index)||index<0||index>=Math.max(1,groups.length))throw new StackiDraftError(422,'STACKI_ASSET_STEP_INVALID');
      if(!groups.length){await confirm();return {identity:plan.identity,completed:0,total:0,ready:true};}
      phase='bucket';
      const bucket=await this.storage(),entries=groups[index];
      phase='existing-read';
      if(!await this.readPart(bucket,plan,index,entries)){
      phase='source-read';
      const assets=await plan.read(entries);
      if(assets.length!==entries.length||assets.some((asset,i)=>asset.name!==entries[i].name||asset.body.length>12*1024*1024))fail();
      const header=Buffer.from(JSON.stringify({format:'stacki-asset-part:v1',identity:plan.identity,index,files:assets.map((asset,i)=>({name:asset.name,sourceSha256:entries[i].sha256,bytes:asset.body.length,sha256:hash(asset.body)}))}));
      const size=4+header.length+assets.reduce((sum,file)=>sum+file.body.length,0);if(size>MAX_PART||header.length>64*1024)fail();
      const prefix=Buffer.alloc(4);prefix.writeUInt32BE(header.length);
      phase='confirm';await confirm();
      phase='upload';
      try{const result=await bucket.upload(this.key(plan,index),Buffer.concat([prefix,header,...assets.map(asset=>asset.body)]),{contentType:'application/octet-stream',cacheControl:'0',upsert:false});
        const status=Number((result.error as {statusCode?:unknown}|null)?.statusCode);
        if(result.error && Number.isInteger(status) && status>=400 && status<=599)uploadStatus=status;
      }catch{/* exact readback reconciles uncertain upload */}
      phase='readback';
      const verified=await this.readPart(bucket,plan,index,entries);
      if(!verified||verified.some((file,i)=>!file.body.equals(assets[i].body)))fail();
      }
      phase='confirm';await confirm();
      // This is progress only. readAll independently requires every group.
      return {identity:plan.identity,completed:index+1,total:groups.length,ready:index+1===groups.length};
    } catch(error) {
      // No source paths, object keys, bytes, actor identity or raw provider errors.
      console.warn('gnr8-stacki-asset-step-failure',{index,phase,uploadStatus,
        reason:error instanceof StackiDraftError?error.code:'UNEXPECTED'});
      throw error;
    }
  }
  async readAll(plan:StackiAssetPlan):Promise<StackiRuntimeAsset[]> {
    const groups=this.groups(plan);if(!groups.length)return [];
    const bucket=await this.storage(),assets:StackiRuntimeAsset[]=[];
    for(let first=0;first<groups.length;first+=4){
      const batch=await Promise.all(groups.slice(first,first+4).map((group,i)=>this.readPart(bucket,plan,first+i,group)));
      if(batch.some(part=>part===null))throw new StackiDraftError(409,'STACKI_ASSETS_NOT_PREPARED');
      for(const part of batch)assets.push(...part!);
    }
    if(assets.reduce((sum,file)=>sum+file.body.length,0)>128*1024*1024)fail();
    return assets;
  }
}
