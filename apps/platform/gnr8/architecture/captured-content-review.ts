import { rewriteAssetReferenceToRuntime } from '@/src/public-site/raw-template-runtime';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import type { EvidenceCaptureBaselineArtifactRecord } from './evidence-capture-baseline-artifact';
import { extractWidgetInventory } from './evidence-capture-expansion';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
export type ContentReviewItem = {
  id: string; selector: string; order: number; kind: string; text: string;
  section: string; region: string; target: string | null; attributes: Record<string, string>; confidence: 'observed' | 'inferred';
  assets: Array<{ reference: string; path: string | null; status: 'captured' | 'missing' | 'unverified' }>;
  status: 'captured' | 'missing' | 'unverified'; reason: string;
  support: 'not_applicable' | 'unverified'; supportReason: string;
  evidence: 'element' | 'detector';
  geometry: { x: number; y: number; width: number; height: number } | null;
  viewport: { width: number; height: number } | null;
  members: string[];
};
export type ReviewCoverage = { category: string; status: 'partial' | 'unverified'; detail: string; evidenceRefs: string[] };
export type CapturedRouteReview = { state: 'reviewed' | 'failed' | 'excluded' | 'unverified'; coverage: ReviewCoverage[]; route: string; sourceUrl: string | null; filePath: string | null; items: ContentReviewItem[]; limitations: string[] };
export type CapturedContentReview = { siteVersionId: string; artifactId: string; routes: CapturedRouteReview[]; omittedLinks: Array<{reference: string; reasons: string[]; sourceReferences: string[]}>; limitations: string[] };
export const CAPTURE_SCOPE_NOTE='Prikazane so shranjene poti. Ali zajem vključuje vse strani izvirnega spletišča, še ni preverjeno.';
export const ROUTE_REVIEW_SCOPE_NOTES=[
 'Pregled opisuje shranjeni HTML. Nezajete strani, vsebina iz CSS, različni prikazi glede na širino zaslona in naknadno vstavljena vsebina lahko manjkajo.',
 'Položaj in velikost sta prikazana le ob ustreznem dokazu iz zajema. Manjkajočih meritev ne ugibamo.',
 'Ta seznam ne potrjuje delovanja interakcij, vizualne zvestobe ali celovitosti glede na izvirno stran.',
] as const;
/** These links are retained for review but are not missing pages on this site. */
export function isNonPageOmissionReason(reason:string){
 const code=reason.slice(reason.lastIndexOf(':')+1).trim();
 return /^(?:(?:discovery|sitemap)_)?(?:asset_link|external_host|hash_only|tel|mailto)$/.test(code);
}
export function isPageIndependentOmissionReason(reason:string){
 const code=reason.slice(reason.lastIndexOf(':')+1).trim();
 // An omitted same-site asset may still be a missing download or gallery image.
 return /^(?:(?:discovery|sitemap)_)?(?:external_host|hash_only|tel|mailto)$/.test(code);
}
const element = (n: Node): n is Element => 'tagName' in n;
const children = (n: Node): Node[] => 'childNodes' in n ? n.childNodes : [];
const attr = (n: Element, name: string) => n.attrs.find(a => a.name === name)?.value ?? '';
function text(n: Node): string {
  if (element(n) && ['script','style','template','noscript'].includes(n.tagName)) return '';
  return ('value' in n ? n.value : children(n).map(text).join(' ')).replace(/\s+/g,' ').trim();
}
function selector(n: Element): string {
  const parent = n.parentNode;
  const index = parent ? children(parent).filter(element).filter(x => x.tagName === n.tagName).indexOf(n) + 1 : 1;
  return `${parent && element(parent) ? selector(parent) + ' > ' : ''}${n.tagName}:nth-of-type(${index})`;
}
function marker(n: Element) { return `${attr(n,'class')} ${attr(n,'id')} ${attr(n,'data-widget')}`.toLowerCase(); }
function isSlide(n: Element) { return /(?:^|\s)(?:slide|swiper-slide|slick-slide|carousel-item)(?:\s|$)/.test(marker(n)); }
function widget(n: Element): string | null {
  const m = marker(n);
  if (n.tagName === 'a' || isSlide(n)) return null;
  if (n.tagName === 'form') return 'form';
  if (n.tagName === 'video') return 'video';
  if (n.tagName === 'iframe') return 'embed';
  if (/\bgallery\b/.test(m)) return 'gallery';
  if (/(?:^|\s)(slider|carousel|swiper|swiper-container|slick-slider)(?:\s|$)/.test(m)) return 'slider';
  if (attr(n,'data-widget') || /\bwidget\b/.test(m)) return 'unknown-widget';
  return null;
}
function region(n: Element): { region: string; confidence: 'observed' | 'inferred' } {
  let current: Node | null = n;
  while (current && element(current)) {
    const tag = current.tagName, role = attr(current,'role');
    if (tag === 'nav' || role === 'navigation') return { region:'navigation', confidence:'observed' };
    if (tag === 'header' || role === 'banner') return { region:'header', confidence:'observed' };
    if (tag === 'footer' || role === 'contentinfo') return { region:'footer', confidence:'observed' };
    if (/\b(nav|navigation|header|footer)\b/.test(marker(current))) return { region:marker(current).match(/\b(nav|navigation|header|footer)\b/)![0].replace(/^nav$/,'navigation'), confidence:'inferred' };
    current = current.parentNode;
  }
  return { region:'body', confidence:'inferred' };
}
/** Tokenize srcset URLs without splitting the comma inside a data URL. Descriptors stay inert. */
function srcsetReferences(value: string): string[] {
  const urls: string[] = [];
  let rest=value.trim();
  while(rest) {
    rest=rest.replace(/^[\s,]+/,'');
    if(!rest) break;
    const match=/^\S+/.exec(rest)!;
    let url=match[0]; rest=rest.slice(url.length);
    if(!url.startsWith('data:') && url.includes(',')) {
      const comma=url.indexOf(','); rest=url.slice(comma+1)+rest;url=url.slice(0,comma);
    } else if(url.endsWith(',')) url=url.replace(/,+$/,'');
    else { const comma=rest.indexOf(',');rest=comma<0?'':rest.slice(comma+1); }
    if(url)urls.push(url);
  }
  return urls;
}
function coverageForRoute(input: Parameters<typeof reviewCapturedRoute>[0], nodes: Element[], items: ContentReviewItem[]): ReviewCoverage[] {
  const baseline=input.baseline?.routePath===input.route?input.baseline:null;
  const styles=baseline?.evidence.computedStyle.computedStyleSampleRefs??[];
  const fonts=baseline?.evidence.computedStyle.fontSourcesLoaded??[];
  const layouts=input.baseline?.captureExpansionEvidence.layoutGeometryEvidence.filter(e=>e.routePath===input.route)??[];
  return [
    {category:'CSS ozadja in ustvarjena vsebina',status:items.some(i=>i.kind==='background')||styles.length?'partial':'unverified',detail:`Vdelani URL-ji ozadij so vključeni. Sklicev na datoteke vzorcev sloga: ${styles.length}. Zunanji CSS in psevdoelementi niso v celoti pregledani.`,evidenceRefs:styles.map(r=>r.id)},
    {category:'Ikone in pisave',status:fonts.length?'partial':'unverified',detail:`Dokazi naloženih pisav: ${fonts.length}. SVG je zajet kot oznaka; povezava ikon iz pisav z glifi še ni potrjena.`,evidenceRefs:fonts.flatMap(f=>f.evidenceRefIds)},
    {category:'Odzivne slike in prikazi',status:layouts.length||nodes.some(n=>attr(n,'srcset')||attr(n,'data-srcset'))?'partial':'unverified',detail:`Alternative srcset so pregledane; potrjenih geometrijskih zajemov: ${layouts.length}. Prikaz na vseh širinah zaslona ni potrjen.`,evidenceRefs:layouts.map(l=>l.routePath+':'+l.viewportWidth+'x'+l.viewportHeight)},
    {category:'Dinamično dodana vsebina',status:baseline?.evidence.scriptRuntime.domMutationSummary?'partial':'unverified',detail:`Zajetih opažanj sprememb DOM: ${baseline?.evidence.scriptRuntime.domMutationSummary?.mutationCount??'ni podatka'}; naknadno dodanih vozlišč: ${baseline?.evidence.scriptRuntime.postRenderAddedNodes.length??'ni podatka'}. Pregled ne izvaja skript; popolnost vseh stanj ni potrjena.`,evidenceRefs:baseline?.persistedRefs.renderedDomRef?[baseline.persistedRefs.renderedDomRef.id]:[]},
  ];
}
/** Projection of retained DOM evidence, not a new capture or a claim of reconstruction completeness. */
export function reviewCapturedRoute(input: {
  route: string; sourceUrl: string | null; filePath: string; html: string; siteId: string;
  filePaths: ReadonlySet<string>; baseline?: EvidenceCaptureBaselineArtifactRecord | null;
}): CapturedRouteReview {
  const nodes: Element[] = [];
  function visit(n: Node) { if (element(n) && ['script','style','template','noscript'].includes(n.tagName)) return; if (element(n)) nodes.push(n); children(n).forEach(visit); }
  visit(parse(input.html));
  const asset = (reference: string): ContentReviewItem['assets'][number] => {
    if (reference.startsWith('data:')) return {reference,path:null,status:'captured'};
    const rewritten = rewriteAssetReferenceToRuntime({reference,siteId:input.siteId,siteVersionId:'content-review',contextFilePath:input.filePath,fileMapPaths:input.filePaths});
    const prefix = `/api/gnr8/runtime/preview-assets/${encodeURIComponent(input.siteId)}/content-review/`;
    let path: string | null = null;
    if (rewritten?.startsWith(prefix)) {
      try { path = decodeURIComponent(rewritten.slice(prefix.length).split(/[?#]/)[0]); } catch { /* invalid URI remains unverified */ }
    }
    const external = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference);
    return {reference,path,status:path && input.filePaths.has(path) ? 'captured' : external ? 'unverified' : 'missing'};
  };
  const items: ContentReviewItem[] = [];
  for (const n of nodes) {
    const tag = n.tagName, kind = widget(n) ?? (/^h[1-6]$/.test(tag) ? 'heading' : ({p:'text',li:'text',a:'link',img:'image',svg:'icon',i:'icon',input:'field',select:'field',textarea:'field',button:'button',source:'media-source'} as Record<string,string>)[tag]);
    const directText = children(n).filter(x => x.nodeName === '#text').map(text).join(' ').trim();
    const actualKind = kind ?? (/url\(/i.test(attr(n,'style')) ? 'background' : null) ?? (isSlide(n) ? 'slide' : null) ?? (directText && ['div','span','address','td','label','header','footer','section','main','figcaption','blockquote','strong','em'].includes(tag) ? 'text' : null);
    if (!actualKind) continue;
    const ownSelector = selector(n);
    let section: Node | null = n;
    while (section && element(section) && !['section','header','footer','nav','main'].includes(section.tagName) && !/\b(row|section)\b/.test(marker(section))) section = section.parentNode;
    const refs = ['src','poster','data-src'].map(a=>attr(n,a)).filter(Boolean);
    // An image link may navigate to a page. Only explicit lightbox/gallery image targets are asset dependencies.
    const href = attr(n,'href');
    if (tag === 'a' && children(n).some(x=>element(x)&&x.tagName==='img') &&
        (/\.(?:png|jpe?g|webp|avif|gif|svg)(?:[?#]|$)/i.test(href) || attr(n,'data-lightbox') || attr(n,'data-fancybox'))) refs.push(href);
    for (const name of ['srcset','data-srcset']) refs.push(...srcsetReferences(attr(n,name)));
    refs.push(...Array.from(attr(n,'style').matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi),m=>m[1].trim()));
    const assets = refs.filter(Boolean).map(asset);
    const interactive = widget(n);
    const hasUnresolvedContent = (['image','media-source'].includes(actualKind) && assets.length===0) ||
      (actualKind==='icon' && tag!=='svg');
    const status = assets.some(a=>a.status==='missing') ? 'missing' : hasUnresolvedContent || assets.some(a=>a.status==='unverified') ? 'unverified' : 'captured';
    const layout = input.baseline?.captureExpansionEvidence.layoutGeometryEvidence.find(e=>e.routePath===input.route);
    const matching = layout?.regions.find(e=>e.selector===ownSelector || (attr(n,'id') && e.selector===`#${attr(n,'id')}`));
    const descendants = interactive ? nodes.filter(x=> { let p: Node | null=x.parentNode; while(p){if(p===n)return true;p='parentNode' in p?p.parentNode:null;}return false; }) : [];
    items.push({ id:`${input.route}::${ownSelector}`,selector:ownSelector,order:items.length+1,kind:actualKind,
      text: actualKind==='text' && !kind ? directText : text(n) || attr(n,'alt') || attr(n,'aria-label') || attr(n,'name'),
      section:section && element(section)?selector(section):'body',...region(n),target:attr(n,'href')||attr(n,'action')||null,attributes:Object.fromEntries(n.attrs.filter(a=>['type','name','required','pattern','min','max','method','controls','autoplay','loop'].includes(a.name)).map(a=>[a.name,a.value])),assets,status,evidence:'element',support:interactive?'unverified':'not_applicable',supportReason:interactive?'Vsebina je evidentirana ločeno; delovanje in pretvorba tega gradnika še nista preverjena.':'Statični element; podpora interakciji ni relevantna.',
      reason:status==='missing'?'Sklicane datoteke ni v seznamu shranjenih datotek.':status==='unverified'?'Zunanji ali nerazrešen sklic; shranjena datoteka ni potrjena.':'Opaženo v shranjenem HTML. Datoteka je navedena v zajemu; njeno nalaganje s tem ni preverjeno.',
      geometry:matching?.boundingBox ?? null,viewport:matching&&layout?{width:layout.viewportWidth,height:layout.viewportHeight}:null,
      members:interactive?descendants.filter(x=>interactive==='gallery'?x.tagName==='img':interactive==='slider'?isSlide(x):['input','select','textarea','source'].includes(x.tagName)).map(x=>`${input.route}::${selector(x)}`):[],
    });
  }
  // Propagate member asset gaps to containers without conflating capture and interaction support.
  for (const item of [...items].reverse()) {
    if(item.support==='not_applicable') continue;
    const members = items.filter(other=>other.selector.startsWith(item.selector+' > '));
    if (members.some(m=>m.status==='missing')) {item.status='missing';item.reason='Vsaj en član gradnika ima manjkajočo datoteko.';}
    else if (members.some(m=>m.status==='unverified')) {item.status='unverified';item.reason='Vsebina vsaj enega člana gradnika še ni v celoti preverjena.';}
  }
  // Preserve existing detector findings even when DOM classification has no precise element match.
  for (const w of extractWidgetInventory({renderedHtml:input.html})) {
    const concreteKinds = w.type==='gallery' ? ['gallery','slider'] : w.type==='embedded_video' ? ['video','embed'] : [w.type];
    // The legacy detector exposes broad selectors. Keep unmatched hints as evidence, never count them as widgets.
    if (items.some(i=>concreteKinds.includes(i.kind)) && w.source?.startsWith('class=')) continue;
    items.push({id:`${input.route}::${w.id}`,selector:w.selectorHint??'',order:items.length+1,kind:`detector:${w.type}`,text:w.source??'',section:'unknown',region:'unknown',target:null,attributes:{},confidence:'inferred',assets:[],status:'unverified',evidence:'detector',support:'unverified',supportReason:'Namig še ni povezan s potrjenim gradnikom.',reason:'Ugotovitev obstoječega prepoznavanja gradnikov; povezava s točnim elementom in delovanje nista preverjena.',geometry:null,viewport:null,members:[]});
  }
  return {state:'reviewed',coverage:coverageForRoute(input,nodes,items),route:input.route,sourceUrl:input.sourceUrl,filePath:input.filePath,items,limitations:[...ROUTE_REVIEW_SCOPE_NOTES]};
}
