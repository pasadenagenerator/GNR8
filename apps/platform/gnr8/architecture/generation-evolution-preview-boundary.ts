import { constants as fsConstants } from "node:fs";
import { existsSync } from "node:fs";
import { access, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

export type GenerationPreviewIteration = 1 | 2;

export type GenerationPreviewBundleAvailability = {
  iteration: GenerationPreviewIteration;
  proposalArtifactId: string;
  outputBundleId: string;
  bundleLabel: string;
  bundleRoot: string;
  entryFile: "source/index.html";
  available: boolean;
  unavailableReason: string | null;
};

export type GenerationPreviewResolvedFile =
  | {
      ok: true;
      status: 200;
      iteration: GenerationPreviewIteration;
      absolutePath: string;
      relativePath: string;
      contentType: string;
      body: ArrayBuffer;
    }
  | {
      ok: false;
      status: 400 | 404 | 403 | 410;
      code:
        | "UNKNOWN_ITERATION"
        | "PREVIEW_UNAVAILABLE"
        | "PATH_TRAVERSAL_REJECTED"
        | "ASSET_NOT_FOUND"
        | "ASSET_OUTSIDE_BUNDLE_REJECTED";
      message: string;
    };

const PREVIEW_BUNDLE_ALLOWLIST: Record<GenerationPreviewIteration, {
  proposalArtifactId: string;
  outputBundleId: string;
  bundleLabel: string;
}> = {
  1: {
    proposalArtifactId: "generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3",
    outputBundleId: "ODV_GENERATED_PROPOSAL_001",
    bundleLabel: "ODV_GENERATED_PROPOSAL_001",
  },
  2: {
    proposalArtifactId: "generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e",
    outputBundleId: "ODV_GENERATED_PROPOSAL_002",
    bundleLabel: "ODV_GENERATED_PROPOSAL_002",
  },
};

function candidateRepoRoots(): string[] {
  return [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
  ];
}

function bundleRootFor(label: string): string {
  return candidateRepoRoots()
    .map((root) => path.resolve(root, label))
    .find((candidate) => existsSync(candidate)) ?? path.resolve(process.cwd(), label);
}

function iterationFromUnknown(value: unknown): GenerationPreviewIteration | null {
  const normalized = String(value ?? "").trim();
  if (normalized === "1") return 1;
  if (normalized === "2") return 2;
  return null;
}

function contentTypeFor(relativePath: string): string {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  if (extension === ".ico") return "image/x-icon";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await access(absolutePath, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function normalizeAssetPath(assetPathSegments: readonly string[] | undefined): string | null {
  const rawSegments = assetPathSegments && assetPathSegments.length > 0
    ? assetPathSegments
    : ["source", "index.html"];
  const decodedSegments: string[] = [];

  for (const rawSegment of rawSegments) {
    let segment = rawSegment;
    try {
      segment = decodeURIComponent(rawSegment);
    } catch {
      return null;
    }
    if (
      segment.length === 0 ||
      segment === "." ||
      segment === ".." ||
      segment.includes("/") ||
      segment.includes("\\") ||
      path.isAbsolute(segment)
    ) {
      return null;
    }
    decodedSegments.push(segment);
  }

  const relativePath = decodedSegments.join("/");
  const normalized = path.posix.normalize(relativePath);
  if (
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized.startsWith("/") ||
    normalized.split("/").some((segment) => segment === "..")
  ) {
    return null;
  }
  return normalized;
}

export function generationPreviewSecurityHeaders(contentType?: string): HeadersInit {
  return {
    ...(contentType ? { "content-type": contentType } : {}),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "content-security-policy": [
      "default-src 'none'",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
      "sandbox allow-scripts allow-same-origin",
    ].join("; "),
  };
}

export async function getGenerationPreviewBundleAvailability(
  iterationValue: unknown,
): Promise<GenerationPreviewBundleAvailability | null> {
  const iteration = iterationFromUnknown(iterationValue);
  if (!iteration) return null;
  const allowed = PREVIEW_BUNDLE_ALLOWLIST[iteration];
  const bundleRoot = bundleRootFor(allowed.bundleLabel);
  const entryPath = path.resolve(bundleRoot, "source", "index.html");
  const available = await pathExists(entryPath);

  return {
    iteration,
    proposalArtifactId: allowed.proposalArtifactId,
    outputBundleId: allowed.outputBundleId,
    bundleLabel: allowed.bundleLabel,
    bundleRoot,
    entryFile: "source/index.html",
    available,
    unavailableReason: available ? null : "Proposal source bundle is not present in this runtime filesystem.",
  };
}

export async function resolveGenerationPreviewFile(input: {
  iteration: unknown;
  assetPathSegments?: readonly string[];
}): Promise<GenerationPreviewResolvedFile> {
  const availability = await getGenerationPreviewBundleAvailability(input.iteration);
  if (!availability) {
    return {
      ok: false,
      status: 404,
      code: "UNKNOWN_ITERATION",
      message: "Unknown generation iteration preview.",
    };
  }
  if (!availability.available) {
    return {
      ok: false,
      status: 410,
      code: "PREVIEW_UNAVAILABLE",
      message: availability.unavailableReason ?? "Preview bundle is unavailable.",
    };
  }

  const relativePath = normalizeAssetPath(input.assetPathSegments);
  if (!relativePath || !relativePath.startsWith("source/")) {
    return {
      ok: false,
      status: 400,
      code: "PATH_TRAVERSAL_REJECTED",
      message: "Preview asset path was rejected.",
    };
  }

  const rootRealPath = await realpath(availability.bundleRoot);
  const absolutePath = path.resolve(availability.bundleRoot, relativePath);
  const absoluteRealPath = await realpath(path.dirname(absolutePath)).catch(() => null);
  if (!absoluteRealPath || (absoluteRealPath !== rootRealPath && !absoluteRealPath.startsWith(`${rootRealPath}${path.sep}`))) {
    return {
      ok: false,
      status: 403,
      code: "ASSET_OUTSIDE_BUNDLE_REJECTED",
      message: "Preview asset resolves outside the allowlisted proposal bundle.",
    };
  }

  const fileStat = await stat(absolutePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return {
      ok: false,
      status: 404,
      code: "ASSET_NOT_FOUND",
      message: "Preview asset was not found.",
    };
  }

  const fileRealPath = await realpath(absolutePath);
  if (fileRealPath !== rootRealPath && !fileRealPath.startsWith(`${rootRealPath}${path.sep}`)) {
    return {
      ok: false,
      status: 403,
      code: "ASSET_OUTSIDE_BUNDLE_REJECTED",
      message: "Preview asset resolves outside the allowlisted proposal bundle.",
    };
  }

  const fileBuffer = await readFile(fileRealPath);
  const body = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength,
  ) as ArrayBuffer;

  return {
    ok: true,
    status: 200,
    iteration: availability.iteration,
    absolutePath: fileRealPath,
    relativePath,
    contentType: contentTypeFor(relativePath),
    body,
  };
}
