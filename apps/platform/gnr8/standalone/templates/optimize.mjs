import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {join,extname} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {parse,serialize,parseFragment} from 'parse5';
import postcss from 'postcss';
const digest=b=>createHash('sha256').update(b).digest('hex');
const root=new URL('../dist/',import.meta.url);
const files=await walk(root);
const images=new Map();
const output=new URL('_media/',root);await mkdir(output,{recursive:true});
// Transform only immutable local inputs; no network, environment or platform API.
for(const path of files.filter(p=>/\.(png|jpe?g|webp)$/i.test(p))){
 const body=await readFile(new URL(path,root));
 const metadata=await sharp(body,{animated:true}).metadata();
 if(!metadata.width||!metadata.height||metadata.pages>1)continue;
 const widths=[480,768,1280,1920].filter(w=>w<metadata.width);widths.push(Math.min(metadata.width,2560));
 const variants=[];
 for(const width of [...new Set(widths)]){
  const bytes=await sharp(body).rotate().resize({width,withoutEnlargement:true}).webp({quality:85,effort:5}).toBuffer();
  const name=digest(bytes)+'.webp';await writeFile(new URL(name,output),bytes);
  variants.push({width,url:'/_media/'+name,bytes:bytes.length});
 }
 images.set('/'+path,{width:metadata.width,height:metadata.height,variants});
}
const report={images:images.size,pages:0,embeddedImages:0,cssFiles:0,backgroundPreloads:0};
const stylesheets=new Map();
for(const path of files.filter(p=>p.endsWith('.css')))stylesheets.set('/'+path,postcss.parse(await readFile(new URL(path,root),'utf8')));
const elements=node=>[...(node.tagName?[node]:[]),...(node.childNodes??[]).flatMap(elements)];
const attribute=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;

for(const path of files.filter(p=>p.endsWith('.html'))){
 const tree=parse(await readFile(new URL(path,root),'utf8'));let priority=false;
 const nodes=elements(tree),backgrounds=new Map();
 for(const link of nodes.filter(n=>n.tagName==='link'&&attribute(n,'rel')==='stylesheet')){
  const sheet=stylesheets.get((attribute(link,'href')??'').split('?')[0]);
  sheet?.walkDecls('background-image',decl=>{
   if(decl.parent.parent?.type!=='root')return;
   const selector=decl.parent.selector;
   if(!/^(?:#[A-Za-z0-9_-]+\s+)*#[A-Za-z0-9_-]+$/.test(selector??''))return;
   const ids=selector.split(/\s+/).map(v=>v.slice(1));const node=nodes.find(n=>attribute(n,'id')===ids.at(-1));
   if(!node||!ids.slice(0,-1).every(id=>{for(let a=node.parentNode;a;a=a.parentNode)if(attribute(a,'id')===id)return true;return false;}))return;
   const url=decl.value.match(/url\(["']?([^)'"?]+)(?:\?[^)'" ]*)?["']?\)/)?.[1];const image=images.get(url);
   if(image)backgrounds.set(node,image);
  });
 }

 const visit=async node=>{
  const background=backgrounds.get(node);
  if(!priority&&background&&background.width>=600){
   const desktop=background.variants.at(-1),mobile=background.variants.find(v=>v.width>=768)??desktop;
   const head=nodes.find(n=>n.tagName==='head');
   const markup=`<link rel="preload" as="image" fetchpriority="high" href="${desktop.url}" media="(min-width:768px)"><link rel="preload" as="image" fetchpriority="high" href="${mobile.url}" media="(max-width:767px)">`;
   for(const link of parseFragment(markup).childNodes){link.parentNode=head;head.childNodes.push(link);}
   priority=true;report.backgroundPreloads++;
  }

  if(node.tagName==='img'){
   const get=n=>node.attrs.find(a=>a.name===n)?.value;
   const set=(name,value)=>{node.attrs=node.attrs.filter(a=>a.name!==name);node.attrs.push({name,value:String(value)})};
   if(priority)set('loading','lazy');
   const asset=images.get((get('src')??'').split('?')[0]);
   if(asset&&!get('srcset')){
    set('srcset',asset.variants.map(v=>v.url+' '+v.width+'w').join(', '));
    set('sizes',get('sizes')??'(max-width: 768px) 100vw, 1280px');
    // Original remains fallback; intrinsic dimensions prevent layout shifts.
    if(!get('width')&&!get('height')){set('width',asset.width);set('height',asset.height);}
    const main=!priority&&asset.width>=600&&asset.height>=250;
    if(main){set('fetchpriority','high');set('loading','eager');priority=true;}
    else if(priority)set('loading','lazy');
    set('decoding','async');
   }
  }
  if(node.childNodes)for(const child of node.childNodes)await visit(child);
 };
 await visit(tree);await writeFile(new URL(path,root),serialize(tree));report.pages++;
}
// Parse CSS rather than deleting selectors or subsetting fonts speculatively.
// Preserve full font glyph sets (including č š ž). Extract embedded raster data
// into immutable files and use smaller WebP alternatives for CSS backgrounds.
for(const path of files.filter(p=>p.endsWith('.css'))){
 const sheet=postcss.parse(await readFile(new URL(path,root),'utf8'));
 const pending=[];
 sheet.walkDecls(decl=>{
  decl.value=decl.value.replace(/url\(\s*(["']?)(\/[^)'"\s?]+)(?:\?[^)'"\s]*)?\1\s*\)/g,(all,q,url)=>{
   const image=images.get(url);const chosen=image?.variants.at(-1);
   if(chosen&&decl.prop==='background-image'&&decl.parent.type==='rule'&&decl.parent.parent?.type==='root'){
    const mobile=image.variants.find(v=>v.width>=768)??chosen;
    if(mobile.url!==chosen.url){const rule=postcss.rule({selector:decl.parent.selector});rule.append({prop:decl.prop,value:`url("${mobile.url}")`,important:decl.important});const media=postcss.atRule({name:'media',params:'(max-width:767px)'});media.append(rule);decl.parent.after(media);}
   }
   return chosen?`url("${chosen.url}")`:all;
  });
  const matches=[...decl.value.matchAll(/url\(\s*(["']?)data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)\1\s*\)/g)];
  for(const match of matches)pending.push((async()=>{
   const bytes=Buffer.from(match[3],'base64');
   const encoded=await sharp(bytes).webp({quality:85}).toBuffer();const name=digest(encoded)+'.webp';
   await writeFile(new URL(name,output),encoded);decl.value=decl.value.replace(match[0],`url("/_media/${name}")`);report.embeddedImages++;
  })());
 });
 await Promise.all(pending);
 sheet.walkAtRules('font-face',rule=>{if(!rule.nodes.some(n=>n.type==='decl'&&n.prop==='font-display'))rule.append({prop:'font-display',value:'swap'});});
 sheet.walkComments(c=>c.remove());await writeFile(new URL(path,root),sheet.toString());report.cssFiles++;
}
await writeFile(new URL('../optimization-report.json',import.meta.url),JSON.stringify(report,null,2));
async function walk(directory,prefix=''){const result=[];for(const e of await readdir(directory,{withFileTypes:true})){if(e.isSymbolicLink())throw Error('symlink');const p=prefix+e.name;if(e.isDirectory())result.push(...await walk(new URL(e.name+'/',directory),p+'/'));else result.push(p);}return result.sort();}
