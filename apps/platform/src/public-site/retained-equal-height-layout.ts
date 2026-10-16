import { parse, type DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
const hasClass = (node: Element, name: string) =>
  (node.attrs.find((attr) => attr.name === "class")?.value ?? "").split(/\s+/).includes(name);
const children = (node: Node): Element[] =>
  ("childNodes" in node ? node.childNodes : []).filter((child): child is Element => "tagName" in child);
const descendants = (node: Node): Element[] => children(node).flatMap((child) => [child, ...descendants(child)]);

// Captured BeTheme equal-height rows normally depend on a script setting each
// column's height. Without it, translateY(-50%) moves content into the prior row.
// Flex alignment preserves the existing column widths and responsive stacking.
const CSS = `
.equal-height-wrap > [data-gnr8-equal-height]{display:flex;flex-wrap:wrap;align-items:stretch}
.equal-height-wrap > [data-gnr8-equal-height] > .mcb-wrap{height:auto!important}
.equal-height-wrap > [data-gnr8-equal-height] > .mcb-wrap.valign-middle{display:flex;align-items:center}
.equal-height-wrap > [data-gnr8-equal-height] > .mcb-wrap.valign-middle > .mcb-wrap-inner{top:auto;transform:none;width:100%}
`;

export function restoreRetainedEqualHeightLayout(html: string): string {
  if (!html.includes("equal-height-wrap") || html.includes("data-gnr8-equal-height-style")) return html;
  const document = parse(html, { sourceCodeLocationInfo: true });
  const offsets: number[] = [];
  for (const section of descendants(document).filter((node) => hasClass(node, "equal-height-wrap"))) {
    for (const wrapper of children(section).filter((node) => hasClass(node, "section_wrapper"))) {
      const columns = children(wrapper);
      if (columns.length < 2 || !columns.every((node) => hasClass(node, "mcb-wrap"))) continue;
      if (!columns.some((node) => hasClass(node, "valign-middle") && children(node).some((inner) => hasClass(inner, "mcb-wrap-inner")))) continue;
      const tag = wrapper.sourceCodeLocation?.startTag;
      if (tag) offsets.push(tag.endOffset - 1);
    }
  }
  if (!offsets.length) return html;
  let output = html;
  for (const offset of offsets.sort((a, b) => b - a)) {
    output = output.slice(0, offset) + " data-gnr8-equal-height" + output.slice(offset);
  }
  const style = `<style data-gnr8-equal-height-style>${CSS}</style>`;
  return output.includes("</body>") ? output.replace("</body>", `${style}</body>`) : output + style;
}
