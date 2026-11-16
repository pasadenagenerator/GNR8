import 'server-only';
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server';
import { SupabasePublicationStore } from './publication-store';
import { GitHubVercelPublicationProvider, parseStageRecoveryAuthorization } from './publication-provider';
import {PublicationConnectionRepository,connectionTarget} from './publication-connection';
import { publicationService } from './publication-service';
import { fingerprint, validateTarget, type PublicationSelection, type PublicationTarget } from './publication-contract';
import {SiteGitHubRepositoryBinding} from '../stacki/site-github-repository-binding';

/** Provisioned only after the user's bounded hosted plan is approved. The
 * browser cannot pick arbitrary accounts, repositories, hosts or cost limits. */
export function configuredPublicationTarget(input:PublicationSelection):PublicationTarget{
 if(process.env.GNR8_STANDALONE_PUBLICATION_ENABLED!=='1')throw Error('standalone_publication_disabled');
 let entries:Record<string,PublicationTarget>;
 try{entries=JSON.parse(process.env.GNR8_STANDALONE_TARGETS??'{}');}catch{throw Error('standalone_target_not_authorized');}
 const target=entries[input.selection.scope.siteId];if(!target)throw Error('standalone_target_not_authorized');return validateTarget(target);
}
export async function publicationComposition(input:PublicationSelection,authorize:()=>Promise<{userId:string}>){
 if(process.env.GNR8_STANDALONE_PUBLICATION_ENABLED!=='1')throw Error('standalone_publication_disabled');
 const client=getSupabaseServiceRoleClient();if(!client)throw Error('standalone_store_unavailable');
 const bucket=process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET??'gnr8-astro-candidate-routes';
 const store=new SupabasePublicationStore(client,bucket,input.selection.scope);
 const legacy=JSON.parse(process.env.GNR8_STANDALONE_TARGETS??'{}')[input.selection.scope.siteId];
 const scope={agencyId:input.selection.scope.agencyId,clientId:input.selection.scope.clientId,siteId:input.selection.scope.siteId};
 const connections=new PublicationConnectionRepository(client);
 const connection=legacy?null:await connections.read(scope);
 if(!legacy&&!connection)throw Error('standalone_connection_required');
 const siteRepository=connection&&process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED==='1'
  ?await new SiteGitHubRepositoryBinding(client).readForPublication(scope):null;
 const target=connection?connectionTarget(connection,input,siteRepository):configuredPublicationTarget(input);
 const tokens=connection?.tokens??{github:process.env.GNR8_STANDALONE_GITHUB_TOKEN??'',vercel:process.env.GNR8_STANDALONE_VERCEL_TOKEN??''};
 if(!tokens.github||!tokens.vercel)throw Error('standalone_connection_unavailable');
 let recoveries:Record<string,unknown>;
 try{recoveries=JSON.parse(process.env.GNR8_STANDALONE_STAGE_RECOVERY??'{}');}catch{throw Error('standalone_recovery_not_authorized');}
 if(!recoveries||typeof recoveries!=='object'||Array.isArray(recoveries))throw Error('standalone_recovery_not_authorized');
 const recovery=parseStageRecoveryAuthorization(recoveries[input.selection.scope.siteId]);
 const guardedAuthorize=async()=>{const actor=await authorize();if(connection){const current=await connections.read(scope);
  const currentRepository=process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED==='1'
   ?await new SiteGitHubRepositoryBinding(client).readForPublication(scope):null;
  if(!current||fingerprint(connectionTarget(current,input,currentRepository))!==fingerprint(target))
   throw Error('standalone_connection_changed');}return actor;};
 const provider=new GitHubVercelPublicationProvider(store,tokens,fetch,recovery);
 return {target,client,bucket,store,provider,service:publicationService(store,provider,guardedAuthorize),requestId:fingerprint({input,target})};
}
