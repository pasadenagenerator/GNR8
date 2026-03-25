import fs from "node:fs/promises";
import path from "node:path";

import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import { buildDeterministicArtifactBundle } from "@/gnr8/runtime/artifact-builder";
import { deterministicId } from "@/gnr8/runtime/deterministic";
import { evaluatePageRolloutEnforcementByStage } from "@/gnr8/migration/enforcement/page-enforcement";
import { evaluateSiteRolloutEnforcementByStage } from "@/gnr8/migration/enforcement/site-enforcement";
import { buildLayoutGraphFromSnapshotHtml } from "@/gnr8/migration/layout-graph/layout-graph-builder";
import { computePageStructuralConfidence } from "@/gnr8/migration/layout-graph/page-confidence";
import { evaluatePageRolloutPolicy } from "@/gnr8/migration/policy/page-rollout-policy";
import { evaluateSiteRolloutPolicy, toSiteRolloutPolicyPageResult } from "@/gnr8/migration/policy/site-rollout-policy";
import { evaluatePageMigrationGate, type PageGateIntent } from "@/gnr8/migration/quality-gates/page-quality-gate";
import { evaluateSiteMigrationGate } from "@/gnr8/migration/quality-gates/site-quality-gate";
import { buildCanonicalMigrationInput } from "@/gnr8/runtime/migration-factory";
import { evaluatePublishEnforcement } from "@/gnr8/runtime/publish-enforcement";
import { runRenderIntegrityGate } from "@/gnr8/runtime/render-integrity-gate";
import { RENDERER_COMPATIBILITY_VERSION, type CanonicalSiteMigrationInput, type CanonicalSiteVersionSnapshot, type PageMigrationGovernanceSnapshot } from "@/gnr8/runtime/types";
import type { Gnr8Page } from "@/gnr8/types/page";
import { importPublicSinglePageUrlToSnapshot, type UrlSinglePageImportSnapshot } from "@/gnr8/validation/runtime/url-single-page-import";

import { MIGRATION_STAGES, type MigrationJob, type MigrationStage, type MigrationStageResult } from "@/gnr8/migration-factory/migration-job-types";

export type MigrationStageExecutorContext = {
  now: () => string;
};

export type MigrationStageExecutor = (
  job: MigrationJob,
  stage: MigrationStage,
  context: MigrationStageExecutorContext,
) => Promise<MigrationStageResult> | MigrationStageResult;

export interface MigrationStageRunner {
  runStage(job: MigrationJob, stage: MigrationStage, context: MigrationStageExecutorContext): Promise<MigrationStageResult>;
}

type SnapshotImportOptions = Omit<Parameters<typeof importPublicSinglePageUrlToSnapshot>[0], "sourceUrl">;
type SnapshotImporter = (input: Parameters<typeof importPublicSinglePageUrlToSnapshot>[0]) => Promise<UrlSinglePageImportSnapshot>;

const VALID_SOURCE_PROTOCOLS = new Set(["http:", "https:"]);

function buildDeterministicRef(jobId: string, stage: MigrationStage, key: string): string {
  return deterministicId(key, `${jobId}:${stage}`);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round3(value: number): number {
  return Number(clamp01(value).toFixed(3));
}

function summarizeIntentsFromPage(page: Gnr8Page): Record<string, number> {
  const summary = new Map<string, number>();
  for (const section of page.sections) {
    const raw = section.props?.layoutStructural;
    if (!raw || typeof raw !== "object") continue;
    const intent = (raw as { intent?: unknown }).intent;
    if (typeof intent !== "string" || intent.trim().length === 0) continue;
    summary.set(intent, (summary.get(intent) ?? 0) + 1);
  }

  return Object.fromEntries([...summary.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function toPageGateIntent(value: unknown): PageGateIntent | null {
  if (
    value === "header_nav" ||
    value === "hero" ||
    value === "body" ||
    value === "gallery_media" ||
    value === "form_contact" ||
    value === "footer_legal" ||
    value === "unknown"
  ) {
    return value;
  }
  return null;
}

function deriveSectionIntentSignals(page: Gnr8Page): {
  sectionIntents: string[];
  sectionIntentConfidence: Partial<Record<PageGateIntent, number>>;
} {
  const sectionIntents: string[] = [];
  const confidenceBuckets = new Map<PageGateIntent, number[]>();

  for (const section of page.sections) {
    const raw = section.props?.layoutStructural;
    if (!raw || typeof raw !== "object") continue;
    const node = raw as Record<string, unknown>;
    const intent = toPageGateIntent(node.intent);
    if (!intent) continue;
    sectionIntents.push(intent);

    const confidence = typeof node.structuralConfidence === "number" ? clamp01(node.structuralConfidence) : null;
    if (confidence === null) continue;
    const list = confidenceBuckets.get(intent) ?? [];
    list.push(confidence);
    confidenceBuckets.set(intent, list);
  }

  const sectionIntentConfidence: Partial<Record<PageGateIntent, number>> = {};
  for (const [intent, values] of confidenceBuckets.entries()) {
    const avg = values.reduce((acc, value) => acc + value, 0) / values.length;
    sectionIntentConfidence[intent] = round3(avg);
  }

  return { sectionIntents, sectionIntentConfidence };
}

function resolvePrimaryPathFromSourceUrl(sourceUrl: string): string {
  try {
    const parsed = new URL(sourceUrl);
    const pathname = parsed.pathname.trim();
    return pathname.length > 0 ? pathname : "/";
  } catch {
    return "/";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resolvePublishStageCandidate(input: {
  siteEnforcement: {
    SHADOW: { decision: string };
    CANARY: { decision: string };
    PRODUCTION: { decision: string };
  };
}): "shadow" | "canary" | "production" | "none" {
  if (input.siteEnforcement.PRODUCTION.decision === "ALLOW") return "production";
  if (input.siteEnforcement.CANARY.decision === "ALLOW") return "canary";
  if (input.siteEnforcement.SHADOW.decision === "ALLOW" || input.siteEnforcement.SHADOW.decision === "REVIEW_ONLY") return "shadow";
  return "none";
}

function createSucceededResult(
  stage: MigrationStage,
  startedAt: string,
  endedAt: string,
  outputRefs: Record<string, string>,
  diagnostics?: MigrationStageResult["diagnostics"],
): MigrationStageResult {
  return {
    stage,
    status: "SUCCEEDED",
    startedAt,
    endedAt,
    diagnostics: diagnostics ?? [{ code: "STAGE_EXECUTED", message: `${stage} completed`, level: "INFO" }],
    outputRefs,
  };
}

export function createFailedStageResult(input: {
  stage: MigrationStage;
  startedAt: string;
  endedAt: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}): MigrationStageResult {
  return {
    stage: input.stage,
    status: "FAILED",
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    diagnostics: [{ code: input.code, message: input.message, level: "ERROR", details: input.details }],
    outputRefs: {},
    error: {
      code: input.code,
      message: input.message,
      details: input.details,
    },
  };
}

function countLayoutNodes(root: { children: unknown[] }): number {
  const stack: unknown[] = [root];
  let count = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    count += 1;
    const children = (current as { children?: unknown[] }).children;
    if (Array.isArray(children)) {
      for (let i = children.length - 1; i >= 0; i -= 1) stack.push(children[i]);
    }
  }
  return count;
}

function countLayoutRegions(root: { type: string; children: unknown[] }): number {
  const meaningful = new Set(["header", "nav", "hero", "section", "gallery", "form", "footer", "legal"]);
  const stack: unknown[] = [root];
  let count = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    const node = current as { type?: string; children?: unknown[] };
    if (typeof node.type === "string" && meaningful.has(node.type)) count += 1;
    const children = node.children;
    if (Array.isArray(children)) {
      for (let i = children.length - 1; i >= 0; i -= 1) stack.push(children[i]);
    }
  }
  return count;
}

type CanonicalStageArtifact = {
  canonicalInput?: CanonicalSiteMigrationInput;
  canonical?: {
    canonicalPageId?: string;
    primaryPath?: string;
  };
};

type QualityGateGovernanceSummary = {
  page?: {
    canonicalPageId?: string;
    sourcePath?: string;
    pageStructuralConfidence?: number;
    weakSectionIds?: string[];
    structuralAnomalies?: string[];
    pageMigrationGate?: PageMigrationGovernanceSnapshot["pageMigrationGate"];
    pageRolloutPolicy?: PageMigrationGovernanceSnapshot["pageRolloutPolicy"];
    pageEnforcement?: PageMigrationGovernanceSnapshot["pageEnforcement"];
  };
  site?: {
    siteEnforcement?: {
      SHADOW?: { decision?: string };
      CANARY?: { decision?: string };
      PRODUCTION?: { decision?: string };
    };
  };
};

function createDefaultStageExecutors(input?: {
  snapshotImporter?: SnapshotImporter;
  snapshotImportOptions?: SnapshotImportOptions;
}): Record<MigrationStage, MigrationStageExecutor> {
  const snapshotImporter = input?.snapshotImporter ?? importPublicSinglePageUrlToSnapshot;
  const snapshotImportOptions = input?.snapshotImportOptions ?? {};
  return {
    INTAKE: async (job, stage, context) => {
      const startedAt = context.now();
      const endedAt = context.now();
      try {
        const parsed = new URL(job.sourceUrl);
        if (!VALID_SOURCE_PROTOCOLS.has(parsed.protocol)) {
          return createFailedStageResult({
            stage,
            startedAt,
            endedAt,
            code: "INTAKE_INVALID_SOURCE_URL_PROTOCOL",
            message: "sourceUrl must use http or https protocol",
            details: { sourceUrl: job.sourceUrl, protocol: parsed.protocol },
          });
        }
      } catch {
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "INTAKE_INVALID_SOURCE_URL",
          message: "sourceUrl is not a valid absolute URL",
          details: { sourceUrl: job.sourceUrl },
        });
      }

      return createSucceededResult(stage, startedAt, endedAt, {
        intakeRef: buildDeterministicRef(job.jobId, stage, "intake"),
      });
    },
    SNAPSHOT: async (job, stage, context) => {
      const startedAt = context.now();
      let parsed: URL;
      try {
        parsed = new URL(job.sourceUrl);
      } catch {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "SNAPSHOT_INVALID_SOURCE_URL",
          message: "sourceUrl is not a valid absolute URL",
          details: { sourceUrl: job.sourceUrl },
        });
      }

      if (!VALID_SOURCE_PROTOCOLS.has(parsed.protocol)) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "SNAPSHOT_INVALID_SOURCE_URL_PROTOCOL",
          message: "sourceUrl must use http or https protocol",
          details: { sourceUrl: job.sourceUrl, protocol: parsed.protocol },
        });
      }

      let snapshot: UrlSinglePageImportSnapshot;
      try {
        snapshot = await snapshotImporter({
          ...snapshotImportOptions,
          sourceUrl: job.sourceUrl,
          requestId: snapshotImportOptions.requestId ?? `migration-factory:${job.jobId}:snapshot`,
        });
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "SNAPSHOT_ACQUISITION_FAILED",
          message: "snapshot acquisition threw an error",
          details: { sourceUrl: job.sourceUrl, error: String((error as Error)?.message ?? error) },
        });
      }

      const fatalCount = snapshot.importDiagnostics.summary.fatalCount;
      if (fatalCount > 0 || !snapshot.entryHtmlPathAbs || !snapshot.snapshotRootDirAbs) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "SNAPSHOT_ACQUISITION_FAILED",
          message: "snapshot acquisition returned fatal diagnostics",
          details: {
            sourceUrl: job.sourceUrl,
            fatalCount,
            snapshotId: snapshot.snapshotId,
            fatalCodes: snapshot.importDiagnostics.issues.filter((issue) => issue.severity === "fatal").map((issue) => issue.code),
          },
        });
      }

      const fetchedUrlCount = 1 + new Set(snapshot.fetchManifest.map((entry) => entry.resolvedUrl).filter((url): url is string => typeof url === "string")).size;
      const endedAt = context.now();
      return createSucceededResult(
        stage,
        startedAt,
        endedAt,
        {
          snapshotId: snapshot.snapshotId,
          snapshotRef: buildDeterministicRef(job.jobId, stage, `snapshot:${snapshot.snapshotId}`),
          snapshotRootDirAbs: snapshot.snapshotRootDirAbs,
          primaryDocumentRef: snapshot.entryHtmlPathAbs,
          snapshotUrlCount: String(fetchedUrlCount),
          pageCount: "1",
        },
        [
          {
            code: "SNAPSHOT_CAPTURED",
            message: "snapshot stage captured primary page",
            level: "INFO",
            details: {
              fetchedUrlCount,
              primaryUrl: snapshot.normalizedUrl || job.sourceUrl,
              captureMode: snapshot.kind,
              snapshotId: snapshot.snapshotId,
            },
          },
        ],
      );
    },
    LAYOUT_GRAPH: async (job, stage, context) => {
      const startedAt = context.now();
      const snapshotOutputs = job.stageStates.SNAPSHOT.outputRefs;
      const primaryDocumentRef = snapshotOutputs.primaryDocumentRef ?? snapshotOutputs.entryHtmlPathAbs;
      if (!primaryDocumentRef) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "LAYOUT_GRAPH_SNAPSHOT_REF_MISSING",
          message: "SNAPSHOT output is missing primaryDocumentRef",
        });
      }

      let html = "";
      try {
        html = await fs.readFile(primaryDocumentRef, "utf8");
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "LAYOUT_GRAPH_SNAPSHOT_READ_FAILED",
          message: "failed to read primary snapshot document",
          details: {
            primaryDocumentRef,
            error: String((error as Error)?.message ?? error),
          },
        });
      }

      let graph;
      try {
        graph = buildLayoutGraphFromSnapshotHtml({
          html,
          pathSeed: primaryDocumentRef,
        });
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "LAYOUT_GRAPH_BUILD_FAILED",
          message: "layout graph builder failed",
          details: {
            primaryDocumentRef,
            error: String((error as Error)?.message ?? error),
          },
        });
      }

      const layoutGraphId = buildDeterministicRef(job.jobId, stage, `layout_graph:${primaryDocumentRef}`);
      const snapshotRootDirAbs = snapshotOutputs.snapshotRootDirAbs;
      const layoutGraphRef = snapshotRootDirAbs
        ? path.resolve(snapshotRootDirAbs, "layout-graph.json")
        : path.resolve(path.dirname(primaryDocumentRef), "layout-graph.json");
      const serialized = JSON.stringify(
        {
          kind: "migration_factory_layout_graph_v1",
          layoutGraphId,
          source: {
            snapshotId: snapshotOutputs.snapshotId ?? null,
            primaryDocumentRef,
          },
          graph: {
            root: graph.root,
            anomalies: graph.anomalies,
            nodeCount: graph.nodeIndex.size,
          },
        },
        null,
        2,
      );

      try {
        await fs.mkdir(path.dirname(layoutGraphRef), { recursive: true });
        await fs.writeFile(layoutGraphRef, `${serialized}\n`, "utf8");
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "LAYOUT_GRAPH_PERSIST_FAILED",
          message: "failed to persist layout graph artifact",
          details: { layoutGraphRef, error: String((error as Error)?.message ?? error) },
        });
      }

      const nodeCount = countLayoutNodes(graph.root);
      const regionCount = countLayoutRegions(graph.root);
      const anomalyCount = graph.anomalies.length;
      const endedAt = context.now();
      return createSucceededResult(
        stage,
        startedAt,
        endedAt,
        {
          layoutGraphId,
          layoutGraphRef,
          rootNodeId: graph.root.id,
          regionCount: String(regionCount),
          anomalyCount: String(anomalyCount),
          nodeCount: String(nodeCount),
        },
        [
          {
            code: "LAYOUT_GRAPH_BUILT",
            message: "layout graph built from snapshot HTML",
            level: "INFO",
            details: {
              rootNodeId: graph.root.id,
              regionCount,
              anomalyCount,
              nodeCount,
            },
          },
        ],
      );
    },
    CANONICAL: async (job, stage, context) => {
      const startedAt = context.now();
      const snapshotOutputs = job.stageStates.SNAPSHOT.outputRefs;
      const layoutOutputs = job.stageStates.LAYOUT_GRAPH.outputRefs;
      const primaryDocumentRef = snapshotOutputs.primaryDocumentRef ?? snapshotOutputs.entryHtmlPathAbs;
      const layoutGraphRef = layoutOutputs.layoutGraphRef;

      if (!primaryDocumentRef) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "CANONICAL_SNAPSHOT_REF_MISSING",
          message: "SNAPSHOT output is missing primaryDocumentRef",
        });
      }

      if (!layoutGraphRef) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "CANONICAL_LAYOUT_GRAPH_REF_MISSING",
          message: "LAYOUT_GRAPH output is missing layoutGraphRef",
        });
      }

      let html = "";
      try {
        html = await fs.readFile(primaryDocumentRef, "utf8");
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "CANONICAL_PRIMARY_DOCUMENT_READ_FAILED",
          message: "failed to read primary snapshot document",
          details: {
            primaryDocumentRef,
            error: String((error as Error)?.message ?? error),
          },
        });
      }

      let layoutGraphArtifact: Record<string, unknown>;
      try {
        const raw = await fs.readFile(layoutGraphRef, "utf8");
        layoutGraphArtifact = JSON.parse(raw) as Record<string, unknown>;
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "CANONICAL_LAYOUT_GRAPH_READ_FAILED",
          message: "failed to read persisted layout graph artifact",
          details: {
            layoutGraphRef,
            error: String((error as Error)?.message ?? error),
          },
        });
      }

      let page: Gnr8Page;
      try {
        page = importHtmlToPage({
          slug: resolvePrimaryPathFromSourceUrl(job.sourceUrl),
          html,
        });
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "CANONICAL_BUILD_FAILED",
          message: "failed to build canonical page from snapshot html",
          details: {
            primaryDocumentRef,
            error: String((error as Error)?.message ?? error),
          },
        });
      }

      let canonicalInput;
      try {
        canonicalInput = buildCanonicalMigrationInput({
          sourceUrl: job.sourceUrl,
          page,
          actor: "migration-factory",
        });
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "CANONICAL_INTEGRITY_FAILED",
          message: "canonical migration input integrity check failed",
          details: {
            error: String((error as Error)?.message ?? error),
          },
        });
      }

      const pageStructuralConfidence = round3(page.migrationDiagnostics?.pageStructuralConfidence ?? 0);
      const weakSectionCount = page.migrationDiagnostics?.weakSectionIds.length ?? 0;
      const anomalyCount = page.migrationDiagnostics?.structuralAnomalies.length ?? 0;
      const sectionCount = page.sections.length;
      const canonicalIntentSummary = summarizeIntentsFromPage(page);
      const canonicalRef = buildDeterministicRef(job.jobId, stage, `canonical:${primaryDocumentRef}`);
      const canonicalPageId = canonicalInput.pages[0]?.pageId ?? buildDeterministicRef(job.jobId, stage, "page");
      const migrationDiagnosticsRef = buildDeterministicRef(job.jobId, stage, `diagnostics:${canonicalPageId}`);
      const snapshotRootDirAbs = snapshotOutputs.snapshotRootDirAbs;
      const canonicalPageRef = snapshotRootDirAbs
        ? path.resolve(snapshotRootDirAbs, "canonical-page.json")
        : path.resolve(path.dirname(primaryDocumentRef), "canonical-page.json");
      const canonicalArtifact = {
        kind: "migration_factory_canonical_v1",
        canonicalRef,
        source: {
          sourceUrl: job.sourceUrl,
          primaryDocumentRef,
          snapshotId: snapshotOutputs.snapshotId ?? null,
          layoutGraphRef,
          layoutGraphId: layoutOutputs.layoutGraphId ?? null,
          layoutGraphRootNodeId: layoutOutputs.rootNodeId ?? null,
          layoutGraphNodeCount: Number(layoutOutputs.nodeCount ?? 0),
          layoutGraphAnomalyCount: Number(layoutOutputs.anomalyCount ?? 0),
          layoutGraphArtifactId: typeof layoutGraphArtifact.layoutGraphId === "string" ? layoutGraphArtifact.layoutGraphId : null,
        },
        canonical: {
          canonicalPageId,
          primaryPath: canonicalInput.pages[0]?.path ?? resolvePrimaryPathFromSourceUrl(job.sourceUrl),
          sectionCount,
          pageStructuralConfidence,
          weakSectionCount,
          anomalyCount,
          canonicalIntentSummary,
          migrationDiagnosticsRef,
        },
        page,
        canonicalInput,
      };

      try {
        await fs.mkdir(path.dirname(canonicalPageRef), { recursive: true });
        await fs.writeFile(canonicalPageRef, `${JSON.stringify(canonicalArtifact, null, 2)}\n`, "utf8");
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "CANONICAL_PERSIST_FAILED",
          message: "failed to persist canonical output artifact",
          details: {
            canonicalPageRef,
            error: String((error as Error)?.message ?? error),
          },
        });
      }

      const endedAt = context.now();
      return createSucceededResult(
        stage,
        startedAt,
        endedAt,
        {
          canonicalRef,
          canonicalPageRef,
          canonicalPageId,
          primaryPath: canonicalInput.pages[0]?.path ?? resolvePrimaryPathFromSourceUrl(job.sourceUrl),
          sectionCount: String(sectionCount),
          pageStructuralConfidence: pageStructuralConfidence.toFixed(3),
          weakSectionCount: String(weakSectionCount),
          anomalyCount: String(anomalyCount),
          migrationDiagnosticsRef,
        },
        [
          {
            code: "CANONICAL_BUILT",
            message: "canonical page/model output created from snapshot and layout graph",
            level: "INFO",
            details: {
              canonicalPageId,
              sectionCount,
              pageStructuralConfidence,
              weakSectionCount,
              anomalyCount,
              canonicalIntentSummary,
            },
          },
        ],
      );
    },
    QUALITY_GATE: async (job, stage, context) => {
      const startedAt = context.now();
      const canonicalOutputs = job.stageStates.CANONICAL.outputRefs;
      const canonicalPageRef = canonicalOutputs.canonicalPageRef;
      if (!canonicalPageRef) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "QUALITY_GATE_CANONICAL_REF_MISSING",
          message: "CANONICAL output is missing canonicalPageRef",
        });
      }

      let canonicalArtifact: {
        page?: Gnr8Page;
        canonical?: {
          canonicalPageId?: string;
          primaryPath?: string;
        };
      };
      try {
        const raw = await fs.readFile(canonicalPageRef, "utf8");
        canonicalArtifact = JSON.parse(raw) as {
          page?: Gnr8Page;
          canonical?: { canonicalPageId?: string; primaryPath?: string };
        };
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "QUALITY_GATE_CANONICAL_READ_FAILED",
          message: "failed to read canonical stage artifact",
          details: {
            canonicalPageRef,
            error: String((error as Error)?.message ?? error),
          },
        });
      }

      const page = canonicalArtifact.page;
      if (!page || typeof page !== "object" || !Array.isArray(page.sections)) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "QUALITY_GATE_CANONICAL_PAYLOAD_INVALID",
          message: "canonical artifact is missing page data",
          details: { canonicalPageRef },
        });
      }

      const computedStructural = computePageStructuralConfidence(page.sections);
      const pageStructuralConfidence = round3(page.migrationDiagnostics?.pageStructuralConfidence ?? computedStructural.score);
      const weakSectionIds = page.migrationDiagnostics?.weakSectionIds ?? computedStructural.weakestSections;
      const structuralAnomalies = page.migrationDiagnostics?.structuralAnomalies ?? computedStructural.anomalySummary;
      const intentSignals = deriveSectionIntentSignals(page);
      const pageMigrationGate = evaluatePageMigrationGate({
        pageStructuralConfidence,
        weakSectionIds,
        structuralAnomalies,
        sectionIntents: intentSignals.sectionIntents,
        sectionIntentConfidence: intentSignals.sectionIntentConfidence,
      });
      const pageRolloutPolicy = evaluatePageRolloutPolicy(pageMigrationGate);
      const pageEnforcement = evaluatePageRolloutEnforcementByStage({
        pageMigrationGate,
        pageRolloutPolicy,
        pageStructuralConfidence,
        weakSectionIds,
        structuralAnomalies,
      });

      const canonicalPageId = canonicalArtifact.canonical?.canonicalPageId ?? canonicalOutputs.canonicalPageId ?? deterministicId("page", job.jobId);
      const sourcePath = canonicalArtifact.canonical?.primaryPath ?? canonicalOutputs.primaryPath ?? resolvePrimaryPathFromSourceUrl(job.sourceUrl);
      const siteMigrationGate = evaluateSiteMigrationGate({
        pageResults: [
          {
            pageId: canonicalPageId,
            sourcePath,
            isRoot: true,
            gate: pageMigrationGate,
          },
        ],
      });
      const siteRolloutPolicy = evaluateSiteRolloutPolicy({
        siteGateResult: siteMigrationGate,
        pagePolicyResults: [
          toSiteRolloutPolicyPageResult({
            pageId: canonicalPageId,
            sourcePath,
            isRoot: true,
            score: pageMigrationGate.score,
            pageGateResult: pageMigrationGate,
          }),
        ],
      });
      const siteEnforcement = evaluateSiteRolloutEnforcementByStage({
        siteMigrationGate,
        siteRolloutPolicy,
      });

      const governanceSummaryRef = path.resolve(path.dirname(canonicalPageRef), "governance-summary.json");
      const qualityGateRef = buildDeterministicRef(job.jobId, stage, `quality_gate:${canonicalPageId}`);
      const governanceSummary = {
        kind: "migration_factory_quality_gate_v1",
        qualityGateRef,
        canonicalPageRef,
        page: {
          canonicalPageId,
          sourcePath,
          pageStructuralConfidence,
          pageMigrationGate,
          pageRolloutPolicy,
          pageEnforcement,
          weakSectionIds,
          structuralAnomalies,
        },
        site: {
          siteMigrationGate,
          siteRolloutPolicy,
          siteEnforcement,
        },
      };

      try {
        await fs.mkdir(path.dirname(governanceSummaryRef), { recursive: true });
        await fs.writeFile(governanceSummaryRef, `${JSON.stringify(governanceSummary, null, 2)}\n`, "utf8");
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "QUALITY_GATE_PERSIST_FAILED",
          message: "failed to persist quality gate governance summary",
          details: {
            governanceSummaryRef,
            error: String((error as Error)?.message ?? error),
          },
        });
      }

      const shadowDecision = pageEnforcement.SHADOW.decision;
      const shadowEligibility = shadowDecision === "ALLOW" ? "ALLOWED" : "REVIEW_OR_DENY";
      const endedAt = context.now();
      return createSucceededResult(
        stage,
        startedAt,
        endedAt,
        {
          qualityGateRef,
          governanceSummaryRef,
          pageMigrationGateState: pageMigrationGate.state,
          siteMigrationGateState: siteMigrationGate.state,
          pageRolloutPolicyState: pageRolloutPolicy.state,
          siteRolloutPolicyState: siteRolloutPolicy.state,
          pageEnforcementShadowDecision: shadowDecision,
          siteEnforcementShadowDecision: siteEnforcement.SHADOW.decision,
        },
        [
          {
            code: "QUALITY_GATE_EVALUATED",
            message: "page/site migration gate, policy, and enforcement computed",
            level: "INFO",
            details: {
              pageStructuralConfidence,
              weakSectionCount: weakSectionIds.length,
              anomalyCount: structuralAnomalies.length,
              pageMigrationGateState: pageMigrationGate.state,
              siteMigrationGateState: siteMigrationGate.state,
              recommendedNextStep: siteRolloutPolicy.recommendedNextStep,
              shadowEligibility,
            },
          },
        ],
      );
    },
    ARTIFACT_BUILD: async (job, stage, context) => {
      const startedAt = context.now();
      const canonicalOutputs = job.stageStates.CANONICAL.outputRefs;
      const qualityGateOutputs = job.stageStates.QUALITY_GATE.outputRefs;
      const canonicalPageRef = canonicalOutputs.canonicalPageRef;
      const governanceSummaryRef = qualityGateOutputs.governanceSummaryRef;

      if (!canonicalPageRef) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "ARTIFACT_BUILD_CANONICAL_REF_MISSING",
          message: "CANONICAL output is missing canonicalPageRef",
        });
      }

      if (!governanceSummaryRef) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "ARTIFACT_BUILD_GOVERNANCE_REF_MISSING",
          message: "QUALITY_GATE output is missing governanceSummaryRef",
        });
      }

      let canonicalArtifact: CanonicalStageArtifact;
      try {
        const raw = await fs.readFile(canonicalPageRef, "utf8");
        canonicalArtifact = JSON.parse(raw) as CanonicalStageArtifact;
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "ARTIFACT_BUILD_CANONICAL_READ_FAILED",
          message: "failed to read canonical stage artifact",
          details: {
            canonicalPageRef,
            error: String((error as Error)?.message ?? error),
          },
        });
      }

      let governanceSummary: QualityGateGovernanceSummary;
      try {
        const raw = await fs.readFile(governanceSummaryRef, "utf8");
        governanceSummary = JSON.parse(raw) as QualityGateGovernanceSummary;
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "ARTIFACT_BUILD_GOVERNANCE_READ_FAILED",
          message: "failed to read quality gate governance summary artifact",
          details: {
            governanceSummaryRef,
            error: String((error as Error)?.message ?? error),
          },
        });
      }

      const canonicalInput = canonicalArtifact.canonicalInput;
      if (!canonicalInput || !Array.isArray(canonicalInput.pages) || canonicalInput.pages.length === 0) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "ARTIFACT_BUILD_CANONICAL_PAYLOAD_INVALID",
          message: "canonical artifact is missing canonicalInput.pages payload",
          details: { canonicalPageRef },
        });
      }

      const governancePage = governanceSummary.page;
      const governanceSite = governanceSummary.site;
      const canonicalPageId = governancePage?.canonicalPageId ?? canonicalArtifact.canonical?.canonicalPageId ?? canonicalOutputs.canonicalPageId ?? null;
      const governancePayload: PageMigrationGovernanceSnapshot | null =
        governancePage &&
        typeof governancePage.pageStructuralConfidence === "number" &&
        Array.isArray(governancePage.weakSectionIds) &&
        Array.isArray(governancePage.structuralAnomalies) &&
        isRecord(governancePage.pageMigrationGate) &&
        isRecord(governancePage.pageRolloutPolicy) &&
        isRecord(governancePage.pageEnforcement)
          ? {
              pageStructuralConfidence: governancePage.pageStructuralConfidence,
              weakSectionIds: governancePage.weakSectionIds,
              structuralAnomalies: governancePage.structuralAnomalies,
              pageMigrationGate: governancePage.pageMigrationGate,
              pageRolloutPolicy: governancePage.pageRolloutPolicy,
              pageEnforcement: governancePage.pageEnforcement,
            }
          : null;

      if (!canonicalPageId || !governancePayload) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "ARTIFACT_BUILD_GOVERNANCE_PAYLOAD_INVALID",
          message: "quality gate governance summary is missing required page governance fields",
          details: {
            governanceSummaryRef,
            canonicalPageIdPresent: Boolean(canonicalPageId),
            governancePayloadPresent: Boolean(governancePayload),
          },
        });
      }

      const pageIndex = canonicalInput.pages.findIndex((page) => page.pageId === canonicalPageId);
      if (pageIndex < 0) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "ARTIFACT_BUILD_CANONICAL_PAGE_NOT_FOUND",
          message: "canonical pageId from governance summary was not found in canonical pages payload",
          details: {
            canonicalPageId,
            pageCount: canonicalInput.pages.length,
          },
        });
      }

      const canonicalPages = canonicalInput.pages.map((page, index) =>
        index === pageIndex
          ? {
              ...page,
              migrationGovernance: governancePayload,
            }
          : page,
      );
      const pageSnapshot = canonicalPages[pageIndex]!;
      const publishStageCandidate = resolvePublishStageCandidate({
        siteEnforcement: {
          SHADOW: { decision: governanceSite?.siteEnforcement?.SHADOW?.decision ?? "DENY" },
          CANARY: { decision: governanceSite?.siteEnforcement?.CANARY?.decision ?? "DENY" },
          PRODUCTION: { decision: governanceSite?.siteEnforcement?.PRODUCTION?.decision ?? "DENY" },
        },
      });

      const versionSeed = `${job.jobId}:${canonicalPageId}:${canonicalPageRef}:${governanceSummaryRef}`;
      const siteVersion: CanonicalSiteVersionSnapshot = {
        id: deterministicId("site_version", versionSeed),
        siteId: canonicalInput.siteId,
        versionNo: 1,
        state: "DRAFT",
        source: "migration",
        actor: canonicalInput.actor,
        createdAt: "deterministic",
        rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
        artifactId: null,
        pages: [
          {
            id: deterministicId("page_version", versionSeed),
            siteVersionId: deterministicId("site_version", versionSeed),
            pageId: pageSnapshot.pageId,
            path: pageSnapshot.path,
            title: pageSnapshot.title,
            structureModel: pageSnapshot.structureModel,
            contentModel: pageSnapshot.contentModel,
            styleTokens: pageSnapshot.styleTokens,
            assetGraph: pageSnapshot.assetGraph,
            semanticSignals: pageSnapshot.semanticSignals,
            migrationGovernance: pageSnapshot.migrationGovernance,
            source: pageSnapshot.source,
            actor: pageSnapshot.actor,
            createdAt: "deterministic",
          },
        ],
      };

      let artifactBundle;
      let enforcement;
      try {
        enforcement = evaluatePublishEnforcement({
          siteVersion,
          stage: publishStageCandidate === "none" ? "shadow" : publishStageCandidate,
        });
        artifactBundle = buildDeterministicArtifactBundle({
          siteVersion,
          renderMode: "PUBLISH",
        });
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "ARTIFACT_BUILD_EXCEPTION",
          message: "artifact build path threw an error",
          details: {
            error: String((error as Error)?.message ?? error),
          },
        });
      }

      const integrity = runRenderIntegrityGate({
        siteVersion,
        htmlByPath: artifactBundle.htmlByPath,
        assetFingerprintMap: artifactBundle.assetFingerprintMap,
      });
      if (!integrity.ok) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "ARTIFACT_BUILD_INTEGRITY_FAILED",
          message: "artifact render integrity validation failed",
          details: {
            issueCount: integrity.issues.length,
            issues: integrity.issues,
          },
        });
      }

      const pathCount = Object.keys(artifactBundle.htmlByPath).length;
      const rootPathCovered = Object.prototype.hasOwnProperty.call(artifactBundle.htmlByPath, "/");
      if (!artifactBundle.bundleSha256 || pathCount === 0 || (!rootPathCovered && pathCount < 1)) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "ARTIFACT_BUILD_EMPTY_OUTPUT",
          message: "artifact bundle did not produce required output coverage",
          details: {
            hasBundleSha: Boolean(artifactBundle.bundleSha256),
            pathCount,
            rootPathCovered,
          },
        });
      }

      const builderMarkersPresent = Object.values(artifactBundle.htmlByPath).some((html) => /chaibuilder/i.test(html));
      const artifactId = deterministicId("artifact", artifactBundle.bundleSha256);
      const artifactManifestRef = path.resolve(path.dirname(canonicalPageRef), "runtime-artifact-manifest.json");
      const artifactRef = path.resolve(path.dirname(canonicalPageRef), "runtime-artifact.json");
      const artifactBuildRef = path.resolve(path.dirname(canonicalPageRef), "artifact-build-summary.json");
      const resolvedPublishStageCandidate = publishStageCandidate === "none" ? "shadow" : publishStageCandidate;
      const artifactPayload = {
        kind: "migration_factory_runtime_artifact_v1",
        artifactId,
        artifactRef,
        artifactBuildRef,
        siteVersionId: artifactBundle.siteVersionId,
        pageId: pageSnapshot.pageId,
        pageCount: siteVersion.pages.length,
        primaryPath: pageSnapshot.path,
        pathCount,
        rootPathCovered,
        publishStageCandidate: resolvedPublishStageCandidate,
        artifactGovernancePresent: true,
        buildMode: "runtime-deterministic-publish-bundle",
        bundleSha256: artifactBundle.bundleSha256,
        publishEnforcementDecision: enforcement.adapter.decision,
        shadowRestricted: enforcement.shadowRestricted,
        artifactGovernance: enforcement.artifactGovernance,
        artifact: artifactBundle,
      };
      const artifactBuildSummary = {
        kind: "migration_factory_artifact_build_summary_v1",
        artifactId,
        artifactRef,
        artifactManifestRef,
        primaryPath: pageSnapshot.path,
        pathCount,
        rootPathCovered,
        pageCount: siteVersion.pages.length,
        publishStageCandidate: resolvedPublishStageCandidate,
        artifactGovernancePresent: true,
        builderMarkersPresent,
        buildMode: "runtime-deterministic-publish-bundle",
        bundleSha256: artifactBundle.bundleSha256,
      };

      try {
        await fs.mkdir(path.dirname(artifactRef), { recursive: true });
        await fs.writeFile(artifactManifestRef, `${JSON.stringify(artifactBundle.manifest, null, 2)}\n`, "utf8");
        await fs.writeFile(artifactRef, `${JSON.stringify(artifactPayload, null, 2)}\n`, "utf8");
        await fs.writeFile(artifactBuildRef, `${JSON.stringify(artifactBuildSummary, null, 2)}\n`, "utf8");
      } catch (error) {
        const endedAt = context.now();
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "ARTIFACT_BUILD_PERSIST_FAILED",
          message: "failed to persist artifact build outputs",
          details: {
            artifactRef,
            artifactManifestRef,
            artifactBuildRef,
            error: String((error as Error)?.message ?? error),
          },
        });
      }

      const endedAt = context.now();
      return createSucceededResult(
        stage,
        startedAt,
        endedAt,
        {
          artifactId,
          artifactRef,
          artifactManifestRef,
          artifactBuildRef,
          primaryPath: pageSnapshot.path,
          pathCount: String(pathCount),
          publishStageCandidate: resolvedPublishStageCandidate,
          artifactGovernancePresent: "true",
          bundleSha256: artifactBundle.bundleSha256,
        },
        [
          {
            code: "ARTIFACT_BUILD_REALIZED",
            message: "runtime-compatible artifact bundle built from canonical and governance outputs",
            level: "INFO",
            details: {
              artifactId,
              pathCount,
              rootPathCovered,
              artifactGovernancePresent: true,
              pageCount: siteVersion.pages.length,
              builderMarkersPresent,
              artifactBuildMode: "runtime-deterministic-publish-bundle",
              publishStageCandidate: resolvedPublishStageCandidate,
            },
          },
        ],
      );
    },
    SHADOW_BIND_READY: async (job, stage, context) => {
      const startedAt = context.now();
      const endedAt = context.now();
      return createSucceededResult(stage, startedAt, endedAt, {
        shadowReadyRef: buildDeterministicRef(job.jobId, stage, "shadow_bind"),
      });
    },
  };
}

export class DefaultMigrationStageRunner implements MigrationStageRunner {
  private readonly executors: Record<MigrationStage, MigrationStageExecutor>;

  constructor(options?: {
    executors?: Partial<Record<MigrationStage, MigrationStageExecutor>>;
    snapshotImporter?: SnapshotImporter;
    snapshotImportOptions?: SnapshotImportOptions;
  }) {
    const defaults = createDefaultStageExecutors({
      snapshotImporter: options?.snapshotImporter,
      snapshotImportOptions: options?.snapshotImportOptions,
    });
    this.executors = {
      ...defaults,
      ...(options?.executors ?? {}),
    };
  }

  async runStage(job: MigrationJob, stage: MigrationStage, context: MigrationStageExecutorContext): Promise<MigrationStageResult> {
    const executor = this.executors[stage];
    if (!executor) {
      const startedAt = context.now();
      const endedAt = context.now();
      return createFailedStageResult({
        stage,
        startedAt,
        endedAt,
        code: "STAGE_EXECUTOR_MISSING",
        message: `No executor defined for stage ${stage}`,
      });
    }

    const result = await executor(job, stage, context);
    if (!MIGRATION_STAGES.includes(result.stage)) {
      throw new Error(`Stage executor returned invalid stage result: ${String(result.stage)}`);
    }
    if (result.stage !== stage) {
      throw new Error(`Stage executor mismatch: expected ${stage}, got ${result.stage}`);
    }
    return result;
  }
}
