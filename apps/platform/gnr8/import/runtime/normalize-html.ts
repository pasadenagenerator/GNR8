export type HtmlNormalization = {
  normalizedText: string;
  hadUtf8Bom: boolean;
  normalizedNewlines: boolean;
  isEffectivelyEmpty: boolean;
};

const UTF8_BOM = "\uFEFF";

function normalizeNewlinesToLf(text: string): { text: string; changed: boolean } {
  // Canonical newline format for importer processing + stored snapshots: LF ("\n").
  // Replace CRLF and CR with LF deterministically.
  const normalized = text.replace(/\r\n|\r/g, "\n");
  return { text: normalized, changed: normalized !== text };
}

export function normalizeHtmlInput(text: string): HtmlNormalization {
  const hadUtf8Bom = text.startsWith(UTF8_BOM);
  let withoutBom = hadUtf8Bom ? text.slice(1) : text;

  const nl = normalizeNewlinesToLf(withoutBom);
  withoutBom = nl.text;

  const isEffectivelyEmpty = withoutBom.trim().length === 0;

  return {
    normalizedText: withoutBom,
    hadUtf8Bom,
    normalizedNewlines: nl.changed,
    isEffectivelyEmpty,
  };
}

