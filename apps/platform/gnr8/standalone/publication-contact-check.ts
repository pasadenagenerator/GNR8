import 'server-only';
import {isContactEmail} from '@gnr8/runtime-contracts';
/** Read-only connection probe. It never sends an email and makes no claim that
 * a receiving mailbox or Resend delivery has been verified. */
export async function checkIndependentContact(env:Record<string,string>,host:string,transport:typeof fetch=fetch){
 let url:URL;try{url=new URL(env.CONTACT_REDIS_URL);}catch{throw Error('standalone_contact_connection_invalid');}
 const sender=env.CONTACT_FROM?.match(/<([^<>]+)>$/)?.[1]??env.CONTACT_FROM;
 if(url.protocol!=='https:'||url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!/^[-a-z0-9]+\.upstash\.io$/.test(url.hostname)||!env.CONTACT_REDIS_TOKEN||!env.CONTACT_RESEND_KEY||!env.CONTACT_RATE_SECRET||env.CONTACT_RATE_SECRET.length<32||!isContactEmail(sender)||!(env.CONTACT_ALLOWED_HOSTS??'').split(',').map(v=>v.trim()).includes(host))throw Error('standalone_contact_connection_invalid');
 try{
  const r=await transport(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{authorization:'Bearer '+env.CONTACT_REDIS_TOKEN,'content-type':'application/json'},body:JSON.stringify(['PING'])});
  if(!r.ok||(await r.json()).result!=='PONG')throw Error('failed');
 }catch{throw Error('standalone_contact_store_unreachable');}
 return {redis:'reachable',mail:'not_sent',recipient:'owner_confirmed',limits:'release_policy',retention:'payload_ttl_with_permanent_deduplication'};
}
