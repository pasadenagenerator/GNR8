import 'server-only';
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {PublicationScope as PublicOutputScope} from './publication-contract';
import {STANDALONE_TRANSFORM_VERSION,fingerprint,validateTarget,type PublicationSelection,type PublicationTarget,type ContactPolicy} from './publication-contract';
import {isContactEmail} from '@gnr8/runtime-contracts';
import type {SiteGitHubRepositoryWithOwnerKind} from '../stacki/site-github-repository-binding';

export type {ContactPolicy} from './publication-contract';
export type ConnectionSettings=Omit<PublicationTarget,'authorizationId'|'approvedManifestSha256'|'provisionedRepositoryId'|'maxFiles'|'maxBytes'|'contactPolicy'|'domainMode'> & {hostPurpose:'working'|'final';domainMode:'new'|'transfer';contact:ContactPolicy|null};
export type ConnectionTokens={github:string;vercel:string};
type Sealed={iv:string;tag:string;body:string};
export type PublicationConnection={scope:PublicOutputScope;revision:number;settings:ConnectionSettings;tokens:ConnectionTokens};
export function parseConnectionSettings(value:unknown):ConnectionSettings {
 const v=value as ConnectionSettings;
 if(!v||Object.keys(v).sort().join()!=='contact,domainMode,githubOwner,githubOwnerId,githubOwnerKind,host,hostPurpose,project,repository,vercelTeamId'||!['working','final'].includes(v.hostPurpose)||!['new','transfer'].includes(v.domainMode))throw Error('standalone_connection_invalid');
 validateTarget({...v,authorizationId:'connection-setup',maxFiles:2000,maxBytes:128*1024*1024});
 if(v.host.endsWith('.vercel.app')||v.host.length>253||v.host.split('.').some(s=>s.length>63||s.startsWith('-')||s.endsWith('-')))throw Error('standalone_host_invalid');
 if(v.contact!==null){const c=v.contact;if(!c||Object.keys(c).sort().join()!=='confirmed,maxClaims,perHour,recipient,retentionDays'||c.confirmed!==true||!isContactEmail(c.recipient)||!Number.isInteger(c.maxClaims)||c.maxClaims<1||c.maxClaims>99999||!Number.isInteger(c.perHour)||c.perHour<1||c.perHour>100||!Number.isInteger(c.retentionDays)||c.retentionDays<1||c.retentionDays>365)throw Error('standalone_contact_policy_required');}
 return v;
}
function key(secret:string){if(!/^[a-f0-9]{64}$/.test(secret))throw Error('standalone_encryption_not_configured');return Buffer.from(secret,'hex');}
export function sealConnection(tokens:ConnectionTokens,scope:PublicOutputScope,secret:string):Sealed{
 if(Object.keys(tokens).sort().join()!=='github,vercel'||Object.values(tokens).some(t=>typeof t!=='string'||t.length<20||t.length>512||/\s/.test(t)))throw Error('standalone_credentials_invalid');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(secret),iv);cipher.setAAD(Buffer.from(fingerprint(scope)));
 return {iv:iv.toString('base64'),body:Buffer.concat([cipher.update(JSON.stringify(tokens),'utf8'),cipher.final()]).toString('base64'),...{tag:cipher.getAuthTag().toString('base64')}};
}
export function openConnection(encrypted:Sealed,scope:PublicOutputScope,secret:string):ConnectionTokens{
 try{const decipher=createDecipheriv('aes-256-gcm',key(secret),Buffer.from(encrypted.iv,'base64'));decipher.setAAD(Buffer.from(fingerprint(scope)));decipher.setAuthTag(Buffer.from(encrypted.tag,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted.body,'base64')),decipher.final()]).toString());}catch{throw Error('standalone_credentials_unavailable');}
}
/** Stateless service-role storage, following existing BYOK AES-GCM practice.
 * AAD binds ciphertext to the complete tenant/site identity. Never select this
 * table from a page or return its row to the browser. */
export class PublicationConnectionRepository {
 constructor(private client:SupabaseClient,private secret=process.env.GNR8_STANDALONE_ENCRYPTION_KEY??''){}
 private query(scope:PublicOutputScope){return this.client.from('gnr8_standalone_connections').select('*').eq('agency_id',scope.agencyId).eq('client_id',scope.clientId).eq('site_id',scope.siteId);}
 async read(scope:PublicOutputScope):Promise<PublicationConnection|null>{
  const r=await this.query(scope).maybeSingle();if(r.error)throw Error('standalone_connection_store_unavailable');if(!r.data)return null;
  return {scope,revision:r.data.revision,settings:parseConnectionSettings(r.data.settings),tokens:openConnection(r.data.encrypted_credentials,scope,this.secret)};
 }
 async save(scope:PublicOutputScope,settings:ConnectionSettings,tokens:ConnectionTokens,expectedRevision:number,actor:string){
  settings=parseConnectionSettings(settings);const encrypted=sealConnection(tokens,scope,this.secret);
  const old=await this.read(scope);
  if(old&&fingerprint({settings:old.settings,tokens:old.tokens})===fingerprint({settings,tokens}))return old;
  if((old?.revision??0)!==expectedRevision)throw Error('standalone_connection_stale');
  // Dedicated resources are permanent for this site. Credentials, contact and
  // chosen host may change; all release identities then include those settings.
  if(old&&['githubOwner','githubOwnerId','githubOwnerKind','repository','vercelTeamId','project'].some(k=>old.settings[k as keyof ConnectionSettings]!==settings[k as keyof ConnectionSettings]))throw Error('standalone_dedicated_target_locked');
  const row={site_id:scope.siteId,agency_id:scope.agencyId,client_id:scope.clientId,settings,encrypted_credentials:encrypted,revision:expectedRevision+1,updated_by:actor,updated_at:new Date().toISOString()};
  const result=old?await this.client.from('gnr8_standalone_connections').update(row).eq('site_id',scope.siteId).eq('agency_id',scope.agencyId).eq('client_id',scope.clientId).eq('revision',expectedRevision).select('revision').maybeSingle():await this.client.from('gnr8_standalone_connections').insert(row).select('revision').maybeSingle();
  if(result.error||!result.data)throw Error(result.error?.code==='23505'?'standalone_target_already_bound':'standalone_connection_write_unconfirmed');
  return {scope,revision:row.revision,settings,tokens};
 }
}
export function assertConnectionRepository(settings:ConnectionSettings,binding:SiteGitHubRepositoryWithOwnerKind|null){
 if(binding&&(settings.githubOwner!==binding.owner||settings.githubOwnerId!==binding.ownerId||
   settings.githubOwnerKind!==binding.ownerKind||settings.repository!==binding.repository))
   throw Error('standalone_repository_ownership_mismatch');
}
export function connectionTarget(connection:PublicationConnection,input:PublicationSelection,
 binding:SiteGitHubRepositoryWithOwnerKind|null=null):PublicationTarget {
 const {githubOwner,githubOwnerId,githubOwnerKind,repository,vercelTeamId,project,host}=connection.settings;
 if(fingerprint(connection.scope)!==fingerprint({agencyId:input.selection.scope.agencyId,clientId:input.selection.scope.clientId,siteId:input.selection.scope.siteId}))throw Error('standalone_ownership_mismatch');
 assertConnectionRepository(connection.settings,binding);
 return {domainMode:connection.settings.domainMode,contactPolicy:connection.settings.contact,githubOwner,githubOwnerId,githubOwnerKind,repository,
  ...(binding?{provisionedRepositoryId:binding.repositoryId}:{}),vercelTeamId,project,host,
  authorizationId:fingerprint({input,settings:connection.settings,...(binding?{repositoryId:binding.repositoryId}:{}),
   transform:STANDALONE_TRANSFORM_VERSION}),maxFiles:2000,maxBytes:128*1024*1024};
}
export function publicConnection(c:PublicationConnection|null){return c?{state:'connected',revision:c.revision,settings:c.settings}: {state:'not_connected',revision:0};}
