import { parseFragment, type DefaultTreeAdapterMap } from "parse5";
import { RETAINED_HERO_SCRIPT } from "./retained-hero-slider";

/** Content identity is the authority, never an imported filename or marker.
 * Keep a single inline controller so Astro does not rebundle/minify its bytes.
 */
export function isOwnedRetainedRuntimeScript(element: DefaultTreeAdapterMap["element"]): boolean {
  return element.tagName === "script" &&
    element.attrs.every(a =>
      (a.name === "data-gnr8-preview-runtime" && a.value === "retained-hero") ||
      (a.name === "is:inline" && a.value === "")) &&
    element.childNodes.every(n => n.nodeName === "#text") &&
    element.childNodes.map(n => "value" in n ? n.value : "").join("") === RETAINED_HERO_SCRIPT;
}

/** Reject every other script, including spoofed markers and src/onload attrs. */
export function prepareOwnedRetainedRuntimeForAstro(html: string): string {
  const fragment = parseFragment(html, { sourceCodeLocationInfo: true });
  const edits: number[] = [];
  const walk = (node: DefaultTreeAdapterMap["node"]) => {
    if ("tagName" in node && node.tagName === "script") {
      if (!isOwnedRetainedRuntimeScript(node)) throw new Error("unsupported_astro_page_script");
      if (!node.attrs.some(a => a.name === "is:inline")) edits.push(node.sourceCodeLocation!.startTag!.endOffset - 1);
    }
    if ("childNodes" in node) node.childNodes.forEach(walk);
    if ("tagName" in node && node.tagName === "template") walk((node as DefaultTreeAdapterMap["template"]).content);
  };
  walk(fragment);
  for (const offset of edits.sort((a,b) => b-a)) html = html.slice(0,offset) + " is:inline" + html.slice(offset);
  return html;
}
