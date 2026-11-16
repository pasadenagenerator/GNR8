import { parse, type DefaultTreeAdapterMap } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
const attr = (e: Element, name: string) => e.attrs.find(a => a.name === name)?.value ?? '';
const all = (n: Node): Element[] => ('childNodes' in n ? n.childNodes : []).flatMap(c => 'tagName' in c ? [c, ...all(c)] : []);
const text = (n: Node): string => 'value' in n ? n.value : ('childNodes' in n ? n.childNodes : []).map(text).join('');
const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const hasClass = (e: Element, name: string) => attr(e, 'class').split(/\s+/).includes(name);

export const RETAINED_GALLERY_SCRIPT = String.raw`(()=>{
document.querySelectorAll('[data-gnr8-gallery]').forEach(root=>{
  if(root.dataset.ready)return;root.dataset.ready='true';
  const links=[...root.querySelectorAll('a[data-gallery-image]')];
  root.addEventListener('click',event=>{
    const link=event.target.closest('a[data-gallery-image]');
    if(!links.includes(link)||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||typeof HTMLDialogElement==='undefined')return;
    const safe=href=>{try{const u=new URL(href,location.href);return u.origin===location.origin&&/^https?:$/.test(u.protocol)}catch{return false}};
    if(!links.every(a=>safe(a.href)))return;
    event.preventDefault();event.stopPropagation();
    let index=links.indexOf(link);
    const dialog=document.createElement('dialog'),image=document.createElement('img'),caption=document.createElement('p'),toolbar=document.createElement('div');
    dialog.dataset.gnr8GalleryDialog='';dialog.setAttribute('aria-label',root.dataset.galleryLabel||'Gallery');caption.setAttribute('aria-live','polite');
    const button=(label,action)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',action);toolbar.append(b);return b};
    const show=i=>{index=(i+links.length)%links.length;const a=links[index],thumb=a.querySelector('img');image.src=a.href;image.alt=thumb?.alt||'';caption.textContent=(index+1)+' / '+links.length+(a.dataset.caption?' — '+a.dataset.caption:'')};
    const close=button(root.dataset.closeLabel||'Close',()=>dialog.close());
    const previous=button(root.dataset.previousLabel||'Previous',()=>show(index-1));
    const next=button(root.dataset.nextLabel||'Next',()=>show(index+1));
    previous.disabled=next.disabled=links.length<2;
    dialog.append(toolbar,image,caption);document.body.append(dialog);
    dialog.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();show(e.key==='Home'?0:e.key==='End'?links.length-1:index+(e.key==='ArrowLeft'?-1:1))}});
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
    dialog.addEventListener('close',()=>{dialog.remove();link.focus()},{once:true});
    show(index);dialog.showModal();close.focus();
  });
});
})();`;

const CSS = `
[data-gnr8-gallery] .gnr8-gallery-grid{display:grid;grid-template-columns:repeat(var(--gallery-cols),minmax(0,1fr));gap:var(--gallery-gap)}
[data-gnr8-gallery] figure{margin:0;min-width:0}
[data-gnr8-gallery] a{display:block;color:inherit}
[data-gnr8-gallery] img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover}
[data-gnr8-gallery] figcaption:empty{display:none}
[data-gnr8-gallery] a:focus-visible{outline:3px solid currentColor;outline-offset:2px}
@media(max-width:1199px){[data-gnr8-gallery] .gnr8-gallery-grid{grid-template-columns:repeat(var(--gallery-cols-md),minmax(0,1fr));gap:var(--gallery-gap-md)}}
@media(max-width:767px){[data-gnr8-gallery] .gnr8-gallery-grid{grid-template-columns:repeat(var(--gallery-cols-sm),minmax(0,1fr));gap:var(--gallery-gap-sm)}}
dialog[data-gnr8-gallery-dialog]{max-width:96vw;max-height:95dvh;padding:12px;border:0;background:#fff;color:#222;overflow:auto}
dialog[data-gnr8-gallery-dialog]::backdrop{background:#000c}
dialog[data-gnr8-gallery-dialog]>div{display:flex;gap:12px;margin-bottom:10px;flex-wrap:wrap}
dialog[data-gnr8-gallery-dialog] button{font:inherit;cursor:pointer;padding:8px 16px;color:#222;background:#fff;border:1px solid #555}
dialog[data-gnr8-gallery-dialog]>img{display:block;max-width:90vw;max-height:72dvh;width:auto;height:auto;object-fit:contain;margin:auto}
dialog[data-gnr8-gallery-dialog]>p{margin:10px 0 0}
`;

/** Recognize a retained Mono image grid, not arbitrary sliders or widgets.
 * Require every full image and thumbnail to belong to this version's map.
 * Unsupported structures remain untouched for existing capability reporting. */
export function enhanceRetainedGalleries(input: {html: string; siteId: string; siteVersionId: string; fileMapPaths: ReadonlySet<string>}): string {
  if (!input.html.includes('gallery')) return input.html;
  const nodes = all(parse(input.html, {sourceCodeLocationInfo:true}));
  const language = attr(nodes.find(e=>e.tagName==='html')!, 'lang');
  const labels = /^sl/i.test(language) ? ['Galerija','Zapri','Prejšnja','Naslednja'] : /^it/i.test(language) ? ['Galleria','Chiudi','Precedente','Successiva'] : ['Gallery','Close','Previous','Next'];
  const root = `/api/gnr8/runtime/preview-assets/${encodeURIComponent(input.siteId)}/${encodeURIComponent(input.siteVersionId)}/`;
  const retained = (value: string) => value.startsWith(root) && input.fileMapPaths.has(value.slice(root.length).split(/[?#]/)[0]!);
  const edits: {start:number;end:number;html:string}[] = [];
  for (const gallery of nodes.filter(e=>hasClass(e,'gallery') && attr(e,'data-req').split(',').includes('lightbox'))) {
    const descendants = all(gallery), location = gallery.sourceCodeLocation;
    const lists = descendants.filter(e=>e.tagName==='ul'&&hasClass(e,'pics'));
    const images = descendants.filter(e=>e.tagName==='img');
    const anchors = descendants.filter(e=>e.tagName==='a');
    if (!location || lists.length!==1 || !images.length || anchors.length!==images.length || descendants.some(e=>!['div','ul','li','a','span','img'].includes(e.tagName))) continue;
    if (anchors.some(a=>all(a).filter(e=>e.tagName==='img').length!==1 || !retained(attr(a,'href'))) || images.some(e=>!retained(attr(e,'src')))) continue;
    const settings = new Map(attr(gallery,'data-settings').split(',').map(v=>{const [key,value]=v.split('=');return [key,value]}));
    if (settings.get('view')!=='normal' || descendants.filter(e=>hasClass(e,'slide')).length!==1) continue;
    const number = (key:string,fallback:number,max:number) => {const n=Number(settings.get(key));return Number.isInteger(n)&&n>=1&&n<=max?n:fallback};
    const style = `--gallery-cols:${number('imagecols',5,12)};--gallery-cols-md:${number('imagecols-md',4,12)};--gallery-cols-sm:${number('imagecols-sm',3,12)};--gallery-gap:${number('margin',2,100)}px;--gallery-gap-md:${number('margin-md',2,100)}px;--gallery-gap-sm:${number('margin-sm',6,100)}px`;
    const figures = anchors.map((a,i)=>{const img=all(a).find(e=>e.tagName==='img')!;const caption=all(a).filter(e=>hasClass(e,'caption')).map(text).join(' ').trim();return `<figure><a data-gallery-image href="${escape(attr(a,'href'))}" data-caption="${escape(caption)}" aria-label="${escape(attr(a,'aria-label')||`${labels[0]} ${i+1}`)}"><img src="${escape(attr(img,'src'))}" alt="${escape(attr(img,'alt'))}" loading="lazy" decoding="async"></a><figcaption>${escape(caption)}</figcaption></figure>`}).join('');
    edits.push({start:location.startOffset,end:location.endOffset,html:`<section id="${escape(attr(gallery,'id'))}" class="module" data-gnr8-gallery data-gallery-label="${labels[0]}" data-close-label="${labels[1]}" data-previous-label="${labels[2]}" data-next-label="${labels[3]}" aria-label="${labels[0]}" style="${style}"><div class="gnr8-gallery-grid">${figures}</div></section>`});
  }
  if (!edits.length) return input.html;
  let html = input.html;
  for (const edit of edits.sort((a,b)=>b.start-a.start)) html=html.slice(0,edit.start)+edit.html+html.slice(edit.end);
  const runtime = `<style data-gnr8-gallery-style>${CSS}</style><script data-gnr8-preview-runtime="retained-gallery">${RETAINED_GALLERY_SCRIPT}</script>`;
  return html.replace(/<\/body>/i,`${runtime}</body>`);
}
