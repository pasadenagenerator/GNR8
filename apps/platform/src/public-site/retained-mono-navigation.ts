import {parse, type DefaultTreeAdapterMap} from 'parse5';
type Node=DefaultTreeAdapterMap['node'];
type Element=DefaultTreeAdapterMap['element'];
const attr=(e:Element,key:string)=>e.attrs.find(a=>a.name===key)?.value??'';
const all=(n:Node):Element[]=>('childNodes' in n?n.childNodes:[]).flatMap(c=>'tagName' in c?[c,...all(c)]:[]);
const text=(n:Node):string=>'value' in n?n.value:('childNodes' in n?n.childNodes:[]).map(text).join('');
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const hasClass=(e:Element,name:string)=>attr(e,'class').split(/\s+/).includes(name);

/** Native disclosures replace the two recognized Mono menu interactions.
 * No loader, script-assigned URL, or event handler is carried into controls. */
export function restoreRetainedMonoNavigation(html:string):string {
 if(html.includes('data-gnr8-mono-navigation'))return html;
 const nodes=all(parse(html,{sourceCodeLocationInfo:true}));
 const edits:{start:number;end:number;html:string}[]=[];
 const renderLinks=(node:Element)=>{
   const anchors=all(node).filter(e=>e.tagName==='a');
   if(!anchors.length||anchors.some(a=>!text(a).trim()||!attr(a,'href')||/^(?:\/\/|[a-z][a-z0-9+.-]*:)/i.test(attr(a,'href'))))return null;
   return anchors.map(a=>{
     const icons=all(a).filter(e=>e.tagName==='i'&&/^localeIcon svg-[a-z]{2}$/.test(attr(e,'class'))).map(e=>`<i class="${attr(e,'class')}" aria-hidden="true"></i>`).join('');
     return `<li><a href="${escape(attr(a,'href'))}">${icons}${escape(text(a).trim())}</a></li>`;
   }).join('');
 };
 for(const node of nodes){
   const loc=node.sourceCodeLocation;if(!loc)continue;
   if(node.tagName==='nav'&&hasClass(node,'module')&&hasClass(node,'nav')&&attr(node,'data-settings').includes('verticalNav-')){
     // Nested or non-link menu content needs a richer adapter.
     if(all(node).filter(e=>e.tagName==='ul').length!==1||all(node).some(e=>!['ul','li','a'].includes(e.tagName)))continue;
     const links=renderLinks(node);if(!links)continue;
     const label=attr(node,'aria-label')||'Menu';
     // Mono's inspected initializer targets `.module.nav`. Once the mobile
     // menu is native, that initializer must not change desktop aria-hidden
     // state when crossing breakpoints. Keep nav/ID styling and put the
     // generic module layout class on its wrapper instead.
     const desktop=html.slice(loc.startOffset,loc.endOffset).replace(/^(<nav\b[^>]*\bclass=)(["'])(.*?)\2/i,(_full,prefix,quote,classes)=>`${prefix}${quote}${classes.split(/\s+/).filter((c:string)=>c!=='module').join(' ')}${quote}`);
     edits.push({start:loc.startOffset,end:loc.endOffset,html:`<div class="module" data-gnr8-mono-navigation><div data-mono-desktop>${desktop}</div><details data-mono-mobile><summary aria-label="${escape(label)}">☰</summary><nav aria-label="${escape(label)}"><ul>${links}</ul></nav></details></div>`});
   }
   if(node.tagName==='div'&&hasClass(node,'locale')&&attr(node,'data-req')==='locale'){
     if(all(node).some(e=>!['ul','li','a','i','span'].includes(e.tagName)))continue;
     const links=renderLinks(node);if(!links)continue;
     const active=all(node).find(e=>e.tagName==='li'&&hasClass(e,'active'));
     const icon=active&&all(active).find(e=>e.tagName==='i'&&/^localeIcon svg-[a-z]{2}$/.test(attr(e,'class')));
     const label=attr(node,'aria-label')||'Language';
     edits.push({start:loc.startOffset,end:loc.endOffset,html:`<details id="${escape(attr(node,'id'))}" data-gnr8-mono-locale><summary aria-label="${escape(label)}">${icon?`<i class="${attr(icon,'class')}" aria-hidden="true"></i>`:escape(label)}</summary><ul>${links}</ul></details>`});
   }
 }
 if(!edits.length)return html;
 for(const edit of edits.sort((a,b)=>b.start-a.start))html=html.slice(0,edit.start)+edit.html+html.slice(edit.end);
 return html.replace(/<\/head>/i,`<style data-gnr8-mono-navigation-style>
[data-gnr8-mono-navigation]{width:100%}[data-mono-mobile]{display:none}
[data-gnr8-mono-locale],[data-mono-mobile]{position:relative;z-index:20}
[data-gnr8-mono-locale] summary,[data-mono-mobile] summary{cursor:pointer;list-style:disclosure-closed;padding:8px}
[data-gnr8-mono-locale] summary .localeIcon{display:inline-block;width:22px;height:16px;vertical-align:middle}
[data-gnr8-mono-locale]>ul,[data-mono-mobile] nav{position:absolute;right:0;top:100%;background:#fff;color:#333;min-width:180px;padding:10px;box-shadow:0 3px 12px #0003}
[data-gnr8-mono-locale] li,[data-mono-mobile] li{display:block;position:static;list-style:none;float:none}
[data-gnr8-mono-locale] a,[data-mono-mobile] a{display:block;padding:10px;color:inherit;white-space:nowrap}
[data-gnr8-mono-locale] a .localeIcon{display:inline-block;width:22px;height:16px;margin-right:8px;vertical-align:middle}
[data-gnr8-mono-navigation] nav::before,[data-gnr8-mono-navigation] nav::after{display:none!important;content:none!important}
@media(max-width:1199px){[data-mono-desktop]{display:none}[data-mono-mobile]{display:block}[data-mono-mobile] summary{font-size:24px}[data-mono-mobile] nav{display:block!important;height:auto!important;max-height:70vh;overflow:auto}[data-mono-mobile] nav ul,[data-mono-mobile] nav li,[data-mono-mobile] nav a{position:static!important;left:auto!important;right:auto!important;top:auto!important;transform:none!important;float:none!important;width:auto!important;height:auto!important;max-height:none!important;visibility:visible!important;opacity:1!important;background:#fff!important;color:#333!important;font-size:16px!important;line-height:1.5!important;text-align:left!important}[data-mono-mobile] nav ul{display:block!important;padding:0!important;margin:0!important}[data-mono-mobile] nav a{display:block!important}}
</style></head>`);
}
