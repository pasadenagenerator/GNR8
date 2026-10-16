import postcss from "postcss";
import { parse } from "parse5";

type HtmlSelectorEvidence = {
  classNames: ReadonlySet<string>;
  ids: ReadonlySet<string>;
};

export type UnusedCssDependencyEvidence = {
  resolvedUrl: string;
  selectors: string[];
};

export function findProvablyUnusedCssDependencies(input: {
  css: string;
  stylesheetUrl: string;
  htmlDocuments: string[];
}): UnusedCssDependencyEvidence[] {
  const evidence = collectHtmlSelectorEvidence(input.htmlDocuments);
  const references = new Map<string, { required: boolean; selectors: Set<string> }>();
  const root = postcss.parse(input.css, { from: input.stylesheetUrl });

  root.walkDecls((declaration) => {
    const parent = declaration.parent;
    const selector = parent?.type === "rule" ? parent.selector : null;
    const provablyUnused = selector !== null && selectorCannotMatch(selector, evidence);
    for (const rawReference of cssUrlReferences(declaration.value)) {
      const resolvedUrl = resolveCssReference(rawReference, input.stylesheetUrl);
      if (!resolvedUrl) continue;
      const current = references.get(resolvedUrl) ?? { required: false, selectors: new Set<string>() };
      if (selector) current.selectors.add(selector);
      if (!provablyUnused) current.required = true;
      references.set(resolvedUrl, current);
    }
  });

  return [...references.entries()]
    .filter(([, value]) => !value.required && value.selectors.size > 0)
    .map(([resolvedUrl, value]) => ({
      resolvedUrl,
      selectors: [...value.selectors].sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) => left.resolvedUrl.localeCompare(right.resolvedUrl));
}

export function removeProvablyUnusedCssDependencyRules(input: {
  css: string;
  stylesheetUrl: string;
  htmlDocuments: string[];
  allowedUnusedUrls: ReadonlySet<string>;
}): { css: string; removedUrls: string[] } {
  if (input.allowedUnusedUrls.size === 0) return { css: input.css, removedUrls: [] };
  const evidence = collectHtmlSelectorEvidence(input.htmlDocuments);
  const root = postcss.parse(input.css, { from: input.stylesheetUrl });
  const removedUrls = new Set<string>();

  root.walkRules((rule) => {
    if (!selectorCannotMatch(rule.selector, evidence)) return;
    const matchingUrls = new Set<string>();
    rule.walkDecls((declaration) => {
      for (const rawReference of cssUrlReferences(declaration.value)) {
        const resolvedUrl = resolveCssReference(rawReference, input.stylesheetUrl);
        if (resolvedUrl && input.allowedUnusedUrls.has(resolvedUrl)) matchingUrls.add(resolvedUrl);
      }
    });
    if (matchingUrls.size === 0) return;
    matchingUrls.forEach((url) => removedUrls.add(url));
    rule.remove();
  });

  return {
    css: root.toString(),
    removedUrls: [...removedUrls].sort((left, right) => left.localeCompare(right)),
  };
}

function collectHtmlSelectorEvidence(htmlDocuments: string[]): HtmlSelectorEvidence {
  const classNames = new Set<string>();
  const ids = new Set<string>();
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const attrs = (node as { attrs?: Array<{ name?: string; value?: string }> }).attrs ?? [];
    for (const attr of attrs) {
      const name = String(attr.name ?? "").toLowerCase();
      const value = String(attr.value ?? "");
      if (name === "class") value.split(/\s+/).filter(Boolean).forEach((item) => classNames.add(item));
      if (name === "id" && value) ids.add(value);
    }
    for (const child of (node as { childNodes?: unknown[] }).childNodes ?? []) visit(child);
  };
  htmlDocuments.forEach((html) => visit(parse(html)));
  return { classNames, ids };
}

function selectorCannotMatch(selector: string, evidence: HtmlSelectorEvidence): boolean {
  return splitSelectorList(selector).every((part) => {
    // Escaped identifiers require a full selector parser. Stay conservative.
    if (part.includes("\\")) return false;
    const classes = [...part.matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)].map((match) => match[1]!);
    const ids = [...part.matchAll(/#(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)].map((match) => match[1]!);
    if (classes.length === 0 && ids.length === 0) return false;
    return classes.some((name) => !evidence.classNames.has(name)) || ids.some((id) => !evidence.ids.has(id));
  });
}

function splitSelectorList(selector: string): string[] {
  const out: string[] = [];
  let start = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let quote: string | null = null;
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index]!;
    if (quote) {
      if (char === quote && selector[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "[") bracketDepth += 1;
    else if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    else if (char === "(") parenDepth += 1;
    else if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
    else if (char === "," && bracketDepth === 0 && parenDepth === 0) {
      out.push(selector.slice(start, index).trim());
      start = index + 1;
    }
  }
  out.push(selector.slice(start).trim());
  return out.filter(Boolean);
}

function cssUrlReferences(value: string): string[] {
  return [...value.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)]
    .map((match) => (match[2] ?? "").trim())
    .filter((reference) => reference && !reference.startsWith("data:") && !reference.startsWith("#"));
}

function resolveCssReference(reference: string, stylesheetUrl: string): string | null {
  try {
    const resolved = new URL(reference, stylesheetUrl);
    resolved.hash = "";
    return resolved.toString();
  } catch {
    return null;
  }
}
