import 'server-only';
import {createHash} from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fingerprint } from './publication-contract';
import type { PublicationScope as PublicOutputScope } from './publication-contract';
/** Existing private object store, append-only CAS. This is release evidence,
 * never an alternate editable source store or public serving dependency. */
export interface PublicationStore {
 read<T>(key:string):Promise<T|null>;
 put<T>(key:string,value:T):Promise<T>;
 claim(key:string,value:unknown):Promise<boolean>;
 putBytes(hash:string,bytes:Buffer):Promise<void>;
 getBytes(hash:string):Promise<Buffer>;
}
// download() requests a Blob. storage-js therefore wraps even HTTP errors in
// StorageUnknownError.originalError (Response), unlike its JSON endpoints.
// Decode only that already-received error; never treat auth/bucket failures as
// an absent release and never issue a second provider request to classify it.
async function isMissingObject(error:unknown){
 const e=error as {name?:string;status?:number;statusCode?:string;message?:string;originalError?:Response};
 let status=e.status??Number(e.statusCode),code=e.statusCode,message=e.message;
 const response=e.originalError;
 if(e.name==='StorageUnknownError'&&response&&[400,404].includes(response.status)&&typeof response.clone==='function'){
  const body=await response.clone().json().catch(()=>null);
  status=response.status;code=body?.code??body?.statusCode;message=body?.message;
 }
 return [400,404].includes(status)&&(code==='NoSuchKey'||(['404','400','not_found'].includes(String(code))&&message==='Object not found'));
}
export class SupabasePublicationStore implements PublicationStore {
 private readonly prefix:string;
 private checkedStorage:Promise<ReturnType<SupabaseClient["storage"]["from"]>>|undefined;
 constructor(private client:SupabaseClient,private bucket:string,scope:PublicOutputScope){
  this.prefix=`standalone-publication/v1/${scope.agencyId}/${scope.clientId}/${scope.siteId}/`;
 }
 private storage(){return this.checkedStorage??=this.checkStorage();}
 private async checkStorage(){const r=await this.client.storage.getBucket(this.bucket);if(r.error||!r.data||r.data.public!==false)throw Error('standalone_store_unavailable');return this.client.storage.from(this.bucket);}
 private key(key:string){if(!/^[a-zA-Z0-9/_-]+\.json$/.test(key)||key.includes('..'))throw Error('standalone_store_key_invalid');return this.prefix+key;}
 async putBytes(hash:string,bytes:Buffer){
  if(!/^[a-f0-9]{64}$/.test(hash)||bytes.length>12*1024*1024||createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('standalone_file_invalid');
  const s=await this.storage();try{await s.upload(this.prefix+'files/'+hash,bytes,{contentType:'application/octet-stream',upsert:false});}catch{/* immutable byte readback */}
  if(!(await this.getBytes(hash)).equals(bytes))throw Error('standalone_file_write_unconfirmed');
 }
 async getBytes(hash:string){
  if(!/^[a-f0-9]{64}$/.test(hash))throw Error('standalone_file_invalid');const s=await this.storage();const r=await s.download(this.prefix+'files/'+hash);
  if(r.error||!r.data||r.data.size>12*1024*1024)throw Error('standalone_file_unavailable');const bytes=Buffer.from(await r.data.arrayBuffer());
  if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('standalone_file_integrity');return bytes;
 }
 async read<T>(key:string):Promise<T|null>{const s=await this.storage();const r=await s.download(this.key(key));if(r.error){if(await isMissingObject(r.error))return null;throw Error('standalone_store_read_failed');}const text=await r.data.text();const envelope=JSON.parse(text);if(fingerprint(envelope.value)!==envelope.sha256)throw Error('standalone_store_integrity');return envelope.value;}
 async claim(key:string,value:unknown){const s=await this.storage();let uploaded=false;try{const r=await s.upload(this.key(key),Buffer.from(JSON.stringify({value,sha256:fingerprint(value)})),{contentType:'application/json',upsert:false});uploaded=!r.error;}catch{/* Ambiguous CAS is not permission to repeat the external mutation. */}if(!uploaded){await this.read(key);return false;}return true;}
 async put<T>(key:string,value:T):Promise<T>{await this.claim(key,value);const saved=await this.read<T>(key);if(fingerprint(saved)!==fingerprint(value))throw Error('standalone_receipt_conflict');return saved!;}
}
