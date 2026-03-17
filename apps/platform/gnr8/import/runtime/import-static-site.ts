import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  IMPORT_CONTRACT_VERSION,
  type AssetRegistry,
  type ImportInput,
  type ImportOutput,
  type ImportedAssetFile,
  type ImportedHtmlDocument,
  type JsonValue,
} from "../import-contract.ts";
import {
  buildImportDiagnostics,
  createDiagnosticIssue,
  hasFatalIssues,
  sha256Hex,
  stableStringify,
} from "./diagnostics.ts";
import { extractAssetReferencesFromDom } from "./extract-assets.ts";
import { parseHtmlToDomSnapshot } from "./parse-html.ts";

function toPosixPath(p: string): string {
  return p.replaceAll(path.sep, "/");
}

function normalizeRelPosix(rel: string): string {
  return path.posix.normalize(toPosixPath(rel));
}

function resolveToRootRelativePosix(input: {
  rootDirAbs: string;
  inputPath: string;
}): { absPath: string; relPosixPath: string } | null {
  const absPath = path.isAbsolute(input.inputPath)
    ? path.resolve(input.inputPath)
    : path.resolve(input.rootDirAbs, input.inputPath);

  const rel = path.relative(input.rootDirAbs, absPath);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return null;

  return { absPath, relPosixPath: normalizeRelPosix(rel) };
}

function readFileBytes(absPath: string): { bytes: Uint8Array; byteLength: number } {
  const buf = fs.readFileSync(absPath);
  return { bytes: new Uint8Array(buf), byteLength: buf.byteLength };
}

function decodeUtf8Deterministically(bytes: Uint8Array): {
  text: string;
  hadDecodingErrors: boolean;
} {
  const fatalDecoder = new TextDecoder("utf-8", { fatal: true });
  try {
    return { text: fatalDecoder.decode(bytes), hadDecodingErrors: false };
  } catch {
    const forgivingDecoder = new TextDecoder("utf-8", { fatal: false });
    return { text: forgivingDecoder.decode(bytes), hadDecodingErrors: true };
  }
}

function mediaTypeFromExtension(p: string): string | null {
  const ext = path.extname(p).toLowerCase();
  switch (ext) {
    case ".css":
      return "text/css";
    case ".js":
    case ".mjs":
      return "application/javascript";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    case ".json":
      return "application/json";
    case ".txt":
      return "text/plain";
    default:
      return null;
  }
}

function walkDirFiles(absDir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [absDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    for (const ent of entries) {
      const abs = path.join(current, ent.name);
      if (ent.isDirectory()) {
        stack.push(abs);
      } else if (ent.isFile()) {
        out.push(abs);
      }
    }
  }

  return out.sort((a, b) => a.localeCompare(b));
}

function stableInputSpec(source: ImportInput["source"], normalized: {
  source: ImportOutput["documentMeta"]["source"];
}): JsonValue {
  if (source.kind === "single-entry-html") {
    return {
      kind: "single-entry-html",
      entryHtmlPath: normalized.source.kind === "single-entry-html" ? normalized.source.entryHtmlPath : "",
      assetsDirPath: normalized.source.kind === "single-entry-html" ? normalized.source.assetsDirPath : null,
    };
  }
  return {
    kind: "html-files",
    htmlFilePaths: normalized.source.kind === "html-files" ? normalized.source.htmlFilePaths : [],
    entryHtmlPath: normalized.source.kind === "html-files" ? normalized.source.entryHtmlPath : null,
    assetsDirPath: normalized.source.kind === "html-files" ? normalized.source.assetsDirPath : null,
  };
}

export async function importStaticSite(input: ImportInput): Promise<ImportOutput> {
  const issues: ReturnType<typeof createDiagnosticIssue>[] = [];

  try {
    const rootDirAbs = path.resolve(input.rootDir);

    if (!path.isAbsolute(rootDirAbs)) {
      issues.push(
        createDiagnosticIssue({
          severity: "fatal",
          code: "INPUT_INVALID",
          message: "rootDir must be an absolute path",
          location: { path: null, position: null, selector: null },
          details: { rootDir: input.rootDir },
        }),
      );
    }

    const requestId = input.requestId ?? null;

    let normalizedSource: ImportOutput["documentMeta"]["source"];
    let htmlPathsToRead: { absPath: string; relPosixPath: string; isEntry: boolean }[] = [];
    let assetsDir: { absPath: string; relPosixPath: string } | null = null;

    if (input.source.kind === "single-entry-html") {
      const entry = resolveToRootRelativePosix({
        rootDirAbs,
        inputPath: input.source.entryHtmlPath,
      });
      if (!entry) {
        issues.push(
          createDiagnosticIssue({
            severity: "fatal",
            code: "PATH_OUTSIDE_ROOT",
            message: "entryHtmlPath resolves outside rootDir",
            location: { path: null, position: null, selector: null },
            details: { entryHtmlPath: input.source.entryHtmlPath },
          }),
        );
        normalizedSource = {
          kind: "single-entry-html",
          entryHtmlPath: normalizeRelPosix(input.source.entryHtmlPath),
          assetsDirPath: null,
        };
      } else {
        htmlPathsToRead.push({ ...entry, isEntry: true });
        normalizedSource = {
          kind: "single-entry-html",
          entryHtmlPath: entry.relPosixPath,
          assetsDirPath: null,
        };
      }

      if (input.source.assetsDirPath) {
        const assets = resolveToRootRelativePosix({
          rootDirAbs,
          inputPath: input.source.assetsDirPath,
        });
        if (!assets) {
          issues.push(
            createDiagnosticIssue({
              severity: "fatal",
              code: "PATH_OUTSIDE_ROOT",
              message: "assetsDirPath resolves outside rootDir",
              location: { path: null, position: null, selector: null },
              details: { assetsDirPath: input.source.assetsDirPath },
            }),
          );
        } else {
          assetsDir = assets;
          normalizedSource = { ...normalizedSource, assetsDirPath: assets.relPosixPath };
        }
      }
    } else {
      const normalized = new Map<string, { absPath: string; relPosixPath: string }>();
      for (const p of input.source.htmlFilePaths) {
        const resolved = resolveToRootRelativePosix({ rootDirAbs, inputPath: p });
        if (!resolved) {
          issues.push(
            createDiagnosticIssue({
              severity: "fatal",
              code: "PATH_OUTSIDE_ROOT",
              message: "htmlFilePath resolves outside rootDir",
              location: { path: null, position: null, selector: null },
              details: { htmlFilePath: p },
            }),
          );
          continue;
        }
        normalized.set(resolved.relPosixPath, resolved);
      }
      const sorted = [...normalized.values()].sort((a, b) => a.relPosixPath.localeCompare(b.relPosixPath));

      const entry =
        input.source.entryHtmlPath === undefined
          ? null
          : resolveToRootRelativePosix({ rootDirAbs, inputPath: input.source.entryHtmlPath });
      if (input.source.entryHtmlPath !== undefined && !entry) {
        issues.push(
          createDiagnosticIssue({
            severity: "fatal",
            code: "PATH_OUTSIDE_ROOT",
            message: "entryHtmlPath resolves outside rootDir",
            location: { path: null, position: null, selector: null },
            details: { entryHtmlPath: input.source.entryHtmlPath },
          }),
        );
      }

      const entryRel = entry?.relPosixPath ?? null;
      htmlPathsToRead = sorted.map((v) => ({ ...v, isEntry: entryRel !== null && v.relPosixPath === entryRel }));

      normalizedSource = {
        kind: "html-files",
        htmlFilePaths: htmlPathsToRead.map((p) => p.relPosixPath),
        entryHtmlPath: entryRel,
        assetsDirPath: null,
      };

      if (input.source.assetsDirPath) {
        const assets = resolveToRootRelativePosix({
          rootDirAbs,
          inputPath: input.source.assetsDirPath,
        });
        if (!assets) {
          issues.push(
            createDiagnosticIssue({
              severity: "fatal",
              code: "PATH_OUTSIDE_ROOT",
              message: "assetsDirPath resolves outside rootDir",
              location: { path: null, position: null, selector: null },
              details: { assetsDirPath: input.source.assetsDirPath },
            }),
          );
        } else {
          assetsDir = assets;
          normalizedSource = { ...normalizedSource, assetsDirPath: assets.relPosixPath };
        }
      }
    }

    const importedDocuments: ImportedHtmlDocument[] = [];
    const allAssetReferences: AssetRegistry["references"] = [];

    for (const html of htmlPathsToRead.sort((a, b) => a.relPosixPath.localeCompare(b.relPosixPath))) {
      let bytes: Uint8Array;
      let byteLength: number;
      try {
        const read = readFileBytes(html.absPath);
        bytes = read.bytes;
        byteLength = read.byteLength;
      } catch (err) {
        const code = html.isEntry ? "ENTRY_HTML_MISSING" : "HTML_FILE_UNREADABLE";
        const severity = html.isEntry ? "fatal" : "error";
        issues.push(
          createDiagnosticIssue({
            severity,
            code,
            message: html.isEntry ? "Entry HTML file is missing or unreadable" : "HTML file is unreadable",
            location: { path: html.relPosixPath, position: null, selector: null },
            details: { error: String((err as Error)?.message ?? err) },
          }),
        );
        continue;
      }

      const contentSha256 = sha256Hex(bytes);
      const decoded = decodeUtf8Deterministically(bytes);
      if (decoded.hadDecodingErrors) {
        issues.push(
          createDiagnosticIssue({
            severity: "error",
            code: "HTML_DECODING_ERROR",
            message: "HTML contained invalid UTF-8 sequences (replacement characters inserted)",
            location: { path: html.relPosixPath, position: null, selector: null },
            details: null,
          }),
        );
      }

      const { document, snapshot } = parseHtmlToDomSnapshot(decoded.text);
      if (snapshot.parseWarnings.length > 0) {
        issues.push(
          createDiagnosticIssue({
            severity: "warning",
            code: "HTML_PARSE_ERROR",
            message: `HTML parser reported ${snapshot.parseWarnings.length} warning(s)`,
            location: { path: html.relPosixPath, position: null, selector: null },
            details: { parseWarnings: snapshot.parseWarnings },
          }),
        );
      }

      const extracted = extractAssetReferencesFromDom({
        rootDirAbs,
        fromDocumentPath: html.relPosixPath,
        document,
      });
      allAssetReferences.push(...extracted.references);
      issues.push(...extracted.issues);

      importedDocuments.push({
        path: html.relPosixPath,
        contentSha256,
        byteLength,
        decoding: { encoding: "utf-8", hadDecodingErrors: decoded.hadDecodingErrors },
        text: decoded.text,
        dom: snapshot,
      });
    }

    let importedAssetFiles: ImportedAssetFile[] = [];
    if (assetsDir) {
      try {
        const st = fs.statSync(assetsDir.absPath);
        if (!st.isDirectory()) throw new Error("Not a directory");
      } catch (err) {
        issues.push(
          createDiagnosticIssue({
            severity: "fatal",
            code: "ASSETS_DIR_UNREADABLE",
            message: "assetsDirPath is missing or unreadable",
            location: { path: assetsDir.relPosixPath, position: null, selector: null },
            details: { error: String((err as Error)?.message ?? err) },
          }),
        );
        assetsDir = null;
      }
    }

    if (assetsDir) {
      const absFiles = walkDirFiles(assetsDir.absPath);
      const assetFiles: ImportedAssetFile[] = [];
      for (const abs of absFiles) {
        const rel = path.relative(rootDirAbs, abs);
        const relPosix = normalizeRelPosix(rel);
        try {
          const read = readFileBytes(abs);
          assetFiles.push({
            path: relPosix,
            contentSha256: sha256Hex(read.bytes),
            byteLength: read.byteLength,
            mediaType: mediaTypeFromExtension(relPosix),
          });
        } catch (err) {
          issues.push(
            createDiagnosticIssue({
              severity: "error",
              code: "ASSET_FILE_UNREADABLE",
              message: "Asset file is unreadable",
              location: { path: relPosix, position: null, selector: null },
              details: { error: String((err as Error)?.message ?? err) },
            }),
          );
        }
      }
      importedAssetFiles = assetFiles.sort((a, b) => a.path.localeCompare(b.path));
    }

    const contentPairs = [
      ...importedDocuments.map((d) => ({ path: d.path, contentSha256: d.contentSha256 })),
      ...importedAssetFiles.map((f) => ({ path: f.path, contentSha256: f.contentSha256 })),
    ].sort((a, b) => a.path.localeCompare(b.path));

    const inputSpec = stableInputSpec(input.source, { source: normalizedSource });
    const inputSpecSha256 = crypto.createHash("sha256").update(stableStringify(inputSpec), "utf8").digest("hex");
    const inputContentSha256 = crypto
      .createHash("sha256")
      .update(stableStringify(contentPairs), "utf8")
      .digest("hex");

    const assetRegistry: AssetRegistry = {
      assetsDirPath: assetsDir?.relPosixPath ?? null,
      files: importedAssetFiles,
      references: allAssetReferences.sort((a, b) => {
        if (a.fromDocumentPath !== b.fromDocumentPath)
          return a.fromDocumentPath.localeCompare(b.fromDocumentPath);
        if (a.attribute !== b.attribute) return a.attribute.localeCompare(b.attribute);
        if (a.rawRef !== b.rawRef) return a.rawRef.localeCompare(b.rawRef);
        return (a.resolvedPath ?? "").localeCompare(b.resolvedPath ?? "");
      }),
    };

    const importDiagnostics = buildImportDiagnostics(issues);

    return {
      contractVersion: IMPORT_CONTRACT_VERSION,
      status: hasFatalIssues(importDiagnostics.issues) ? "failed" : "ok",
      documentMeta: {
        execution: { requestId },
        source: normalizedSource,
        fingerprints: {
          inputSpecSha256,
          inputContentSha256,
        },
      },
      rawDomSnapshot: { documents: importedDocuments.sort((a, b) => a.path.localeCompare(b.path)) },
      assetRegistry,
      importDiagnostics,
    };
  } catch (err) {
    const issue = createDiagnosticIssue({
      severity: "fatal",
      code: "INTERNAL_ERROR",
      message: "Internal error during importStaticSite",
      location: { path: null, position: null, selector: null },
      details: { name: String((err as Error)?.name ?? "Error"), message: String((err as Error)?.message ?? err) },
    });
    const importDiagnostics = buildImportDiagnostics([issue]);
    return {
      contractVersion: IMPORT_CONTRACT_VERSION,
      status: "failed",
      documentMeta: {
        execution: { requestId: input.requestId ?? null },
        source:
          input.source.kind === "single-entry-html"
            ? { kind: "single-entry-html", entryHtmlPath: normalizeRelPosix(input.source.entryHtmlPath), assetsDirPath: input.source.assetsDirPath ? normalizeRelPosix(input.source.assetsDirPath) : null }
            : {
                kind: "html-files",
                htmlFilePaths: [...input.source.htmlFilePaths].map(normalizeRelPosix).sort((a, b) => a.localeCompare(b)),
                entryHtmlPath: input.source.entryHtmlPath ? normalizeRelPosix(input.source.entryHtmlPath) : null,
                assetsDirPath: input.source.assetsDirPath ? normalizeRelPosix(input.source.assetsDirPath) : null,
              },
        fingerprints: {
          inputSpecSha256: sha256Hex("[]"),
          inputContentSha256: sha256Hex("[]"),
        },
      },
      rawDomSnapshot: { documents: [] },
      assetRegistry: { assetsDirPath: null, files: [], references: [] },
      importDiagnostics,
    };
  }
}
