import 'server-only';
import {requirePublicOutputSite} from '../output-adapters/public-output-access';
import {getSupabaseServiceRoleClient} from '@/src/supabase/service-role-server';
import {readBoundedJson,requireSameOriginJson} from '../stacki/stacki-draft-route-handlers';
import {PublicationConnectionRepository,assertConnectionRepository,parseConnectionSettings,publicConnection,sealConnection,type ConnectionTokens} from './publication-connection';
import {PublicationConnectionProvider} from './publication-connection-provider';
import {SupabasePublicationStore} from './publication-store';
import {publicationFailureCode} from './publication-errors';
import {SiteGitHubRepositoryBinding} from '../stacki/site-github-repository-binding';
type Context={params:Promise<{clientId:string;siteId:string}>};
const headers={'cache-control':'private,no-store','referrer-policy':'no-referrer'};
export function createPublicationConnectionRoutes(deps={authorize:requirePublicOutputSite,client:getSupabaseServiceRoleClient,provider:(tokens:ConnectionTokens)=>new PublicationConnectionProvider(tokens)}){
 async function run(request:Request,context:Context){
  try{
   if(process.env.GNR8_STANDALONE_PUBLICATION_ENABLED!=='1')return Response.json({ok:true,data:{state:'disabled'}},{headers});
   const scope={...await context.params,agencyId:new URL(request.url).searchParams.get('agencyId')??''};
   const actor=await deps.authorize(scope);const client=deps.client();if(!client)throw Error('standalone_store_unavailable');
   const repository=new PublicationConnectionRepository(client),old=await repository.read(scope);
   const siteRepository=process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED==='1'
    ?await new SiteGitHubRepositoryBinding(client).readForPublication(scope):null;
   if(request.method==='GET')return Response.json({ok:true,data:{...publicConnection(old),
    ...(siteRepository?{repositoryBinding:siteRepository}:{})}},{headers});
   requireSameOriginJson(request);const body=await readBoundedJson(request) as any;
   if(body.action==='domain'||body.action==='contact'){
    if(!old)throw Error('standalone_connection_required');
    const provider=deps.provider(old.tokens);
    const store=new SupabasePublicationStore(client,process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET??'gnr8-astro-candidate-routes',scope);
    await provider.verify(old.settings,scope,store,siteRepository);
    return Response.json({ok:true,data:body.action==='domain'?await provider.domain(old.settings):await provider.contact(old.settings)},{headers});
   }
   if(!['accounts','save','verify'].includes(body.action))throw Error('standalone_request_invalid');
   const tokens=body.tokens??old?.tokens;if(!tokens)throw Error('standalone_credentials_invalid');
   sealConnection(tokens,scope,process.env.GNR8_STANDALONE_ENCRYPTION_KEY??'');
   if(body.action==='accounts')return Response.json({ok:true,data:await deps.provider(tokens).accounts()},{headers});
   const settings=parseConnectionSettings(body.settings??old?.settings);
   assertConnectionRepository(settings,siteRepository);
   const provider=deps.provider(tokens);
   const store=new SupabasePublicationStore(client,process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET??'gnr8-astro-candidate-routes',scope);
   const checked=await provider.verify(settings,scope,store,siteRepository);
   await deps.authorize(scope);
   if(body.action==='verify')return Response.json({ok:true,data:checked},{headers});
   if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0||body.confirmation!=='connect-dedicated-publication-target')throw Error('standalone_confirmation_required');
   const saved=await repository.save(scope,settings,tokens,body.expectedRevision,actor.userId);
   return Response.json({ok:true,data:{...publicConnection(saved),checked,
    ...(siteRepository?{repositoryBinding:siteRepository}:{})}},{headers});
  }catch(error){return Response.json({ok:false,error:publicationFailureCode(error)},{status:409,headers});}
 }
 return {GET:run,POST:run};
}
