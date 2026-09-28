import {
  ASTRO_INTERNAL_PREVIEW_ASSET_MODE,
  ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND,
  ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION,
  computeAstroInternalPreviewCandidateContentSha256,
  type AstroInternalPreviewCandidate,
} from "./astro-static-site-internal-preview-bridge";
import { ASTRO_STATIC_EXPORT_MANIFEST_VERSION } from "./astro-static-site-build-export-proof";

export function createSyntheticAstroInternalPreviewCandidate(input: {
  candidateId?: string;
  siteId?: string;
  siteVersionId?: string;
  html?: string;
  createdAt?: string;
} = {}): AstroInternalPreviewCandidate {
  const html = input.html ?? "<!doctype html><html><head><style>:root{--proof:#0f766e}</style></head><body><h1>Persistence survives process exit</h1><a href=\"#contact\">Contact</a><section id=\"contact\">Ready</section></body></html>";
  const siteId = input.siteId ?? "site-persistence-proof";
  const siteVersionId = input.siteVersionId ?? "sv-persistence-proof";
  const candidate: AstroInternalPreviewCandidate = {
    kind: ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND,
    id: input.candidateId ?? "candidate-persistence-proof",
    siteId,
    siteVersionId,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    htmlByPath: { "/": html },
    compiledTokenStyles: ":root{--proof:#0f766e}",
    assetFingerprintMap: { "styles/global.css": "d".repeat(64) },
    manifest: {
      sourceKind: ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND,
      conversionVersion: ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION,
      adapterId: "astro-static-site",
      ownership: { siteId, siteVersionId },
      provenance: {
        sourceSnapshotSha256: "a".repeat(64),
        exportManifestVersion: ASTRO_STATIC_EXPORT_MANIFEST_VERSION,
        exportSha256: "b".repeat(64),
        convertedArtifactSha256: "0".repeat(64),
      },
      assetHandling: {
        mode: ASTRO_INTERNAL_PREVIEW_ASSET_MODE,
        inlinedStylesheetPaths: ["styles/global.css"],
        externalAssetStorageRequired: false,
      },
      lifecycle: {
        storage: "caller_owned_in_memory",
        lifetime: "proof_invocation_only",
        durableRegistration: false,
      },
    },
    contentSha256: "0".repeat(64),
    createdAt: input.createdAt ?? "2026-09-27T09:00:00.000Z",
  };
  const contentSha256 = computeAstroInternalPreviewCandidateContentSha256(candidate);
  candidate.contentSha256 = contentSha256;
  candidate.manifest.provenance.convertedArtifactSha256 = contentSha256;
  return candidate;
}
