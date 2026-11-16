import { createContactPost, type PublishedContact, type ContactDelivery, type ContactOutcome } from '../contact/contact-submission';
import { createHmac } from 'node:crypto';

/** Dedicated project only. No GNR8 client, lookup, credentials or callback.
 * Redis and mail accounts must belong to the site owner. Keys never expire:
 * unknown sends cannot become sendable again when a deduplication TTL elapses.
 * Redis must use durable storage and no-eviction, with a bounded operator policy.
 */
export const CLAIM_CONTACT = `
local old = redis.call('GET',KEYS[1])
if old then
 local v = cjson.decode(old)
 if v.hash ~= ARGV[1] then return {'conflict'} end
 return {'duplicate',v.outcome}
end
local clock = redis.call('TIME')
local window = math.floor(tonumber(clock[1])/3600)
local rate = KEYS[2]..':'..window
local total = tonumber(redis.call('GET',KEYS[3]) or '0')
if total >= tonumber(ARGV[4]) then return {'rate_limited'} end
if tonumber(redis.call('GET',rate) or '0') >= tonumber(ARGV[3]) then return {'rate_limited'} end
redis.call('INCR',rate)
redis.call('EXPIRE',rate,7200)
redis.call('INCR',KEYS[3])
local claim = {hash=ARGV[1],outcome='pending',acceptedAt=clock[1]}
if tonumber(ARGV[5] or '0') > 0 then
 redis.call('SET',KEYS[4],ARGV[2],'EX',tonumber(ARGV[5]))
else
 claim.payload = cjson.decode(ARGV[2])
end
redis.call('SET',KEYS[1],cjson.encode(claim))
return {'claimed',KEYS[1]}
`;
export const FINISH_CONTACT = `
local old=redis.call('GET',KEYS[1])
if not old then return 0 end
local v=cjson.decode(old)
if v.outcome ~= 'pending' then return v.outcome == ARGV[1] and 1 or 0 end
v.outcome=ARGV[1]
redis.call('SET',KEYS[1],cjson.encode(v))
return 1
`;
export type ContactRuntimeConfig = { siteKey: string; forms: Record<string, PublishedContact>; policy?:{maxClaims:number;perHour:number;retentionDays:number} };
type Environment = Record<string,string|undefined>;
export function createStandaloneContactHandler(config: ContactRuntimeConfig, env: Environment = process.env, transport: typeof fetch = fetch) {
  return async (request: Request) => {
    const headers = { 'cache-control':'private, no-store', 'x-content-type-options':'nosniff' };
    if(request.method !== 'POST') return new Response('Method not allowed',{status:405,headers:{...headers,allow:'POST'}});
    const hosts = (env.CONTACT_ALLOWED_HOSTS ?? '').split(',').map(h=>h.trim()).filter(Boolean);
    // Vercel supplies this immutable deployment URL; live host is an explicit
    // reviewed environment value. Neither a form field nor forwarded header is trusted.
    if (env.VERCEL_URL) hosts.push(env.VERCEL_URL);
    const policy=config.policy;
    if(policy&&(!Number.isInteger(policy.maxClaims)||policy.maxClaims<1||policy.maxClaims>99999||!Number.isInteger(policy.perHour)||policy.perHour<1||policy.perHour>100||!Number.isInteger(policy.retentionDays)||policy.retentionDays<1||policy.retentionDays>365))return new Response('Contact unavailable',{status:503,headers});
    let redis: URL;
    try { redis = new URL(env.CONTACT_REDIS_URL ?? ''); } catch { return new Response('Contact unavailable',{status:503,headers}); }
    if(env.VERCEL_ENV !== 'production' || !hosts.includes(new URL(request.url).host) ||
      redis.protocol !== 'https:' || redis.username || redis.password || redis.search || redis.hash || redis.pathname !== '/' ||
      !redis.hostname.endsWith('.upstash.io') || !env.CONTACT_REDIS_TOKEN || !env.CONTACT_RATE_SECRET ||
      !env.CONTACT_RESEND_KEY || !env.CONTACT_FROM || (!policy&&!/^[1-9]\d{0,4}$/.test(env.CONTACT_MAX_CLAIMS ?? '')))
      return new Response('Contact unavailable',{status:503,headers});
    const command = async (args: Array<string|number>) => {
      const result=await transport(redis,{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{authorization:`Bearer ${env.CONTACT_REDIS_TOKEN}`,'content-type':'application/json'},body:JSON.stringify(args)});
      if(!result.ok)throw new Error('contact_store_unavailable');
      const data=await result.json();if(data.error)throw new Error('contact_store_unavailable');return data.result;
    };
    // The global site cap bounds mail costs even if IPs rotate. The network header
    // is useful only on Vercel, where x-vercel-forwarded-for is provider controlled.
    const ip=request.headers.get('x-vercel-forwarded-for') ?? 'unknown';
    const bucket=createHmac('sha256',env.CONTACT_RATE_SECRET).update(ip).digest('hex');
    const prefix=`contact:${config.siteKey}:`;
    const delivery: ContactDelivery = {
      verifiedSender:env.CONTACT_FROM,
      async claim(input) {
        const value=await command(['EVAL',CLAIM_CONTACT,4,prefix+input.key,prefix+'rate:'+bucket,prefix+'total',prefix+'payload:'+input.key,input.payloadHash,JSON.stringify({fields:input.payload,acceptance:input.acceptanceEvidence??null}),policy?.perHour??5,policy?.maxClaims??Number(env.CONTACT_MAX_CLAIMS),(policy?.retentionDays??0)*86400]);
        if(!Array.isArray(value))throw new Error('contact_claim_invalid');
        if(value[0]==='claimed' && value[1]===prefix+input.key)return {status:'claimed',submissionId:value[1]};
        if(value[0]==='duplicate' && ['pending','notification_accepted','notification_failed','notification_unknown'].includes(value[1]))return {status:'duplicate',outcome:value[1] as ContactOutcome|'pending'};
        if(value[0]==='conflict'||value[0]==='rate_limited')return {status:value[0]};
        throw new Error('contact_claim_invalid');
      },
      async send(input) {
        const result=await transport('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{authorization:`Bearer ${env.CONTACT_RESEND_KEY}`,'content-type':'application/json','idempotency-key':input.idempotencyKey},body:JSON.stringify({from:input.from,to:[input.to],reply_to:input.replyTo,subject:input.subject,text:input.text})});
        if([400,401,403,404,413,422,429].includes(result.status))return 'failed';
        if(!result.ok || typeof (await result.json()).id!=='string')throw new Error('contact_notification_unknown');
        return 'accepted';
      },
      async finish(id,outcome) { if(!id.startsWith(prefix)||await command(['EVAL',FINISH_CONTACT,1,id,outcome])!==1)throw new Error('contact_finish_unavailable'); },
    };
    return createContactPost({resolve:async(_host,path)=>config.forms[path]??null,delivery})(request);
  };
}
