import type { DefaultTreeAdapterMap } from 'parse5';
/** Non-fetching document relationships remain source links; they cannot load
 * executable content. Resource links (styles, icons, preload) are separate. */
export function isRetainedDocumentRelationship(element: DefaultTreeAdapterMap['element']): boolean {
 if(element.tagName !== 'link')return false;
 const attr=(key:string)=>element.attrs.find(a=>a.name===key)?.value??'';
 const relationships=attr('rel').toLowerCase().split(/\s+/);
 if(!relationships.length||!relationships.every(rel=>['alternate','canonical','shortlink','next','prev','edituri','wlwmanifest','https://api.w.org/'].includes(rel)))return false;
 try{const url=new URL(attr('href'));return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password;}catch{return false;}
}
