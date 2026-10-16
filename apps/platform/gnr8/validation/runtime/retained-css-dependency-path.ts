import { posix } from "node:path";
import { createHash } from "node:crypto";

export function hashedImportAssetPath(resolvedUrl: string, assetKind: string, normalizedBasename: string): string {
  return `assets/${assetKind}/${createHash("sha256").update(resolvedUrl).digest("hex").slice(0, 12)}-${normalizedBasename}`;
}

/** Only accept an unambiguous stylesheet mapping from an intact stored manifest. */
export function retainedStylesheetSourceUrl(input: {
  bytes: Uint8Array;
  expectedSha256: string;
  expectedSizeBytes: number;
  stylesheetPath: string;
}): string | null {
  if (input.bytes.byteLength !== input.expectedSizeBytes || createHash("sha256").update(input.bytes).digest("hex") !== input.expectedSha256) return null;
  try {
    const entries: unknown = JSON.parse(Buffer.from(input.bytes).toString("utf8"));
    if (!Array.isArray(entries)) return null;
    const urls = new Set<string>();
    for (const entry of entries) {
      if (!entry || entry.localPath !== input.stylesheetPath || entry.assetKind !== "stylesheet" || entry.fetchStatus !== "fetched") continue;
      const url = new URL(entry.resolvedUrl);
      if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
      urls.add(url.href);
    }
    return urls.size === 1 ? [...urls][0]! : null;
  } catch { return null; }
}

/** Reverse the known repeated-localization transform by reproducing it forward
 * from owned paths and the manifest's source URL, never by stripping a hash.
 */
export function recoverRelocalizedCssReferences(input: {
  css: string;
  stylesheetPath: string;
  stylesheetSourceUrl: string;
  filePaths: ReadonlySet<string>;
}): string {
  const aliases = new Map<string, string | null>();
  const add = (alias: string, target: string) => {
    if (input.filePaths.has(alias)) return;
    aliases.set(alias, aliases.has(alias) && aliases.get(alias) !== target ? null : target);
  };
  for (const filePath of input.filePaths) {
    if (!/^assets\/style_asset\/[a-f0-9]{12}-[a-z0-9._-]+$/.test(filePath)) continue;
    const relative = posix.relative(posix.dirname(input.stylesheetPath), filePath);
    const mistakenSourceUrl = new URL(relative, input.stylesheetSourceUrl);
    add(hashedImportAssetPath(mistakenSourceUrl.href, "style_asset", posix.basename(filePath)), filePath);
    // Failed fetches were rewritten to the source-origin pathname instead.
    add(mistakenSourceUrl.pathname.replace(/^\/+/, ""), filePath);
  }
  const aliasPaths = new Set(aliases.keys());
  return input.css.replace(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi, (full, quote: string, reference: string) => {
    const alias = resolveRetainedCssDependencyPath({ stylesheetPath: input.stylesheetPath, rawReference: reference, filePaths: aliasPaths });
    const target = alias ? aliases.get(alias) : null;
    if (!target) return full;
    const suffix = reference.match(/[?#].*$/)?.[0] ?? "";
    return `url(${quote}${posix.relative(posix.dirname(input.stylesheetPath), target)}${suffix}${quote})`;
  });
}

/** Resolve only exact owned paths; never infer identity from a basename. */
export function resolveRetainedCssDependencyPath(input: {
  stylesheetPath: string;
  rawReference: string;
  filePaths: ReadonlySet<string>;
}): string | null {
  const raw = input.rawReference.trim();
  if (!raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw)) return null;
  const withoutQueryOrHash = raw.split(/[?#]/, 1)[0] ?? "";
  if (!withoutQueryOrHash) return null;
  let decoded = withoutQueryOrHash;
  try { decoded = decodeURIComponent(withoutQueryOrHash); } catch { return null; }
  if (decoded.includes("\0") || decoded.includes("\\")) return null;
  const candidate = decoded.startsWith("/")
    ? posix.normalize(decoded.replace(/^\/+/, ""))
    : posix.normalize(posix.join(posix.dirname(input.stylesheetPath), decoded));
  if (!candidate || candidate === "." || candidate.startsWith("../") || posix.isAbsolute(candidate)) return null;
  return input.filePaths.has(candidate) ? candidate : null;
}
