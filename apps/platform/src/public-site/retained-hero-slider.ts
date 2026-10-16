import { parse, type DefaultTreeAdapterMap } from "parse5";

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

// Static, first-party code only. Captured text/settings are never executable.
export const RETAINED_HERO_SCRIPT = String.raw`(()=>{
  document.querySelectorAll('[data-gnr8-hero]').forEach(root=>{
    if(root.dataset.gnr8Ready)return;root.dataset.gnr8Ready='true';
    const slides=[...root.querySelectorAll('[data-hero-slide]')],dots=[...root.querySelectorAll('[data-hero-dot]')],pause=root.querySelector('[data-hero-pause]');
    let current=0,timer,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,focused=false;
    const interval=Number(root.dataset.interval);
    const stop=()=>clearTimeout(timer);
    const schedule=()=>{stop();if(!paused&&!focused&&!document.hidden)timer=setTimeout(()=>show(current+1),interval)};
    const show=index=>{current=(index+slides.length)%slides.length;slides.forEach((slide,i)=>{slide.dataset.active=String(i===current);slide.setAttribute('aria-hidden',String(i!==current))});dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===current)));root.dataset.activeSlide=String(current);schedule()};
    dots.forEach((dot,i)=>dot.addEventListener('click',()=>show(i)));
    root.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();show(event.key==='Home'?0:event.key==='End'?slides.length-1:current+(event.key==='ArrowLeft'?-1:1))});
    const label=()=>{pause.textContent=paused?pause.dataset.playLabel:pause.dataset.pauseLabel;pause.setAttribute('aria-pressed',String(paused))};
    pause.addEventListener('click',()=>{paused=!paused;label();schedule()});
    root.addEventListener('focusin',()=>{focused=true;stop()});
    root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget)){focused=false;schedule()}});
    document.addEventListener('visibilitychange',schedule);
    window.addEventListener('pagehide',stop,{once:true});
    label();show(0);
  });
})();`;

const CSS = `
[data-gnr8-hero]{position:relative;display:block;width:100%;aspect-ratio:var(--hero-ratio);overflow:hidden;background:#24444e;color:#fff;isolation:isolate}
[data-gnr8-hero] [data-hero-slide]{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .65s ease,visibility .65s;pointer-events:none}
[data-gnr8-hero] [data-hero-slide][data-active=true]{opacity:1;visibility:visible;pointer-events:auto}
[data-gnr8-hero] [data-hero-slide]>img{display:block;position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;object-position:center}
[data-gnr8-hero] [data-hero-layer]{position:absolute;left:var(--hero-x);top:var(--hero-y);width:var(--hero-width);max-width:94%;margin:0;white-space:pre-line;font-family:var(--hero-font),sans-serif;font-size:var(--hero-size);font-weight:var(--hero-weight);line-height:var(--hero-line);color:var(--hero-color);text-shadow:0 1px 3px #0006}
[data-gnr8-hero] [data-hero-controls]{position:absolute;z-index:2;left:20px;bottom:20px;display:flex;gap:8px;align-items:center}
[data-gnr8-hero] button{margin:0;box-shadow:none;cursor:pointer;border:1px solid #fff;background:#173843aa;color:#fff}
[data-gnr8-hero] [data-hero-dot]{border-radius:50%;width:32px;height:32px;padding:0}
[data-gnr8-hero] [data-hero-dot][aria-pressed=true]{background:#fff;color:#173843}
[data-gnr8-hero] [data-hero-pause]{border-radius:3px;padding:5px 10px;font:14px/20px sans-serif}
[data-gnr8-hero] button:focus-visible{outline:3px solid #71caff;outline-offset:3px}
@media(max-width:600px){[data-gnr8-hero]{min-height:460px;aspect-ratio:auto}[data-gnr8-hero] [data-hero-layer]{left:5%;width:90%;font-size:clamp(16px,var(--hero-size),34px)}[data-gnr8-hero] [data-hero-layer="0"]{font-size:30px;line-height:1.15;top:28%}[data-gnr8-hero] [data-hero-layer="1"]{top:68%}}
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
  if (!input.html.includes("<rs-module-wrap") || !input.fileMapPaths) return input.html;
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
    const module = descendants.find((node) => node.tagName === "rs-module");
    if (!location || !module) continue;
    const moduleId = attr(module, "id");
    if (!/^[\w-]+$/.test(moduleId)) continue;
    const initializer = scripts.filter((script) => text(script).includes(moduleId) && /\.revolution\s*\(/.test(text(script)));
    if (initializer.length !== 1) continue;
    const configuration = text(initializer[0]!);
    // Read numeric literals only; never evaluate captured JavaScript.
    const numeric = (key: string) => Number(configuration.match(new RegExp(`\\b${key}\\s*:\\s*["']?(\\d+)(?:ms)?["']?\\s*[,}]`))?.[1]);
    const width = numeric("gridwidth"), height = numeric("gridheight"), interval = numeric("duration");
    if (!(width >= 320 && width <= 3840 && height >= 200 && height <= 2160 && interval >= 2000 && interval <= 30000)) continue;
    const sourceSlides = descendants.filter((node) => node.tagName === "rs-slide");
    if (sourceSlides.length < 2 || sourceSlides.length > 12) continue;
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
    edits.push({ start: location.startOffset, end: location.endOffset, html: `<section id="${escape(attr(wrapper,"id"))}" data-gnr8-hero data-interval="${interval}" data-active-slide="0" role="region" aria-roledescription="carousel" aria-label="${sl?'Izpostavljeno':'Highlights'}" style="--hero-ratio:${width}/${height}">${slides.join("")}<div data-hero-controls>${dots}<button type="button" data-hero-pause data-pause-label="${pause}" data-play-label="${play}" aria-pressed="false">${pause}</button></div></section>` });
    replacedIds.push(moduleId);
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
  const trusted = `<style data-gnr8-hero-style>${CSS}</style><script data-gnr8-preview-runtime="retained-hero">${RETAINED_HERO_SCRIPT}</script>`;
  return output.includes("</body>") ? output.replace("</body>", `${trusted}</body>`) : output+trusted;
}
