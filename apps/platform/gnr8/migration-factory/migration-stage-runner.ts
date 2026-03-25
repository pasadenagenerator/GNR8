import fs from "node:fs/promises";
import path from "node:path";

import { deterministicId } from "@/gnr8/runtime/deterministic";
import { buildLayoutGraphFromSnapshotHtml } from "@/gnr8/migration/layout-graph/layout-graph-builder";
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
      const endedAt = context.now();
      return createSucceededResult(stage, startedAt, endedAt, {
        canonicalRef: buildDeterministicRef(job.jobId, stage, "canonical"),
      });
    },
    QUALITY_GATE: async (job, stage, context) => {
      const startedAt = context.now();
      const endedAt = context.now();
      return createSucceededResult(stage, startedAt, endedAt, {
        gateState: "SHADOW_READY",
        qualityGateRef: buildDeterministicRef(job.jobId, stage, "quality_gate"),
      });
    },
    ARTIFACT_BUILD: async (job, stage, context) => {
      const startedAt = context.now();
      const endedAt = context.now();
      return createSucceededResult(stage, startedAt, endedAt, {
        artifactRef: buildDeterministicRef(job.jobId, stage, "artifact"),
      });
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
