'use client';
import {useEffect,useState,useRef} from 'react';
import StandaloneConnectionPanel from './StandaloneConnectionPanel';
import {publicationMessage} from '@/gnr8/standalone/publication-messages';
import type {PublicOutputSelection} from '@/gnr8/output-adapters/public-output-service';
type Props={agencyId:string;clientId:string;siteId:string;selection:PublicOutputSelection;canPublish:boolean};
type Status={state:string;target?:{githubOwner:string;repository:string;project:string;host:string;domainMode?:'new'|'transfer'};release?:{manifestSha256:string;routes:string[];input:{selection:{revision?:number;sha256:string}};target:{githubOwner:string;repository:string;project:string;host:string;domainMode?:'new'|'transfer'}};git?:{commit:string;repository:string};deployment?:{deploymentId:string;url:string;configurationSha256:string};evidenceSha256?:string;live?:{domainReady:boolean};firstFailure?:{code:string}|null};
export default function StandalonePublicationPanel(p:Props){
 const [status,setStatus]=useState<Status|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[reviewed,setReviewed]=useState(false);
 const endpoint=`/api/gnr8/agency/clients/${p.clientId}/sites/${p.siteId}/standalone?agencyId=${encodeURIComponent(p.agencyId)}`;
 const selectionKey=JSON.stringify({endpoint,selection:p.selection});const currentSelection=useRef(selectionKey);currentSelection.current=selectionKey;
 async function call(action?:'prepare'|'approve'|'publish'|'connect-domain'){
  setBusy(true);setNotice('');
  try{
   const response=await fetch(action?endpoint:endpoint+'&'+new URLSearchParams(p.selection),action?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...p.selection,action,...(action==='prepare'?{}:{evidenceSha256:status?.evidenceSha256,confirmation:action==='approve'?'approve-exact-standalone-deployment':action==='connect-domain'?'connect-reviewed-release-host':'publish-exact-standalone-deployment'})})}:{cache:'no-store'});
   const value=await response.json();if(!response.ok||!value.ok)throw Error(value.error??'Priprava ni potrjena. Osvežite stanje.');
   if(currentSelection.current===selectionKey){setStatus(value.data);setReviewed(false);}
  }catch(e){if(currentSelection.current===selectionKey)setNotice(publicationMessage(e instanceof Error?e.message:''));}finally{if(currentSelection.current===selectionKey)setBusy(false);}
 }
 useEffect(()=>{setStatus(null);setReviewed(false);void call();
 // An immutable artifact selection resets the entire review, not only the URL.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[endpoint,selectionKey]);
 if(status?.state==='disabled')return null;
 const target=status?.release?.target??status?.target;
 return <section aria-label="Samostojna objava" style={{borderTop:'1px solid #cbd5e1',paddingTop:16,display:'grid',gap:8,overflowWrap:'anywhere'}}>
  <h3>Samostojna objava GitHub → Vercel</h3>
  <StandaloneConnectionPanel endpoint={endpoint} canPublish={p.canPublish} onSaved={()=>void call()}/>
  <p>Potrjena vsebina, postavitev vseh strani in vodič znamke → preverjena Astro gradnja → zasebni predogled GitHub/Vercel → vaš Publish. Stacki Save hrani osnutek in sam ne sproži objave.</p>
  {target&&<p>Repozitorij: {target.githubOwner}/{target.repository}<br/>Vercel projekt: {target.project}<br/>Delovna domena: {target.host}</p>}
  {status?.release&&<p>{status.release.input.selection.revision===undefined?'Shranjeni Astro izvor':'Stacki revizija '+status.release.input.selection.revision} · {status.release.routes.length} strani<br/>SHA izvora: {status.release.input.selection.sha256}<br/>Izvozni manifest: {status.release.manifestSha256}</p>}
  {status?.git&&<p>Git commit: {status.git.commit}</p>}
  {status?.deployment&&<p>Deployment: {status.deployment.deploymentId}<br/>Konfiguracija: {status.deployment.configurationSha256}<br/><a href={status.deployment.url} target="_blank" rel="noreferrer">Odpri točno izdajo za pregled</a></p>}
  <p>Stanje: {({unprepared:'priprava še ni zahtevana',preparing:'priprava poteka',building:'gostovana gradnja poteka',review:'čaka na vaš pregled',approved:'odobreno; preverite domeno pred Publish',published:'objavljena točna izdaja'} as Record<string,string>)[status?.state??'']??'nalaganje'}</p>
  {status?.firstFailure&&<p>Prva zabeležena ovira: {publicationMessage(status.firstFailure.code)}</p>}
  {!['review','approved','published'].includes(status?.state??'')&&<button disabled={busy||!p.canPublish||!status||status.state==='disabled'} onClick={()=>void call('prepare')}>Pripravi oziroma nadaljuj izbrano izdajo</button>}
  {status?.state==='review'&&<><label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>Pregledal sem prikazano izdajo na namizju in telefonu ter potrjujem vsebino, povezave in kontakt.</label><button disabled={!reviewed||busy||!p.canPublish} onClick={()=>void call('approve')}>Odobri točno izdajo</button></>}
  {status?.state==='approved'&&<>{target?.domainMode==='new'&&!status.live?.domainReady&&<><p>Po pregledu lahko priključite točen nov host. To ne spreminja DNS ali prenaša obstoječega hosta. Nato preverite dokaz lastništva, DNS in TLS v nastavitvah povezave.</p><button disabled={busy||!p.canPublish} onClick={()=>void call('connect-domain')}>Priključi potrjeni novi host</button></>}<p>{status.live?.domainReady?'Domena je pripravljena.':'Pred objavo je treba dokončati odobren prenos domene in TLS na namenski projekt.'}</p><button disabled={busy||!p.canPublish||!status.live?.domainReady} onClick={()=>void call('publish')}>Publish — objavi pregledano izdajo</button></>}
  <button disabled={busy} onClick={()=>void call()}>Osveži stanje izdaje</button>
  <p role="status">{notice}</p>
 </section>;
}
