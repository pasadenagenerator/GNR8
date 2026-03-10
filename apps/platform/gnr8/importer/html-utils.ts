export type HtmlTagToken = {
  raw: string;
  name: string;
  start: number;
  end: number;
  isClosing: boolean;
  isSelfClosing: boolean;
};

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function decodeHtmlEntities(input: string): string {
  // Minimal decoding (enough for titles/headlines).
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return input.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, g1) => {
    if (!g1) return m;
    if (g1[0] === "#") {
      const hex = g1[1]?.toLowerCase() === "x";
      const numStr = hex ? g1.slice(2) : g1.slice(1);
      const code = Number.parseInt(numStr, hex ? 16 : 10);
      if (!Number.isFinite(code)) return m;
      try {
        return String.fromCodePoint(code);
      } catch {
        return m;
      }
    }
    return named[g1] ?? m;
  });
}

export function stripHtmlTags(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");
}

export function textFromHtml(html: string): string {
  return normalizeWhitespace(decodeHtmlEntities(stripHtmlTags(html)));
}

export function extractBodyHtml(html: string): string {
  const m = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  return (m?.[1] ?? html).trim();
}

export function parseNextTag(html: string, fromIndex: number): HtmlTagToken | null {
  const lt = html.indexOf("<", fromIndex);
  if (lt === -1) return null;

  // Comments / doctype / other declarations
  if (html.startsWith("<!--", lt)) {
    const end = html.indexOf("-->", lt + 4);
    const tokenEnd = end === -1 ? html.length : end + 3;
    return {
      raw: html.slice(lt, tokenEnd),
      name: "!--",
      start: lt,
      end: tokenEnd,
      isClosing: false,
      isSelfClosing: true,
    };
  }

  if (html.startsWith("<!", lt)) {
    const gt = html.indexOf(">", lt + 2);
    const tokenEnd = gt === -1 ? html.length : gt + 1;
    return {
      raw: html.slice(lt, tokenEnd),
      name: "!",
      start: lt,
      end: tokenEnd,
      isClosing: false,
      isSelfClosing: true,
    };
  }

  const gt = html.indexOf(">", lt + 1);
  if (gt === -1) return null;

  const raw = html.slice(lt, gt + 1);
  const isClosing = /^<\s*\//.test(raw);
  const nameMatch = raw.match(/^<\s*\/?\s*([a-zA-Z0-9:-]+)/);
  const name = (nameMatch?.[1] ?? "").toLowerCase();
  const isExplicitSelfClosing = /\/\s*>$/.test(raw);
  const isSelfClosing = isExplicitSelfClosing || VOID_TAGS.has(name);

  return { raw, name, start: lt, end: gt + 1, isClosing, isSelfClosing };
}

export function extractElementFrom(html: string, tagName: string, startIndex: number): string | null {
  const tag = tagName.toLowerCase();
  const first = parseNextTag(html, startIndex);
  if (!first || first.name !== tag || first.isClosing) return null;
  if (first.isSelfClosing) return html.slice(first.start, first.end);

  let depth = 0;
  let idx = first.start;
  while (true) {
    const tok = parseNextTag(html, idx);
    if (!tok) return null;
    idx = tok.end;
    if (tok.name !== tag) continue;

    if (!tok.isClosing && !tok.isSelfClosing) depth += 1;
    if (tok.isClosing) depth -= 1;
    if (depth === 0) {
      return html.slice(first.start, tok.end);
    }
  }
}

export function innerHtmlOfElement(elementHtml: string, tagName: string): string {
  const tag = tagName.toLowerCase();
  const openEnd = elementHtml.indexOf(">");
  if (openEnd === -1) return elementHtml;
  const closeRe = new RegExp(`<\\s*\\/\\s*${tag}\\s*>\\s*$`, "i");
  const withoutOpen = elementHtml.slice(openEnd + 1);
  return withoutOpen.replace(closeRe, "").trim();
}

export function extractTopLevelBlocksOrdered(html: string, allowedTags: string[]): string[] {
  const allowed = new Set(allowedTags.map((t) => t.toLowerCase()));
  const blocks: string[] = [];
  const stack: string[] = [];

  let i = 0;
  while (i < html.length) {
    const tok = parseNextTag(html, i);
    if (!tok) break;

    // If we're at top-level, and see an allowed opening tag: extract its full element.
    if (stack.length === 0 && allowed.has(tok.name) && !tok.isClosing) {
      const el = extractElementFrom(html, tok.name, tok.start);
      if (el) {
        blocks.push(el.trim());
        i = tok.start + el.length;
        continue;
      }
    }

    // Update stack for depth tracking.
    if (!tok.isClosing && !tok.isSelfClosing && tok.name && tok.name !== "!" && tok.name !== "!--") {
      stack.push(tok.name);
    } else if (tok.isClosing && tok.name) {
      // best-effort pop until matching
      while (stack.length > 0) {
        const popped = stack.pop()!;
        if (popped === tok.name) break;
      }
    }

    i = tok.end;
  }

  return blocks;
}

export function extractAllImgSrc(html: string): string[] {
  const out: string[] = [];
  const re = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const src = String(m[1] ?? "").trim();
    if (src) out.push(src);
  }
  return out;
}

export function extractFirstTagInnerText(html: string, tagName: string): string | null {
  const tag = tagName.toLowerCase();
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\s*\\/\\s*${tag}\\s*>`, "i");
  const m = re.exec(html);
  if (!m) return null;
  const t = textFromHtml(m[1] ?? "");
  return t || null;
}

