import React from 'react';
import type { CapturedContentReview } from '@/gnr8/architecture/captured-content-review';
const statuses = {captured:'Zajeto',missing:'Manjka',unsupported:'Nepodprto',unverified:'Nepreverjeno'};
const routeStates = {reviewed:'Pregledano',failed:'Neuspešno',excluded:'Izločeno',unverified:'Nepreverjeno'};
const kinds: Record<string,string> = {text:'Besedilo',heading:'Naslov',link:'Povezava',image:'Slika',icon:'Ikona',gallery:'Galerija',slider:'Slajder',slide:'Slajd',form:'Obrazec',field:'Polje',button:'Gumb',video:'Video','media-source':'Vir medija',background:'Ozadje',embed:'Vdelana vsebina','unknown-widget':'Neznan gradnik'};
const regions: Record<string,string> = {header:'Glava',navigation:'Navigacija',body:'Vsebina',footer:'Noga',unknown:'Neopredeljeno'};
export default function CapturedContentReviewPanel({review}:{review:CapturedContentReview|null|undefined}) {
  return <section style={{border:'1px solid #e2e8f0',borderRadius:12,padding:20,background:'white',color:'#0f172a'}}>
    <h3 style={{marginTop:0}}>Vsebina in celovitost zajema</h3>
    <p>Pregled shranjenega izvora. »Zajeto« potrjuje zapis v HTML oziroma sklic v seznamu datotek, ne popolnosti izvirne strani ali delovanja funkcije.</p>
    {!review?<p>Za to različico ni razpoložljivega pregleda. Celovitost ni preverjena.</p>:<>
      <details><summary>Meje in dokazi zajema</summary>{review.limitations.map(s=><p key={s}>{s}</p>)}</details>
      {review.omittedLinks.length>0&&<details><summary>{review.omittedLinks.length} povezav, ki niso uvožene kot strani</summary><p>Datoteke, sidra, telefonske in zunanje povezave so izločene iz seznama strani. To ne pomeni, da njihove datoteke manjkajo v zajemu. Isti sklic je združen med fazami.</p><ul>{review.omittedLinks.map(link=><li key={link.reference} style={{overflowWrap:'anywhere'}}><strong>{link.reference}</strong><ul>{link.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul></li>)}</ul></details>}
      {review.routes.map(route=><details key={route.route} style={{borderTop:'1px solid #e2e8f0',padding:'14px 0'}}>
        <summary style={{cursor:'pointer',fontWeight:700}}>{route.route} · {routeStates[route.state]} — {route.items.filter(i=>!i.kind.startsWith('detector:')).length} elementov · {route.items.filter(i=>i.status==='missing').length} z manjkajočimi datotekami · {route.items.filter(i=>i.status==='unverified').length} vsebinsko nepreverjenih</summary>
        <p>Izvor: {route.sourceUrl??'Izvorni URL ni potrjen'} · shranjena pot: {route.filePath??'manjka'}</p>
        {route.state==='reviewed' && <a href={`/api/gnr8/runtime/versions/${encodeURIComponent(review.siteVersionId)}/preview?mode=raw_template_preview&path=${encodeURIComponent(route.route)}`} target="_blank" rel="noreferrer">Odpri shranjeni predogled te strani</a>}
        <ul>{route.limitations.map(s=><li key={s}>{s}</li>)}</ul>
        {route.coverage.length>0&&<details><summary>Pokritost posebnih vrst vsebine</summary><ul>{route.coverage.map(c=><li key={c.category}><strong>{c.category}: {c.status==='partial'?'delno pregledano':'nepreverjeno'}</strong><p>{c.detail}</p>{c.evidenceRefs.length>0&&<small>Dokazi: {c.evidenceRefs.join(', ')}</small>}</li>)}</ul></details>}
        <p>{route.items.filter(i=>i.evidence==='element'&&i.support==='unverified').length} gradnikov z nepreverjeno podporo pretvorbi ali delovanju.</p>
        {route.items.map(item=><details key={item.id} style={{padding:8,borderBottom:'1px solid #f1f5f9'}}>
          <summary style={{cursor:'pointer'}}>#{item.order} · {regions[item.region]??item.region} · {kinds[item.kind]??'Namig detektorja: '+item.kind.replace('detector:','')} · {statuses[item.status]} — {item.text.slice(0,110)||'Brez besedilnega opisa'}</summary>
          <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.text}</p>
          <p>Zajem: {statuses[item.status]}. {item.reason}</p>
          {item.support==='unverified'&&<p>Podpora funkciji: nepreverjeno. {item.supportReason}</p>}
          <dl style={{overflowWrap:'anywhere'}}>
            <dt>Izvorni element</dt><dd>{item.selector}</dd>
            <dt>Sekcija</dt><dd>{item.section}</dd>
            <dt>Razvrstitev</dt><dd>{item.confidence==='observed'?'Opaženo v oznakah izvora':'Sklep iz strukture ali poimenovanja'}</dd>
            <dt>Položaj in velikost zaslona</dt><dd>{item.geometry?JSON.stringify({box:item.geometry,viewport:item.viewport}):'Ni zajetega dokaza za ta element'}</dd>
            {item.target&&<><dt>Cilj povezave ali obrazca (ne izvaja se)</dt><dd>{item.target}</dd></>}
            {Object.keys(item.attributes).length>0&&<><dt>Lastnosti</dt><dd>{JSON.stringify(item.attributes)}</dd></>}
          </dl>
          {item.assets.length>0&&<ul>{item.assets.map((a,index)=><li key={index} style={{overflowWrap:'anywhere'}}>{a.reference} → {a.path??'Brez potrjene lokalne poti'} · {statuses[a.status]}</li>)}</ul>}
          {item.members.length>0&&<details><summary>{item.members.length} elementov v izvornem vrstnem redu</summary><ol>{item.members.map(id=><li key={id} style={{overflowWrap:'anywhere'}}>{id}</li>)}</ol></details>}
        </details>)}
      </details>)}
      <details><summary>Identiteta shranjenega vhoda</summary><p>Različica: {review.siteVersionId}<br/>Zajem: {review.artifactId}</p></details>
    </>}
  </section>;
}
