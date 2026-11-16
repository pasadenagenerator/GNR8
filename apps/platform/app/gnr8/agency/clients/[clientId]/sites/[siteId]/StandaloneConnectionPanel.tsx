'use client';
import {useEffect,useState,useRef} from 'react';
import type {ConnectionSettings} from '@/gnr8/standalone/publication-connection';
import {publicationMessage} from '@/gnr8/standalone/publication-messages';
type Props={endpoint:string;canPublish:boolean;onSaved:()=>void};
type Accounts={github:Array<{login:string;id:number;kind:'User'|'Organization'}>;vercel:Array<{id:string;name:string}>;limited:boolean};
type RepositoryBinding={owner:string;ownerId:number;ownerKind:'User'|'Organization';
 repository:string;repositoryId:number};
export default function StandaloneConnectionPanel({endpoint,canPublish,onSaved}:Props){
 const [state,setState]=useState('loading'),[revision,setRevision]=useState(0),[settings,setSettings]=useState<ConnectionSettings|null>(null),[accounts,setAccounts]=useState<Accounts|null>(null),[github,setGithub]=useState(''),[vercel,setVercel]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[domain,setDomain]=useState<any>(null);
 const [repositoryBinding,setRepositoryBinding]=useState<RepositoryBinding|null>(null);
 const [owner,setOwner]=useState(''),[team,setTeam]=useState(''),[repository,setRepository]=useState(''),[project,setProject]=useState(''),[host,setHost]=useState(''),[hostPurpose,setHostPurpose]=useState<'working'|'final'>('working'),[domainMode,setDomainMode]=useState<'new'|'transfer'>('new');
 const [contact,setContact]=useState(false),[recipient,setRecipient]=useState(''),[confirmed,setConfirmed]=useState(false),[maxClaims,setMaxClaims]=useState(''),[perHour,setPerHour]=useState(''),[days,setDays]=useState('');
 const currentEndpoint=useRef(endpoint);currentEndpoint.current=endpoint;
 const connectionEndpoint=endpoint.replace('/standalone?','/standalone/connection?');
 function load(value:any){setState(value.state);setRevision(value.revision??0);const bound=value.repositoryBinding as RepositoryBinding|undefined;
  setRepositoryBinding(bound??null);if(bound&&!value.settings){setOwner(bound.owner);setRepository(bound.repository);}
  if(value.settings){const s=value.settings as ConnectionSettings;setSettings(s);setOwner(s.githubOwner);setTeam(s.vercelTeamId);setRepository(s.repository);setProject(s.project);setHost(s.host);setHostPurpose(s.hostPurpose);setDomainMode(s.domainMode);setContact(Boolean(s.contact));setRecipient(s.contact?.recipient??'');setConfirmed(s.contact?.confirmed??false);setMaxClaims(String(s.contact?.maxClaims??''));setPerHour(String(s.contact?.perHour??''));setDays(String(s.contact?.retentionDays??''));}}
 async function call(action?:string){
  setBusy(true);setNotice('');
  try{
   const selected=accounts?.github.find(a=>a.login===owner);
   const next={githubOwner:repositoryBinding?.owner??owner,githubOwnerId:repositoryBinding?.ownerId??selected?.id??settings?.githubOwnerId,githubOwnerKind:repositoryBinding?.ownerKind??selected?.kind??settings?.githubOwnerKind,vercelTeamId:team,repository:repositoryBinding?.repository??repository,project,host:host.trim().toLowerCase(),hostPurpose,domainMode,contact:contact?{recipient,confirmed,maxClaims:Number(maxClaims),perHour:Number(perHour),retentionDays:Number(days)}:null};
   const response=await fetch(connectionEndpoint,action?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,...(['accounts','save'].includes(action)&&github&&vercel?{tokens:{github,vercel}}:{}),...(action==='save'?{settings:next,expectedRevision:revision,confirmation:'connect-dedicated-publication-target'}:{})})}:{cache:'no-store'});
   const result=await response.json();if(currentEndpoint.current!==endpoint)return;if(!response.ok||!result.ok)throw Error(result.error);
   if(action==='accounts'){setAccounts(result.data);setNotice('Računa sta preverjena. Izberite dovoljeni cilj.');}
   else if(action==='domain')setDomain(result.data);
   else if(action==='contact')setNotice('Neodvisni Redis odgovarja; Production nastavitve so prisotne. Testna pošta ni bila poslana. Veljavnost Resend ključa in prejem je treba preveriti z ločeno odobreno oddajo na pregledani izdaji.');
   else if(action==='verify')setNotice('Lastništvo in namenska vira sta preverjena. Veljavnost povezave se ponovno preveri ob pripravi.');
   else {load(result.data);if(action==='save'){setGithub('');setVercel('');setNotice('Povezava je shranjena. Zdaj lahko pripravite izbrano izdajo.');onSaved();}}
  }catch(error){if(currentEndpoint.current===endpoint)setNotice(publicationMessage(error instanceof Error?error.message:''));}finally{if(currentEndpoint.current===endpoint)setBusy(false);}
 }
 useEffect(()=>{setState('loading');setSettings(null);setAccounts(null);setRepositoryBinding(null);setGithub('');setVercel('');setDomain(null);setOwner('');setTeam('');setRepository('');setProject('');setHost('');setContact(false);setRecipient('');setConfirmed(false);setMaxClaims('');setPerHour('');setDays('');setRevision(0);void call();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[connectionEndpoint]);
 if(state==='disabled')return null;
 return <details open={state==='not_connected'}><summary>Povezava računa, kontakt in domena — {state==='connected'?'povezano':'nastavitev'}</summary>
 <fieldset disabled={busy||!canPublish} style={{display:'grid',gap:8,minWidth:0}}><legend>Namenska povezava te strani</legend>
 <p>{repositoryBinding?'Repozitorij te strani je že povezan z uvozom; za objavo se uporabi isti repozitorij. ':'Prvič povežite lastniška računa. '}Preverjanje samo bere; ne ustvarja repozitorija, projekta ali plačljivih storitev. Ključi se shranijo šifrirano in se ne vrnejo v brskalnik. Za naslednje izdaje ostaneta ista namenska vira.</p>
 <label>GitHub ključ <input type="password" autoComplete="off" value={github} onChange={e=>setGithub(e.target.value)}/></label>
 <label>Vercel ključ <input type="password" autoComplete="off" value={vercel} onChange={e=>setVercel(e.target.value)}/></label>
 <p>GitHub: lastniški račun oziroma skrbnik organizacije in dostop do zasebnega repozitorija{repositoryBinding?'.':' ter pravica ustvarjanja, če še ne obstaja.'} Vercel: ključ omejite na izbrano ekipo. Pravice se ne širijo samodejno.</p>
 <button type="button" onClick={()=>void call('accounts')}>Preveri računa in dovoljene cilje</button>
 {accounts?.limited&&<p>Prikazan je omejen seznam računov. Manjkajočega cilja ne izberite z ugibanjem identitete.</p>}
 {accounts?<><label>GitHub lastnik <select aria-label="GitHub lastnik" value={owner} disabled={revision>0||Boolean(repositoryBinding)} onChange={e=>setOwner(e.target.value)}><option value="">Izberite</option>{repositoryBinding&&!accounts.github.some(a=>a.login===repositoryBinding.owner)&&<option value={repositoryBinding.owner}>{repositoryBinding.owner}</option>}{accounts.github.map(a=><option key={a.id} value={a.login}>{a.login}</option>)}</select></label><label>Vercel ekipa <select aria-label="Vercel ekipa" value={team} disabled={revision>0} onChange={e=>setTeam(e.target.value)}><option value="">Izberite</option>{accounts.vercel.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label></>:settings&&<p>GitHub: {owner} · Vercel: {team}</p>}
 <label>Ime zasebnega repozitorija <input value={repository} disabled={revision>0||Boolean(repositoryBinding)} onChange={e=>setRepository(e.target.value)}/></label>
 <label>Ime namenskega Vercel projekta <input value={project} disabled={revision>0} onChange={e=>setProject(e.target.value)}/></label>
 <label>Točen host brez https:// <input value={host} onChange={e=>setHost(e.target.value)}/></label>
 <label>Namen <select value={hostPurpose} onChange={e=>setHostPurpose(e.target.value as 'working'|'final')}><option value="working">Delovni host</option><option value="final">Končni host</option></select></label>
 <label>Vezava <select value={domainMode} onChange={e=>setDomainMode(e.target.value as 'new'|'transfer')}><option value="new">Nov host</option><option value="transfer">Prenos obstoječega hosta</option></select></label>
 <label><input type="checkbox" checked={contact} onChange={e=>setContact(e.target.checked)}/>Stran uporablja podprti kontaktni obrazec</label>
 {contact&&<><label>Prejemnik <input type="email" value={recipient} onChange={e=>{setRecipient(e.target.value);setConfirmed(false);}}/></label><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Kot lastnik potrjujem prejemnika, neodvisni Resend/Redis storitvi in spodnjo politiko. Ustvarjanja storitev ali pošiljanja pošte s tem ne naročam.</label>
 <label>Največ skupnih novih oddaj (1–99999) <input type="number" min="1" max="99999" value={maxClaims} onChange={e=>setMaxClaims(e.target.value)}/></label><label>Največ oddaj na IP na uro (1–100) <input type="number" min="1" max="100" value={perHour} onChange={e=>setPerHour(e.target.value)}/></label><label>Hramba vsebine oddaje v dneh (1–365) <input type="number" min="1" max="365" value={days} onChange={e=>setDays(e.target.value)}/></label>
 <p>Redis hrani vsebino le do izteka; kontrolni hash in status za preprečevanje ponovnega pošiljanja ostane. Hramba v prejemnikovem nabiralniku in pri Resend je ločena. Meja ne zagotavlja brezplačnosti računa: lastnik preveri paket in preostalo kvoto. Brez novih storitev ali pošte ob shranjevanju.</p>
 <p>Po ustvaritvi projekta lastnik v Vercel → Settings → Environment Variables vnese neodvisne Production vrednosti CONTACT_REDIS_URL, CONTACT_REDIS_TOKEN, CONTACT_RATE_SECRET, CONTACT_RESEND_KEY, CONTACT_FROM in CONTACT_ALLOWED_HOSTS. Redis mora biti trajen in brez eviction. Skrivnosti nikoli ne sodijo v Git.</p></>}
 <button type="button" disabled={!owner||!team||!repository||!project||!host||contact&&!confirmed} onClick={()=>void call('save')}>Preveri razpoložljivost in shrani povezavo</button>
 {state==='connected'&&<><button type="button" onClick={()=>void call('verify')}>Preveri povezavo</button>{contact&&<button type="button" onClick={()=>void call('contact')}>Preveri kontaktno povezavo brez pošte</button>}<button type="button" onClick={()=>void call('domain')}>Preveri domeno in DNS pogoje</button></>}
 </fieldset>
 {domain&&<div><p>Domena: {domain.host} · stanje: {domain.state}. TLS: {domain.tlsReady?'veljaven':'še ni potrjen'}. DNS: {domain.dnsConfigured?'trenutno veljaven':'še ni potrjen'}. Lastništvo: {domain.verified?'potrjeno':'še ni potrjeno'}.</p><p>Projekt: {domain.projectId??'še ni ustvarjen'} · produkcijski cilj: {domain.productionDeploymentId??'še ni nastavljen'}. Prejšnja vezava: {domain.previousProjectId??'ni zaznana'} · wildcard: {domain.wildcardProjectId??'ni zaznan v tej ekipi'}.</p>
 {domain.verification?.map((v:any,i:number)=><p key={i}>Dokaz lastništva: {v.type} {v.domain} → {v.value}</p>)}
 <p>Priporočene nove vrednosti ponudnika (veljavnega DNS ni treba spreminjati samo zaradi priporočila):</p><pre>{JSON.stringify({CNAME:domain.recommendedCNAME,IPv4:domain.recommendedIPv4},null,2)}</pre>
 <p>{domain.tls}</p><p>{domainMode==='transfer'?'Prenos med projekti lahko prekine dostop. Najprej preglejte in odobrite izdajo, pripravite stari projekt/host in povrnitev, nato v prisotnosti lastnika premaknite samo točen host v Vercelu in takoj izvedite Publish. Wildcard in nadrejene domene ostanejo nedotaknjeni.':'V Vercel → Project → Settings → Domains dodajte samo ta host na Production. Dokaz lastništva in DNS vrednosti uredi lastnik; nato osvežite preverjanje.'}</p>
 <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">Odpri Vercel</a><p>Recovery brez GNR8: v istem projektu izberite prejšnji preverjeni deployment in Instant Rollback oziroma Promote. Ne izberite Redeploy. Pri prenosu med projekti je potrebna tudi povrnitev vezave hosta na prejšnji projekt. Preverite točen alias, HTTPS in vsebino.</p></div>}
 <p role="status">{notice}</p></details>;
}
