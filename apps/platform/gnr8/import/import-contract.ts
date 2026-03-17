/**
 * GNR8 — Deterministic Import Contract (FIRST MIGRATION PHASE)
 * ===========================================================
 *
 * This file is the single source-of-truth for the importer boundary between:
 *   raw static site inputs (HTML + local assets) → structured, internal import snapshot
 *
 * Scope (this contract defines; implementations are out of scope):
 * - Supported input formats for FIRST migration phase
 * - Import execution interface (function/service boundary)
 * - Output contract (high-level, JSON-like shape)
 * - Deterministic diagnostics (warnings/errors/fatal) and failure behavior
 * - Assumptions + explicit non-goals
 *
 * ---------------------------------------------------------------------------
 * Determinism Rules (normative)
 * ---------------------------------------------------------------------------
 * - Same input bytes + same options + same contract version => same output bytes.
 * - No random IDs, no timestamps, no environment-dependent values.
 * - Any ordering derived from filesystem or maps MUST be canonicalized:
 *   - Paths are normalized to POSIX ("/") and relative to `rootDir`.
 *   - Collections are sorted lexicographically by normalized path unless specified otherwise.
 * - Import MUST NOT silently "fix" content. It may only:
 *   - read
 *   - normalize (in explicitly defined, reversible ways)
 *   - record (snapshot + diagnostics)
 *
 * ---------------------------------------------------------------------------
 * Supported Input Formats (FIRST PHASE)
 * ---------------------------------------------------------------------------
 * Input is strictly local. No crawling, no network I/O, no remote fetching.
 *
 * Supported:
 * 1) Single entry HTML document (a file) + optional local assets folder
 * 2) Multiple static HTML files (a list) + optional local assets folder
 * 3) Local folder with assets (referenced by HTML); assets are not fetched remotely
 *
 * Not supported (explicit non-goals for this phase):
 * - Remote URLs / crawling / HTTP(S) requests
 * - JavaScript execution to hydrate DOM
 * - Server-side includes / templating evaluation
 * - Heuristic section detection, semantic inference, or AI/LLM logic
 * - Transforming, rewriting, minifying, beautifying, or "cleaning" HTML/CSS/JS
 *
 * ---------------------------------------------------------------------------
 * Normalization (allowed; MUST be recorded)
 * ---------------------------------------------------------------------------
 * Normalization is limited to steps that do not change meaning and are reversible:
 * - Path normalization:
 *   - Resolve input paths against `rootDir`
 *   - Reject path traversal outside `rootDir`
 *   - Canonical output paths as POSIX, relative to `rootDir`, with no "." or ".."
 * - Text decoding:
 *   - Implementations MUST declare decoding used (e.g. "utf-8")
 *   - Any decoding errors MUST be reported in diagnostics (never silently ignored)
 *
 * ---------------------------------------------------------------------------
 * Failure Model (deterministic; compiler-like)
 * ---------------------------------------------------------------------------
 * The importer returns an `ImportOutput` in all cases.
 *
 * - `status: "ok"` means no `fatal` issues were produced.
 * - `status: "failed"` means at least one `fatal` issue exists and downstream
 *   systems MUST NOT proceed as if the import were valid.
 *
 * Importer MUST NOT throw for user-content problems (I/O, parse errors, missing assets).
 * Those are represented as diagnostics. Throwing is reserved for programmer errors
 * (violating this contract) and should be wrapped into a deterministic `INTERNAL_ERROR`
 * diagnostic if it would otherwise leak nondeterminism.
 *
 * ---------------------------------------------------------------------------
 * Diagnostic Severity & Classification
 * ---------------------------------------------------------------------------
 * - info: informative, no action required
 * - warning: unexpected or unsupported-but-ignorable structure; output remains usable
 * - error: serious issue; output MAY be usable but is incomplete/incorrect in defined ways
 * - fatal: import contract cannot be satisfied; `status` MUST be "failed"
 *
 * All unexpected structures MUST be reported in diagnostics as warning/error/fatal.
 *
 * ---------------------------------------------------------------------------
 * Import Execution Interface (service boundary)
 * ---------------------------------------------------------------------------
 * Implementations MUST expose a pure(ish) function boundary:
 *
 *   importStaticSite(input: ImportInput): Promise<ImportOutput>
 *
 * "Pure-ish" means the only permitted side effects are reading the provided local files.
 * No network, no clocks, no randomness.
 */

export const IMPORT_CONTRACT_VERSION = "1.0.0" as const;

/**
 * JSON-like value set for diagnostics/details payloads.
 * Keep this strict to ensure deterministic serialization and avoid functions/classes.
 */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ImportInput = {
  /**
   * Absolute path to the import root directory. All other paths are resolved against this root.
   * Output paths are always normalized to be POSIX and relative to this root.
   */
  rootDir: string;

  /**
   * Import sources for FIRST migration phase.
   */
  source: ImportInputSource;

  /**
   * Optional caller-supplied identifier, echoed into `documentMeta.execution.requestId`.
   * This MUST be caller-provided (never generated by importer).
   */
  requestId?: string;
};

export type ImportInputSource =
  | {
      kind: "single-entry-html";
      /**
       * Path to the entry HTML file, relative to `rootDir` (preferred) or absolute.
       */
      entryHtmlPath: string;
      /**
       * Optional assets directory path (relative to `rootDir` preferred).
       * If provided, importer MUST be able to read it; otherwise a `fatal` diagnostic is produced.
       */
      assetsDirPath?: string;
    }
  | {
      kind: "html-files";
      /**
       * Paths to HTML files (relative to `rootDir` preferred). The importer treats this as a set:
       * it MUST dedupe after normalization and then sort lexicographically by normalized path.
       */
      htmlFilePaths: string[];
      /**
       * Optional entry HTML path for downstream consumers; if omitted, `documentMeta.source.entryHtmlPath`
       * is `null` and no implicit entry selection occurs (no heuristics).
       */
      entryHtmlPath?: string;
      /**
       * Optional assets directory path (relative to `rootDir` preferred).
       * If provided, importer MUST be able to read it; otherwise a `fatal` diagnostic is produced.
       */
      assetsDirPath?: string;
    };

export type ImportOutput = {
  contractVersion: typeof IMPORT_CONTRACT_VERSION;
  status: "ok" | "failed";

  documentMeta: ImportDocumentMeta;
  rawDomSnapshot: RawDomSnapshot;
  assetRegistry: AssetRegistry;
  importDiagnostics: ImportDiagnostics;
};

export type ImportDocumentMeta = {
  /**
   * Echoed execution metadata; must be deterministic and caller-controlled.
   */
  execution: {
    requestId: string | null;
  };

  /**
   * Normalized description of the import source.
   * All `...Path` fields are normalized POSIX paths relative to `rootDir`.
   */
  source:
    | {
        kind: "single-entry-html";
        entryHtmlPath: string;
        assetsDirPath: string | null;
      }
    | {
        kind: "html-files";
        htmlFilePaths: string[];
        entryHtmlPath: string | null;
        assetsDirPath: string | null;
      };

  /**
   * Deterministic fingerprints derived only from input bytes + normalized paths.
   * Hash algorithm is fixed for this contract version: sha256 hex, lowercase.
   */
  fingerprints: {
    /**
     * Hash of a canonical JSON serialization of the normalized input *spec* (paths only),
     * using stable key ordering and UTF-8 encoding.
     */
    inputSpecSha256: string;
    /**
     * Hash of a canonical JSON serialization of (normalized path -> content sha256) pairs.
     */
    inputContentSha256: string;
  };
};

export type RawDomSnapshot = {
  /**
   * Snapshot of HTML documents as imported. This contract does not require DOM parsing;
   * implementations may include `dom` in a later contract version.
   */
  documents: ImportedHtmlDocument[];
};

export type ImportedHtmlDocument = {
  /**
   * Normalized POSIX path relative to `rootDir`.
   */
  path: string;

  /**
   * sha256 hex of the original file bytes (before any decoding).
   */
  contentSha256: string;

  /**
   * Byte size of the original file.
   */
  byteLength: number;

  /**
   * Text decoding metadata. `text` is the decoded HTML string.
   * If decoding fails, importer must emit a diagnostic and MAY set `text` to "".
   */
  decoding: {
    encoding: "utf-8";
    hadDecodingErrors: boolean;
  };

  text: string;

  /**
   * Optional deterministic DOM snapshot derived from `text`.
   * When present, this MUST be derived only from `text` using a server-safe HTML parser.
   */
  dom: ImportedDomSnapshot | null;
};

export type ImportedDomSnapshot = {
  /**
   * Deterministic serialization of the parsed DOM tree.
   * This is a snapshot only; no semantic interpretation is implied.
   */
  serializedDom: string;

  /**
   * Total number of nodes in the parsed tree (including document/root nodes),
   * counted deterministically by a single traversal.
   */
  nodeCount: number;

  /**
   * Parser warnings/errors when available. This MUST NOT include nondeterministic data.
   */
  parseWarnings: HtmlParseWarning[];
};

export type HtmlParseWarning = {
  code: string;
  message: string;
  position:
    | {
        line: number;
        column: number;
      }
    | null;
};

export type AssetRegistry = {
  /**
   * Normalized POSIX path relative to `rootDir`, or null if no assets dir was provided.
   */
  assetsDirPath: string | null;

  /**
   * All files found under `assetsDirPath` (recursive), sorted lexicographically by `path`.
   */
  files: ImportedAssetFile[];

  /**
   * References discovered from imported HTML. FIRST PHASE does not require implementing this
   * extraction yet; an implementation may leave this empty but MUST emit diagnostics if it
   * claims to support reference extraction in the same contract version.
   */
  references: AssetReference[];
};

export type ImportedAssetFile = {
  /**
   * Normalized POSIX path relative to `rootDir`.
   */
  path: string;
  /**
   * sha256 hex of file bytes.
   */
  contentSha256: string;
  byteLength: number;
  /**
   * Optional media type when deterministically known (e.g. by file extension mapping).
   * No sniffing heuristics in this phase.
   */
  mediaType: string | null;
};

export type AssetReference = {
  /**
   * Path of the HTML document that contains the reference (normalized, relative to root).
   */
  fromDocumentPath: string;
  /**
   * The raw attribute value (e.g. src/href). No rewriting.
   */
  rawRef: string;
  /**
   * Deterministically resolved target path (normalized, relative to root) when it refers to a local file.
   * Null when not resolvable (e.g. external URL, data: URL, invalid path).
   */
  resolvedPath: string | null;
  /**
   * Attribute name holding the reference (e.g. "src", "href").
   */
  attribute: string;
};

export type ImportDiagnostics = {
  /**
   * Deterministic summary derived from `issues`.
   */
  summary: {
    infoCount: number;
    warningCount: number;
    errorCount: number;
    fatalCount: number;
  };

  /**
   * All diagnostics, in deterministic order.
   * If an implementation produces diagnostics from unordered sources, it MUST sort by:
   *   severityRank(fatal>error>warning>info), code, location.path, message
   */
  issues: ImportDiagnosticIssue[];
};

export type ImportDiagnosticSeverity = "info" | "warning" | "error" | "fatal";

export type ImportDiagnosticCode =
  | "INPUT_INVALID"
  | "PATH_OUTSIDE_ROOT"
  | "ENTRY_HTML_MISSING"
  | "HTML_FILE_UNREADABLE"
  | "ASSETS_DIR_UNREADABLE"
  | "ASSET_FILE_UNREADABLE"
  | "HTML_DECODING_ERROR"
  | "HTML_PARSE_ERROR"
  | "ASSET_REFERENCE_UNRESOLVED"
  | "INVALID_ASSET_REFERENCE"
  | "UNSUPPORTED_STRUCTURE"
  | "INTERNAL_ERROR";

export type ImportDiagnosticIssue = {
  /**
   * Deterministic identifier for stable de-duplication.
   * Implementations should compute from (severity, code, location, message).
   */
  id: string;
  severity: ImportDiagnosticSeverity;
  code: ImportDiagnosticCode;
  message: string;
  location: ImportDiagnosticLocation | null;
  details: JsonValue | null;
};

export type ImportDiagnosticLocation = {
  /**
   * Normalized POSIX path relative to `rootDir` when applicable.
   */
  path: string | null;

  /**
   * Optional position data when derived deterministically (e.g. from a parser).
   * FIRST PHASE does not require producing line/column.
   */
  position:
    | {
        line: number;
        column: number;
      }
    | null;

  /**
   * Optional HTML selector or node hint; MUST be deterministic if present.
   */
  selector: string | null;
};

/**
 * Importer boundary (service interface).
 * Implementations MUST follow the deterministic failure model described above.
 */
export type ImportStaticSite = (input: ImportInput) => Promise<ImportOutput>;
