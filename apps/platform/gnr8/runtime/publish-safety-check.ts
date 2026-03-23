import type { RuntimeArtifact } from "@/gnr8/runtime/types";

export type PublishSafetyIssueCode =
  | "ACTIVE_ARTIFACT_MISSING"
  | "ROOT_PATH_MISSING"
  | "MANIFEST_INCONSISTENT"
  | "ACTIVE_POINTER_MISSING"
  | "ACTIVE_POINTER_MISMATCH";

export type PublishSafetyIssue = {
  code: PublishSafetyIssueCode;
  message: string;
};

export type PublishSafetyResult =
  | { ok: true }
  | {
      ok: false;
      issues: PublishSafetyIssue[];
    };

function readManifestString(input: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!input) return null;
  const value = input[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readManifestPaths(input: Record<string, unknown> | null | undefined): string[] {
  if (!input) return [];
  const paths = input["paths"];
  if (!Array.isArray(paths)) return [];
  return paths.filter((value): value is string => typeof value === "string");
}

export function evaluatePublishSafety(input: {
  siteId: string;
  siteVersionId: string;
  artifactId: string;
  rendererCompatibilityVersion: string;
  artifact: RuntimeArtifact | null;
  activePointer: { siteVersionId: string; artifactId: string } | null;
}): PublishSafetyResult {
  const issues: PublishSafetyIssue[] = [];
  const artifact = input.artifact;

  if (!artifact) {
    issues.push({
      code: "ACTIVE_ARTIFACT_MISSING",
      message: "Publish artifact is missing after creation.",
    });
  } else {
    const rootHtml = String(artifact.htmlByPath["/"] ?? "").trim();
    if (!rootHtml) {
      issues.push({
        code: "ROOT_PATH_MISSING",
        message: `Publish artifact ${artifact.id} does not contain root path "/" HTML.`,
      });
    }

    const manifestSiteId = readManifestString(artifact.manifest, "siteId");
    const manifestSiteVersionId = readManifestString(artifact.manifest, "siteVersionId");
    const manifestRendererCompatibilityVersion = readManifestString(artifact.manifest, "rendererCompatibilityVersion");
    const manifestPaths = readManifestPaths(artifact.manifest);
    const manifestHasRootPath = manifestPaths.includes("/");

    const manifestConsistent =
      artifact.siteId === input.siteId &&
      artifact.siteVersionId === input.siteVersionId &&
      artifact.rendererCompatibilityVersion === input.rendererCompatibilityVersion &&
      manifestSiteId === input.siteId &&
      manifestSiteVersionId === input.siteVersionId &&
      manifestRendererCompatibilityVersion === input.rendererCompatibilityVersion &&
      manifestHasRootPath;

    if (!manifestConsistent) {
      issues.push({
        code: "MANIFEST_INCONSISTENT",
        message: "Artifact metadata/manifest is inconsistent with published site and version binding.",
      });
    }
  }

  if (!input.activePointer) {
    issues.push({
      code: "ACTIVE_POINTER_MISSING",
      message: "Active pointer is missing after publish pointer switch.",
    });
  } else {
    const pointerMatches =
      input.activePointer.siteVersionId === input.siteVersionId && input.activePointer.artifactId === input.artifactId;
    if (!pointerMatches) {
      issues.push({
        code: "ACTIVE_POINTER_MISMATCH",
        message: "Active pointer does not reference the published siteVersion/artifact pair.",
      });
    }
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

export function assertPublishSafety(input: {
  siteId: string;
  siteVersionId: string;
  artifactId: string;
  rendererCompatibilityVersion: string;
  artifact: RuntimeArtifact | null;
  activePointer: { siteVersionId: string; artifactId: string } | null;
}): void {
  const result = evaluatePublishSafety(input);
  if (result.ok) return;
  const issueSummary = result.issues.map((issue) => `${issue.code}:${issue.message}`).join("; ");
  throw new Error(`publish-safety-check failed: ${issueSummary}`);
}
