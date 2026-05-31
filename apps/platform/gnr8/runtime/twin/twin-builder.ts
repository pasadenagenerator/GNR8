import { deterministicId } from "@/gnr8/runtime/deterministic";
import type { TwinSnapshot, TwinViewerPayload, WebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-types";

export type BuildWebsiteDigitalTwinInput = {
  siteId: string;
  siteVersionId: string;
  workspaceId: string;
  environmentScope: string;
  sourceImportId?: string;
  sourceModels?: string[];
  sourceEvidenceSummary?: {
    pageCount: number;
    sectionCount: number;
    assetCount: number;
    detectedTitle: string;
    detectedHomepagePath: string;
    providerStateSummary?: string;
  };
  generatedBy?: string;
  nowIso?: string;
  clock?: () => string;
};

const BUILD_DIAGNOSTICS = [
  "TWIN_BUILD_STARTED",
  "TWIN_IDENTITY_CREATED",
  "TWIN_SNAPSHOT_CREATED",
  "TWIN_BUILD_SUCCEEDED",
] as const;

function normalizeToken(value: string | undefined): string {
  return String(value ?? "").trim();
}

function resolveGeneratedAt(input: BuildWebsiteDigitalTwinInput): string {
  if (typeof input.nowIso === "string" && input.nowIso.trim().length > 0) {
    return input.nowIso;
  }
  if (typeof input.clock === "function") {
    return input.clock();
  }
  return new Date().toISOString();
}

function sanitizeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function normalizeEvidenceText(value: string | undefined): string {
  const normalized = normalizeToken(value);
  return normalized.length > 0 ? normalized : "unknown";
}

function buildSnapshot(sourceModels: string[], input: BuildWebsiteDigitalTwinInput): TwinSnapshot {
  const sourceModelCount = sourceModels.length;
  const evidence = input.sourceEvidenceSummary;
  if (!evidence) {
    return {
      contentState: {
        bucket: "content",
        summary: "deterministic_content_read_model",
        sourceModelCount,
      },
      designState: {
        bucket: "design",
        summary: "deterministic_design_read_model",
        sourceModelCount,
      },
      experienceState: {
        bucket: "experience",
        summary: "deterministic_experience_read_model",
        sourceModelCount,
      },
      governanceState: {
        bucket: "governance",
        summary: "deterministic_governance_read_model",
        sourceModelCount,
      },
      operationalState: {
        bucket: "operational",
        summary: "deterministic_operational_read_model",
        sourceModelCount,
      },
    };
  }

  const pageCount = sanitizeCount(evidence.pageCount);
  const sectionCount = sanitizeCount(evidence.sectionCount);
  const assetCount = sanitizeCount(evidence.assetCount);
  const detectedTitle = normalizeEvidenceText(evidence.detectedTitle);
  const homepagePath = normalizeEvidenceText(evidence.detectedHomepagePath);
  const hasLayoutEvidence = assetCount > 0;
  const hasNavigationEvidence = pageCount > 1 || homepagePath !== "unknown";
  const providerState = normalizeEvidenceText(evidence.providerStateSummary);
  const sourceImportId = normalizeToken(input.sourceImportId) || "unknown";
  const sourceSiteVersionId = normalizeToken(input.siteVersionId) || "unknown";
  const environmentScope = normalizeToken(input.environmentScope) || "unknown";
  const homepageDetected = homepagePath !== "unknown";

  return {
    contentState: {
      bucket: "content",
      summary: `pages=${pageCount}; sections=${sectionCount}; detectedTitle=${detectedTitle}; homepagePath=${homepagePath}`,
      sourceModelCount,
    },
    designState: {
      bucket: "design",
      summary: `assets=${assetCount}; layoutEvidence=${hasLayoutEvidence ? "available" : "unknown"}`,
      sourceModelCount,
    },
    experienceState: {
      bucket: "experience",
      summary: `navigationEvidence=${hasNavigationEvidence ? "available" : "unknown"}; homepageDetected=${homepageDetected}`,
      sourceModelCount,
    },
    governanceState: {
      bucket: "governance",
      summary: `sourceImportId=${sourceImportId}; sourceSiteVersionId=${sourceSiteVersionId}; readOnly=true`,
      sourceModelCount,
    },
    operationalState: {
      bucket: "operational",
      summary: `environmentScope=${environmentScope}; providerState=${providerState}`,
      sourceModelCount,
    },
  };
}

export function buildWebsiteDigitalTwin(input: BuildWebsiteDigitalTwinInput): WebsiteDigitalTwin {
  const siteId = normalizeToken(input.siteId);
  const siteVersionId = normalizeToken(input.siteVersionId);
  const workspaceId = normalizeToken(input.workspaceId);
  const environmentScope = normalizeToken(input.environmentScope);

  if (siteId.length === 0) {
    throw new Error("TWIN_BUILD_INVALID_INPUT: siteId is required");
  }
  if (siteVersionId.length === 0) {
    throw new Error("TWIN_BUILD_INVALID_INPUT: siteVersionId is required");
  }

  const generatedAt = resolveGeneratedAt(input);
  const twinIdSeed = `${siteId}:${siteVersionId}:${environmentScope}`;
  const twinId = deterministicId("twin", twinIdSeed);
  const sourceModels = [...(input.sourceModels ?? [])].map((entry) => String(entry)).sort();
  const diagnostics = [...BUILD_DIAGNOSTICS];
  const snapshot = buildSnapshot(sourceModels, input);

  return {
    identity: {
      twinId,
      siteId,
      siteVersionId,
      workspaceId,
      environmentScope,
      status: "ready",
      createdAt: generatedAt,
      updatedAt: generatedAt,
    },
    status: "ready",
    snapshot,
    metadata: {
      sourceImportId: normalizeToken(input.sourceImportId) || null,
      sourceSiteVersionId: siteVersionId,
      sourceModels,
      generatedAt,
      generatedBy: normalizeToken(input.generatedBy) || "twin_builder_v1",
      diagnostics,
    },
    diagnostics,
  };
}

export function toTwinViewerPayload(twin: WebsiteDigitalTwin): TwinViewerPayload {
  return {
    identity: twin.identity,
    status: twin.status,
    snapshot: twin.snapshot,
    metadata: twin.metadata,
    diagnostics: twin.diagnostics,
  };
}
