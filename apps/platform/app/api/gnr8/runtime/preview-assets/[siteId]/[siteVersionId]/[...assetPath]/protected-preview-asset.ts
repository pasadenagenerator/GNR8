import 'server-only';
import {requireOwnedPreviewVersion} from '@/gnr8/output-adapters/public-output-access';
import {readVerifiedRetainedAsset as readRetainedAsset} from '@/gnr8/output-adapters/verified-retained-asset';
import {SupabaseAstroCandidateOwnershipResolver} from '@/gnr8/output-adapters/astro-production-candidate-ownership-resolver';
import {getSupabaseServiceRoleClient} from '@/src/supabase/service-role-server';

export {readVerifiedRetainedAsset} from '@/gnr8/output-adapters/verified-retained-asset';

const headers={
  'cache-control':'private, no-store',
  'x-content-type-options':'nosniff',
  'cross-origin-resource-policy':'same-origin',
  'content-security-policy':"sandbox; default-src 'none'",
};

/** Authenticate once, then use the same verified reader as other retained
 * assets. It supports both legacy bytea and immutable Git-backed imports. */
export async function readProtectedPreviewAsset(
  input:{siteId:string;siteVersionId:string;path:string;host?:string},
  dependencies={
    enabled:()=>process.env.VERCEL_ENV!=='production'||input.host==='app.pasadenagenerator.com',
    authenticate:async()=>{await requireOwnedPreviewVersion(input.siteVersionId,input.siteId);return 'owned-preview';},
    client:getSupabaseServiceRoleClient,
    ownership:(siteVersionId:string,expectedRuntimeSiteId:string)=>
      new SupabaseAstroCandidateOwnershipResolver().resolve({siteVersionId,expectedRuntimeSiteId}),
  },
):Promise<Response|null>{
  if(!dependencies.enabled()||!/\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot)$/i.test(input.path))return null;
  const fail=(status:number)=>new Response('Preview asset unavailable.',{status,headers});
  try{await dependencies.authenticate();}
  catch(error){
    const message=error instanceof Error?error.message:'';
    return fail(message.startsWith('Unauthorized')?401:message.startsWith('Forbidden')?403:500);
  }
  try{
    await dependencies.ownership(input.siteVersionId,input.siteId);
    const client=dependencies.client();
    if(!client)return fail(503);
    return await readRetainedAsset(input,client);
  }catch{return fail(500);}
}
