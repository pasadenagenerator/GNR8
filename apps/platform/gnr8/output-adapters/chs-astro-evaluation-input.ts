import { computeRuntimeArtifactBundleSha256, readAstroRuntimeArtifactPromotionEvidence } from "@/gnr8/runtime/astro-artifact-materialization";
import { sha256Hex } from "@/gnr8/runtime/deterministic";
import type { RuntimeArtifact } from "@/gnr8/runtime/types";

import { validateSelfContainedAstroProductionPayload } from "./astro-production-candidate-record";
import { CHS_ASTRO_EVALUATION } from "./chs-astro-evaluation-contract";
import { CHS_ASTRO_EXPORT_VERIFICATION } from "./chs-astro-source-content";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export type ChsAstroGeneratedEvaluationProvenance = {
  kind: "chs_astro_generated_evaluation_provenance_v1";
  inputKind: "validated_rendered_html";
  sourceArtifactId: string;
  sourceSnapshotSha256: string;
  exportSha256: string;
  candidateContentSha256: string;
  convertedArtifactSha256: string;
  runtimeBundleSha256: string;
  htmlSha256: string;
  htmlPath: "/";
  htmlTransformation: "none";
};

export type ChsAstroEvaluationInput = {
  html: string;
  css: string;
  assetFingerprintMap: Record<string, string>;
  provenance: ChsAstroGeneratedEvaluationProvenance;
};

export function resolveChsAstroEvaluationInput(artifact: RuntimeArtifact | null): ChsAstroEvaluationInput {
  if (!artifact) {
    throw new Error(`CHS_ASTRO_EVALUATION_VALIDATED_ARTIFACT_MISSING:${CHS_ASTRO_EVALUATION.sourceSiteVersionId}`);
  }
  if (
    artifact.siteId !== CHS_ASTRO_EVALUATION.runtimeSiteId ||
    artifact.siteVersionId !== CHS_ASTRO_EVALUATION.sourceSiteVersionId
  ) {
    throw new Error("CHS_ASTRO_EVALUATION_ARTIFACT_LINEAGE_MISMATCH");
  }

  const promotion = readAstroRuntimeArtifactPromotionEvidence(artifact.manifest);
  if (!promotion) throw new Error("CHS_ASTRO_EVALUATION_GENERATED_PROVENANCE_MISSING");
  const candidateManifest = record(artifact.manifest.astroCandidateManifest);
  const candidateProvenance = record(candidateManifest?.provenance);
  const hashes = [
    promotion.sourceSnapshotSha256,
    promotion.exportSha256,
    promotion.candidateContentSha256,
    promotion.convertedArtifactSha256,
  ];
  if (hashes.some((hash) => typeof hash !== "string" || !SHA256_PATTERN.test(hash))) {
    throw new Error("CHS_ASTRO_EVALUATION_GENERATED_HASH_INVALID");
  }
  if (
    candidateProvenance?.sourceSnapshotSha256 !== promotion.sourceSnapshotSha256 ||
    candidateProvenance?.exportSha256 !== promotion.exportSha256 ||
    candidateProvenance?.convertedArtifactSha256 !== promotion.convertedArtifactSha256 ||
    promotion.candidateContentSha256 !== promotion.convertedArtifactSha256
  ) {
    throw new Error("CHS_ASTRO_EVALUATION_GENERATED_HASH_MISMATCH");
  }

  const recomputedBundleSha256 = computeRuntimeArtifactBundleSha256({
    htmlByPath: artifact.htmlByPath,
    compiledTokenStyles: artifact.compiledTokenStyles,
    assetFingerprintMap: artifact.assetFingerprintMap,
    manifest: artifact.manifest,
  });
  if (recomputedBundleSha256 !== artifact.bundleSha256) {
    throw new Error("CHS_ASTRO_EVALUATION_RUNTIME_BUNDLE_HASH_MISMATCH");
  }
  const paths = Object.keys(artifact.htmlByPath).sort();
  if (paths.length !== 1 || paths[0] !== "/") {
    throw new Error("CHS_ASTRO_EVALUATION_UNSUPPORTED_OUTPUT_CAPABILITY");
  }
  const html = artifact.htmlByPath["/"];
  if (!html?.trim()) throw new Error("CHS_ASTRO_EVALUATION_RENDERED_HTML_MISSING");
  validateSelfContainedAstroProductionPayload({ html, compiledTokenStyles: artifact.compiledTokenStyles });
  for (const expected of CHS_ASTRO_EXPORT_VERIFICATION.expectedContent) {
    if (!html.includes(expected)) throw new Error(`CHS_ASTRO_EVALUATION_REQUIRED_CONTENT_MISSING:${expected}`);
  }
  if (!artifact.compiledTokenStyles.includes(CHS_ASTRO_EXPORT_VERIFICATION.expectedThemeToken)) {
    throw new Error("CHS_ASTRO_EVALUATION_THEME_TOKEN_MISSING");
  }

  return {
    html,
    css: artifact.compiledTokenStyles,
    assetFingerprintMap: structuredClone(artifact.assetFingerprintMap),
    provenance: {
      kind: "chs_astro_generated_evaluation_provenance_v1",
      inputKind: "validated_rendered_html",
      sourceArtifactId: artifact.id,
      sourceSnapshotSha256: promotion.sourceSnapshotSha256,
      exportSha256: promotion.exportSha256,
      candidateContentSha256: promotion.candidateContentSha256,
      convertedArtifactSha256: promotion.convertedArtifactSha256,
      runtimeBundleSha256: artifact.bundleSha256,
      htmlSha256: sha256Hex(html),
      htmlPath: "/",
      htmlTransformation: "none",
    },
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
