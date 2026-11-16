import {parse,parseFragment,serialize,type DefaultTreeAdapterMap} from 'parse5';
type Node=DefaultTreeAdapterMap['node'];
type Element=DefaultTreeAdapterMap['element'];
const all=(n:Node):Element[]=>('childNodes' in n?n.childNodes:[]).flatMap(c=>'tagName' in c?[c,...all(c)]:[]);
const attr=(e:Element,key:string)=>e.attrs.find(a=>a.name===key)?.value??'';
const text=(n:Node):string=>'value' in n?n.value:('childNodes' in n?n.childNodes:[]).map(text).join('');
const identity=(href:string)=>href.split(/[?#]/)[0]!.replace(/^\/+/, '');

/** Materialize the observed stylesheet insertion; never evaluate the loader. */
export function materializeRetainedStylesheetDocument(document:DefaultTreeAdapterMap['document'],resolve:(href:string)=>string|null):boolean {
 const nodes=all(document),existing=new Set(nodes.filter(e=>e.tagName==='link'&&attr(e,'rel')==='stylesheet').map(e=>identity(attr(e,'href'))));
 let changed=false;
 for(const script of nodes.filter(e=>e.tagName==='script')){
   const body=text(script);
   if(!/createelement\s*\(\s*["']link["']\s*\)/i.test(body)||!/rel\s*=\s*["']stylesheet["']/i.test(body))continue;
   const id=body.match(/getElementById\s*\(\s*(["'])([^"']+)\1\s*\)/i)?.[2];
   const target=id&&nodes.find(e=>attr(e,'id')===id),parent=target&&target.parentNode;
   if(!target||!parent)continue;
   for(const match of body.matchAll(/\bhref\s*=\s*(["'])(\/assets\/[^"'?#\s>]+\.css(?:\?[^"'#\s>]*)?(?:#[^"'\s>]*)?)\1/gi)){
     const href=resolve(match[2]!);if(!href||existing.has(identity(href)))continue;
     const link=parseFragment('<link rel="stylesheet" data-gnr8-materialized-script-stylesheet>').childNodes[0] as Element;
     link.attrs.push({name:'href',value:href});link.parentNode=parent;
     parent.childNodes.splice(parent.childNodes.indexOf(target),0,link);existing.add(identity(href));changed=true;
   }
 }
 return changed;
}

export function materializeRetainedStylesheets(html:string,fileMapPaths:ReadonlySet<string>):string {
 if(!/createelement\s*\(\s*["']link["']\s*\)/i.test(html))return html;
 const document=parse(html);
 return materializeRetainedStylesheetDocument(document,href=>fileMapPaths.has(identity(href))?href:null)?serialize(document):html;
}
