import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {listAgencyMembershipCandidates} from './resolve-current-agency';
import {canPerformAction,type AgencyAction} from './rbac';
/** A queued, authenticated action must re-check the actor at execution time.
 * Uses the same membership normalization and role policy as interactive actions. */
export async function requireAgencyBackgroundActor(client:SupabaseClient,input:{userId:string;agencyId:string;action:AgencyAction}){
 const result=await client.auth.admin.getUserById(input.userId);const user=result.data?.user;
 if(result.error||!user||user.banned_until&&Date.parse(user.banned_until)>Date.now())throw Error('standalone_actor_revoked');
 const superadmin=(process.env.SUPERADMIN_EMAILS??'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).includes(user.email?.toLowerCase()??'');
 if(superadmin&&canPerformAction('superadmin',input.action))return {userId:input.userId};
 const membership=(await listAgencyMembershipCandidates(client,input.userId)).find(m=>m.agency_id===input.agencyId);
 if(!membership||!canPerformAction(membership.role,input.action))throw Error('standalone_actor_revoked');
 return {userId:input.userId};
}
