import { rewriteAssetReferenceToRuntime } from '@/src/public-site/raw-template-runtime';
import { parse as parseHtml, type DefaultTreeAdapterMap } from 'parse5';
import postcss from 'postcss';
import type { BrandGuide, BrandKey, BrandObservation } from './brand-guide';
import type { RawTemplateSiteFileMeta } from '../runtime/types';

type Element = DefaultTreeAdapterMap['element'];
type Node = DefaultTreeAdapterMap['node'];
export async function extractBrandGuide(input: {
  siteId: string; siteVersionId: string; artifactId: string; entryHtmlPath: string; computedStylePath: string | null;
  fileMap: Record<string, RawTemplateSiteFileMeta>; read: (path: string) => Promise<Response>;
}): Promise<BrandGuide> {
  const guide: BrandGuide = {kind:'brand_style_guide_v1',siteVersionId:input.siteVersionId,artifactId:input.artifactId,observations:[],proposals:{},decisions:{},revision:0,savedAt:null,limitations:[
    'Vzorci sloga opisujejo zajeti prikaz, ne vseh elementov in vseh širin zaslona.',
    'Semantične vloge so predlogi za pregled. Pravila CSS niso dokaz, da so bila uporabljena; kaskada ni ponovno izvedena.',
    'Predogled vodiča ne spreminja izvorne strani ali Astro izhoda. Manjkajoče vrednosti ostanejo nepotrjene.',
  ]};
  const add=(o:Omit<BrandObservation,'id'>)=>{const value={...o,id:`e${guide.observations.length+1}`};guide.observations.push(value);return value.id;};
  const propose=(key:BrandKey,value:string,evidence:string[],reason:string)=>{guide.proposals[key]={value,evidence,reason};};
  async function read(path:string){
    const meta=input.fileMap[path];
    if(!meta || meta.sizeBytes>2*1024*1024){guide.limitations.push(`Vir ni dosegljiv ali presega omejitev: ${path}`);return null;}
    try{const r=await input.read(path);if(!r.ok)throw Error();return await r.text();}catch{guide.limitations.push(`Branje vira ni potrjeno: ${path}`);return null;}
  }
  if(input.computedStylePath){
    // Baseline refs retain the capture workspace prefix; storage keys are relative.
    // Resolve only against the authoritative manifest; never read a local/remote path.
    const sourceRef=input.computedStylePath;
    const retainedPath=input.fileMap[sourceRef]?sourceRef:Object.keys(input.fileMap).filter(p=>sourceRef.startsWith('/')&&sourceRef.endsWith('/'+p)).sort((a,b)=>b.length-a.length)[0]??null;
    const raw=retainedPath?await read(retainedPath):null;
    try{
      const data=raw?JSON.parse(raw):null;
      const samples=Array.isArray(data)?data:data?.samples;
      if(!Array.isArray(samples)) throw Error();
      for(const sample of samples.slice(0,200)){
        if(!sample.styles || typeof sample.selector!=='string')continue;
        for(const [property,value] of Object.entries(sample.styles)){
          if(typeof value!=='string')continue;
          const id=add({route:'/',file:retainedPath!,selector:sample.selector,property,value,context:`Vzorec ${sample.sampleId??''}${sourceRef!==retainedPath?' · Izvorna referenca: '+sourceRef:''}`,kind:'computed'});
          const root:Record<string,BrandKey>={backgroundColor:'background',color:'text',fontFamily:'fontFamily',fontSize:'fontSize',fontWeight:'fontWeight',lineHeight:'lineHeight'};
          const heading:Record<string,BrandKey>={color:'accent',fontFamily:'headingFamily',fontSize:'headingSize',fontWeight:'headingWeight',lineHeight:'headingLineHeight'};
          const key=sample.target==='root'?root[property]:sample.target==='h1'?heading[property]:undefined;
          if(key)propose(key,value,[id],key==='accent'?'Barva prvega h1 je kandidat za poudarek znamke.':'Vrednost opažena na izbranem elementu; vloga zahteva pregled.');
        }
      }
    }catch{guide.limitations.push('Vzorci izračunanih slogov niso berljivi.');}
  }else guide.limitations.push('Ni reference na vzorce izračunanih slogov.');
  const html=await read(input.entryHtmlPath);
  const styles:Array<{file:string;text:string}>=[];
  if(html){
    const walk=(node:Node,header=false,path='')=>{
      if(!('tagName' in node)){if('childNodes' in node)node.childNodes.forEach(n=>walk(n,header,path));return;}
      const e=node as Element,a=(name:string)=>e.attrs.find(a=>a.name===name)?.value??'';
      const selector=path+' > '+e.tagName+(a('id')?`#${a('id')}`:'');
      const inHeader=header || e.tagName==='header';
      if(e.tagName==='style')styles.push({file:input.entryHtmlPath,text:e.childNodes.map(n=>'value' in n?n.value:'').join('')});
      if(e.tagName==='img' && (inHeader || /(?:logo|znak)/i.test(a('src')+' '+a('alt')))){
        const src=a('src'), marker='/preview-assets/', suffix=src.includes(marker)?src.split(marker)[1].split('/').slice(2).join('/'):src.replace(/^\//,'');
        const id=add({route:'/',file:input.entryHtmlPath,selector,property:'src',value:suffix,context:inHeader?'Slika v glavi; vloga logotipa je sklepanje.':'Ime slike nakazuje logotip; vloga zahteva potrditev.',kind:'element'});
        if(!guide.proposals.logo && input.fileMap[suffix])propose('logo',suffix,[id],'Kandidat po imenu ali mestu slike; vlogo mora potrditi uporabnik.');
      }
      e.childNodes.forEach(n=>walk(n,inHeader,selector));
    };walk(parseHtml(html));
  }
  const cssPaths=Object.keys(input.fileMap).filter(p=>p.endsWith('.css'));
  if(cssPaths.length>12)guide.limitations.push('Pregled CSS je omejen na prvih 12 shranjenih slogovnih datotek.');
  // Read retained CSS only. No imports, URLs, scripts or remote resources are executed.
  for(const file of cssPaths.slice(0,12)){const text=await read(file);if(text)styles.unshift({file,text});}
  const mappings:Record<string,BrandKey>={'max-width':'contentWidth','gap':'spacing','padding':'spacing','border':'border','border-radius':'radius','box-shadow':'shadow'};
  for(const {file,text} of styles){
    try{const css=postcss.parse(text,{from:file});
      css.walkAtRules('font-face',rule=>{
        const declarations:Record<string,string>={};rule.walkDecls(d=>{declarations[d.prop]=d.value;});
        const family=(declarations['font-family']??'').replace(/^['"]|['"]$/g,'');
        const weight=declarations['font-weight']??'400',style=declarations['font-style']??'normal';
        if(!family||style!=='normal'||!/^(normal|bold|[1-9]00)$/.test(weight))return;
        const match=/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/.exec(declarations.src??'');if(!match)return;
        const resolved=rewriteAssetReferenceToRuntime({reference:match[1],siteId:input.siteId,siteVersionId:input.siteVersionId,contextFilePath:file,fileMapPaths:new Set(Object.keys(input.fileMap))});
        const prefix=`/api/gnr8/runtime/preview-assets/${encodeURIComponent(input.siteId)}/${encodeURIComponent(input.siteVersionId)}/`;
        if(!resolved?.startsWith(prefix))return;
        let path:string;try{path=decodeURIComponent(resolved.slice(prefix.length).split(/[?#]/)[0]);}catch{return;}
        if(!input.fileMap[path]||! /\.(woff2?|ttf|otf)$/i.test(path))return;
        guide.fontFaces??=[];
        if(guide.fontFaces.length<80&&!guide.fontFaces.some(f=>f.family===family&&f.weight===weight&&f.path===path))guide.fontFaces.push({family,weight:weight==='normal'?'400':weight==='bold'?'700':weight,style,path,file});
      });
      css.walkRules(rule=>{
      const selectors=rule.selector.split(',').map(s=>s.trim());
      const relevant=selectors.some(s=>/^(body|\.container|\.container-fixed|\.row|\.button|\.button2|header)$/.test(s));
      if(!relevant)return;
      const contexts:string[]=[];let parent=rule.parent;
      while(parent&&parent.type!=='root'){if(parent.type==='atrule')contexts.unshift(`@${parent.name} ${parent.params}`);parent=parent.parent;}
      rule.walkDecls(d=>{
        const button=selectors.includes('.button');
        const key=button?({'background-color':'buttonBackground',color:'buttonText',padding:'buttonPadding','border-radius':'radius'} as Record<string,BrandKey>)[d.prop]??mappings[d.prop]:mappings[d.prop];
        if(!key || guide.observations.length>=600)return;
        const id=add({route:null,file,selector:rule.selector,property:d.prop,value:d.value,context:contexts.join(' / ')||'Pravilo CSS; uporaba ni potrjena.',kind:'declaration'});
        if(!contexts.length)propose(key,d.value,[id],'Kandidat iz deklaracije CSS; specifičnost in uporaba še nista potrjeni.');
      });
    });}catch{guide.limitations.push(`CSS ni bilo mogoče razčleniti: ${file}`);}
  }
  guide.limitations.push('Položaj logotipa, variante, odzivno obnašanje in manjkajoče vloge zahtevajo pregled; niso privzeto potrjeni.');
  return guide;
}
