'use client';
import {useEffect,useRef,useState} from 'react';
import type {PublicOutputSelection} from '@/gnr8/output-adapters/public-output-service';
import type {ImportReviewModel,RouteDecision} from '@/gnr8/standalone/import-review';
type Props={agencyId:string;clientId:string;siteId:string;selection:PublicOutputSelection;canEdit:boolean;preview:string|null};
const closureLabels:Record<string,string>={capture_identity_mismatch:'izvor zajema se ne ujema',selected_routes_mismatch:'seznam izbranih strani se ne ujema',technical_review_blocked:'tehnični pregled še ni uspešen',unsupported_capabilities:'prisotne so nepodprte funkcije',selected_route_unverified:'ena ali več strani ni preverjenih',selected_asset_unverified:'manjkajo ali niso preverjene datoteke strani',selected_widget_unverified:'najden je neznan gradnik brez preverjene podpore',selected_route_limited:'pregled strani ima omejitve',discovered_route_unresolved:'odkrite strani niso razrešene',omitted_links_unresolved:'ostale so izpuščene povezave',capture_limitations_unresolved:'zajem je bil omejen'};
export default function ImportReviewPanel(props:Props){
 // Remount on immutable selection changes; an older response cannot provide
 // decisions or a write token for the new selection.
 return <Review key={JSON.stringify([props.agencyId,props.clientId,props.siteId,props.selection])} {...props}/>;
}
function Review(p:Props){
 const [model,setModel]=useState<ImportReviewModel|null>(null),[routes,setRoutes]=useState<RouteDecision[]>([]),[brandConfirmed,setBrandConfirmed]=useState(false);
 const [scopeConfirmed,setScopeConfirmed]=useState(false);
 const [functionsConfirmed,setFunctionsConfirmed]=useState(false);
 const [busy,setBusy]=useState(true),[notice,setNotice]=useState('');
 const [monitorStudio,setMonitorStudio]=useState(false),[studioNotice,setStudioNotice]=useState('');
 const alive=useRef(false),sequence=useRef(0);
 const endpoint=`/api/gnr8/agency/clients/${p.clientId}/sites/${p.siteId}/standalone/import-review?agencyId=${encodeURIComponent(p.agencyId)}`;
 const studioStatusQuery=new URLSearchParams({...p.selection,agencyId:p.agencyId}).toString();
 async function request(save=false){
  const call=++sequence.current;
  setBusy(true);setNotice('');
  try {
   const response=await fetch(save?endpoint:endpoint+'&'+new URLSearchParams(p.selection),save?{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({...p.selection,token:model?.token,routes,brandConfirmed})}:{cache:'no-store'});
   const value=await response.json();
   if(!response.ok||!value.ok)throw Error(value.error??'Pregleda ni mogoče shraniti.');
   if(alive.current&&call===sequence.current){setModel(value.data);setRoutes(value.data.routes);setBrandConfirmed(value.data.brand.confirmed);setScopeConfirmed(false);setFunctionsConfirmed(false);setNotice(save?'Pregled je shranjen za prikazani izvor. Objava ni sprožena.':'');
    if(!value.data.confirmedAt){setMonitorStudio(false);setStudioNotice('');}}
  }catch(error){if(alive.current&&call===sequence.current)setNotice(error instanceof Error?error.message:'Pregled ni na voljo.');}
  finally{if(alive.current&&call===sequence.current)setBusy(false);}
 }
 async function confirm(){
  const call=++sequence.current;setBusy(true);setNotice('');
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...p.selection,action:'confirm',token:model?.token,scopeConfirmed,functionsConfirmed})});
   const value=await response.json();if(!response.ok||!value.ok)throw Error(value.error??'Potrditve ni mogoče shraniti.');
   if(alive.current&&call===sequence.current){setModel(value.data);setFunctionsConfirmed(false);
    if(value.sourcePreparation==='queued'){
     setStudioNotice('Priprava zasebnega paketa Studia poteka.');setMonitorStudio(true);
    }else if(value.sourcePreparation==='queue-failed'||value.sourcePreparation==='unavailable'){
     setMonitorStudio(false);setStudioNotice('');
    }
    setNotice(value.sourcePreparation==='queued'
     ?'Izbrani uvoz je potrjen. Zasebna priprava Studia je zahtevana; objava ni sprožena.'
     :value.sourcePreparation==='queue-failed'
      ?'Izbrani uvoz je potrjen. Priprave Studia ni bilo mogoče sprožiti; uporabite gumb za ponovni poskus. Objava ni sprožena.'
      :value.sourcePreparation==='unavailable'
       ?'Izbrani uvoz je potrjen. Priprava Studia še ni nastavljena za to stran. Objava ni sprožena.'
      :'Izbrani uvoz je potrjen. Objava ni sprožena.');}
  }catch(error){if(alive.current&&call===sequence.current)setNotice(error instanceof Error?error.message:'Potrditev ni na voljo.');}
  finally{if(alive.current&&call===sequence.current)setBusy(false);}
 }
 async function prepareStudio(){
  const call=++sequence.current;setBusy(true);setNotice('');
  try{
   const response=await fetch(`/api/gnr8/agency/clients/${p.clientId}/sites/${p.siteId}/native-studio`,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({...p.selection,agencyId:p.agencyId,action:'prepare-source'})});
   const value=await response.json();
   if(!response.ok||!value.ok)throw Error('Priprave Studia ni mogoče začeti. Osvežite pregled.');
   if(alive.current&&call===sequence.current){setNotice('Priprava zasebnega paketa Studia je zahtevana. Objava ni sprožena.');
    setStudioNotice('Priprava zasebnega paketa Studia poteka.');setMonitorStudio(true);}
  }catch(error){if(alive.current&&call===sequence.current)setNotice(error instanceof Error?error.message:'Priprava ni na voljo.');}
  finally{if(alive.current&&call===sequence.current)setBusy(false);}
 }
 async function checkStudio(){
  const call=++sequence.current;setBusy(true);setNotice('');
  try{
   const endpoint=`/api/gnr8/agency/clients/${p.clientId}/sites/${p.siteId}/native-studio`;
   const response=await fetch(endpoint+'?'+new URLSearchParams({...p.selection,agencyId:p.agencyId}),{cache:'no-store'});
   const value=await response.json();
   if(!response.ok||!value.ok)throw Error('Stanja priprave ni mogoče prebrati.');
   if(alive.current&&call===sequence.current){setMonitorStudio(value.data.state==='preparing-source');setStudioNotice(value.data.state==='prepared-source'
    ?`Zasebni paket Studia je pripravljen: ${value.data.files} datotek. Objava ni sprožena.`
    :value.data.state==='failed-source'
     ?'Priprava paketa ni uspela. Pregled lahko osvežite in pripravo ponovno zahtevate.'
     :'Priprava zasebnega paketa še poteka.');}
  }catch(error){if(alive.current&&call===sequence.current)setNotice(error instanceof Error?error.message:'Stanje ni na voljo.');}
  finally{if(alive.current&&call===sequence.current)setBusy(false);}
 }
 useEffect(()=>{alive.current=true;void request();return()=>{alive.current=false;};
 // The parent remounts this component for every selection/scope change.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{
  if(!monitorStudio)return;
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined,failures=0;
  async function poll(){
   try{
    const response=await fetch(`/api/gnr8/agency/clients/${p.clientId}/sites/${p.siteId}/native-studio?${studioStatusQuery}`,
     {cache:'no-store',signal:controller.signal});
    const value=await response.json();
    if(!response.ok||!value.ok)throw Error('status_unavailable');
    if(controller.signal.aborted)return;
    failures=0;
    if(value.data.state==='prepared-source'){
     setStudioNotice(`Zasebni paket Studia je pripravljen: ${value.data.files} datotek. Objava ni sprožena.`);
     setMonitorStudio(false);
    }else if(value.data.state==='failed-source'){
     setStudioNotice('Priprava paketa ni uspela. Uporabite gumb za ponovni poskus.');
     setMonitorStudio(false);
    }else timer=setTimeout(()=>void poll(),5000);
   }catch{
    if(controller.signal.aborted)return;
    if(++failures>=3){
     setStudioNotice('Stanja priprave ni mogoče prebrati. Uporabite gumb za preverjanje.');
     setMonitorStudio(false);
    }else timer=setTimeout(()=>void poll(),5000);
   }
  }
  timer=setTimeout(()=>void poll(),1500);
  return()=>{controller.abort();if(timer)clearTimeout(timer);};
 },[monitorStudio,p.clientId,p.siteId,studioStatusQuery]);
 function decide(path:string,key:'contentConfirmed'|'layoutConfirmed',value:boolean){setRoutes(rows=>rows.map(r=>r.path===path?{...r,[key]:value}:r));}
 return <section aria-label="Pregled vsebine in postavitve" style={{borderTop:'1px solid #cbd5e1',paddingTop:16,overflowWrap:'anywhere'}}>
  <h3>Pregled vsebine, postavitve in znamke</h3>
  <p>Potrditve veljajo za izbrani shranjeni izvor. Preglejte vsebino, postavitev in delovanje vsake strani na namizju in telefonu. Pregled lahko shranite tudi delno.</p>
  {model&&<>
   <p>{model.revision===null?'Shranjeni Astro izvor':`Stacki revizija ${model.revision}`} · {routes.length} strani</p>
   {model.stale&&<p role="alert">Prejšnji pregled se nanaša na drug izvor ali spremenjen vodič. Potrditve ponovno označite.</p>}
   {!p.preview&&<p>Predogled točne izdaje tu še ni na voljo. Pred potrjevanjem jo preverite v delovnem prostoru.</p>}
   <fieldset disabled={busy||!p.canEdit}><legend>Pregled posameznih strani</legend>
    {routes.map(route=><div key={route.path} style={{padding:'8px 0',display:'flex',gap:12,flexWrap:'wrap'}}>
     <strong>{route.path}</strong>
     <a href={`/api/gnr8/runtime/versions/${encodeURIComponent(model.captureVersionId)}/preview?mode=raw_template_preview&path=${encodeURIComponent(route.path)}`} target="_blank" rel="noreferrer">Zajeti izvor</a>
     {p.preview&&<a href={`${p.preview}&path=${encodeURIComponent(route.path)}`} target="_blank" rel="noreferrer">Izbrana izdaja</a>}
     <label><input type="checkbox" aria-label={`Vsebina ${route.path}`} checked={route.contentConfirmed} onChange={e=>decide(route.path,'contentConfirmed',e.target.checked)}/>Vsebina potrjena</label>
     <label><input type="checkbox" aria-label={`Postavitev ${route.path}`} checked={route.layoutConfirmed} onChange={e=>decide(route.path,'layoutConfirmed',e.target.checked)}/>Postavitev potrjena</label>
    </div>)}
   </fieldset>
   <details><summary>Vodič znamke · {model.brand.revision===null?'ni shranjen':`revizija ${model.brand.revision}`}</summary>
    <p>Zajem: {model.captureVersionId}. Vodič urejate v zavihku Oblikovanje.</p>
    <dl>{model.brand.values.map(v=><div key={v.label}><dt>{v.label}</dt><dd>{v.value}</dd></div>)}</dl>
   </details>
   <label><input type="checkbox" disabled={busy||!p.canEdit||!model.brand.ready} checked={brandConfirmed} onChange={e=>setBrandConfirmed(e.target.checked)}/>Potrjujem prikazano shranjeno revizijo vodiča znamke.</label>
   {model.selectedClosure&&<p>Znane izbrane poti: {model.selectedClosure.status==='selected_routes_verified'?'tehnično preverjene':'potrebno je dopolniti zajem ali projekt'}.
    {model.selectedClosure.blockers.length>0&&` Ovire: ${model.selectedClosure.blockers.map(code=>closureLabels[code]??'preverjanje ni končano').join(', ')}.`} To še ne dokazuje, da so odkrite vse strani izvirnega spletišča.</p>}
   <p>Preostale ovire za nadaljnjo pripravo:</p><ul>{model.blockers.map(b=><li key={b}>{b}</li>)}</ul>
   <p>{model.savedAt?`Zadnje shranjevanje: ${model.savedAt}`:'Za ta izvor še ni shranjenega pregleda.'}</p>
   {model.confirmedAt&&<p>Izbrani obseg je potrjen od {model.confirmedAt}. To ne potrjuje celovitosti vseh strani izvirnega spletišča.</p>}
   {model.confirmedAt&&model.nativeStudioAvailable&&<button disabled={busy||monitorStudio||!p.canEdit} onClick={()=>void prepareStudio()}>Pripravi zasebni paket Studia</button>}
   {model.confirmedAt&&model.nativeStudioAvailable&&<button disabled={busy} onClick={()=>void checkStudio()}>Preveri pripravo Studia</button>}
   <button disabled={busy||!p.canEdit} onClick={()=>void request(true)}>Shrani pregled</button>
   <label style={{display:'block',marginTop:12}}><input type="checkbox" checked={scopeConfirmed} disabled={busy||!p.canEdit} onChange={e=>setScopeConfirmed(e.target.checked)}/> Potrjujem, da seznam izbranih strani vključuje vse strani, ki jih želim uvoziti.</label>
   <label style={{display:'block',marginTop:12}}><input type="checkbox" checked={functionsConfirmed} disabled={busy||!p.canEdit} onChange={e=>setFunctionsConfirmed(e.target.checked)}/> Preveril sem navigacijo in interaktivne gradnike na izbranih straneh v izbrani izdaji. Ta potrditev je moj pregled delovanja, ne samodejni tehnični dokaz.</label>
   <button disabled={busy||!p.canEdit||!scopeConfirmed||!functionsConfirmed||!model.savedAt||!model.brand.confirmed||model.selectedClosure?.status!=='selected_routes_verified'||routes.some(r=>!r.contentConfirmed||!r.layoutConfirmed)} onClick={()=>void confirm()}>Potrdi izbrani uvoz</button>
  </>}
  <button disabled={busy} onClick={()=>void request()}>Ponovno naloži shranjeni pregled</button>
  <p role="status">{busy?'Nalagam oziroma shranjujem pregled …':notice}</p>
  {studioNotice&&<p role="status" aria-live="polite">{studioNotice}</p>}
 </section>;
}
