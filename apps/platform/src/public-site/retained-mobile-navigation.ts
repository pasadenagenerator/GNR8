import { parse, type DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
const attr = (e: Element, name: string) => e.attrs.find(a => a.name === name)?.value ?? "";
const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const children = (n: Node): Element[] => ("childNodes" in n ? n.childNodes : []).filter((c): c is Element => "tagName" in c);
const all = (n: Node): Element[] => children(n).flatMap(c => [c, ...all(c)]);
const text = (n: Node): string => "value" in n ? n.value : ("childNodes" in n ? n.childNodes : []).map(text).join("");

/** Native disclosure controls: no captured or first-party JavaScript required. */
export function restoreRetainedMobileNavigation(html: string): string {
  if (html.includes("data-gnr8-mobile-navigation") || !html.includes("responsive-menu-toggle")) return html;
  const document = parse(html, { sourceCodeLocationInfo: true });
  const nodes = all(document);
  const headers = nodes.filter(e => attr(e, "id") === "Top_bar");
  if (headers.length !== 1) return html;
  const headerNodes = all(headers[0]!);
  const menus = headerNodes.filter(e => e.tagName === "nav" && attr(e, "id") === "menu");
  const toggles = headerNodes.filter(e => e.tagName === "a" && attr(e, "class").split(/\s+/).includes("responsive-menu-toggle"));
  if (menus.length !== 1 || toggles.length !== 1) return html;
  const list = children(menus[0]!).find(e => e.tagName === "ul");
  const loc = toggles[0]!.sourceCodeLocation;
  if (!list || !loc) return html;
  const sl = /^sl\b/i.test(attr(nodes.find(e => e.tagName === "html")!, "lang"));
  const renderLink = (a: Element): string | null => {
    const href = attr(a, "href"), label = text(a).trim();
    if (!label || !href || /[\u0000-\u0020]/.test(href) || /^(?!https?:)[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) return null;
    return `<a href="${escape(href)}"${attr(a, "aria-current") === "page" ? ' aria-current="page"' : ''}>${escape(label)}</a>`;
  };
  const renderList = (ul: Element, depth: number): string | null => {
    if (depth > 4) return null;
    const items = children(ul);
    if (!items.length || items.some(e => e.tagName !== "li")) return null;
    const output: string[] = [];
    for (const li of items) {
      const direct = children(li);
      const anchors = direct.filter(e => e.tagName === "a");
      const sublists = direct.filter(e => e.tagName === "ul");
      if (anchors.length !== 1 || sublists.length > 1 || direct.some(e => !["a", "ul", "span"].includes(e.tagName))) return null;
      const a = anchors[0]!, label = text(a).trim();
      // Never copy event handlers, markup, or executable URL schemes.
      const link = renderLink(a);
      if (!link) return null;
      let nested = "";
      if (sublists[0]) {
        const child = renderList(sublists[0], depth + 1);
        if (!child) return null;
        nested = `<details><summary>${escape(sl ? `Podmeni: ${label}` : `Submenu: ${label}`)}</summary>${child}</details>`;
      }
      output.push(`<li>${link}${nested}</li>`);
    }
    return `<ul>${output.join("")}</ul>`;
  };
  const links = renderList(list, 0);
  if (!links) return html;
  // BeTheme moves the header action into its side panel on mobile. Preserve
  // that destination as well as the nav list when replacing the side panel.
  const actions = headerNodes.filter(e => e.tagName === "a" && attr(e, "class").split(/\s+/).includes("action_button")).map(renderLink);
  if (actions.some(link => link === null)) return html;
  const replacement = `<details data-gnr8-mobile-navigation><summary>${sl ? 'Meni' : 'Menu'}</summary><nav aria-label="${sl ? 'Mobilna navigacija' : 'Mobile navigation'}">${links}${actions.length ? `<ul>${actions.map(link => `<li>${link}</li>`).join("")}</ul>` : ''}</nav></details>`;
  const css = `<style data-gnr8-mobile-navigation-style>
#Top_bar [data-gnr8-mobile-navigation]{display:none}
@media(max-width:1239px){
#Top_bar [data-gnr8-mobile-navigation]{display:block;position:relative;clear:both;margin-top:24px;z-index:100;background:#fff;color:#173843;text-align:left}
#Top_bar [data-gnr8-mobile-navigation] summary{display:list-item;cursor:pointer;padding:12px 20px;font:600 16px/1.5 sans-serif}
#Top_bar [data-gnr8-mobile-navigation] nav{display:block!important;max-height:65vh;overflow:auto}
#Top_bar [data-gnr8-mobile-navigation] ul{display:block!important;position:static!important;margin:0!important;padding:0 16px!important;list-style:none}
#Top_bar [data-gnr8-mobile-navigation] li{display:block!important;float:none!important;width:auto!important}
#Top_bar [data-gnr8-mobile-navigation] a{display:block!important;padding:10px 4px!important;color:#173843!important;font:16px/1.5 sans-serif!important}
#Top_bar [data-gnr8-mobile-navigation] :focus-visible{outline:3px solid #1266aa;outline-offset:-3px}
}</style>`;
  let result = html.slice(0, loc.startOffset) + replacement + css + html.slice(loc.endOffset);
  // The captured theme hides this header until its initialization clears
  // `loading`. Our recognized replacement is now ready without that script.
  const headerClass = headers[0]!.sourceCodeLocation?.attrs?.class;
  const classes = attr(headers[0]!, "class").split(/\s+/);
  if (headerClass && classes.includes("loading")) {
    result = result.slice(0, headerClass.startOffset) +
      `class="${escape(classes.filter(c => c !== "loading").join(" "))}"` +
      result.slice(headerClass.endOffset);
  }
  return result;
}
