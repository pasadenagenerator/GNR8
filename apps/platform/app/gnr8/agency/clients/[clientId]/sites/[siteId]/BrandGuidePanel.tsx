'use client';
import { useState, useEffect, type CSSProperties } from 'react';
import { BRAND_FIELDS, type BrandGuide, type BrandKey } from '@/gnr8/brand/brand-guide';
import { brandValueError } from '@/gnr8/brand/brand-guide-values';
import { rebaseBrandDraft } from '@/gnr8/brand/brand-guide-editing';
const inputStyle={width:'100%',padding:8,border:'1px solid #cbd5e1',borderRadius:6};
type FontPreview={family:string;message:string};
const fallbackFont={family:'system-ui, sans-serif',message:'Nadomestna pisava: system-ui. Shranjena pisava za ta izbor ni na voljo.'};
function useRetainedFonts(guide:BrandGuide|null,body:string,heading:string,bodyWeight:string,headingWeight:string){
  const siteVersionId=guide?.siteVersionId,fontFaces=guide?.fontFaces;
  const [fonts,setFonts]=useState<{body:FontPreview;heading:FontPreview}>({body:fallbackFont,heading:fallbackFont});
  useEffect(()=>{
    let active=true;const loaded:FontFace[]=[];
    setFonts({body:{...fallbackFont,message:'Preverjam pisavo; začasno system-ui.'},heading:{...fallbackFont,message:'Preverjam pisavo; začasno system-ui.'}});
    async function load(role:'body'|'heading',family:string,weight:string):Promise<FontPreview>{
      const name=family.split(',')[0].trim().replace(/^['"]|['"]$/g,'');
      const numeric=weight==='bold'?'700':weight==='normal'||!weight?'400':weight;
      const source=fontFaces?.find(f=>f.family.toLowerCase()===name.toLowerCase()&&f.weight===numeric&&f.style==='normal');
      if(!source?.previewUrl?.startsWith('/api/gnr8/runtime/preview-assets/'))return {...fallbackFont,message:`${name||'Neizbrana pisava'} (${numeric}): ni shranjenega vira. Nadomestna pisava: system-ui.`};
      const alias=`GNR8Brand_${siteVersionId!.replace(/[^a-z0-9]/gi,'')}_${role}_${numeric}`;
      try{
        const face=new FontFace(alias,`url(${JSON.stringify(source.previewUrl)})`,{weight:numeric,style:'normal'});
        let timeout:ReturnType<typeof setTimeout>|undefined;
        try{await Promise.race([face.load(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('font_timeout')),10000);})]);}finally{if(timeout)clearTimeout(timeout);}
        if(active){document.fonts.add(face);loaded.push(face);}
        return {family:`"${alias}", system-ui, sans-serif`,message:`${name} (${numeric}): shranjena pisava je naložena.`};
      }catch{return {...fallbackFont,message:`${name} (${numeric}): nalaganje ni uspelo. Nadomestna pisava: system-ui.`};}
    }
    void Promise.all([load('body',body,bodyWeight),load('heading',heading,headingWeight)]).then(([body,heading])=>{if(active)setFonts({body,heading});});
    return ()=>{active=false;loaded.forEach(f=>document.fonts.delete(f));};
  },[siteVersionId,fontFaces,body,heading,bodyWeight,headingWeight]); // only retained same-origin font files
  return fonts;
}
export function BrandGuidePanel(props:{agencyId:string;clientId:string;siteId:string;siteVersionId:string|null;canEdit:boolean;canPrepare?:boolean;proposal?:{revision:number;previewUrl:string}|null}){
  const [guide,setGuide]=useState<BrandGuide|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[dirty,setDirty]=useState(false);
  const [edited,setEdited]=useState<BrandKey[]>([]),[latest,setLatest]=useState<BrandGuide|null>(null),[conflict,setConflict]=useState(false);
  const [preserveFunctions,setPreserveFunctions]=useState(false),[recipient,setRecipient]=useState(''),[recipientConfirmed,setRecipientConfirmed]=useState(false);
  const [excludedRoutes,setExcludedRoutes]=useState(''),[omittedBackgroundImages,setOmittedBackgroundImages]=useState('');
  const endpoint=`/api/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/brand-guide?agencyId=${encodeURIComponent(props.agencyId)}&siteVersionId=${encodeURIComponent(props.siteVersionId??'')}`;
  async function request(save=false,compare=false){
    setBusy(true);setMessage('');
    try{
      const r=await fetch(endpoint,{cache:'no-store',...(save?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({artifactId:guide?.artifactId,revision:guide?.revision,decisions:guide?.decisions})}:{})});
      const result=await r.json();if(!r.ok){if(r.status===409&&save)setConflict(true);throw Error(result.error??'Vodič ni na voljo.');}
      if(compare){setLatest(result.guide);setMessage('Osnutek je ohranjen. Primerjajte vrednosti in izberite nadaljevanje.');return;}
      setGuide(result.guide);setDirty(false);setEdited([]);setLatest(null);setConflict(false);setMessage(save?'Vodič je shranjen.':'Vodič je odprt iz shranjenega vhoda.');
    }catch(error){setMessage(error instanceof Error?error.message:'Vodič ni na voljo.');}finally{setBusy(false);}
  }
  async function prepareLumos(){
    if (!guide || dirty || busy || !guide.revision) return;
    setBusy(true);setMessage('Pripravljam Lumos predlog iz shranjenega vodiča …');
    try {
      const response=await fetch('/api/gnr8/site-actions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
        agencyId:props.agencyId,siteId:props.siteId,actionType:'generate_redesign',outputAdapterId:'astro-static-site',
        lumosBrand:{siteVersionId:guide.siteVersionId,artifactId:guide.artifactId,revision:guide.revision},
        ...(preserveFunctions?{retainedFunctions:{kind:'retained-functions-v1',contact:{recipient,recipientConfirmed},
          omittedBackgroundImages:omittedBackgroundImages.split('\n').map(url=>url.trim()).filter(Boolean),
          excludedRoutes:excludedRoutes.split('\n').map(path=>path.trim()).filter(Boolean).map(path=>({path,reason:'obsolete-template'}))}}:{}),
      })});
      const result=await response.json();
      if(!response.ok||!result.ok)throw Error(result.error??result.action?.resultSummary??'Priprava ni uspela.');
      setMessage('Priprava je v čakalni vrsti. Po zaključku dejanja izberite različico »Lumos · vodič '+guide.revision+'«. Tu se prikaže njen predogled, nato jo lahko odprete v Stackiju. Predlog ni javno objavljen.');
    }catch(error){setMessage(error instanceof Error?error.message:'Priprava ni uspela.');}finally{setBusy(false);}
  }
  const value=(key:BrandKey)=>guide?.decisions[key]?.value??guide?.proposals[key]?.value??'';
  const fonts=useRetainedFonts(guide,value('fontFamily'),value('headingFamily'),value('fontWeight'),value('headingWeight'));
  const previewValue=(key:BrandKey)=>brandValueError(key,value(key))?undefined:value(key)||undefined;
  const invalidEdits=edited.some(key=>!!brandValueError(key,value(key)));
  function recover(keep:boolean){if(!guide||!latest)return;try{setGuide(keep?rebaseBrandDraft(guide,latest,edited):latest);setDirty(keep);if(!keep)setEdited([]);setLatest(null);setConflict(false);setMessage(keep?'Vaše spremembe so ohranjene na zadnji različici. Preglejte jih in shranite.':'Uporabljena je zadnja shranjena različica.');}catch(error){setMessage(error instanceof Error?error.message:'Osnutka ni mogoče povezati.');}}
  function change(key:BrandKey,value:string,confirmed=false){setEdited(keys=>keys.includes(key)?keys:[...keys,key]);setGuide(g=>g?{...g,decisions:{...g.decisions,[key]:{value,confirmed}}}:g);setDirty(true);}
  const preview:CSSProperties={padding:24,border:'1px solid #cbd5e1',borderRadius:8,overflow:'hidden',backgroundColor:previewValue('background'),color:previewValue('text'),fontFamily:fonts.body.family,fontWeight:previewValue('fontWeight'),fontSize:previewValue('fontSize'),lineHeight:previewValue('lineHeight')};
  return <section aria-label="Brand style guide" style={{padding:20,border:'1px solid #cbd5e1',borderRadius:12,background:'white',display:'grid',gap:16}}>
    <h2 style={{margin:0}}>Brand style guide</h2>
    <p style={{margin:0}}>Opaženi slog → predlog → vaša potrditev. Urejanje vodiča ne spreminja sprejetega predogleda strani.</p>
    {!guide?<button disabled={busy||!props.siteVersionId} onClick={()=>request()}>{busy?'Odpiram …':'Odpri vodič znamke'}</button>:<>
      <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        <button disabled={busy||!props.canEdit||!dirty||invalidEdits||conflict||!!latest} onClick={()=>request(true)}>Shrani vodič</button>
        <button disabled={busy} onClick={()=>request(false,dirty)}>{dirty?'Primerjaj z zadnjo shranjeno različico':'Ponovno odpri shranjeno'}</button>
        <span>{dirty?'Neshranjene spremembe':guide.revision?`Shranjena revizija ${guide.revision}`:'Predlog še ni shranjen'}{guide.savedAt?` · ${guide.savedAt}`:''}</span>
      </div>
      {conflict&&<p role="alert">Shranjevanje je naletelo na konflikt. Vaš osnutek ostaja ohranjen. Najprej primerjajte zadnjo shranjeno različico.</p>}
      {latest&&<section aria-label="Primerjava osnutka" style={{border:'1px solid #d97706',padding:12}}>
        <h3>Vaš osnutek in shranjena revizija {latest.revision}</h3>
        <p>Ob ohranitvi vaših sprememb se prenesejo samo polja, ki ste jih urejali. Druga polja prevzamejo zadnjo shranjeno vrednost. Nič se ne shrani samodejno.</p>
        {edited.map(key=><p key={key}>{BRAND_FIELDS[key]}: vaš osnutek »{value(key)||'prazno'}« · shranjeno »{latest.decisions[key]?.value??latest.proposals[key]?.value??'prazno'}«</p>)}
        <button disabled={busy} onClick={()=>recover(true)}>Ohrani moje spremembe na zadnji različici</button>{' '}
        <button disabled={busy} onClick={()=>recover(false)}>Zavrzi moj osnutek in uporabi zadnjo različico</button>
      </section>}
      <div aria-label="Predogled vodiča" style={preview}>
        {guide.logoOptions?.find(o=>o.path===value('logo')) && <img src={guide.logoOptions.find(o=>o.path===value('logo'))!.previewUrl} alt="Predlog logotipa" style={{maxWidth:220,maxHeight:100,objectFit:'contain',marginBottom:20}}/>}
        <strong style={{display:'block',color:previewValue('accent'),fontFamily:fonts.heading.family,fontSize:previewValue('headingSize'),fontWeight:previewValue('headingWeight'),lineHeight:previewValue('headingLineHeight')}}>Predogled znamke</strong>
        <p>Vzorec besedila, barv in tipografije.</p>
        <span style={{display:'inline-block',padding:previewValue('buttonPadding')??'12px 20px',borderRadius:previewValue('radius'),backgroundColor:previewValue('buttonBackground')??previewValue('accent'),color:previewValue('buttonText')}}>Vzorec gumba</span>
        <p style={{font:'12px/1.5 system-ui',marginTop:16}}>Besedilo: {fonts.body.message}<br/>Naslov: {fonts.heading.message}</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,300px),1fr))',gap:16}}>
        {(Object.entries(BRAND_FIELDS) as [BrandKey,string][]).map(([key,label])=>{
          const p=guide.proposals[key],d=guide.decisions[key],problem=brandValueError(key,value(key));
          return <div key={key} style={{padding:12,border:'1px solid #e2e8f0',borderRadius:8,minWidth:0}}>
            <label htmlFor={`brand-${key}`} style={{fontWeight:600}}>{label}</label>
            <input id={`brand-${key}`} maxLength={500} aria-invalid={!!problem} aria-describedby={problem?`brand-${key}-error`:undefined} disabled={busy||!props.canEdit} value={value(key)} onChange={e=>change(key,e.target.value)} style={inputStyle}/>
            {problem&&<p id={`brand-${key}-error`} style={{color:'#b91c1c',fontSize:13}}>{problem}</p>}
            <label style={{display:'block',margin:'8px 0'}}><input type="checkbox" disabled={busy||!props.canEdit||!value(key).trim()||!!problem} checked={!problem&&(d?.confirmed??false)} onChange={e=>change(key,value(key),e.target.checked)}/> Potrjeno za znamko</label>
            <small>{d?.confirmed?'Uporabniško potrjeno':d?'Uporabniški osnutek':p?'Predlog — še ni potrjeno':'Ni podatka — potreben pregled'}</small>
            {p&&<details style={{marginTop:8,overflowWrap:'anywhere'}}><summary>Izvor predloga</summary><p>{p.value} · {p.reason}</p>{p.evidence.map(id=>{const o=guide.observations.find(o=>o.id===id);return o?<p key={id}>{o.route??'Pot ni potrjena'} · {o.file} · {o.selector} · {o.property}: {o.value}<br/>{o.context}</p>:null;})}</details>}
          </div>;
        })}
      </div>
      <details><summary>Vsa opažanja ({guide.observations.length}) in omejitve</summary>
        {guide.limitations.map((text,i)=><p key={i}>{text}</p>)}
        <div style={{maxHeight:400,overflow:'auto'}}>{guide.observations.map(o=><p key={o.id} style={{overflowWrap:'anywhere'}}>{o.kind==='computed'?'Izračunani slog':o.kind==='element'?'Element':'Deklaracija CSS'} · {o.route??'Pot ni potrjena'} · {o.file} · {o.selector}<br/>{o.property}: {o.value} · {o.context}</p>)}</div>
      </details>
      <section aria-label="Lumos predlog" style={{display:'grid',gap:12}}>
        <h3>Lumos predlog iz uvoza</h3>
        <p>Uporabi shranjeni vodič in vse strani, ki jih podpira pretvornik. Potrjene vrednosti tipografije, barv besedila in gumbov se prenesejo v predlog. Logotip, postavitev in druge vrednosti ostanejo iz uvoza; vodič je priložen urejevalni različici.</p>
        <label><input type="checkbox" checked={preserveFunctions} disabled={busy} onChange={e=>setPreserveFunctions(e.target.checked)}/> Ohrani podprte funkcije in preseli kontaktni obrazec v GNR8. Nepodprte funkcije ustavijo pripravo.</label>
        {preserveFunctions&&<><label>Prejemnik kontaktnega obrazca<input type="email" value={recipient} disabled={busy} onChange={e=>{setRecipient(e.target.value);setRecipientConfirmed(false)}}/></label>
          <label><input type="checkbox" checked={recipientConfirmed} disabled={busy||!recipient} onChange={e=>setRecipientConfirmed(e.target.checked)}/> Potrjujem prejemnika za ta uvoz. Zasebni predogled ne pošilja sporočil.</label>
          <label>Izrecno izločene stare demo strani (ena pot na vrstico; sicer pustite prazno)<textarea value={excludedRoutes} disabled={busy} onChange={e=>setExcludedRoutes(e.target.value)}/></label>
          <label>Izrecno izpuščene manjkajoče slike ozadja (celoten izvorni URL na vrstico)<textarea value={omittedBackgroundImages} disabled={busy} onChange={e=>setOmittedBackgroundImages(e.target.value)}/></label></>}
        <button disabled={busy||dirty||conflict||!!latest||!guide.revision||!props.canPrepare||(preserveFunctions&&(!recipientConfirmed||!recipient))} onClick={prepareLumos}>Pripravi zasebni Lumos predlog</button>
        {!guide.revision&&<p>Najprej shranite vodič znamke.</p>}
        {props.proposal&&<><p>Izbrani predlog uporablja revizijo vodiča {props.proposal.revision}.{props.proposal.revision!==guide.revision?' Vodič je bil pozneje spremenjen; obstoječi predlog ostane ohranjen.':''}</p>
          <iframe title="Lumos predlog strani" src={props.proposal.previewUrl} sandbox="allow-scripts" style={{width:'100%',height:640,border:'1px solid #cbd5e1'}}/>
        </>}
      </section>
    </>}
    <p role="status" aria-live="polite" style={{margin:0}}>{message}</p>
  </section>;
}
