type HtmlAttr = {
  name?: string;
  value?: string;
};

type HtmlNode = {
  nodeName?: string;
  tagName?: string;
  attrs?: HtmlAttr[];
  childNodes?: unknown[];
};

type SanitizedNode =
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "element";
      tagName: string;
      attrs: Array<{ name: string; value: string }>;
      children: SanitizedNode[];
    };

export const PRESERVED_MARKUP_ALLOWED_ELEMENTS = [
  "a",
  "article",
  "br",
  "div",
  "em",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "img",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "section",
  "small",
  "span",
  "strong",
  "ul",
] as const;

export const PRESERVED_MARKUP_ALLOWED_ATTRIBUTES = [
  "alt",
  "aria-*",
  "class",
  "href",
  "id",
  "rel",
  "role",
  "src",
  "target",
  "title",
] as const;

const ALLOWED_ELEMENT_SET = new Set<string>(PRESERVED_MARKUP_ALLOWED_ELEMENTS);
const VOID_ELEMENT_SET = new Set<string>(["img", "br"]);
const TRANSPARENT_UNSUPPORTED_CONTAINER_SET = new Set<string>([
  "address",
  "aside",
  "blockquote",
  "body",
  "button",
  "code",
  "figure",
  "figcaption",
  "form",
  "html",
  "input",
  "label",
  "pre",
  "textarea",
]);
const SUBTREE_DROP_ELEMENT_SET = new Set<string>([
  "canvas",
  "iframe",
  "noscript",
  "object",
  "script",
  "style",
  "svg",
  "template",
  "video",
  "audio",
]);
const NEUTRAL_WRAPPER_SET = new Set<string>(["article", "div", "footer", "header", "main", "nav", "section"]);
const GLOBAL_ALLOWED_ATTR_SET = new Set<string>(["class", "id", "title", "role"]);
const ANCHOR_ALLOWED_ATTR_SET = new Set<string>(["href", "target", "rel"]);
const IMG_ALLOWED_ATTR_SET = new Set<string>(["src", "alt"]);

function isElement(node: unknown): node is HtmlNode {
  return !!node && typeof node === "object" && typeof (node as { tagName?: unknown }).tagName === "string";
}

function isText(node: unknown): node is HtmlNode {
  return !!node && typeof node === "object" && String((node as { nodeName?: unknown }).nodeName ?? "") === "#text";
}

function textFromNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { value?: unknown; data?: unknown };
  return String(n.value ?? n.data ?? "");
}

function isAllowedAttr(tagName: string, attrName: string): boolean {
  if (attrName.startsWith("on")) return false;
  if (attrName.startsWith("aria-")) return true;
  if (GLOBAL_ALLOWED_ATTR_SET.has(attrName)) return true;
  if (tagName === "a") return ANCHOR_ALLOWED_ATTR_SET.has(attrName);
  if (tagName === "img") return IMG_ALLOWED_ATTR_SET.has(attrName);
  return false;
}

function sanitizeAttrs(tagName: string, attrs: HtmlAttr[]): Array<{ name: string; value: string }> {
  const out: Array<{ name: string; value: string }> = [];
  const seen = new Set<string>();

  for (const attr of attrs) {
    const attrName = String(attr.name ?? "").trim().toLowerCase();
    if (attrName.length === 0) continue;
    if (!isAllowedAttr(tagName, attrName)) continue;
    if (seen.has(attrName)) continue;
    seen.add(attrName);
    out.push({ name: attrName, value: String(attr.value ?? "") });
  }

  return out;
}

function sanitizeNodeToList(node: unknown): SanitizedNode[] {
  if (isText(node)) {
    const text = textFromNode(node);
    if (text.trim().length === 0) return [];
    return [{ kind: "text", text }];
  }

  if (!isElement(node)) return [];
  const tagName = String(node.tagName ?? "").toLowerCase();
  if (tagName.length === 0) return [];
  if (SUBTREE_DROP_ELEMENT_SET.has(tagName)) return [];

  const childNodes = Array.isArray(node.childNodes) ? node.childNodes : [];
  const children = childNodes.flatMap((child) => sanitizeNodeToList(child));
  if (!ALLOWED_ELEMENT_SET.has(tagName)) {
    return TRANSPARENT_UNSUPPORTED_CONTAINER_SET.has(tagName) ? children : [];
  }

  const attrs = sanitizeAttrs(tagName, Array.isArray(node.attrs) ? node.attrs : []);
  if (tagName === "img" && !attrs.some((a) => a.name === "src" && a.value.trim().length > 0)) return [];
  if (NEUTRAL_WRAPPER_SET.has(tagName) && children.length === 0) return [];

  return [{ kind: "element", tagName, attrs, children }];
}

function escapeHtmlAttr(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeHtmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function serializeSanitizedNode(node: SanitizedNode): string {
  if (node.kind === "text") return escapeHtmlText(node.text);

  const attrs = node.attrs.length > 0 ? ` ${node.attrs.map((a) => `${a.name}="${escapeHtmlAttr(a.value)}"`).join(" ")}` : "";
  if (VOID_ELEMENT_SET.has(node.tagName)) return `<${node.tagName}${attrs}>`;
  const children = node.children.map((child) => serializeSanitizedNode(child)).join("");
  return `<${node.tagName}${attrs}>${children}</${node.tagName}>`;
}

/**
 * Build deterministic, minimal source-markup HTML for a source subtree.
 * Returns `null` when no preservable whitelist content exists.
 */
export function extractDeterministicMinimalSourceMarkupHtml(root: unknown): string | null {
  const nodes = sanitizeNodeToList(root);
  if (nodes.length === 0) return null;
  const html = nodes.map((n) => serializeSanitizedNode(n)).join("").trim();
  return html.length > 0 ? html : null;
}
