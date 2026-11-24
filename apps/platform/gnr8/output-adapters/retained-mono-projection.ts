import {createHash} from 'node:crypto';
import {parseFragment, type DefaultTreeAdapterMap} from 'parse5';
import {RETAINED_MONO_CONTROLS_SCRIPT} from '../../src/public-site/retained-mono-controls';

type Node=DefaultTreeAdapterMap['node'];
type Element=DefaultTreeAdapterMap['element'];
const elements=(node:Node):Element[]=>('childNodes' in node?node.childNodes:[]).flatMap(child=>[...('tagName' in child?[child]:[]),...elements(child)]);
const attr=(node:Element,key:string)=>node.attrs.find(a=>a.name===key)?.value??'';
const hasClass=(node:Element,name:string)=>attr(node,'class').split(/\s+/).includes(name);
const set=(node:Element,name:string,value:string)=>{node.attrs=node.attrs.filter(a=>a.name!==name);node.attrs.push({name,value});};
const detach=(node:Element)=>{if(node.parentNode)node.parentNode.childNodes=node.parentNode.childNodes.filter(child=>child!==node);};
const append=(node:Element,markup:string)=>{for(const child of parseFragment(markup).childNodes){child.parentNode=node;node.childNodes.push(child);}};

/** Only inspected source identities may be omitted. A changed library or inline
 * program remains unsupported rather than inheriting authority from its name. */
const TRACKING_INLINE=new Set([
 'f49fc28c6271723ced2a8bb85d441527d9816f32824fe7e6a6aa120ca0efcf1b', // cookie opt-in configuration
 '4ffc61db14638932cf784fb1cd2d98efbdb64fd03ab770bcdaadfa8739f7af54', // YETT consent initialization
 '29c21051dac37fc40ec0672048baaeacbf27688e2028225c71ccecb20e672ff3', // Mono GA tracker
 '6f5ea8cfe39369d2e9d1c34cc9699b4892a8a108ea0b30ed867649ccf5374f14', // Metricool tracker
 'd94a8ee04b0b7a0c6b6853b94f0b5c97c1a993f78d7a6c9dcf2637876397ffc4', // Facebook chat initialization
]);
const TRACKING_FILES=new Set([
 'f1a61277e3f902f50ab42015d8b07218db9b7601bb0967e54a52bfdcb4fa7e81', // GA analytics
 'b4e62a8daa779d16b2c25d343db85f6501e334632b0eeafd7d9f5bc5b8f96367', // Metricool tracker
]);
export function removableMonoScript(input:{script:Element; fileSha256?:string; trackingAndChat:boolean; elements:Element[]}):boolean {
 const body=input.script.childNodes.map(n=>'value' in n?n.value:'').join('');
 const hash=createHash('sha256').update(body).digest('hex');
 if(input.trackingAndChat && (TRACKING_INLINE.has(hash)||TRACKING_FILES.has(input.fileSha256??'')))return true;
 if(input.trackingAndChat && attr(input.script,'src')==='https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js')return true;
 // The source cache cannot own the new host. Astro serves the retained files.
 if(hash==='3031e9d37b26bb192b276c8a79a95ffc50e09508385c390e21a8b199010a865b')return true;
 // Static background styles remain; this initialization only shifts their position.
 if(hash==='96f7a330c53f5f72aaf004dd4cc3b12b4088eb0edc346424e0704a217f362a89')return true;
 // This captured loader has no Typeform trigger or embed; actual complex forms
 // have already been replaced by disclosed original-page links.
 if(hash==='5bd47857780ed049273bdf9d26dc25f049836df3d7146d3823f4e9a5ff9e73b7' && !input.elements.some(n=>n.tagName!=='script'&&n.attrs.some(a=>/typeform|data-tf-/i.test(a.name+' '+a.value))))return true;
 // The sole captured engagement is now controlled by the owned close button.
 if(input.fileSha256==='43d4ef8afb0d3af9eb87f1569f87d9b8f0a04aad90aafc7a6f32e15f8ab57cc4') {
   const announcements=input.elements.filter(n=>hasClass(n,'engagement'));
   return announcements.length>0&&announcements.every(n=>attr(n,'data-gnr8-announcement')==='v1');
 }
 // Audited Mono rowgroup program: its two-slide auto rotation is now owned.
 if(input.fileSha256==='88fcc063e6f39c08a2ca8e73b7289fabad9d34f0b003bcd9c690d35262d4199e') {
   const groups=input.elements.filter(n=>attr(n,'data-gnr8-rowgroup')==='auto-v1');
   return groups.length>0&&!input.elements.some(n=>attr(n,'data-req').split(',').includes('rowgroup'));
 }
 return false;
}

export function projectMonoControls(document:DefaultTreeAdapterMap['document'],removeTrackingAndChat:boolean,sourcePageUrl:string|null):void {
 let controls=false;
 for(const node of elements(document)) {
   if(node.tagName==='div' && hasClass(node,'rowGroup') && attr(node,'data-req')==='rowgroup' &&
      /^auto=true(?:;|$)/.test(attr(node,'data-rowgroupsettings')) &&
      node.childNodes.filter(n=>'tagName' in n).length===2 &&
      node.childNodes.filter(n=>'tagName' in n).every(n=>n.tagName==='div'&&hasClass(n,'row'))) {
     set(node,'data-gnr8-rowgroup','auto-v1');
     node.attrs=node.attrs.filter(a=>a.name!=='data-req');
     controls=true;
   }
   if(node.tagName==='iframe' && hasClass(node,'monovideobg') && attr(node,'data-videotype')==='youtube' &&
     attr(node,'data-req').split(',').includes('videobg') && attr(node,'data-req').split(',').includes('ext-//www.youtube.com/iframe_api')) {
     try {
       const url=new URL(attr(node,'src'));
       if(url.protocol==='https:' && url.hostname==='www.youtube.com' && /^\/embed\/[a-zA-Z0-9_-]+$/.test(url.pathname) && !url.username && !url.password) {
         url.searchParams.set('controls','1');
         url.searchParams.delete('enablejsapi');
         url.searchParams.delete('playerapiid');
         const wrapper=node.parentNode;
         if(!wrapper || !('tagName' in wrapper) || wrapper.tagName!=='div' ||
            !hasClass(wrapper,'rowvideobg') || elements(wrapper).filter(child=>child.tagName==='iframe').length!==1)continue;
         const title=attr(node,'title')||'Video';
         const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
         set(wrapper,'data-gnr8-video-projected','youtube-click-v1');
         set(wrapper,'style',`${attr(wrapper,'style') ? `${attr(wrapper,'style').replace(/;?$/, ';')}` : ''}position:relative`);
         detach(node);
         append(wrapper,`<button type="button" data-gnr8-play-youtube data-gnr8-youtube-src="${escape(url.toString())}" data-gnr8-youtube-title="${escape(title)}" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;padding:12px 20px;border:2px solid white;border-radius:6px;background:#111c;color:white;cursor:pointer">Predvajaj video / Play video</button>`);
         controls=true;
       }
     } catch { /* Unknown video input keeps its runtime requirement and blocks generation. */ }
   }
   if(sourcePageUrl && node.tagName==='div' && hasClass(node,'typeform-widget') && /^https:\/\/[a-z0-9-]+\.typeform\.com\/to\/[a-zA-Z0-9]+$/.test(attr(node,'data-url'))) {
     const label=attr(node,'data-text')||'Odpri izvirni obrazec / Open original form';
     const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
     node.attrs=[{name:'data-gnr8-accepted-limitation',value:'complex-form-source-link'}];node.childNodes=[];
     append(node,`<p>Ta obrazec je na voljo na izvirni strani.</p><a href="#" data-gnr8-source-link data-gnr8-source-href="${escape(sourcePageUrl)}">${escape(label)}</a>`);
   }
   if(removeTrackingAndChat && (hasClass(node,'fb-customerchat') || (attr(node,'id')==='fb-root' && node.childNodes.length===0) ||
     (attr(node,'id')==='infobar'&&hasClass(node,'infobar-wrapper')&&elements(node).some(n=>attr(n,'id')==='infobar-acceptCookiesBtn')))) {detach(node);continue;}
   if(node.tagName==='iframe' && attr(node,'src')==='about:blank' && /^\/\/fast\.wistia\.com\/embed\/iframe\/[a-zA-Z0-9]+$/.test(attr(node,'data-src-original'))) {
     const wrapper=node.parentNode;
     if(!wrapper||!('tagName' in wrapper))continue;
     set(wrapper,'data-gnr8-video','v1');
     set(node,'data-gnr8-video-src',`https:${attr(node,'data-src-original')}`);
     // Keep the registered static artifact free of embedded applications.
     // The owned controller creates the frame only after an explicit click.
     const width=attr(node,'width'),height=attr(node,'height');
     node.tagName='div';node.nodeName='div';
     node.attrs=node.attrs.filter(a=>['data-gnr8-video-src','title'].includes(a.name));
     if(/^\d+$/.test(width))set(node,'data-gnr8-video-width',width);
     if(/^\d+$/.test(height))set(node,'data-gnr8-video-height',height);
     set(node,'hidden','');set(node,'title',attr(node,'title')||'Video navodila / Video instructions');
     set(node,'style','max-width:100%;border:0');
     append(wrapper,'<button type="button" data-gnr8-play-video>Predvajaj video / Play video (Wistia)</button>');
     controls=true;
   }
   if(node.tagName==='div' && hasClass(node,'engagement') && hasClass(node,'promomessage')) {
     const close=elements(node).filter(n=>n.tagName==='a'&&hasClass(n,'closeBtn')&&attr(n,'href')==='#');
     if(close.length!==1)continue;
     const button=close[0]!;button.tagName='button';button.nodeName='button';button.attrs=button.attrs.filter(a=>a.name!=='href');
     set(button,'type','button');set(button,'data-gnr8-close-announcement','');set(button,'aria-label','Zapri obvestilo / Close announcement');
     set(node,'data-gnr8-announcement','v1');controls=true;
   }
 }
 if(controls){const body=elements(document).find(n=>n.tagName==='body');if(body)append(body,`<script data-gnr8-preview-runtime="retained-mono-controls">${RETAINED_MONO_CONTROLS_SCRIPT}</script>`);}
}

/** Exact, explicitly accepted source media only. No download, quota change or
 * inference that other missing images may be omitted. */
export function projectAcceptedMediaLinks(document:DefaultTreeAdapterMap['document'],accepted:readonly string[],sourcePageUrl:string|null):void {
 if(!accepted.length || !sourcePageUrl)return;
 const source=new URL(sourcePageUrl);
 const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 for(const image of elements(document).filter(node=>node.tagName==='img')) {
   let url:URL;
   try {url=new URL(attr(image,'src'),source);}catch{continue;}
   if(url.origin!==source.origin || url.protocol!=='https:' || url.username || url.password ||
      !/\.gif$/i.test(url.pathname) || !accepted.includes(url.href))continue;
   let target:Element=image;
   const parent=image.parentNode;
   if(parent && 'tagName' in parent && parent.tagName==='noscript') {
     if(elements(parent).length!==1 || attr(parent,'data-lazyload-src')!==attr(image,'src'))continue;
     target=parent;
     const siblings=parent.parentNode?.childNodes??[];
     const previous=siblings.slice(0,siblings.indexOf(parent)).reverse().find(node=>'tagName' in node);
     if(previous && 'tagName' in previous && previous.tagName==='img' && /^data:image\//.test(attr(previous,'src')))detach(previous);
   }
   const owner=target.parentNode;if(!owner)continue;
   const label=attr(image,'alt').trim();
   const replacement=parseFragment(`<aside data-gnr8-accepted-limitation="source-animation-link"><p>Velika animacija je na voljo na izvirni strani / Large animation available at source.</p><a href="#" data-gnr8-source-link data-gnr8-source-href="${escape(url.href)}">Odpri izvirno animacijo / Open original animation${label ? ': '+escape(label) : ''}</a></aside>`).childNodes;
   for(const node of replacement)node.parentNode=owner;
   owner.childNodes.splice(owner.childNodes.indexOf(target),1,...replacement);
 }
}
