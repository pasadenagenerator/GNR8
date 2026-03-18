import fs from "node:fs";
import path from "node:path";

import { GET as getPreviewByOutput } from "../../../app/validation/previews/by-output/[previewKey]/[[...previewPath]]/route";
import type { JsonValue } from "../../import/import-contract";
import { stableStringify } from "../../migration/runtime/diagnostics";
import {
  createBetaMigrationDryRunReport,
  type BetaMigrationDryRunReport,
  type CreateBetaMigrationDryRunReportInput,
  type DryRunParityFinding,
  type DryRunValidationSummary,
} from "../beta-migration-dry-run-report";
import { PROCEED_WITH_MANUAL_POLISH_SCORE_THRESHOLD } from "../beta-migration-scoring";
import { runUrlImportOperatorFlow, type UrlImportOperatorResponse } from "../../../src/validation-shell/url-import-operator";

export const FIRST_REAL_BETA_RUN_DIR = "apps/platform/gnr8/validation/beta-runs/first-real-beta" as const;

export const FIRST_REAL_BETA_ARTIFACT_FILES = {
  simulation: "beta-run-simulation.json",
  materialize: "beta-run-materialize.json",
  previewCheck: "beta-preview-check.json",
  dryRunReport: "beta-dry-run-report.json",
  decision: "beta-migration-decision.json",
  summary: "beta-migration-summary.json",
} as const;

export type BetaDecisionClassification =
  | "HARD_BLOCKER"
  | "DEGRADED_UNACCEPTABLE"
  | "DEGRADED_ACCEPTABLE"
  | "COSMETIC_ONLY";

export type BetaDecision = "STOP_BETA" | "ENGINE_IMPROVEMENT_REQUIRED" | "PROCEED_WITH_MANUAL_POLISH";

export type PreviewFindingCode =
  | "PREVIEW_COMPLETELY_UNUSABLE"
  | "MAJOR_LAYOUT_BREAK"
  | "MISSING_HERO_OR_PRIMARY_CTA"
  | "UNREADABLE_TYPOGRAPHY"
  | "SPACING_ISSUES"
  | "FONT_MISMATCH"
  | "MINOR_ASSET_MISMATCH"
  | "FAVICON_MISMATCH"
  | "SMALL_ICON_MISMATCH"
  | "SUBTLE_SPACING";

export type PreviewFinding = {
  code: PreviewFindingCode;
  detail: string;
};

export type BetaPreviewCheck = {
  kind: "beta_preview_check_v1";
  previewEntryUrl: string | null;
  outputRootPath: string | null;
  checks: {
    htmlLoads: boolean;
    cssLoads: boolean;
    imagesLoad: boolean;
    layoutNotCatastrophicallyBroken: boolean;
  };
  counts: {
    stylesheetRefs: number;
    stylesheetsLoaded: number;
    imageRefs: number;
    imagesLoaded: number;
    textLength: number;
  };
  status: "passed" | "degraded_acceptable" | "degraded_unacceptable" | "unusable";
  findings: PreviewFinding[];
};

export type BetaMigrationDecisionArtifact = {
  kind: "beta_migration_decision_v1";
  classification: BetaDecisionClassification;
  decision: BetaDecision;
  score: number;
  keyWarnings: string[];
  keyBlockers: string[];
};

export type BetaMigrationSummary = {
  betaClientId: string;
  url: string;
  snapshotKey: string;
  simulationStatus: string;
  materializeStatus: string;
  previewStatus: BetaPreviewCheck["status"];
  score: number;
  classification: BetaDecisionClassification;
  decision: BetaDecision;
  keyWarnings: string[];
  keyBlockers: string[];
  previewEntryUrl: string | null;
  outputRootPath: string | null;
};

export type FirstRealBetaExecutionResult = {
  artifactsRootDirAbs: string;
  simulation: UrlImportOperatorResponse;
  materialize: UrlImportOperatorResponse;
  previewCheck: BetaPreviewCheck;
  dryRunReport: BetaMigrationDryRunReport;
  decision: BetaMigrationDecisionArtifact;
  summary: BetaMigrationSummary;
};

function writeJsonStable(absPath: string, value: JsonValue): void {
  fs.writeFileSync(absPath, `${stableStringify(value)}\n`, "utf8");
}

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function toSafeBetaClientId(input: { url: string; betaClientId?: string | undefined }): string {
  const explicit = input.betaClientId?.trim();
  if (explicit) {
    return explicit
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  try {
    return new URL(input.url).hostname.replace(/[^a-z0-9.-]+/gi, "-").toLowerCase();
  } catch {
    return "beta-client";
  }
}

function localPreviewPathFromRef(input: { rawRef: string; basePath: string }): string | null {
  const raw = input.rawRef.trim();
  if (!raw || raw.startsWith("#")) return null;
  const lower = raw.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("data:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("javascript:")
  ) {
    return null;
  }

  const noQuery = raw.split("?")[0]?.split("#")[0] ?? "";
  if (!noQuery) return null;

  const posix = path.posix;
  if (noQuery.startsWith("/")) {
    return posix.normalize(noQuery.replace(/^\/+/, ""));
  }

  const baseDir = posix.dirname(input.basePath || "index.html");
  return posix.normalize(posix.join(baseDir, noQuery));
}

function extractAttr(tag: string, attr: string): string | null {
  const re = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i");
  const m = tag.match(re);
  return m ? m[1] : null;
}

function extractStylesheetRefs(html: string): string[] {
  const refs: string[] = [];
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const rel = extractAttr(tag, "rel")?.toLowerCase() ?? "";
    if (!rel.includes("stylesheet")) continue;
    const href = extractAttr(tag, "href");
    if (href) refs.push(href);
  }
  return uniqueSortedStrings(refs);
}

function extractImageRefs(html: string): string[] {
  const refs: string[] = [];
  const tags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const src = extractAttr(tag, "src");
    if (src) refs.push(src);
  }
  return uniqueSortedStrings(refs);
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPreviewPath(input: { previewKey: string; previewPath?: string[] | undefined }): Promise<Response> {
  return getPreviewByOutput(new Request("http://localhost/validation-preview"), {
    params: Promise.resolve({ previewKey: input.previewKey, previewPath: input.previewPath }),
  });
}

export function classifyProtocolDegradation(input: {
  hardBlockers: readonly string[];
  previewFindings: readonly PreviewFinding[];
}): BetaDecisionClassification {
  if (input.hardBlockers.length > 0) return "HARD_BLOCKER";

  const findingCodes = new Set(input.previewFindings.map((f) => f.code));
  if (
    findingCodes.has("MAJOR_LAYOUT_BREAK") ||
    findingCodes.has("MISSING_HERO_OR_PRIMARY_CTA") ||
    findingCodes.has("UNREADABLE_TYPOGRAPHY")
  ) {
    return "DEGRADED_UNACCEPTABLE";
  }

  if (findingCodes.has("SPACING_ISSUES") || findingCodes.has("FONT_MISMATCH") || findingCodes.has("MINOR_ASSET_MISMATCH")) {
    return "DEGRADED_ACCEPTABLE";
  }

  return "COSMETIC_ONLY";
}

export function decideProtocolAction(input: {
  classification: BetaDecisionClassification;
  score: number;
}): BetaDecision {
  if (input.classification === "HARD_BLOCKER") return "STOP_BETA";
  if (input.classification === "DEGRADED_UNACCEPTABLE") return "ENGINE_IMPROVEMENT_REQUIRED";
  if (input.score >= PROCEED_WITH_MANUAL_POLISH_SCORE_THRESHOLD) return "PROCEED_WITH_MANUAL_POLISH";
  return "ENGINE_IMPROVEMENT_REQUIRED";
}

function collectHardBlockers(input: {
  simulation: UrlImportOperatorResponse;
  materialize: UrlImportOperatorResponse;
  preview: BetaPreviewCheck;
}): string[] {
  const blockers: string[] = [];

  if (!input.simulation.ok || (input.simulation.summary && input.simulation.summary.importStatus === "failed")) {
    blockers.push("IMPORT_STRUCTURAL_FAILURE");
  }

  if (!input.materialize.ok) {
    blockers.push("MATERIALIZATION_FAILURE");
  } else {
    const materializationStatus = input.materialize.result.executionResult.materialization.status;
    if (
      input.materialize.summary.executionStatus === "failed" ||
      materializationStatus === "materialization_failed" ||
      materializationStatus === "blocked"
    ) {
      blockers.push("MATERIALIZATION_FAILURE");
    }
  }

  if (input.preview.findings.some((f) => f.code === "PREVIEW_COMPLETELY_UNUSABLE")) {
    blockers.push("PREVIEW_COMPLETELY_UNUSABLE");
  }

  return uniqueSortedStrings(blockers);
}

function computeScoreAxes(input: {
  simulation: UrlImportOperatorResponse;
  materialize: UrlImportOperatorResponse;
  preview: BetaPreviewCheck;
}): {
  structuralFidelity: number;
  visualCoherence: number;
  assetIntegrity: number;
  contentCompleteness: number;
  layoutSemanticCorrectness: number;
} {
  const simulationStatus = input.simulation.ok ? input.simulation.summary.importStatus : "failed";
  const materializeStatus = input.materialize.ok ? input.materialize.summary.executionStatus : "failed";

  const structuralFidelity =
    simulationStatus === "failed" || materializeStatus === "failed"
      ? 0
      : simulationStatus === "success" && materializeStatus === "executed"
        ? 5
        : 4;

  const cssTotal = input.preview.counts.stylesheetRefs;
  const cssLoaded = input.preview.counts.stylesheetsLoaded;
  const imgTotal = input.preview.counts.imageRefs;
  const imgLoaded = input.preview.counts.imagesLoaded;
  const totalAssets = cssTotal + imgTotal;
  const loadedAssets = cssLoaded + imgLoaded;

  const assetIntegrity = totalAssets === 0 ? 5 : Math.max(0, Math.min(5, Math.round((loadedAssets / totalAssets) * 5)));

  const hasMajor = input.preview.findings.some((f) => f.code === "MAJOR_LAYOUT_BREAK" || f.code === "PREVIEW_COMPLETELY_UNUSABLE");
  const hasMissingCtaOrHero = input.preview.findings.some((f) => f.code === "MISSING_HERO_OR_PRIMARY_CTA");
  const hasUnreadable = input.preview.findings.some((f) => f.code === "UNREADABLE_TYPOGRAPHY");

  const visualCoherence = hasMajor ? 1 : hasUnreadable ? 2 : hasMissingCtaOrHero ? 3 : input.preview.status === "passed" ? 5 : 4;
  const contentCompleteness = hasMissingCtaOrHero ? 2 : input.preview.counts.textLength > 120 ? 5 : 4;
  const layoutSemanticCorrectness = input.preview.checks.layoutNotCatastrophicallyBroken ? (hasMajor ? 2 : 5) : 0;

  return {
    structuralFidelity,
    visualCoherence,
    assetIntegrity,
    contentCompleteness,
    layoutSemanticCorrectness,
  };
}

function buildDryRunValidationSummary(input: {
  simulation: UrlImportOperatorResponse;
  materialize: UrlImportOperatorResponse;
  hardBlockers: string[];
}): DryRunValidationSummary {
  if (!input.simulation.ok || !input.materialize.ok) {
    return {
      overallStatus: "failed",
      keyDiagnosticCodes: uniqueSortedStrings([
        ...(input.simulation.ok ? input.simulation.summary.warningCodes : []),
        ...(input.materialize.ok ? input.materialize.summary.warningCodes : []),
      ]),
      blockedReasonCodes: input.hardBlockers,
    };
  }

  const keyDiagnosticCodes = uniqueSortedStrings([...input.simulation.summary.warningCodes, ...input.materialize.summary.warningCodes]);

  const hasBlocked = input.hardBlockers.length > 0;
  if (hasBlocked) {
    return {
      overallStatus: "blocked",
      keyDiagnosticCodes,
      blockedReasonCodes: input.hardBlockers,
    };
  }

  if (keyDiagnosticCodes.length > 0) {
    return {
      overallStatus: "passed_with_warnings",
      keyDiagnosticCodes,
      blockedReasonCodes: [],
    };
  }

  return {
    overallStatus: "passed",
    keyDiagnosticCodes: [],
    blockedReasonCodes: [],
  };
}

function mapPreviewFindingsToDryRunDegradation(
  findings: readonly PreviewFinding[],
): CreateBetaMigrationDryRunReportInput["degradationFindings"] {
  const out: CreateBetaMigrationDryRunReportInput["degradationFindings"] = [];
  for (const finding of findings) {
    if (finding.code === "PREVIEW_COMPLETELY_UNUSABLE") {
      out.push({ issueCode: "ENTRY_PAGE_NOT_RENDERED", detail: finding.detail });
      continue;
    }
    if (finding.code === "MAJOR_LAYOUT_BREAK") {
      out.push({ issueCode: "MISSING_HERO_IMAGE", detail: finding.detail });
      continue;
    }
    if (finding.code === "MISSING_HERO_OR_PRIMARY_CTA") {
      out.push({ issueCode: "MISSING_HERO_IMAGE", detail: finding.detail });
      continue;
    }
    if (finding.code === "UNREADABLE_TYPOGRAPHY" || finding.code === "FONT_MISMATCH") {
      out.push({ issueCode: "FONT_MISMATCH", detail: finding.detail });
      continue;
    }
    if (finding.code === "MINOR_ASSET_MISMATCH" || finding.code === "SPACING_ISSUES") {
      out.push({ issueCode: "CTA_STYLE_DRIFT", detail: finding.detail });
      continue;
    }
    if (finding.code === "FAVICON_MISMATCH") {
      out.push({ issueCode: "MISSING_FAVICON", detail: finding.detail });
      continue;
    }
    if (finding.code === "SMALL_ICON_MISMATCH" || finding.code === "SUBTLE_SPACING") {
      out.push({ issueCode: "MINOR_ICON_STYLE_DRIFT", detail: finding.detail });
    }
  }
  return out;
}

function mapPreviewToParityFindings(preview: BetaPreviewCheck): DryRunParityFinding[] {
  return [
    {
      check: "layout_structure_parity",
      status: preview.checks.layoutNotCatastrophicallyBroken ? "pass" : "major_diff",
      detail: preview.checks.layoutNotCatastrophicallyBroken ? "Primary structure remains renderable." : "Layout appears catastrophically broken.",
    },
    {
      check: "typography_parity",
      status: preview.checks.cssLoads ? "pass" : "major_diff",
      detail: preview.checks.cssLoads ? "Stylesheets resolved for preview." : "Stylesheets missing in preview bundle.",
    },
    {
      check: "imagery_presence_parity",
      status:
        preview.counts.imageRefs === 0
          ? "pass"
          : preview.checks.imagesLoad
            ? "pass"
            : preview.counts.imagesLoaded > 0
              ? "minor_diff"
              : "missing",
      detail: `Loaded ${preview.counts.imagesLoaded}/${preview.counts.imageRefs} image references.`,
    },
    {
      check: "cta_presence_parity",
      status: preview.findings.some((f) => f.code === "MISSING_HERO_OR_PRIMARY_CTA") ? "missing" : "pass",
      detail: preview.findings.some((f) => f.code === "MISSING_HERO_OR_PRIMARY_CTA")
        ? "Primary hero/CTA signal appears missing."
        : "Primary CTA signal appears present.",
    },
    {
      check: "responsive_sanity_check",
      status: preview.checks.layoutNotCatastrophicallyBroken ? "pass" : "major_diff",
      detail: preview.checks.layoutNotCatastrophicallyBroken
        ? "No catastrophic break detected by deterministic sanity checks."
        : "Deterministic sanity checks detected catastrophic break conditions.",
    },
  ];
}

export async function runMaterializedPreviewCheck(materialize: UrlImportOperatorResponse): Promise<BetaPreviewCheck> {
  if (!materialize.ok) {
    return {
      kind: "beta_preview_check_v1",
      previewEntryUrl: null,
      outputRootPath: null,
      checks: {
        htmlLoads: false,
        cssLoads: false,
        imagesLoad: false,
        layoutNotCatastrophicallyBroken: false,
      },
      counts: {
        stylesheetRefs: 0,
        stylesheetsLoaded: 0,
        imageRefs: 0,
        imagesLoaded: 0,
        textLength: 0,
      },
      status: "unusable",
      findings: [{ code: "PREVIEW_COMPLETELY_UNUSABLE", detail: "Materialize run failed before preview could be served." }],
    };
  }

  const execution = materialize.result.executionResult;
  const previewHosting = execution.previewHosting;
  const outputRootPath = execution.materialization.outputRootPath;

  if (!previewHosting.available || !previewHosting.previewKey || !previewHosting.previewEntryUrl) {
    return {
      kind: "beta_preview_check_v1",
      previewEntryUrl: previewHosting.previewEntryUrl,
      outputRootPath,
      checks: {
        htmlLoads: false,
        cssLoads: false,
        imagesLoad: false,
        layoutNotCatastrophicallyBroken: false,
      },
      counts: {
        stylesheetRefs: 0,
        stylesheetsLoaded: 0,
        imageRefs: 0,
        imagesLoaded: 0,
        textLength: 0,
      },
      status: "unusable",
      findings: [
        {
          code: "PREVIEW_COMPLETELY_UNUSABLE",
          detail: `Preview hosting unavailable (${previewHosting.status}).`,
        },
      ],
    };
  }

  const htmlRes = await fetchPreviewPath({ previewKey: previewHosting.previewKey });
  const htmlLoads = htmlRes.status === 200;
  const html = htmlLoads ? await htmlRes.text() : "";

  const stylesheetRefs = htmlLoads ? extractStylesheetRefs(html) : [];
  const imageRefs = htmlLoads ? extractImageRefs(html) : [];

  let stylesheetsLoaded = 0;
  for (const href of stylesheetRefs) {
    const localPath = localPreviewPathFromRef({ rawRef: href, basePath: "index.html" });
    if (!localPath) {
      stylesheetsLoaded++;
      continue;
    }
    const res = await fetchPreviewPath({ previewKey: previewHosting.previewKey, previewPath: localPath.split("/") });
    if (res.status === 200) {
      const cssText = await res.text();
      if (cssText.length > 0) stylesheetsLoaded++;
    }
  }

  let imagesLoaded = 0;
  for (const src of imageRefs) {
    const localPath = localPreviewPathFromRef({ rawRef: src, basePath: "index.html" });
    if (!localPath) {
      imagesLoaded++;
      continue;
    }
    const res = await fetchPreviewPath({ previewKey: previewHosting.previewKey, previewPath: localPath.split("/") });
    if (res.status === 200) {
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength > 0) imagesLoaded++;
    }
  }

  const cssLoads = stylesheetRefs.length === 0 ? true : stylesheetsLoaded === stylesheetRefs.length;
  const imagesLoad = imageRefs.length === 0 ? true : imagesLoaded === imageRefs.length;

  const text = stripHtmlToText(html);
  const textLength = text.length;
  const hasBody = /<body\b/i.test(html);
  const hasMainLike = /<(main|section|article|header|footer|nav)\b/i.test(html);
  const hasHero = /<h1\b/i.test(html);
  const hasPrimaryCta = /(get started|start now|contact|book|demo|sign up|free trial|learn more)/i.test(text);

  const catastrophic = !hasBody || textLength < 20;
  const majorLayoutBreak = !catastrophic && (!hasMainLike || textLength < 80);

  const findings: PreviewFinding[] = [];
  if (!htmlLoads || catastrophic) {
    findings.push({
      code: "PREVIEW_COMPLETELY_UNUSABLE",
      detail: !htmlLoads ? "Preview entry URL did not return HTML." : "Preview HTML is effectively empty or structurally unusable.",
    });
  }
  if (majorLayoutBreak) {
    findings.push({ code: "MAJOR_LAYOUT_BREAK", detail: "Preview loaded but structural layout signals look significantly broken." });
  }
  if (!hasHero || !hasPrimaryCta) {
    findings.push({ code: "MISSING_HERO_OR_PRIMARY_CTA", detail: "Hero headline or primary CTA signal could not be confirmed." });
  }
  if (!cssLoads) {
    findings.push({ code: "UNREADABLE_TYPOGRAPHY", detail: "One or more required stylesheets failed to load in preview." });
  }
  if (!imagesLoad) {
    findings.push({ code: "MINOR_ASSET_MISMATCH", detail: "One or more image references failed to load in preview." });
  }

  const layoutNotCatastrophicallyBroken = htmlLoads && !catastrophic;

  const status: BetaPreviewCheck["status"] = findings.some((f) => f.code === "PREVIEW_COMPLETELY_UNUSABLE")
    ? "unusable"
    : findings.some(
          (f) =>
            f.code === "MAJOR_LAYOUT_BREAK" || f.code === "MISSING_HERO_OR_PRIMARY_CTA" || f.code === "UNREADABLE_TYPOGRAPHY",
        )
      ? "degraded_unacceptable"
      : findings.some((f) => f.code === "SPACING_ISSUES" || f.code === "FONT_MISMATCH" || f.code === "MINOR_ASSET_MISMATCH")
        ? "degraded_acceptable"
        : "passed";

  return {
    kind: "beta_preview_check_v1",
    previewEntryUrl: previewHosting.previewEntryUrl,
    outputRootPath,
    checks: {
      htmlLoads,
      cssLoads,
      imagesLoad,
      layoutNotCatastrophicallyBroken,
    },
    counts: {
      stylesheetRefs: stylesheetRefs.length,
      stylesheetsLoaded,
      imageRefs: imageRefs.length,
      imagesLoaded,
      textLength,
    },
    status,
    findings,
  };
}

export async function runFirstRealBetaMigrationExecution(
  input: {
    url: string;
    betaClientId?: string;
  },
  options?: {
    artifactsRootDirAbs?: string;
    snapshotRootDirAbs?: string;
    requestId?: string;
    fetchImpl?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  },
): Promise<FirstRealBetaExecutionResult> {
  const artifactsRootDirAbs = path.resolve(options?.artifactsRootDirAbs ?? path.resolve(process.cwd(), FIRST_REAL_BETA_RUN_DIR));
  fs.mkdirSync(artifactsRootDirAbs, { recursive: true });

  const betaClientId = toSafeBetaClientId({ url: input.url, betaClientId: input.betaClientId });

  const simulation = await runUrlImportOperatorFlow(
    {
      sourceUrl: input.url,
      executionMode: "simulation",
    },
    {
      requestId: options?.requestId ? `${options.requestId}-simulation` : undefined,
      snapshotRootDirAbs: options?.snapshotRootDirAbs,
      fetchImpl: options?.fetchImpl,
    },
  );
  writeJsonStable(
    path.resolve(artifactsRootDirAbs, FIRST_REAL_BETA_ARTIFACT_FILES.simulation),
    simulation as unknown as JsonValue,
  );

  const materialize = await runUrlImportOperatorFlow(
    {
      sourceUrl: input.url,
      executionMode: "materialize",
    },
    {
      requestId: options?.requestId ? `${options.requestId}-materialize` : undefined,
      snapshotRootDirAbs: options?.snapshotRootDirAbs,
      fetchImpl: options?.fetchImpl,
    },
  );
  writeJsonStable(
    path.resolve(artifactsRootDirAbs, FIRST_REAL_BETA_ARTIFACT_FILES.materialize),
    materialize as unknown as JsonValue,
  );

  const previewCheck = await runMaterializedPreviewCheck(materialize);
  writeJsonStable(
    path.resolve(artifactsRootDirAbs, FIRST_REAL_BETA_ARTIFACT_FILES.previewCheck),
    previewCheck as unknown as JsonValue,
  );

  const hardBlockers = collectHardBlockers({ simulation, materialize, preview: previewCheck });
  const scoreAxes = computeScoreAxes({ simulation, materialize, preview: previewCheck });
  const dryRunValidationSummary = buildDryRunValidationSummary({ simulation, materialize, hardBlockers });

  const snapshotKey = simulation.snapshot.snapshotId ?? materialize.snapshot.snapshotId ?? "imported-url-site-invalid";

  const dryRunReport = createBetaMigrationDryRunReport({
    sourceUrl: input.url,
    snapshotId: snapshotKey,
    validationSummary: dryRunValidationSummary,
    exportScoreAxes: scoreAxes,
    parityFindings: mapPreviewToParityFindings(previewCheck),
    degradationFindings: mapPreviewFindingsToDryRunDegradation(previewCheck.findings),
    notes: [
      `simulation_status=${simulation.ok ? simulation.summary.executionStatus : "failed"}`,
      `materialize_status=${materialize.ok ? materialize.summary.executionStatus : "failed"}`,
      `preview_status=${previewCheck.status}`,
    ],
  });
  writeJsonStable(
    path.resolve(artifactsRootDirAbs, FIRST_REAL_BETA_ARTIFACT_FILES.dryRunReport),
    dryRunReport as unknown as JsonValue,
  );

  const classification = classifyProtocolDegradation({ hardBlockers, previewFindings: previewCheck.findings });

  const keyWarnings = uniqueSortedStrings([
    ...(simulation.ok ? simulation.summary.warningCodes : []),
    ...(materialize.ok ? materialize.summary.warningCodes : []),
    ...previewCheck.findings
      .filter((finding) => finding.code !== "PREVIEW_COMPLETELY_UNUSABLE")
      .map((finding) => `${finding.code}`),
  ]);

  const decisionValue = decideProtocolAction({
    classification,
    score: dryRunReport.exportScore.weightedOverall,
  });

  const decision: BetaMigrationDecisionArtifact = {
    kind: "beta_migration_decision_v1",
    classification,
    decision: decisionValue,
    score: dryRunReport.exportScore.weightedOverall,
    keyWarnings,
    keyBlockers: hardBlockers,
  };
  writeJsonStable(
    path.resolve(artifactsRootDirAbs, FIRST_REAL_BETA_ARTIFACT_FILES.decision),
    decision as unknown as JsonValue,
  );

  const summary: BetaMigrationSummary = {
    betaClientId,
    url: input.url,
    snapshotKey,
    simulationStatus: simulation.ok ? simulation.summary.executionStatus : "failed",
    materializeStatus: materialize.ok ? materialize.summary.executionStatus : "failed",
    previewStatus: previewCheck.status,
    score: dryRunReport.exportScore.weightedOverall,
    classification,
    decision: decisionValue,
    keyWarnings,
    keyBlockers: hardBlockers,
    previewEntryUrl: materialize.ok ? materialize.result.executionResult.previewHosting.previewEntryUrl : null,
    outputRootPath: materialize.ok ? materialize.result.executionResult.materialization.outputRootPath : null,
  };

  writeJsonStable(path.resolve(artifactsRootDirAbs, FIRST_REAL_BETA_ARTIFACT_FILES.summary), summary as unknown as JsonValue);

  return {
    artifactsRootDirAbs,
    simulation,
    materialize,
    previewCheck,
    dryRunReport,
    decision,
    summary,
  };
}

function parseCliArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

async function runCli(): Promise<void> {
  const url = parseCliArg("--url");
  if (!url) {
    throw new Error("Missing required --url argument.");
  }

  const betaClientId = parseCliArg("--betaClientId") ?? parseCliArg("--beta-client-id");

  const result = await runFirstRealBetaMigrationExecution({
    url,
    ...(betaClientId ? { betaClientId } : {}),
  });

  const summaryPath = path.resolve(result.artifactsRootDirAbs, FIRST_REAL_BETA_ARTIFACT_FILES.summary);
  process.stdout.write(`${summaryPath}\n`);
}

const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname) : false;
if (isDirectRun) {
  runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
