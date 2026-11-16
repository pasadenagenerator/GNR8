import { createHash } from "node:crypto";
import { parseFragment, type DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
const all = (node: Node): Element[] => ("childNodes" in node ? node.childNodes : []).flatMap(child => [...("tagName" in child ? [child] : []), ...all(child)]);
const attr = (node: Element, name: string) => node.attrs.find(a=>a.name===name)?.value ?? "";
const text = (node: Node): string => "value" in node ? node.value : "childNodes" in node ? node.childNodes.map(text).join(" ") : "";
const cls = (node: Element, name: string) => attr(node,"class").split(/\s+/).includes(name);
const remove = (node: Element) => { if(node.parentNode) node.parentNode.childNodes = node.parentNode.childNodes.filter(n=>n!==node); };
const escape = (value: string) => value.replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;");

// Reviewed source bytes are removable, never executable. Unknown revisions stay
// blocked. These are library/helper identities, not a filename execution allowlist.
const LIBRARIES: Record<string,string> = {
  "8c9e21fbe9238c0762d6961a239755e560300d0f50aa280931ce4947e1a02fa3": "reviewed-jquery-revolution-bundle",
  "bb177ceb583b529f61a882785f8d636c83ba841b19b672dcdd4d297097af7d77": "ieow.js",
  "8ff5de1b0b1d4922b0bf1eea21886efa9976d29655dd30c5ea435dc0b583aeee": "sortable.min.js",
  "af349cb4f6cb39c65dcc5ee5468e4d4e7ecf3687387a856e38058ac8e68f1c04": "accordion.min.js",
  "33189ed1c63f103baa23abcf3ba58a132b955a807b2cbc741acbb9011ac4306e": "scripts.js",
  "f36adc07db49e73c3fd3aeb4234d270725f07719706dd28dfc09657f2cffe9d6": "mouse.min.js",
  "39a41f865d3b03d945566a0cd397f88f76a60961ba94b2ce8a208f1854f412c0": "sck.min_2019081301.js",
  "a1ac109fb0da76a03eb39daecb548806675cda9793ad6bce4621c651746de08f": "tabs.min.js",
  "c22005bbdf738de61a4c2ee99c2b3c4fe52f336dfc8aa274860c58c845027d50": "menu.js",
  "c36a1d5b71cce2b22a63e9593f75c0170f2620ed7bbad0bc12739accd84d38ce": "jplayer.min.js",
  "86d7face00e310c8bf5209ca56f56726fc95a48b2e39db93bcf2cb9c635a5750": "plugins.js",
  "b7e17926b30342edecee8b3a93029ac51462e2b479277d8e077ba57173eb1900": "scripts.js",
  "699210a5ed06e497b4730ec83bb65ac4c2269ae4a0ee8af3f24aae7ee5b66b76": "core.min.js",
  "602797e80613c3623325594e96463093c626554dff563622e8fbc3e795d283e0": "animations.min.js",
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855": "empty.js",
  "f25f13e58a8709b8aa0bd7ebaa2d8f17fdfe165c55ccb8b96d862fe8f8caa90f": "translate3d.js",
  "db8ee8be2b2456c191fc0739f34f6ac675af8ba4782380cf233024498e0eb968": "wp-emoji-release.min.js",
  "51f2cdd4f7e97288a74d803275b0550ec9eb938210ad5ab7fb1409548acf7554": "wp-embed.min.js"
};
const INLINE_HELPERS: Record<string,string> = {
  "902a3d5ca0341db40a2cab80cbb6562848a4884771405649caf310f6bb90bcf8": "emoji",
  "44134cbf94a69a4a21b2805d17b869ad1d5ce8ad563f96b6cd218e71fab9d07e": "revolution",
  "836ffeeea35ff15c81fa426ab7b930f7b22a32e267d573a7b9cff4284137a801": "revolution",
  "c8bd6d4bfb7d4d9a119c228454b24126780416623f3e7994f5f7ef4f47ead835": "revolution",
  "bc2a114d246db837533a93bbd2399514ed061e0d1178e1b4926198b08055d814": "revolution",
  "20e31c918a64347bbdb7b3a0a28c61912f6d0a2df564bbdd19e39a9d2d632ce8": "revolution",
  "edc046c328e7363a34080b45ffc9ffaada64e5bbce38b9afd9b6f33f4fec90f9": "emoji",
  "9862aaf287eb3605637a1dde0ae4b55c203c4e33ad30f72095abf84d93de8e74": "emoji",
  "b8d57907f6e5a234c4efc2d463c0c0335d4a5bb4f8b1e87d8e724df791d75968": "emoji",
  "a5d114bc9cfaa83d26a48191907408aba6768b2886fd1326fc679ceab57d2a3f": "emoji",
  "5ab76f42bb95c7453f6ac240f56cbffe2147dfb86a3cb0265deba901b012ea50": "revolution",
  "cab8670030f686c6d8ddb2b8a4618503efa5c8ebbf35dec480d9ad43df6aa3fc": "emoji",
  "69e2a1312c2bd355607df2c11a2c513f38def71e99d53575036b32f4683a8d9d": "emoji"
};

/** Only called for the explicit presentation-only reduction contract. */
export function reduceRetainedPresentation(document: DefaultTreeAdapterMap["document"]): string[] {
  const nodes = all(document), errors: string[] = [];
  for (const form of nodes.filter(n=>n.tagName==="form" && attr(n,"id")==="searchform")) {
    const inputs = all(form).filter(n=>n.tagName==="input");
    if (attr(form,"method").toLowerCase()!=="get" || !inputs.some(n=>attr(n,"name")==="s")) continue;
    const parent = form.parentNode;
    if(parent && "tagName" in parent && cls(parent,"search_wrapper")) remove(parent); else remove(form);
    for(const trigger of nodes.filter(n=>attr(n,"id")==="search_button")) remove(trigger);
  }
  const bodyText = text(nodes.find(n=>n.tagName==="body") ?? document).replace(/\s+/g," ");
  for(const frame of nodes.filter(n=>n.tagName==="iframe" && attr(n,"data-sck_ref")==="Google Maps")) {
    let address = "";
    try {
      const url = new URL(attr(frame,"data-blocked"));
      if(url.protocol==="https:" && /^(?:www\.)?google\.com$/.test(url.hostname) && url.pathname==="/maps/embed") {
        const encoded = url.searchParams.get("pb")?.match(/!2s([^!]+)/)?.[1];
        if(encoded) address = decodeURIComponent(encoded);
      }
    } catch { /* Unknown map data remains blocked. */ }
    if(!address || address.length>300 || !address.split(",").every(part=>bodyText.includes(part.trim()))) {errors.push("retained_map_address_unverified");continue;}
    const href = `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
    const fragment=parseFragment(`<div data-gnr8-map-address><p>${escape(address)}</p><a href="${escape(href)}" target="_blank" rel="noopener noreferrer">Odpri v OpenStreetMap</a></div>`);
    if(frame.parentNode) {const parent=frame.parentNode; const index=parent.childNodes.indexOf(frame); for(const node of fragment.childNodes) node.parentNode=parent;parent.childNodes.splice(index,1,...fragment.childNodes);}
  }
  // Remove the complete recognized bundle; gated non-map embeds are never unlocked.
  for(const node of all(document)) {
    if(/^SCK(?:_|$)/.test(attr(node,"id"))) {remove(node);continue;}
    if(attr(node,"data-sck_unlock") && node.tagName!=="script") errors.push("retained_unknown_gated_content");
    if(node.tagName==="script") {
      const body = text(node).trim();
      const data = body.replace(/^\/\*\s*<!\[CDATA\[\s*\*\//, "").replace(/\/\*\s*\]\]>\s*\*\/$/, "").trim();
      const options = data.match(/^var NMOD_SCK_Options = (\{[^]*\});$/);
      const initialize = data.match(/^;NMOD_SCK_Options\.checkCompatibility=(\[[^]*?\]);NMOD_SCK_Options\.searchTags=(\[[^]*?\]);NMOD_SCK_Helper\.init\(\);$/);
      let known = false;
      try {
        if(options) known = typeof JSON.parse(options[1]!) === "object";
        if(initialize) known = Array.isArray(JSON.parse(initialize[1]!)) && Array.isArray(JSON.parse(initialize[2]!));
        if(attr(node,"data-sck_unlock")) {
          const blocked = new URL(attr(node,"data-blocked"));
          known = !body && blocked.protocol === "https:" && blocked.hostname === "www.googletagmanager.com" && blocked.pathname === "/gtag/js";
          if(!known) errors.push("retained_unknown_gated_script");
        }
      } catch { /* Leave unknown code for the scripts guard. */ }
      if(known) remove(node);
    }
    if(["html","body"].includes(node.tagName)) {
      node.attrs = node.attrs.map(a=>a.name==="class" ? {...a,value:a.value.split(/\s+/).filter(c=>!["BlockedBySmartCookieKit","BlockedForCookiePreferences"].includes(c)).join(" ")} : a);
    }
  }
  return [...new Set(errors)];
}

export function removableRetainedPresentationScript(input: {
  script: Element; elements: Element[]; siteId: string; siteVersionId: string;
  fileMap: Record<string, {sha256:string}>;
  sourceUrl?: string;
  resolvedScriptPath?: string;
}): boolean {
  const {script,elements}=input;
  // Recognize the theme through its parsed data and actual navigation, rather
  // than treating every library bearing a familiar name as disposable.
  const hasTheme = elements.some(n=>n.tagName==="script" && /^\s*(?:\/\*[^]*?\*\/\s*)?var mfn = \{/.test(text(n))) &&
    elements.some(n=>attr(n,"id")==="Top_bar");
  if(!hasTheme) return false;
  const remainingWidget = elements.some(n=> /(?:^|\s)(?:accordion|tabs_wrapper|ui-tabs|jp-jplayer|masonry|isotope|portfolio_slider|offer_slider|twentytwenty-container)(?:\s|$)/.test(attr(n,"class")) ||
    n.tagName==="rs-module" || cls(n,"testimonials_slider") || (n.tagName==="a" && cls(n,"zoom") && attr(n,"data-gnr8-image-zoom")!=="true"));
  if(remainingWidget) return false;
  const body = text(script).trim();
  const src=attr(script,"src"),prefix=`/api/gnr8/runtime/preview-assets/${input.siteId}/${input.siteVersionId}/`;
  if(src) {
    const path=src.startsWith(prefix) ? src.slice(prefix.length).split(/[?#]/)[0]! : "";
    const sourcePath = path || input.resolvedScriptPath || "";
    const library=LIBRARIES[input.fileMap[sourcePath]?.sha256 ?? ""];
    if(library) return true;
    // Unused dependencies of disabled source libraries, not fetched or executed.
    try {const url=new URL(src,"https://unused.invalid");if(/^\/wp-includes\/js\/(?:jquery\/ui\/(?:widget|core|mouse|sortable|tabs|accordion)|comment-reply)(?:\.min)?\.js$/.test(url.pathname)) return !elements.some(n=>n.tagName==="form" && attr(n,"id")==="commentform");} catch { /* reject */ }
    // WP embed messaging has no target once there are no embedded WP posts.
    try {const url=new URL(src,input.sourceUrl);if(url.pathname==="/wp-includes/js/wp-embed.min.js" && !elements.some(n=>cls(n,"wp-embedded-content"))) return true;} catch { /* reject */ }
    return false;
  }
  if(attr(script,"type")==="speculationrules") {
    try {const rules=JSON.parse(body);if(rules && typeof rules==="object" && Object.keys(rules).every(key=>["prefetch","prerender"].includes(key))) return true;} catch { /* reject invalid data */ }
  }
  if(INLINE_HELPERS[createHash("sha256").update(body).digest("hex")]) return true;
  // JSON data assignments only: no calls, expressions, or trailing code.
  const assignment=body.replace(/^\/\*\s*<!\[CDATA\[\s*\*\//, "").replace(/\/\*\s*\]\]>\s*\*\/$/, "").trim().match(/^var (mfn|wpcf7) = (\{[^]*\});$/);
  if(assignment) {try {const value=JSON.parse(assignment[2]!);return !!value && typeof value==="object";} catch {return false;}}
  return false;
}
