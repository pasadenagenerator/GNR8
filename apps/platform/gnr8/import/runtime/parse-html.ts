import { parse, serialize } from "parse5";

import type { HtmlParseWarning, ImportedDomSnapshot } from "../import-contract";

type Parse5Error = {
  code?: string;
  message?: string;
  startLine?: number;
  startCol?: number;
};

function countNodes(node: unknown): number {
  let count = 0;
  const stack: unknown[] = [node];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    count++;

    const maybe = current as { childNodes?: unknown[]; content?: unknown };
    if (Array.isArray(maybe.childNodes)) {
      for (let i = maybe.childNodes.length - 1; i >= 0; i--) stack.push(maybe.childNodes[i]);
    }
    if (maybe.content && typeof maybe.content === "object") stack.push(maybe.content);
  }

  return count;
}

function normalizeWarnings(warnings: HtmlParseWarning[]): HtmlParseWarning[] {
  return [...warnings].sort((a, b) => {
    const aLine = a.position?.line ?? -1;
    const bLine = b.position?.line ?? -1;
    if (aLine !== bLine) return aLine - bLine;
    const aCol = a.position?.column ?? -1;
    const bCol = b.position?.column ?? -1;
    if (aCol !== bCol) return aCol - bCol;
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    if (a.message !== b.message) return a.message < b.message ? -1 : 1;
    return 0;
  });
}

export function parseHtmlToDomSnapshot(html: string): {
  document: unknown;
  snapshot: ImportedDomSnapshot;
} {
  const parseWarnings: HtmlParseWarning[] = [];

  const document = parse(html, {
    onParseError: (err: Parse5Error) => {
      parseWarnings.push({
        code: String(err.code ?? "PARSE_ERROR"),
        message: String(err.message ?? "HTML parse warning"),
        position:
          typeof err.startLine === "number" && typeof err.startCol === "number"
            ? { line: err.startLine, column: err.startCol }
            : null,
      });
    },
  } as unknown as Parameters<typeof parse>[1]);

  const serializedDom = serialize(document as never);
  const nodeCount = countNodes(document);

  return {
    document,
    snapshot: {
      serializedDom,
      nodeCount,
      parseWarnings: normalizeWarnings(parseWarnings),
    },
  };
}
