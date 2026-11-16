import postcss from 'postcss';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { RETAINED_THEME_CONTROLS_SCRIPT } from '../../src/public-site/retained-theme-controls';
type Node=DefaultTreeAdapterMap['node'];
type Element=DefaultTreeAdapterMap['element'];
const all=(n:Node):Element[]=>('childNodes'in n?n.childNodes:[]).flatMap(c=>'tagName'in c?[c,...all(c)]:[]);
const attr=(n:Element,k:string)=>n.attrs.find(a=>a.name===k)?.value??'';
const set=(n:Element,k:string,v:string)=>{n.attrs=n.attrs.filter(a=>a.name!==k);n.attrs.push({name:k,value:v})};
const text=(n:Node):string=>'value'in n?n.value:('childNodes'in n?n.childNodes:[]).map(text).join('');
const remove=(n:Element)=>{if(n.parentNode)n.parentNode.childNodes=n.parentNode.childNodes.filter(c=>c!==n)};
const cls=(n:Element,c:string)=>attr(n,'class').split(/\s+/).includes(c);

/** Recognize source structure and configuration, independently of site identity.
 * Unknown controls and scripts remain untouched so the ordinary gate rejects them. */
export function projectRetainedFunctions(document:DefaultTreeAdapterMap['document']):string[]{
 const nodes=all(document),errors:string[]=[];
 for(const n of nodes)n.attrs=n.attrs.filter(a=>!['data-gnr8-search','data-gnr8-testimonials','data-gnr8-consent','data-gnr8-consent-map','data-gnr8-consent-tag'].includes(a.name));
 const theme=nodes.some(n=>attr(n,'id')==='Top_bar')&&nodes.some(n=>n.tagName==='script'&&/^\s*(?:\/\*[^]*?\*\/\s*)?var mfn = \{/.test(text(n)));
 if(!theme)return [];
 for(const n of nodes)if(/(?:^|\s)(?:accordion|tabs_wrapper|ui-tabs|jp-jplayer|masonry|isotope|portfolio_slider|offer_slider|twentytwenty-container|chart|counter|countdown)(?:\s|$)/.test(attr(n,'class')))
  errors.push('retained_widget_unsupported');
 for(const form of nodes.filter(n=>n.tagName==='form'&&attr(n,'id')==='searchform')){
  const controls=all(form).filter(n=>['input','textarea','select','button'].includes(n.tagName));
  if(attr(form,'method').toLowerCase()!=='get'||controls.length!==2||
    !controls.some(n=>n.tagName==='input'&&attr(n,'name')==='s'&&attr(n,'type')==='text')||
    !controls.some(n=>n.tagName==='input'&&attr(n,'type')==='submit')||
    [form,...all(form)].some(n=>n.attrs.some(a=>/^on|^formaction$/i.test(a.name)))){errors.push('retained_search_unsupported');continue}
  set(form,'data-gnr8-search','v1');set(form,'action','/');
 }
 for(const slider of nodes.filter(n=>cls(n,'testimonials_slider'))){
  const lists=all(slider).filter(n=>n.tagName==='ul'&&cls(n,'testimonials_slider_ul'));
  if(lists.length!==1||!lists[0]!.childNodes.some(n=>'tagName'in n&&n.tagName==='li')){errors.push('retained_testimonials_unsupported');continue}
  set(slider,'data-gnr8-testimonials','v1');
 }
 const consent=nodes.find(n=>attr(n,'id')==='SCK');
 if(consent){
  if(!all(consent).some(n=>cls(n,'SCK_Accept'))||!all(consent).some(n=>cls(n,'SCK_Close'))||!all(consent).some(n=>cls(n,'SCK_Open')))
   errors.push('retained_consent_unsupported');
  else set(consent,'data-gnr8-consent','v1');
 }
 for(const n of nodes.filter(n=>attr(n,'data-sck_unlock'))){
  if(!consent){errors.push('retained_consent_missing');continue}
  try{
   const url=new URL(attr(n,'data-blocked'));
   if(url.protocol!=='https:'||url.username||url.password)throw Error();
   if(n.tagName==='iframe'&&url.hostname==='www.google.com'&&url.pathname==='/maps/embed'){
    set(n,'src','about:blank');set(n,'data-gnr8-consent-map',url.href);
    n.attrs=n.attrs.filter(a=>!a.name.startsWith('data-sck_')&&a.name!=='data-blocked');
   }else if(n.tagName==='script'&&url.hostname==='www.googletagmanager.com'&&url.pathname==='/gtag/js'&&
     /^(?:UA-\d+-\d+|G-[A-Z0-9]+)$/.test(url.searchParams.get('id')??'')&&!text(n).trim()){
    const span=parseFragment('<span hidden></span>').childNodes[0] as Element;
    set(span,'data-gnr8-consent-tag',url.searchParams.get('id')!);
    if(n.parentNode){span.parentNode=n.parentNode;n.parentNode.childNodes.splice(n.parentNode.childNodes.indexOf(n),1,span)}
   }else throw Error();
  }catch{errors.push('retained_consent_destination_unsupported')}
 }
 for(const script of nodes.filter(n=>n.tagName==='script'&&!attr(n,'src'))){
  const body=text(script).trim().replace(/^\/\*\s*<!\[CDATA\[\s*\*\//,'').replace(/\/\*\s*\]\]>\s*\*\/$/,'').trim();
  const config=body.match(/^var NMOD_SCK_Options = (\{[^]*\});$/);
  if(config&&consent){try{const v=JSON.parse(config[1]!);if(v.saveLogToServer!=='0'||v.acceptedCookieLife!=='365'||v.acceptPolicyOnScroll!=='0'||!['0','1'].includes(v.runCookieKit))throw Error();if(v.runCookieKit==='0')set(consent,'data-gnr8-banner','disabled');remove(script)}catch{errors.push('retained_consent_configuration_unsupported')}continue}
  const init=body.match(/^;NMOD_SCK_Options\.checkCompatibility=(\[[^]*?\]);NMOD_SCK_Options\.searchTags=(\[[^]*?\]);NMOD_SCK_Helper\.init\(\);$/);
  if(init&&consent){try{const refs=JSON.parse(init[1]!),tags=JSON.parse(init[2]!);if(!Array.isArray(refs)||!Array.isArray(tags)||tags.length||refs.some((r:{ref?:string})=>!['Google Tag Manager','Google Maps'].includes(r.ref??'')))throw Error();remove(script)}catch{errors.push('retained_consent_configuration_unsupported')}continue}
  const analytics=body.match(/^window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];\s*function gtag\(\)\{dataLayer\.push\(arguments\);\}\s*gtag\('js', new Date\(\)\);\s*gtag\('config', '(UA-\d+-\d+|G-[A-Z0-9]+)'\);$/);
  if(analytics&&all(document).some(n=>attr(n,'data-gnr8-consent-tag')===analytics[1]))remove(script);
 }
 const body=nodes.find(n=>n.tagName==='body');
 if(body&&!errors.length)for(const n of parseFragment(`<script data-gnr8-preview-runtime="retained-theme-controls">${RETAINED_THEME_CONTROLS_SCRIPT}</script>`).childNodes){n.parentNode=body;body.childNodes.push(n)}
 return [...new Set(errors)];
}

export function retainedSearchIndex(pages:Array<{path:string;title:string;bodyHtml:string}>):string {
 const index=pages.map(page=>{const fragment=parseFragment(page.bodyHtml);for(const n of all(fragment).filter(n=>['script','style','nav','header','footer'].includes(n.tagName)||attr(n,'id')==='SCK'))remove(n);
  return {path:page.path,title:page.title,text:text(fragment).replace(/\s+/g,' ').trim()}});
 return '<div hidden data-gnr8-search-index>'+JSON.stringify(index).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('{','&#123;').replaceAll('}','&#125;')+'</div>';
}

/** Remove only operator-selected missing background references, retaining every
 * element, layout declaration and unrelated layer. No URL is inferred. */
export function omitApprovedBackgroundImages(document:DefaultTreeAdapterMap['document'],urls:readonly string[]):void {
 if(!urls.length)return;
 const approved=new Set(urls);
 const rewrite=(css:string)=>{const root=postcss.parse(css);root.walkDecls(decl=>{
  if(!['background','background-image'].includes(decl.prop.toLowerCase()))return;
  decl.value=decl.value.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi,(whole,quote,url)=>approved.has(url.trim())?'none':whole);
 });return root.toString()};
 for(const element of all(document)){
  const inline=attr(element,'style');if(inline)set(element,'style',rewrite(inline));
  if(element.tagName==='style')for(const node of element.childNodes)if('value'in node)node.value=rewrite(node.value);
 }
}
