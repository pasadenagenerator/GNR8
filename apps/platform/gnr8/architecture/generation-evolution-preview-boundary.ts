import {
  GeneratedProposalBundleResolutionError,
  loadGeneratedProposalBundleByIteration,
  resolveGeneratedProposalBundleAsset,
  type GeneratedProposalBundleIteration,
  type GeneratedProposalBundlePersistenceOptions,
} from "./generated-proposal-bundle-persistence";

export type GenerationPreviewIteration = GeneratedProposalBundleIteration;

export type GenerationPreviewBundleAvailability = {
  iteration: GenerationPreviewIteration;
  proposalArtifactId: string;
  outputBundleId: string;
  bundleLabel: string;
  bundleArtifactId: string | null;
  bundleSha256: string | null;
  assetCount: number | null;
  byteSize: number | null;
  entryFile: "source/index.html";
  available: boolean;
  unavailableReason: string | null;
};

export type GenerationPreviewResolvedFile =
  | {
      ok: true;
      status: 200;
      iteration: GenerationPreviewIteration;
      bundleArtifactId: string;
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

function iterationFromUnknown(value: unknown): GenerationPreviewIteration | null {
  const normalized = String(value ?? "").trim();
  if (normalized === "1") return 1;
  if (normalized === "2") return 2;
  return null;
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

export async function getGenerationPreviewBundleAvailability(input: {
  siteVersionId: string;
  iteration: unknown;
  options?: GeneratedProposalBundlePersistenceOptions;
}): Promise<GenerationPreviewBundleAvailability | null> {
  const iteration = iterationFromUnknown(input.iteration);
  if (!iteration) return null;
  const allowed = PREVIEW_BUNDLE_ALLOWLIST[iteration];
  const artifact = await loadGeneratedProposalBundleByIteration({
    siteVersionId: input.siteVersionId,
    iteration,
    options: input.options,
  });
  const lineageMatches = artifact &&
    artifact.generatedWebsiteProposalArtifactId === allowed.proposalArtifactId &&
    artifact.outputBundleId === allowed.outputBundleId;
  const available = Boolean(artifact && lineageMatches);

  return {
    iteration,
    proposalArtifactId: allowed.proposalArtifactId,
    outputBundleId: allowed.outputBundleId,
    bundleLabel: artifact?.bundleLabel ?? allowed.bundleLabel,
    bundleArtifactId: artifact?.artifactId ?? null,
    bundleSha256: artifact?.bundleSha256 ?? null,
    assetCount: artifact?.assetCount ?? null,
    byteSize: artifact?.byteSize ?? null,
    entryFile: "source/index.html",
    available,
    unavailableReason: available
      ? null
      : artifact
        ? "Persisted Generated Proposal Bundle lineage does not match the allowlisted iteration."
        : "Persisted Generated Proposal Bundle artifact is not available for this runtime.",
  };
}

export async function resolveGenerationPreviewFile(input: {
  siteVersionId: string;
  iteration: unknown;
  assetPathSegments?: readonly string[];
  options?: GeneratedProposalBundlePersistenceOptions;
}): Promise<GenerationPreviewResolvedFile> {
  const iteration = iterationFromUnknown(input.iteration);
  if (!iteration) {
    return {
      ok: false,
      status: 404,
      code: "UNKNOWN_ITERATION",
      message: "Unknown generation iteration preview.",
    };
  }
  const availability = await getGenerationPreviewBundleAvailability({
    siteVersionId: input.siteVersionId,
    iteration,
    options: input.options,
  });
  if (!availability?.available) {
    return {
      ok: false,
      status: 410,
      code: "PREVIEW_UNAVAILABLE",
      message: availability?.unavailableReason ?? "Preview bundle is unavailable.",
    };
  }

  const artifact = await loadGeneratedProposalBundleByIteration({
    siteVersionId: input.siteVersionId,
    iteration,
    options: input.options,
  });
  if (!artifact) {
    return {
      ok: false,
      status: 410,
      code: "PREVIEW_UNAVAILABLE",
      message: "Persisted Generated Proposal Bundle artifact is not available for this runtime.",
    };
  }

  try {
    const file = resolveGeneratedProposalBundleAsset({
      artifact,
      assetPathSegments: input.assetPathSegments,
    });
    return {
      ok: true,
      status: 200,
      iteration,
      bundleArtifactId: artifact.artifactId,
      relativePath: file.relativePath,
      contentType: file.contentType,
      body: file.body,
    };
  } catch (error) {
    if (error instanceof GeneratedProposalBundleResolutionError) {
      return {
        ok: false,
        status: error.status,
        code: error.code,
        message: error.message,
      };
    }
    throw error;
  }
}
