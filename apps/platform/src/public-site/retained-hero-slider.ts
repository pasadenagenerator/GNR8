import { parse, type DefaultTreeAdapterMap } from "parse5";
import postcss from "postcss";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
const attr = (node: Element, name: string) => node.attrs.find((a) => a.name === name)?.value ?? "";
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
function elements(node: Node): Element[] {
  return ("childNodes" in node ? node.childNodes : []).flatMap((child) => [ ...("tagName" in child ? [child] : []), ...elements(child) ]);
}
function text(node: Node): string {
  if (node.nodeName === "br") return "\n";
  if ("value" in node) return node.value;
  return "childNodes" in node ? node.childNodes.map(text).join("") : "";
}

/** A captured plugin wrapper height is obsolete once that wrapper is the owned
 * ratio-based carousel. Remove only its exact ID sizing rule at render time;
 * keep the immutable candidate, source sections and mobile carousel CSS intact. */
export function normalizeRetainedHeroWrapperSizing(html: string): string {
  const nodes = elements(parse(html, { sourceCodeLocationInfo: true }));
  const ids = new Set(nodes.filter(node => node.tagName === "section" &&
    node.attrs.some(a => a.name === "data-gnr8-hero") &&
    attr(node, "style").includes("--hero-ratio:") && /^[A-Za-z][\w-]*$/.test(attr(node, "id")))
    .map(node => `#${attr(node, "id")}`));
  if (!ids.size) return html;
  const edits: { start: number; end: number; css: string }[] = [];
  for (const node of nodes.filter(node => node.tagName === "style")) {
    const location = node.sourceCodeLocation;
    if (!location?.startTag || !location.endTag) continue;
    const original = html.slice(location.startTag.endOffset, location.endTag.startOffset);
    const css = postcss.parse(original);
    css.walkRules(rule => {
      if (!ids.has(rule.selector.trim())) return;
      rule.walkDecls(/^(?:height|min-height|max-height)$/, declaration => { declaration.remove(); });
    });
    if (css.toString() !== original) edits.push({ start: location.startTag.endOffset, end: location.endTag.startOffset, css: css.toString() });
  }
  for (const edit of edits.sort((a, b) => b.start - a.start)) html = html.slice(0, edit.start) + edit.css + html.slice(edit.end);
  return html;
}

// Static, first-party code only. Captured text/settings are never executable.
export const RETAINED_HERO_SCRIPT = String.raw`(()=>{
  document.querySelectorAll('[data-gnr8-hero]').forEach(root=>{
    if(root.dataset.gnr8Ready)return;root.dataset.gnr8Ready='true';
    const slides=[...root.querySelectorAll('[data-hero-slide]')],dots=[...root.querySelectorAll('[data-hero-dot]')],pause=root.querySelector('[data-hero-pause]');
    let current=0,timer,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,focused=false;
    const interval=Number(root.dataset.interval);
    const stop=()=>clearTimeout(timer);
    const schedule=()=>{stop();if(slides.length>1&&interval>=2000&&!paused&&!focused&&!document.hidden)timer=setTimeout(()=>show(current+1),interval)};
    const show=index=>{current=(index+slides.length)%slides.length;slides.forEach((slide,i)=>{slide.dataset.active=String(i===current);slide.setAttribute('aria-hidden',String(i!==current))});dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===current)));root.dataset.activeSlide=String(current);schedule()};
    dots.forEach((dot,i)=>dot.addEventListener('click',()=>show(i)));
    root.querySelectorAll('[data-hero-step]').forEach(button=>button.addEventListener('click',()=>show(current+Number(button.dataset.heroStep))));
    let touchX;root.addEventListener('touchstart',event=>{touchX=event.touches[0]?.clientX},{passive:true});
    root.addEventListener('touchend',event=>{const end=event.changedTouches[0]?.clientX;if(touchX!==undefined&&end!==undefined&&Math.abs(end-touchX)>50)show(current+(end<touchX?1:-1));touchX=undefined},{passive:true});
    root.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();show(event.key==='Home'?0:event.key==='End'?slides.length-1:current+(event.key==='ArrowLeft'?-1:1))});
    const label=()=>{if(!pause)return;pause.textContent=paused?pause.dataset.playLabel:pause.dataset.pauseLabel;pause.setAttribute('aria-pressed',String(paused))};
    pause?.addEventListener('click',()=>{paused=!paused;label();schedule()});
    root.addEventListener('focusin',()=>{focused=true;stop()});
    root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget)){focused=false;schedule()}});
    document.addEventListener('visibilitychange',schedule);
    window.addEventListener('pagehide',stop,{once:true});
    label();show(0);
  });
  document.querySelectorAll('a[data-gnr8-image-zoom]').forEach(link=>{
    if(link.dataset.gnr8Ready)return;link.dataset.gnr8Ready='true';
    link.addEventListener('click',event=>{
      if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      if(typeof HTMLDialogElement==='undefined')return;
      const url=new URL(link.href,location.href);if(url.origin!==location.origin||!url.pathname.startsWith('/api/gnr8/runtime/preview-assets/'))return;
      event.preventDefault();const dialog=document.createElement('dialog'),image=document.createElement('img'),close=document.createElement('button');
      dialog.dataset.gnr8ImageDialog='';dialog.setAttribute('aria-label',link.dataset.zoomLabel||'Image');
      image.src=link.href;image.alt=link.dataset.zoomAlt||'';close.type='button';close.textContent=link.dataset.zoomClose||'Close';
      dialog.append(close,image);document.body.append(dialog);close.addEventListener('click',()=>dialog.close());
      dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
      dialog.addEventListener('close',()=>{dialog.remove();link.focus()},{once:true});dialog.showModal();close.focus();
    });
  });
})();`;

const CSS = `
[data-gnr8-hero]{position:relative;display:block;width:100%;aspect-ratio:var(--hero-ratio);overflow:hidden;background:#24444e;color:#fff;isolation:isolate}
[data-gnr8-hero] [data-hero-slide]{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .65s ease,visibility .65s;pointer-events:none}
[data-gnr8-hero] [data-hero-slide][data-active=true]{opacity:1;visibility:visible;pointer-events:auto}
[data-gnr8-hero] [data-hero-slide]>img{display:block;position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;object-position:center}
[data-gnr8-hero] [data-hero-layer]{position:absolute;left:var(--hero-x);top:var(--hero-y);width:var(--hero-width);max-width:94%;margin:0;white-space:pre-line;font-family:var(--hero-font),sans-serif;font-size:var(--hero-size);font-weight:var(--hero-weight);line-height:var(--hero-line);color:var(--hero-color);text-shadow:0 1px 3px #0006}
[data-gnr8-hero] [data-hero-controls]{position:absolute;z-index:2;left:20px;bottom:20px;display:flex;gap:8px;align-items:center}
[data-gnr8-hero] [data-hero-controls][hidden]{display:none}
[data-gnr8-hero] button{margin:0;box-shadow:none;cursor:pointer;border:1px solid #fff;background:#173843aa;color:#fff}
[data-gnr8-hero] [data-hero-dot]{border-radius:50%;width:32px;height:32px;padding:0}
[data-gnr8-hero] [data-hero-dot][aria-pressed=true]{background:#fff;color:#173843}
[data-gnr8-hero] [data-hero-pause]{border-radius:3px;padding:5px 10px;font:14px/20px sans-serif}
[data-gnr8-hero] button:focus-visible{outline:3px solid #71caff;outline-offset:3px}
@media(max-width:600px){[data-gnr8-hero]{min-height:460px;aspect-ratio:auto}[data-gnr8-hero] [data-hero-layer]{left:5%;width:90%;font-size:clamp(16px,var(--hero-size),34px)}[data-gnr8-hero] [data-hero-layer="0"]{font-size:30px;line-height:1.15;top:28%}[data-gnr8-hero] [data-hero-layer="1"]{top:68%}}
[data-gnr8-hero][data-hero-kind=testimonials]{display:grid;aspect-ratio:auto;min-height:0;background:transparent;color:inherit;padding-bottom:64px}
[data-gnr8-hero][data-hero-kind=testimonials] [data-hero-slide]{position:relative;inset:auto;grid-area:1/1;padding:20px;box-sizing:border-box}
[data-hero-kind=testimonials] [data-hero-slide]>img{position:static;width:85px;height:85px;max-width:100%;border-radius:50%;margin:0 auto 20px}
[data-hero-kind=testimonials] blockquote{margin:0;padding:16px;font:inherit;text-align:center;background:none;box-sizing:border-box}
[data-hero-kind=testimonials] [data-testimonial-author]{text-align:center}
[data-gnr8-image-dialog]{max-width:94vw;max-height:94vh;padding:12px;border:0}
[data-gnr8-image-dialog] img{display:block;max-width:88vw;max-height:80vh;object-fit:contain}
[data-gnr8-image-dialog]::backdrop{background:#000c}
@media(prefers-reduced-motion:reduce){[data-gnr8-hero] [data-hero-slide]{transition:none}}
`;

/** Deliberately narrow profile: an owned image plus plain text layers per slide.
 * Unsupported media/layers or incomplete settings leave the original untouched.
 */
export function enhanceRetainedHeroSliders(input: {
  html: string;
  siteId: string;
  siteVersionId: string;
  fileMapPaths?: ReadonlySet<string>;
}): string {
  if ((!input.html.includes("<rs-module-wrap") && !input.html.includes("testimonials_slider") && !/class=["'][^"']*\bzoom\b/.test(input.html)) || !input.fileMapPaths) return input.html;
  const document = parse(input.html, { sourceCodeLocationInfo: true });
  const nodes = elements(document);
  const scripts = nodes.filter((node) => node.tagName === "script");
  const edits: Array<{ start: number; end: number; html: string }> = [];
  const replacedIds: string[] = [];
  const prefix = `/api/gnr8/runtime/preview-assets/${input.siteId}/${input.siteVersionId}/`;
  const sl = /^sl\b/i.test(attr(nodes.find((node) => node.tagName === "html")!, "lang"));
  for (const wrapper of nodes.filter((node) => node.tagName === "rs-module-wrap")) {
    const location = wrapper.sourceCodeLocation;
    const descendants = elements(wrapper);
    const sliderModule = descendants.find((node) => node.tagName === "rs-module");
    if (!location || !sliderModule) continue;
    const moduleId = attr(sliderModule, "id");
    if (!/^[\w-]+$/.test(moduleId)) continue;
    const initializer = scripts.filter((script) => text(script).includes(moduleId) && /\.revolution\s*\(/.test(text(script)));
    if (initializer.length !== 1) continue;
    const configuration = text(initializer[0]!);
    // Read numeric literals only; never evaluate captured JavaScript.
    const numeric = (key: string) => Number(configuration.match(new RegExp(`\\b${key}\\s*:\\s*["']?(\\d+)(?:ms)?["']?\\s*[,}]`))?.[1]);
    const sourceSlides = descendants.filter((node) => node.tagName === "rs-slide");
    const width = numeric("gridwidth"), height = numeric("gridheight"), interval = sourceSlides.length === 1 ? 0 : numeric("duration");
    if (!(width >= 320 && width <= 3840 && height >= 200 && height <= 2160 && (sourceSlides.length === 1 || interval >= 2000 && interval <= 30000))) continue;
    if (sourceSlides.length < 1 || sourceSlides.length > 12) continue;
    const slides: string[] = [];
    for (const [index, slide] of sourceSlides.entries()) {
      const children = elements(slide);
      const images = children.filter((node) => node.tagName === "img" || (node.tagName === "rs-sbg" && attr(node, "src")));
      const image = images[0];
      const src = image ? attr(image, "src") : "";
      const ownedPath = src.startsWith(prefix) ? src.slice(prefix.length).split(/[?#]/)[0]! : "";
      const layers = children.filter((node) => node.tagName === "rs-layer");
      if (!ownedPath || !input.fileMapPaths.has(ownedPath) || images.length !== 1 || layers.length < 1 || layers.length > 4 || children.some((node) => ["video", "audio", "iframe"].includes(node.tagName))) break;
      const renderedLayers: string[] = [];
      for (const [layerIndex, layer] of layers.entries()) {
        if (attr(layer, "data-type") !== "text" || elements(layer).some((node) => !["br", "span", "strong", "em", "b", "i"].includes(node.tagName))) break;
        const xy = attr(layer, "data-xy"), typography = attr(layer, "data-text"), style = attr(layer, "style");
        const read = (source: string, key: string) => Number(source.match(new RegExp(`(?:^|;)\\s*${key}:\\s*(\\d+(?:\\.\\d+)?)(?:px)?(?:;|$)`))?.[1]);
        const x = read(xy, "x"), y = read(xy, "y"), size = read(typography, "s") || 20, line = read(typography, "l") || size * 1.2, weight = read(typography, "fw") || 400;
        const layerWidth = read(attr(layer, "data-dim"), "w") || width - x - 40;
        if (![x,y,size,line,weight,layerWidth].every(Number.isFinite) || x < 0 || y < 0 || x >= width || y >= height || size > 200 || layerWidth <= 0) break;
        const color = /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(attr(layer, "data-color")) ? attr(layer, "data-color") : "#fff";
        const font = style.match(/font-family:\s*["']?([a-zA-Z ]+)/)?.[1]?.trim() || "sans-serif";
        const vars = `--hero-x:${x/width*100}%;--hero-y:${y/height*100}%;--hero-width:${layerWidth/width*100}%;--hero-size:clamp(14px,${size/width*100}vw,${size}px);--hero-line:${line/size};--hero-weight:${weight};--hero-color:${color};--hero-font:'${font}'`;
        renderedLayers.push(`<p data-hero-layer="${layerIndex}" style="${escape(vars)}">${escape(text(layer).trim())}</p>`);
      }
      if (renderedLayers.length !== layers.length) break;
      slides.push(`<div data-hero-slide="${index}" data-active="${index===0}" aria-hidden="${index!==0}" role="group" aria-label="${index+1} / ${sourceSlides.length}"><img src="${escape(src)}" alt="${escape(attr(image!, "alt"))}" ${index===0?'fetchpriority="high"':''}>${renderedLayers.join("")}</div>`);
    }
    if (slides.length !== sourceSlides.length) continue;
    const pause = sl ? "Ustavi" : "Pause", play = sl ? "Predvajaj" : "Play";
    const dots = slides.map((_,i) => `<button type="button" data-hero-dot="${i}" aria-label="${sl?'Prikaži slajd':'Show slide'} ${i+1}" aria-pressed="${i===0}">${i+1}</button>`).join("");
    edits.push({ start: location.startOffset, end: location.endOffset, html: `<section id="${escape(attr(wrapper,"id"))}" data-gnr8-hero data-interval="${interval}" data-active-slide="0" role="region" aria-roledescription="carousel" aria-label="${sl?'Izpostavljeno':'Highlights'}" style="--hero-ratio:${width}/${height}">${slides.join("")}<div data-hero-controls${slides.length===1?" hidden":""}>${dots}<button type="button" data-hero-pause data-pause-label="${pause}" data-play-label="${play}" aria-pressed="false">${pause}</button></div></section>` });
    replacedIds.push(moduleId);
  }
  const owned = (url: string) => url.startsWith(prefix) && input.fileMapPaths!.has(url.slice(prefix.length).split(/[?#]/)[0]!);
  for (const wrapper of nodes.filter(node => attr(node, "class").split(/\s+/).includes("testimonials_slider"))) {
    const descendants = elements(wrapper), location = wrapper.sourceCodeLocation;
    const lists = descendants.filter(node => node.tagName === "ul" && attr(node,"class").split(/\s+/).includes("testimonials_slider_ul"));
    const configuration = scripts.map(text).filter(body => /\bmfn\s*=/.test(body));
    const intervalMatch = configuration.length === 1 ? configuration[0]!.match(/"testimonials"\s*:\s*(\d+)\s*[,}]/) : null;
    if (!location || lists.length !== 1 || !intervalMatch) continue;
    const interval = Number(intervalMatch[1]);
    if (interval !== 0 && (interval < 2000 || interval > 30000)) continue;
    const items = elements(lists[0]!).filter(node => node.tagName === "li");
    if (items.length < 2 || items.length > 12 || descendants.some(node => !["ul","li","div","img","blockquote","span","h5","br","strong","em","b","i"].includes(node.tagName))) continue;
    const slides: string[] = [];
    for (const [index,item] of items.entries()) {
      const children = elements(item), images = children.filter(n => n.tagName === "img"), quotes = children.filter(n => n.tagName === "blockquote"), authors = children.filter(n => attr(n,"class").split(/\s+/).includes("author"));
      if (images.length !== 1 || quotes.length !== 1 || authors.length !== 1 || !owned(attr(images[0]!,"src"))) break;
      slides.push(`<div data-hero-slide="${index}" data-active="${index===0}" aria-hidden="${index!==0}" role="group" aria-label="${index+1} / ${items.length}"><img src="${escape(attr(images[0]!,"src"))}" alt="${escape(attr(images[0]!,"alt"))}"><blockquote>${escape(text(quotes[0]!))}</blockquote><p data-testimonial-author>${escape((authors[0]!.childNodes??[]).map(text).join(" "))}</p></div>`);
    }
    if (slides.length !== items.length) continue;
    const dots = slides.map((_,i)=>`<button type="button" data-hero-dot="${i}" aria-label="${sl?'Prikaži izjavo':'Show testimonial'} ${i+1}" aria-pressed="${i===0}">${i+1}</button>`).join("");
    const pause = interval ? `<button type="button" data-hero-pause data-pause-label="${sl?'Ustavi':'Pause'}" data-play-label="${sl?'Predvajaj':'Play'}">${sl?'Ustavi':'Pause'}</button>` : "";
    edits.push({start:location.startOffset,end:location.endOffset,html:`<section data-gnr8-hero data-hero-kind="testimonials" data-interval="${interval}" data-active-slide="0" role="region" aria-roledescription="carousel" aria-label="${sl?'Izjave strank':'Testimonials'}">${slides.join("")}<div data-hero-controls><button type="button" data-hero-step="-1" aria-label="${sl?'Prejšnja izjava':'Previous testimonial'}">‹</button>${dots}<button type="button" data-hero-step="1" aria-label="${sl?'Naslednja izjava':'Next testimonial'}">›</button>${pause}</div></section>`});
  }
  for (const link of nodes.filter(node => node.tagName === "a" && attr(node,"class").split(/\s+/).includes("zoom"))) {
    const loc = link.sourceCodeLocation;
    if (!loc?.startTag || !owned(attr(link,"href")) || attr(link,"data-gnr8-image-zoom") || link.attrs.some(a=>a.name.startsWith("on"))) continue;
    const image = elements(link.parentNode!).find(node=>node.tagName==="img");
    const start = loc.startTag.startOffset, end = loc.startTag.endOffset;
    edits.push({start,end,html:input.html.slice(start,end-1)+` data-gnr8-image-zoom="true"${attr(link,"aria-label")?"":` aria-label="${sl?'Povečaj fotografijo':'Enlarge image'}"`} data-zoom-label="${sl?'Povečana fotografija':'Enlarged image'}" data-zoom-close="${sl?'Zapri':'Close'}" data-zoom-alt="${escape(image?attr(image,"alt"):"")}">`});
  }
  if (!edits.length) return input.html;
  for (const script of scripts) {
    const body = text(script), src = attr(script, "src"), loc = script.sourceCodeLocation;
    if (!loc || edits.some((edit) => loc.startOffset >= edit.start && loc.endOffset <= edit.end)) continue;
    const initializer = replacedIds.some((id) => body.includes(id)) && /\.revolution\s*\(/.test(body);
    const engine = replacedIds.length === nodes.filter((node)=>node.tagName==="rs-module").length && /(?:revslider|(?:^|[-/])(?:rs6|rbtools)(?:\.min)?\.js)/i.test(src);
    if (initializer || engine) edits.push({ start: loc.startOffset, end: loc.endOffset, html: `<script type="application/gnr8-disabled-script" data-gnr8-script-policy-reason="retained-hero-replaced">${body}</script>` });
  }
  let output = input.html;
  for (const edit of edits.sort((a,b)=>b.start-a.start)) output = output.slice(0,edit.start)+edit.html+output.slice(edit.end);
  const trusted = input.html.includes(RETAINED_HERO_SCRIPT) ? "" : `<style data-gnr8-hero-style>${CSS}</style><script data-gnr8-preview-runtime="retained-hero">${RETAINED_HERO_SCRIPT}</script>`;
  return output.includes("</body>") ? output.replace("</body>", `${trusted}</body>`) : output+trusted;
}
