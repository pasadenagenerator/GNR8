import { parse, type DefaultTreeAdapterMap } from "parse5";

/** Rewrite decoded CSS, then escape it back into its HTML attribute context.
 * Source offsets keep unrelated markup (including captured scripts) byte-exact.
 */
export function rewriteInlineStyleAttributes(html: string, rewrite: (css: string) => string): string {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const edits: Array<{ start: number; end: number; value: string }> = [];
  function visit(node: DefaultTreeAdapterMap["node"]): void {
    if ("attrs" in node) {
      const attr = node.attrs.find((item) => item.name === "style");
      const location = node.sourceCodeLocation?.attrs?.style;
      if (attr && location) {
        const css = rewrite(attr.value);
        if (css !== attr.value) {
          const value = css.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
          edits.push({ start: location.startOffset, end: location.endOffset, value: `style="${value}"` });
        }
      }
    }
    if ("childNodes" in node) node.childNodes.forEach(visit);
    if (node.nodeName === "template" && "content" in node) visit(node.content);
  }
  visit(document);
  let result = html;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, edit.start) + edit.value + result.slice(edit.end);
  }
  return result;
}
