import { createHash } from 'node:crypto';
import { parse, serialize, type DefaultTreeAdapterMap } from 'parse5';
import policy from './lumos-reviewed-export.json';

/** Reviewed executable template with bounded plain-text revisions. This is
 * NOT a general grant to scripts produced by Astro or supplied by a caller.
 * Non-text changes require a source and executable-output review. */
export const REVIEWED_LUMOS_SOURCE = policy.sourceSnapshotSha256;
export const RESOURCE_CONVERSION_VERSION = 'gnr8-astro-internal-preview-conversion:v2' as const;
export const RESOURCE_RECORD_VERSION = 'gnr8-astro-persisted-preview-candidate:v4' as const;
export type AstroExportResource = { path: string; mediaType: string; sizeBytes: number; sha256: string; base64: string };
export type AstroExportResourceRef = Omit<AstroExportResource, 'base64'> & { kind: 'export_resource'; bucket: string; key: string };
export const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
export function exportMediaType(path: string): string {
  const ext = path.split('.').pop();
  const types: Record<string,string> = {html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml',woff2:'font/woff2',ico:'image/x-icon',jpg:'image/jpeg',txt:'text/plain; charset=utf-8',xml:'application/xml; charset=utf-8'};
  if (!ext || !types[ext]) throw Error('Unsupported export media type');
  return types[ext];
}
export function validateExportPath(path: string): void {
  if (typeof path !== 'string' || path.length > 512 || !/^[a-zA-Z0-9_/-][a-zA-Z0-9_./-]*$/.test(path) || path.startsWith('/') || path.split('/').some(p=>!p || p==='.' || p==='..')) throw Error('Invalid export path');
}
export function validateReviewedDescriptors(files: Omit<AstroExportResource,'base64'>[], source: string): void {
  if (!/^[a-f0-9]{64}$/.test(source) || !Array.isArray(files) || files.length !== policy.files.length) throw Error('Unreviewed source or incomplete export');
  const seen = new Set<string>();
  for (const file of files) {
    validateExportPath(file.path);
    const approved = policy.files.find(p=>p.path===file.path);
    const editable = source !== REVIEWED_LUMOS_SOURCE && file.path.endsWith('.html');
    if (!approved || seen.has(file.path) || file.mediaType!==exportMediaType(file.path) ||
        (!editable && (file.sha256!==approved.sha256 || file.sizeBytes!==approved.sizeBytes)) ||
        (editable && (!/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.sizeBytes) || file.sizeBytes<1 || file.sizeBytes>1024*1024))) throw Error('Export differs from reviewed build');
    seen.add(file.path);
  }
}
export function validateReviewedExport(files: AstroExportResource[], source: string): void {
  validateReviewedDescriptors(files,source);
  for (const file of files) {
    const bytes = Buffer.from(file.base64,'base64');
    if (bytes.toString('base64')!==file.base64 || bytes.length!==file.sizeBytes || digest(bytes)!==file.sha256) throw Error('Export bytes changed');
    if (file.path.endsWith('.svg')) validateExportSvg(bytes.toString('utf8'));
    if (file.path.endsWith('.html')) {
      const html=bytes.toString('utf8');
      if(!Buffer.from(html).equals(bytes))throw Error('Invalid HTML encoding');
      validateExportHtml(html);
      const approved=policy.files.find(f=>f.path===file.path);
      if(digest(maskReviewedText(html))!==approved?.textShapeSha256)throw Error('Unreviewed executable HTML or structure');
    }
  }
}
type Node = DefaultTreeAdapterMap['node'];
export function walk(node: Node, visit: (node: Node)=>void) { visit(node); if ('childNodes' in node) node.childNodes.forEach(n=>walk(n,visit)); if ('content' in node) walk(node.content,visit); }
export function validateExportSvg(svg: string): void {
  if (/<!DOCTYPE|<!ENTITY/i.test(svg)) throw Error('Unsafe SVG declaration');
  const allowed = new Set(['svg','g','path','defs','linearGradient','radialGradient','stop','rect','circle','ellipse','line','polyline','polygon','title','desc','clipPath','mask','filter','feBlend','feFlood','feGaussianBlur']);
  walk(parse(svg), n=>{if ('tagName' in n && !['html','head','body'].includes(n.tagName)) {
    if (!allowed.has(n.tagName)) throw Error('Unsafe SVG element');
    for (const a of n.attrs) if (/^on/i.test(a.name) || /href/i.test(a.name) || /url\(\s*[^#]/i.test(a.value) || /javascript:|@import/i.test(a.value)) throw Error('Unsafe SVG attribute');
  }});
}
function validateExportHtml(html: string): void {
  walk(parse(html),n=>{if ('tagName' in n) {
    if (['iframe','object','embed','base'].includes(n.tagName)) throw Error('Unsafe HTML element');
    for (const a of n.attrs) if (/^on/i.test(a.name) || /^(?:javascript|vbscript):/i.test(a.value.trim())) throw Error('Unsafe HTML attribute');
    if (n.tagName==='script' && (n.attrs.length!==1 || n.attrs[0].name!=='type' || n.attrs[0].value!=='module')) throw Error('Unapproved script attributes');
  }});
}
export function exportHtmlByPath(files: AstroExportResource[]): Record<string,string> & {'/':string} {
  return Object.fromEntries(files.filter(f=>f.path.endsWith('.html')).map(f=>[f.path==='index.html'?'/':f.path==='404.html'?'/404': '/'+f.path.replace(/\/index\.html$/,''),Buffer.from(f.base64,'base64').toString('utf8')])) as Record<string,string> & {'/':string};
}

/** Byte-preserving objects remain stored separately. Only this isolated preview
 * presentation is rewritten to inline data resources, so no authenticated asset
 * request or platform origin privilege is needed by the sandboxed document. */
export function renderReviewedExport(files: AstroExportResource[], source: string, path: string): {html:string; status:number; csp:string} {
  validateReviewedExport(files,source);
  const routes=exportHtmlByPath(files); const raw=routes[path] ?? routes['/404'];
  const status=path==='/404' || !routes[path] ? 404 : 200;
  const resources = new Map(files.map(f=>['/'+f.path,f]));
  const data=(url:string, from='/')=>{
    if (url.startsWith('#') || url.startsWith('data:')) return url;
    const parsed=new URL(url,new URL(from,'https://export.invalid'));
    if(parsed.origin!=='https://export.invalid') throw Error('Preview resource is not local');
    const f=resources.get(parsed.pathname); if(!f) throw Error('Missing preview resource: '+parsed.pathname);
    return `data:${f.mediaType};base64,${f.base64}${parsed.hash}`;
  };
  const css=(body:string,from:string)=>body.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g,(_all,_q,url)=>`url("${data(url,from)}")`);
  const doc=parse(raw);const hashes:string[]=[];
  walk(doc,n=>{if(!('tagName' in n))return;
    const get=(name:string)=>n.attrs.find(a=>a.name===name);
    if(n.tagName==='link'){
      const rel=get('rel')?.value, href=get('href');
      if(rel==='stylesheet' && href){const f=resources.get(new URL(href.value,'https://export.invalid').pathname);if(!f)throw Error('Missing stylesheet');
        n.tagName='style';n.nodeName='style';n.attrs=[];n.childNodes=[{nodeName:'#text',value:css(Buffer.from(f.base64,'base64').toString('utf8'),'/'+f.path),parentNode:n}];
      } else if(href && rel!=='canonical') href.value=data(href.value);
    }
    if(n.tagName==='style')for(const c of n.childNodes)if(c.nodeName==='#text' && 'value' in c)c.value=css(c.value,(path==='/'?'/':path+'/'));
    for(const a of n.attrs){
      if(n.tagName==='video' && a.name==='src' && /^https:\/\//.test(a.value)) { n.attrs.push({name:'title',value:'External demo video unavailable in isolated preview'}); continue; }
      if(a.name==='src' || a.name==='poster' || (n.tagName==='use'&&a.name==='href')) a.value=data(a.value,(path==='/'?'/':path+'/'));
      if(a.name==='style') a.value=css(a.value,(path==='/'?'/':path+'/'));
      if(a.name==='srcset') a.value=a.value.split(',').map(s=>{const [u,...rest]=s.trim().split(/\s+/);return data(u,(path==='/'?'/':path+'/'))+' '+rest.join(' ')}).join(', ');
    }
    if(n.tagName==='form') {
      n.attrs.push({name:'data-gnr8-submission',value:'unavailable'},{name:'aria-label',value:'Demonstration form — submission unavailable'});
    }
    if((n.tagName==='button' && (!get('type') || get('type')?.value==='submit')) || (n.tagName==='input'&&get('type')?.value==='submit')){
      // Disable only controls within the demonstration form.
      let p:Node|null=n.parentNode; while(p && !('tagName'in p && p.tagName==='form'))p='parentNode'in p?p.parentNode:null;
      if(p)n.attrs.push({name:'disabled',value:''},{name:'title',value:'Submission unavailable in this preview'});
    }
    if(n.tagName==='script') {
      for(const c of n.childNodes)if('value'in c){
        // Opaque origins cannot change history. Keep tab state/controls working;
        // original executable bytes remain available in the immutable export.
        c.value=c.value.replace(/history\.replaceState\(history\.state,``,([ti])\)/g,'(()=>{try{history.replaceState(history.state,``, $1)}catch{}})()');
        hashes.push(createHash('sha256').update(c.value).digest('base64'));
      }
    }
  });
  // Capturing guard prevents the upstream demo's synthetic "sent" state too.
  const guard='document.addEventListener("submit",e=>{e.preventDefault();e.stopImmediatePropagation()},true);document.querySelectorAll("form").forEach(f=>{const p=document.createElement("p");p.textContent="Demonstration only — submission unavailable.";p.setAttribute("role","note");f.prepend(p)});document.querySelectorAll("video[title]").forEach(v=>{const p=document.createElement("p");p.textContent=v.title;v.after(p)});';
  hashes.push(createHash('sha256').update(guard).digest('base64'));
  const html=serialize(doc).replace('</body>','<script>'+guard+'</script></body>');
  const csp=["sandbox allow-scripts","default-src 'none'",`script-src ${hashes.map(h=>"'sha256-"+h+"'").join(' ')}`,"style-src 'unsafe-inline'","img-src data:","font-src data:","media-src data:","connect-src 'none'","frame-src 'none'","object-src 'none'","base-uri 'none'","form-action 'none'","frame-ancestors 'none'"].join('; ');
  return {html,status,csp};
}

/** Preserve every byte outside plain text spans. In Astro, frontmatter,
 * expressions, attributes and executable/raw-text elements are never masked. */
export function maskReviewedText(body:string, astro=false):string {
  const spans:{start:number;end:number}[]=[];
  const frontmatter=astro && body.startsWith('---') ? body.indexOf('\n---',3) : -1;
  if(astro && body.startsWith('---') && frontmatter<0)throw Error('Invalid Astro frontmatter');
  const protectedUntil=frontmatter<0?0:frontmatter+4;
  const visit=(n:Node,protectedText=false)=>{
    if('tagName'in n)protectedText ||= ['script','style','textarea','template'].includes(n.tagName);
    if(n.nodeName==='#text' && 'value'in n && n.sourceCodeLocation && !protectedText) {
      const {startOffset:start,endOffset:end}=n.sourceCodeLocation;
      if(start>=protectedUntil && (!astro || !/[{}]/.test(body.slice(start,end))))spans.push({start,end});
    }
    if('childNodes'in n)n.childNodes.forEach(c=>visit(c,protectedText));
    if('content'in n)visit(n.content,true);
  };
  visit(parse(body,{sourceCodeLocationInfo:true}));
  for(const {start,end} of spans.sort((a,b)=>b.start-a.start))body=body.slice(0,start)+'TEXT'+body.slice(end);
  return body;
}
export function isReviewedLumosTextSource(files:{path:string;body:Buffer}[]):boolean {
  if(files.length!==policy.sourceFiles.length || new Set(files.map(f=>f.path)).size!==files.length)return false;
  return files.every(file=>{
    const expected=policy.sourceFiles.find(f=>f.path===file.path);
    if(!expected)return false;
    const bytes=file.path==='src/pages/index.astro' ? Buffer.from(maskReviewedText(file.body.toString('utf8'),true)) : file.body;
    return digest(bytes)===expected.sha256;
  });
}
