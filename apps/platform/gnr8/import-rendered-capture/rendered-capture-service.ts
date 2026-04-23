import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  RENDERED_CAPTURE_FOUNDATION_VERSION,
  type ComputedStyleSample,
  type RenderedCaptureDiagnostic,
  type RenderedCaptureExecutor,
  type RenderedCaptureExecutorInput,
  type RenderedCaptureExecutorResult,
  type RenderedCaptureReadinessPolicy,
  type RenderedCaptureResult,
  type RenderedCaptureViewport,
} from "./rendered-capture-contract";
import {
  classifyPlaywrightLaunchFailure,
  DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT_MS,
  type PlaywrightLaunchFailureCode,
} from "./playwright-launch-probe";
import { resolveBrowserRuntimeSelection } from "./browser-runtime";

export const DEFAULT_RENDERED_CAPTURE_VIEWPORT: RenderedCaptureViewport = {
  width: 1366,
  height: 768,
};

export const DEFAULT_RENDERED_CAPTURE_READINESS_POLICY: RenderedCaptureReadinessPolicy = {
  navigationTimeoutMs: 20_000,
  networkQuietTimeoutMs: 4_000,
  domStabilizationWindowMs: 2_500,
  domStabilizationPollMs: 250,
  maxTotalCaptureMs: 30_000,
  shellContentMinLength: 120,
  shellDetectionRetryCount: 1,
  shellDetectionRetryDelayMs: 1_500,
};

function sha256Hex(value: string | Uint8Array): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values.filter((v) => typeof v === "string" && v.trim().length > 0))].sort((a, b) => a.localeCompare(b));
}

function toErrorString(error: unknown): string {
  return String((error as Error)?.message ?? error);
}

function pushDiagnostic(
  diagnostics: RenderedCaptureDiagnostic[],
  input: {
    code: RenderedCaptureDiagnostic["code"];
    message: string;
    severity?: RenderedCaptureDiagnostic["severity"];
    details?: Record<string, unknown>;
  },
): void {
  diagnostics.push({
    code: input.code,
    message: input.message,
    severity: input.severity ?? "info",
    details: input.details,
  });
}

function detectPlaywrightImportFailureReason(error: unknown): PlaywrightLaunchFailureCode {
  const message = toErrorString(error).toLowerCase();
  if (message.includes("cannot find module")) return "PLAYWRIGHT_IMPORT_FAILED";
  if (message.includes("playwright")) return "PLAYWRIGHT_IMPORT_FAILED";
  return "PLAYWRIGHT_IMPORT_FAILED";
}

async function withTimeout<T>(input: { operation: Promise<T>; timeoutMs: number; timeoutMessage: string }): Promise<{ value: T; timedOut: boolean }> {
  let timer: NodeJS.Timeout | null = null;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(input.timeoutMessage)), input.timeoutMs);
    });
    const value = await Promise.race([input.operation, timeout]);
    return { value: value as T, timedOut: false };
  } catch (error) {
    if (toErrorString(error) === input.timeoutMessage) {
      return { value: null as T, timedOut: true };
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type RuntimeKind = "nodejs" | "edge" | "unknown";

function resolveRuntimeKind(): RuntimeKind {
  const runtime = String(process.env.NEXT_RUNTIME ?? "").trim().toLowerCase();
  if (runtime === "nodejs") return "nodejs";
  if (runtime === "edge") return "edge";
  if (typeof process !== "undefined" && typeof process.versions?.node === "string" && process.versions.node.length > 0) return "nodejs";
  return "unknown";
}

function probeRuntimeEnvironment(snapshotRootDirAbs: string): {
  runtime: string;
  runtimeKind: RuntimeKind;
  runtimeCompatible: boolean;
  nodeVersion: string;
  platform: string;
  arch: string;
  tmpDir: string;
  tmpWritable: boolean;
  snapshotDirWritable: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const tmpDir = os.tmpdir();
  let tmpWritable = false;
  let snapshotDirWritable = false;

  try {
    const probeFile = path.resolve(tmpDir, `gnr8-rendered-capture-probe-${process.pid}-${Date.now()}.tmp`);
    fs.writeFileSync(probeFile, "ok", "utf8");
    fs.unlinkSync(probeFile);
    tmpWritable = true;
  } catch (error) {
    errors.push(`TMP_DIR_NOT_WRITABLE:${toErrorString(error)}`);
  }

  try {
    fs.mkdirSync(snapshotRootDirAbs, { recursive: true });
    const probeFile = path.resolve(snapshotRootDirAbs, `.capture-probe-${process.pid}-${Date.now()}.tmp`);
    fs.writeFileSync(probeFile, "ok", "utf8");
    fs.unlinkSync(probeFile);
    snapshotDirWritable = true;
  } catch (error) {
    errors.push(`SNAPSHOT_DIR_NOT_WRITABLE:${toErrorString(error)}`);
  }

  const runtimeKind = resolveRuntimeKind();
  const runtimeCompatible = runtimeKind === "nodejs";

  return {
    runtime: typeof process.env.NEXT_RUNTIME === "string" ? process.env.NEXT_RUNTIME : "nodejs",
    runtimeKind,
    runtimeCompatible,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    tmpDir,
    tmpWritable,
    snapshotDirWritable,
    errors,
  };
}

type BrowserStyleProbe = {
  target: ComputedStyleSample["target"];
  selector: string;
};

const STYLE_PROBES: readonly BrowserStyleProbe[] = [
  { target: "root", selector: "body" },
  { target: "header_nav", selector: "header, nav, [role='banner'], [class*='header'], [class*='nav']" },
  { target: "hero", selector: "section.hero, [class*='hero'], [id*='hero'], [class*='banner'], main > section, section:first-of-type" },
  { target: "h1", selector: "h1" },
  { target: "h2", selector: "h2" },
  { target: "h3", selector: "h3" },
  { target: "body_text", selector: "main p, article p, section p, p" },
  { target: "primary_cta", selector: "button, [role='button'], a[class*='btn'], a[class*='cta'], a.button, main a" },
  { target: "card", selector: "[class*='card'], [class*='feature'], [class*='service'], [class*='plan'], .grid > *, .cards > *, section" },
  { target: "footer", selector: "footer" },
] as const;

type RenderedQualityMetrics = {
  bodyTextLength: number;
  headingCount: number;
  sectionCount: number;
  meaningfulNodeCount: number;
};

type DomCaptureResult = {
  html: string;
  quality: RenderedQualityMetrics;
  domSerializationFailed: boolean;
  domSerializationError: string | null;
};

type StyleSamplingResult = {
  computedStyleSamples: ComputedStyleSample[];
  observedAssetUrls: string[];
  quality: RenderedQualityMetrics;
  styleSamplingFailed: boolean;
  styleSamplingError: string | null;
};

type PostNavigationPhaseName =
  | "stabilization"
  | "dom_serialization"
  | "screenshot_viewport"
  | "style_sampling"
  | "screenshot_fullpage"
  | "asset_manifest_finalization"
  | "response_assembly";

type PhaseDiagnosticCodeSet = {
  started: RenderedCaptureDiagnostic["code"];
  completed: RenderedCaptureDiagnostic["code"];
  timedOut: RenderedCaptureDiagnostic["code"];
  failed: RenderedCaptureDiagnostic["code"];
};

const PHASE_DIAGNOSTIC_CODES: Record<PostNavigationPhaseName, PhaseDiagnosticCodeSet> = {
  stabilization: {
    started: "CAPTURE_PHASE_STABILIZATION_STARTED",
    completed: "CAPTURE_PHASE_STABILIZATION_COMPLETED",
    timedOut: "CAPTURE_PHASE_STABILIZATION_TIMED_OUT",
    failed: "CAPTURE_PHASE_STABILIZATION_FAILED",
  },
  dom_serialization: {
    started: "CAPTURE_PHASE_DOM_SERIALIZATION_STARTED",
    completed: "CAPTURE_PHASE_DOM_SERIALIZATION_COMPLETED",
    timedOut: "CAPTURE_PHASE_DOM_SERIALIZATION_TIMED_OUT",
    failed: "CAPTURE_PHASE_DOM_SERIALIZATION_FAILED",
  },
  screenshot_viewport: {
    started: "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_STARTED",
    completed: "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_COMPLETED",
    timedOut: "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_TIMED_OUT",
    failed: "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_FAILED",
  },
  style_sampling: {
    started: "CAPTURE_PHASE_STYLE_SAMPLING_STARTED",
    completed: "CAPTURE_PHASE_STYLE_SAMPLING_COMPLETED",
    timedOut: "CAPTURE_PHASE_STYLE_SAMPLING_TIMED_OUT",
    failed: "CAPTURE_PHASE_STYLE_SAMPLING_FAILED",
  },
  screenshot_fullpage: {
    started: "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_STARTED",
    completed: "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_COMPLETED",
    timedOut: "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_TIMED_OUT",
    failed: "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_FAILED",
  },
  asset_manifest_finalization: {
    started: "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_STARTED",
    completed: "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_COMPLETED",
    timedOut: "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_TIMED_OUT",
    failed: "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_FAILED",
  },
  response_assembly: {
    started: "CAPTURE_PHASE_RESPONSE_ASSEMBLY_STARTED",
    completed: "CAPTURE_PHASE_RESPONSE_ASSEMBLY_COMPLETED",
    timedOut: "CAPTURE_PHASE_RESPONSE_ASSEMBLY_TIMED_OUT",
    failed: "CAPTURE_PHASE_RESPONSE_ASSEMBLY_FAILED",
  },
};

const POST_NAVIGATION_PHASE_PRIORITY: readonly PostNavigationPhaseName[] = [
  "dom_serialization",
  "screenshot_viewport",
  "style_sampling",
  "screenshot_fullpage",
  "asset_manifest_finalization",
  "response_assembly",
] as const;

const PHASE_BUDGET_CAP_MS: Record<PostNavigationPhaseName, number> = {
  stabilization: 8_000,
  dom_serialization: 4_500,
  screenshot_viewport: 4_000,
  style_sampling: 5_500,
  screenshot_fullpage: 4_500,
  asset_manifest_finalization: 1_500,
  response_assembly: 1_000,
};

function resolveReadinessNumber(value: number | undefined, fallback: number): number {
  const normalized = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.floor(normalized));
}

function isShellLikeContent(input: { quality: RenderedQualityMetrics; minLength: number }): boolean {
  return (
    input.quality.bodyTextLength < input.minLength &&
    input.quality.headingCount < 1 &&
    input.quality.sectionCount < 1 &&
    input.quality.meaningfulNodeCount < 8
  );
}

function hasExceededCaptureBudget(input: { startedAt: number; readiness: RenderedCaptureReadinessPolicy }): boolean {
  return Date.now() - input.startedAt > input.readiness.maxTotalCaptureMs;
}

function inferQualityMetricsFromHtml(html: string): RenderedQualityMetrics {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  const text = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const headingCount = (bodyHtml.match(/<h[1-3][\s>]/gi) ?? []).length;
  const sectionCount = (bodyHtml.match(/<(section|main|article|nav|aside)[\s>]/gi) ?? []).length;
  const meaningfulNodeCount = (bodyHtml.match(/<(main|section|article|nav|aside|h1|h2|h3|p|li|a)\b/gi) ?? []).length;
  return {
    bodyTextLength: normalizedText.length,
    headingCount,
    sectionCount,
    meaningfulNodeCount,
  };
}

function remainingCaptureBudgetMs(input: {
  startedAt: number;
  readiness: RenderedCaptureReadinessPolicy;
}): number {
  return Math.max(0, input.readiness.maxTotalCaptureMs - (Date.now() - input.startedAt));
}

export function getPostNavigationPhaseOrderForTesting(): readonly PostNavigationPhaseName[] {
  return [...POST_NAVIGATION_PHASE_PRIORITY];
}

export async function runCapturePhaseForTesting(input: {
  phase: PostNavigationPhaseName;
  readiness: RenderedCaptureReadinessPolicy;
  startedAt?: number;
  operation: () => Promise<unknown>;
}): Promise<{
  result: { value: unknown | null; timedOut: boolean; failed: boolean; timeoutBudgetMs: number; durationMs: number };
  diagnostics: RenderedCaptureDiagnostic[];
}> {
  const diagnostics: RenderedCaptureDiagnostic[] = [];
  const result = await executeBoundedCapturePhase({
    phase: input.phase,
    diagnostics,
    startedAt: input.startedAt ?? Date.now(),
    readiness: input.readiness,
    operation: input.operation,
  });
  return { result, diagnostics };
}

async function executeBoundedCapturePhase<T>(input: {
  phase: PostNavigationPhaseName;
  diagnostics: RenderedCaptureDiagnostic[];
  startedAt: number;
  readiness: RenderedCaptureReadinessPolicy;
  maxPhaseMs?: number;
  details?: Record<string, unknown>;
  operation: () => Promise<T>;
}): Promise<{ value: T | null; timedOut: boolean; failed: boolean; timeoutBudgetMs: number; durationMs: number }> {
  const phaseCodes = PHASE_DIAGNOSTIC_CODES[input.phase];
  const phaseStartedAt = Date.now();
  const remainingBudgetMs = remainingCaptureBudgetMs({
    startedAt: input.startedAt,
    readiness: input.readiness,
  });
  const timeoutBudgetMs = Math.max(
    1,
    Math.min(
      remainingBudgetMs,
      Math.max(1, Math.floor(input.maxPhaseMs ?? PHASE_BUDGET_CAP_MS[input.phase])),
    ),
  );

  pushDiagnostic(input.diagnostics, {
    code: phaseCodes.started,
    message: `Post-navigation phase started: ${input.phase}`,
    details: {
      phase: input.phase,
      timeoutBudgetMs,
      remainingBudgetMs,
      ...input.details,
    },
  });

  if (remainingBudgetMs <= 0) {
    const durationMs = Date.now() - phaseStartedAt;
    pushDiagnostic(input.diagnostics, {
      code: phaseCodes.timedOut,
      severity: "warning",
      message: `Post-navigation phase timed out before execution: ${input.phase}`,
      details: {
        phase: input.phase,
        durationMs,
        timeoutBudgetMs: 0,
        remainingBudgetMs,
      },
    });
    pushDiagnostic(input.diagnostics, {
      code: "RENDERED_CAPTURE_TIMEOUT",
      severity: "warning",
      message: "Rendered capture reached max timeout budget before completing post-navigation phase",
      details: {
        phase: input.phase,
        durationMs,
        timeoutBudgetMs: 0,
        maxTotalCaptureMs: input.readiness.maxTotalCaptureMs,
      },
    });
    return { value: null, timedOut: true, failed: false, timeoutBudgetMs: 0, durationMs };
  }

  try {
    const phaseResult = await withTimeout({
      operation: input.operation(),
      timeoutMs: timeoutBudgetMs,
      timeoutMessage: `CAPTURE_PHASE_TIMEOUT:${input.phase}:${timeoutBudgetMs}`,
    });
    const durationMs = Date.now() - phaseStartedAt;
    if (phaseResult.timedOut) {
      pushDiagnostic(input.diagnostics, {
        code: phaseCodes.timedOut,
        severity: "warning",
        message: `Post-navigation phase timed out: ${input.phase}`,
        details: {
          phase: input.phase,
          durationMs,
          timeoutBudgetMs,
        },
      });
      pushDiagnostic(input.diagnostics, {
        code: "RENDERED_CAPTURE_TIMEOUT",
        severity: "warning",
        message: "Rendered capture timed out during post-navigation phase",
        details: {
          phase: input.phase,
          durationMs,
          timeoutBudgetMs,
          maxTotalCaptureMs: input.readiness.maxTotalCaptureMs,
        },
      });
      return { value: null, timedOut: true, failed: false, timeoutBudgetMs, durationMs };
    }

    pushDiagnostic(input.diagnostics, {
      code: phaseCodes.completed,
      message: `Post-navigation phase completed: ${input.phase}`,
      details: {
        phase: input.phase,
        durationMs,
        timeoutBudgetMs,
      },
    });
    return { value: phaseResult.value, timedOut: false, failed: false, timeoutBudgetMs, durationMs };
  } catch (error) {
    const durationMs = Date.now() - phaseStartedAt;
    pushDiagnostic(input.diagnostics, {
      code: phaseCodes.failed,
      severity: "warning",
      message: `Post-navigation phase failed: ${input.phase}`,
      details: {
        phase: input.phase,
        durationMs,
        timeoutBudgetMs,
        error: toErrorString(error),
      },
    });
    return { value: null, timedOut: false, failed: true, timeoutBudgetMs, durationMs };
  }
}

async function captureDomState(page: any): Promise<DomCaptureResult> {
  let html = "";
  let domSerializationFailed = false;
  let domSerializationError: string | null = null;
  try {
    html = await page.content();
  } catch (error) {
    domSerializationFailed = true;
    domSerializationError = toErrorString(error);
  }

  return {
    html,
    quality: inferQualityMetricsFromHtml(html),
    domSerializationFailed,
    domSerializationError,
  };
}

async function captureComputedStyles(page: any): Promise<StyleSamplingResult> {
  let styleSamplesRaw: {
    samples: Array<{
      target: string;
      selector: string;
      tagName: string | null;
      className: string | null;
      styles: ComputedStyleSample["styles"];
    }>;
    observedAssetUrls: string[];
    quality: RenderedQualityMetrics;
  } = {
    samples: [],
    observedAssetUrls: [],
    quality: {
      bodyTextLength: 0,
      headingCount: 0,
      sectionCount: 0,
      meaningfulNodeCount: 0,
    },
  };
  let styleSamplingFailed = false;
  let styleSamplingError: string | null = null;

  try {
    styleSamplesRaw = await page.evaluate((probes: BrowserStyleProbe[]) => {
      function isVisible(el: HTMLElement): boolean {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity || "1") <= 0.02) return false;
        const rect = el.getBoundingClientRect();
        return rect.width >= 4 && rect.height >= 4;
      }

      function candidateScore(target: string, el: HTMLElement): number {
        const rect = el.getBoundingClientRect();
        const top = Math.max(0, rect.top);
        const textLen = (el.textContent ?? "").replace(/\s+/g, " ").trim().length;
        const className = String(el.className ?? "").toLowerCase();
        const tag = el.tagName.toLowerCase();
        let score = 0;
        score += Math.min(rect.width * rect.height, 160_000) / 40_000;
        score += Math.min(textLen, 240) / 160;

        if (target === "header_nav") {
          if (tag === "header" || tag === "nav") score += 1.6;
          if (top <= 220) score += 1.2;
        } else if (target === "hero") {
          if (top <= 520) score += 1.2;
          if (className.includes("hero") || className.includes("banner") || className.includes("masthead")) score += 1.4;
          if (el.querySelector("h1,h2")) score += 1.2;
        } else if (target === "body_text") {
          if (tag === "p") score += 0.6;
          score += Math.min(textLen, 420) / 80;
          if (top <= 1400) score += 0.4;
        } else if (target === "primary_cta") {
          const text = (el.textContent ?? "").toLowerCase();
          if (/\b(get started|start|book|contact|call|buy|shop|demo|learn more|sign up|join|quote|request)\b/.test(text)) score += 2.2;
          if (tag === "button") score += 1.2;
          if (className.includes("btn") || className.includes("cta") || className.includes("button")) score += 1.4;
          if (top <= 980) score += 0.6;
        } else if (target === "card") {
          if (className.includes("card") || className.includes("feature") || className.includes("service") || className.includes("plan")) score += 1.6;
          if (tag === "section" || tag === "article") score += 0.7;
          score += Math.min((el.children?.length ?? 0), 8) / 6;
        } else if (target === "footer") {
          const docHeight = Math.max(document.documentElement?.scrollHeight ?? 0, document.body?.scrollHeight ?? 0, 1);
          const nearBottom = rect.top + rect.height >= docHeight * 0.65;
          if (tag === "footer") score += 2;
          if (nearBottom) score += 1.2;
        } else if (target === "h1" || target === "h2" || target === "h3") {
          if (tag === target) score += 1.6;
          if (top <= 980) score += 0.8;
          score += Math.min(textLen, 160) / 120;
        } else if (target === "root") {
          if (tag === "body") score += 2;
        }
        score -= top / 8000;
        return score;
      }

      function pickElement(target: string, selector: string): HTMLElement | null {
        const candidates = Array.from(document.querySelectorAll(selector)).slice(0, 28).filter((node): node is HTMLElement => node instanceof HTMLElement);
        const visible = candidates.filter((node) => isVisible(node));
        if (visible.length === 0) return null;
        return visible
          .map((el) => ({ el, score: candidateScore(target, el) }))
          .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.el.tagName.localeCompare(b.el.tagName)))[0]?.el ?? null;
      }

      function sampleFor(target: string, selector: string) {
        const el = pickElement(target, selector);
        if (!el) return null;
        const style = window.getComputedStyle(el);
        return {
          tagName: el.tagName.toLowerCase(),
          className: el.className || null,
          styles: {
            fontFamily: style.fontFamily || null,
            fontSize: style.fontSize || null,
            fontWeight: style.fontWeight || null,
            lineHeight: style.lineHeight || null,
            color: style.color || null,
            backgroundColor: style.backgroundColor || null,
            borderRadius: style.borderRadius || null,
            paddingTop: style.paddingTop || null,
            paddingRight: style.paddingRight || null,
            paddingBottom: style.paddingBottom || null,
            paddingLeft: style.paddingLeft || null,
          },
        };
      }

      const styleOut: Array<{
        target: string;
        selector: string;
        tagName: string | null;
        className: string | null;
        styles: {
          fontFamily: string | null;
          fontSize: string | null;
          fontWeight: string | null;
          lineHeight: string | null;
          color: string | null;
          backgroundColor: string | null;
          borderRadius: string | null;
          paddingTop: string | null;
          paddingRight: string | null;
          paddingBottom: string | null;
          paddingLeft: string | null;
        };
      }> = [];

      for (const probe of probes) {
        const sampled = sampleFor(probe.target, probe.selector);
        if (!sampled) continue;
        styleOut.push({
          target: probe.target,
          selector: probe.selector,
          tagName: sampled.tagName,
          className: sampled.className,
          styles: sampled.styles,
        });
      }

      const bodyTextLength = (document.body?.innerText ?? "").replace(/\s+/g, " ").trim().length;
      const headingCount = document.querySelectorAll("h1, h2, h3").length;
      const sectionCount = document.querySelectorAll("section, main, article, nav, aside").length;
      const meaningfulNodeCount = document.querySelectorAll("main *, section *, article *, nav *, h1, h2, h3, p, li, a").length;

      const observedAssetUrls = Array.from(
        new Set(
          [
            ...Array.from(document.querySelectorAll("img[src]")).map((n) => (n as HTMLImageElement).src),
            ...Array.from(document.querySelectorAll("script[src]")).map((n) => (n as HTMLScriptElement).src),
            ...Array.from(document.querySelectorAll("link[href]")).map((n) => (n as HTMLLinkElement).href),
          ].filter((v): v is string => typeof v === "string" && v.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b));

      return {
        samples: styleOut,
        observedAssetUrls,
        quality: {
          bodyTextLength,
          headingCount,
          sectionCount,
          meaningfulNodeCount,
        },
      };
    }, [...STYLE_PROBES]);
  } catch (error) {
    styleSamplingFailed = true;
    styleSamplingError = toErrorString(error);
  }

  const computedStyleSamples: ComputedStyleSample[] = styleSamplesRaw.samples.map((sample: {
    target: string;
    selector: string;
    tagName: string | null;
    className: string | null;
    styles: ComputedStyleSample["styles"];
  }) => ({
    kind: "computed_style_sample_v1",
    sampleId: sha256Hex(`${sample.target}:${sample.selector}:${sample.tagName ?? ""}`).slice(0, 16),
    target: sample.target as ComputedStyleSample["target"],
    selector: sample.selector,
    tagName: sample.tagName,
    className: sample.className,
    styles: sample.styles,
  }));

  return {
    computedStyleSamples,
    observedAssetUrls: uniqueSortedStrings(styleSamplesRaw.observedAssetUrls),
    quality: {
      bodyTextLength: Number(styleSamplesRaw.quality.bodyTextLength ?? 0),
      headingCount: Number(styleSamplesRaw.quality.headingCount ?? 0),
      sectionCount: Number(styleSamplesRaw.quality.sectionCount ?? 0),
      meaningfulNodeCount: Number(styleSamplesRaw.quality.meaningfulNodeCount ?? 0),
    },
    styleSamplingFailed,
    styleSamplingError,
  };
}

async function waitForReadinessPass(input: {
  page: any;
  diagnostics: RenderedCaptureDiagnostic[];
  readiness: RenderedCaptureReadinessPolicy;
  startedAt: number;
  attempt: number;
}): Promise<"network_quiet" | "dom_stable" | "timeout_partial"> {
  let readinessState: "network_quiet" | "dom_stable" | "timeout_partial" = "dom_stable";

  const attemptScale = input.attempt > 0 ? 1.5 : 1;
  const networkQuietTimeoutMs = Math.floor(input.readiness.networkQuietTimeoutMs * attemptScale);
  const domStabilizationWindowMs = Math.floor(input.readiness.domStabilizationWindowMs * attemptScale);

  try {
    await input.page.waitForLoadState("networkidle", { timeout: networkQuietTimeoutMs });
    readinessState = "network_quiet";
  } catch {
    input.diagnostics.push({
      code: "RENDERED_CAPTURE_TIMEOUT",
      severity: "warning",
      message: "Network quiet timeout reached; continuing with DOM stabilization fallback",
      details: { networkQuietTimeoutMs, attempt: input.attempt + 1 },
    });
    readinessState = "timeout_partial";
  }

  const stabilizationDeadline = Date.now() + domStabilizationWindowMs;
  let previousHash = "";
  let stableTicks = 0;

  while (Date.now() < stabilizationDeadline) {
    if (hasExceededCaptureBudget({ startedAt: input.startedAt, readiness: input.readiness })) {
      input.diagnostics.push({
        code: "RENDERED_CAPTURE_TIMEOUT",
        severity: "warning",
        message: "Rendered capture reached bounded max timeout during readiness stabilization",
        details: { maxTotalCaptureMs: input.readiness.maxTotalCaptureMs, attempt: input.attempt + 1 },
      });
      return "timeout_partial";
    }

    const html = await input.page.content();
    const hash = sha256Hex(html);
    if (hash === previousHash) {
      stableTicks += 1;
      if (stableTicks >= 2) {
        if (readinessState !== "network_quiet") readinessState = "dom_stable";
        break;
      }
    } else {
      previousHash = hash;
      stableTicks = 0;
    }
    await sleep(input.readiness.domStabilizationPollMs);
  }

  if (hasExceededCaptureBudget({ startedAt: input.startedAt, readiness: input.readiness })) {
    input.diagnostics.push({
      code: "RENDERED_CAPTURE_TIMEOUT",
      severity: "warning",
      message: "Rendered capture reached bounded max timeout; returning partial evidence",
      details: { maxTotalCaptureMs: input.readiness.maxTotalCaptureMs, attempt: input.attempt + 1 },
    });
    return "timeout_partial";
  }

  return readinessState;
}

function resolveCaptureStatus(input: {
  requestedStatus: RenderedCaptureExecutorResult["status"];
  html: string;
  screenshots: RenderedCaptureExecutorResult["screenshots"];
  computedStyleSamples: ComputedStyleSample[];
}): RenderedCaptureExecutorResult["status"] {
  const hasDom = input.html.trim().length > 0;
  const hasScreenshots = input.screenshots.length > 0;
  const hasStyles = input.computedStyleSamples.length > 0;
  if (input.requestedStatus === "unavailable" && (hasDom || hasScreenshots || hasStyles)) return "partial";
  if (input.requestedStatus === "failed" && (hasDom || hasScreenshots || hasStyles)) return "partial";
  if (input.requestedStatus === "failed" || input.requestedStatus === "unavailable") return input.requestedStatus;
  if (hasDom && hasScreenshots && hasStyles) return "available";
  if (hasDom || hasScreenshots || hasStyles) return "partial";
  return "failed";
}

async function defaultRenderedCaptureExecutor(input: RenderedCaptureExecutorInput): Promise<RenderedCaptureExecutorResult> {
  const diagnostics: RenderedCaptureDiagnostic[] = [];
  const environment = probeRuntimeEnvironment(input.snapshotRootDirAbs);
  let browserPackageAvailable = false;
  let browserBinaryAvailable = false;

  pushDiagnostic(diagnostics, {
    code: "RENDERED_CAPTURE_RUNTIME_ENVIRONMENT",
    message: "Rendered capture runtime environment probe completed",
    details: environment,
  });
  pushDiagnostic(diagnostics, {
    code: "PLAYWRIGHT_PACKAGE_CHECK",
    message: "Playwright package availability check pending",
    details: { available: false, state: "pending" },
  });
  pushDiagnostic(diagnostics, {
    code: "PLAYWRIGHT_BINARY_CHECK",
    message: "Playwright browser binary availability check pending",
    details: { available: false, state: "pending" },
  });

  if (!environment.runtimeCompatible) {
    pushDiagnostic(diagnostics, {
      code: "ENVIRONMENT_UNSUPPORTED",
      severity: "error",
      message: "Rendered capture requires Node.js runtime and is unsupported in current runtime kind",
      details: {
        runtimeKind: environment.runtimeKind,
        reason: "RUNTIME_INCOMPATIBLE",
      },
    });
    pushDiagnostic(diagnostics, {
      code: "RENDERED_CAPTURE_UNAVAILABLE",
      severity: "warning",
      message: "Rendered capture unavailable because runtime does not support browser execution",
      details: { reason: "RUNTIME_INCOMPATIBLE" },
    });
    pushDiagnostic(diagnostics, {
      code: "RENDERED_CAPTURE_SUPPORT_DECISION",
      message: "Rendered capture support decision finalized",
      details: {
        supported: false,
        reason: "RUNTIME_INCOMPATIBLE",
        runtimeKind: environment.runtimeKind,
        browserPackageAvailable,
        browserBinaryAvailable,
      },
    });
    return {
      status: "unavailable",
      document: null,
      screenshots: [],
      computedStyleSamples: [],
      renderedObservedAssetUrls: [],
      diagnostics,
    };
  }

  if (!environment.tmpWritable || !environment.snapshotDirWritable) {
    pushDiagnostic(diagnostics, {
      code: "ENVIRONMENT_UNSUPPORTED",
      severity: "error",
      message: "Rendered capture environment is not writable for required temp/output paths",
      details: {
        tmpWritable: environment.tmpWritable,
        snapshotDirWritable: environment.snapshotDirWritable,
        errors: environment.errors,
      },
    });
    pushDiagnostic(diagnostics, {
      code: "RENDERED_CAPTURE_UNAVAILABLE",
      severity: "warning",
      message: "Rendered capture unavailable due to unsupported runtime environment",
      details: { reason: "ENVIRONMENT_IO_UNSUPPORTED" },
    });
    pushDiagnostic(diagnostics, {
      code: "RENDERED_CAPTURE_SUPPORT_DECISION",
      message: "Rendered capture support decision finalized",
      details: {
        supported: false,
        reason: "ENVIRONMENT_IO_UNSUPPORTED",
        runtimeKind: environment.runtimeKind,
        browserPackageAvailable,
        browserBinaryAvailable,
      },
    });
    return {
      status: "unavailable",
      document: null,
      screenshots: [],
      computedStyleSamples: [],
      renderedObservedAssetUrls: [],
      diagnostics,
    };
  }

  const browserRuntimeSelection = await resolveBrowserRuntimeSelection({
    env: process.env,
    launchTimeoutMs: DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT_MS,
  });
  const browserRuntime = browserRuntimeSelection.selection;
  const runtimeModeExpected = "playwright";

  if (!browserRuntime) {
    const importFailure = browserRuntimeSelection.attempts.find((attempt) => attempt.error)?.error ?? "Playwright runtime import failed";
    const reason = detectPlaywrightImportFailureReason(importFailure);
    pushDiagnostic(diagnostics, {
      code: "PLAYWRIGHT_PACKAGE_CHECK",
      message: "Playwright package availability check completed",
      severity: "error",
      details: {
        available: false,
        reason,
        runtimeModeExpected,
        attemptedRuntimes: browserRuntimeSelection.attempts,
      },
    });
    pushDiagnostic(diagnostics, {
      code: reason,
      severity: "error",
      message: "Playwright package import failed",
      details: {
        runtimeModeExpected,
        attemptedRuntimes: browserRuntimeSelection.attempts,
      },
    });
    pushDiagnostic(diagnostics, {
      code: "RENDERED_CAPTURE_UNAVAILABLE",
      severity: "warning",
      message: "Playwright runtime unavailable; rendered capture skipped",
      details: {
        reason,
        runtimeModeExpected,
        attemptedRuntimes: browserRuntimeSelection.attempts,
      },
    });
    pushDiagnostic(diagnostics, {
      code: "RENDERED_CAPTURE_SUPPORT_DECISION",
      message: "Rendered capture support decision finalized",
      details: {
        supported: false,
        reason: "PACKAGE_IMPORT_FAILED",
        runtimeKind: environment.runtimeKind,
        browserPackageAvailable,
        browserBinaryAvailable,
        runtimeModeExpected,
        attemptedRuntimes: browserRuntimeSelection.attempts,
      },
    });
    return {
      status: "unavailable",
      document: null,
      screenshots: [],
      computedStyleSamples: [],
      renderedObservedAssetUrls: [],
      diagnostics,
    };
  }

  browserPackageAvailable = true;
  pushDiagnostic(diagnostics, {
    code: "PLAYWRIGHT_PACKAGE_CHECK",
    message: "Playwright package availability check completed",
    details: {
      available: true,
      selectedRuntimeMode: browserRuntime.mode,
      packageName: browserRuntime.packageName,
      attemptedRuntimes: browserRuntime.attempts,
    },
  });

  const chromium = browserRuntime.chromium;
  if (!chromium) {
    pushDiagnostic(diagnostics, {
      code: "PLAYWRIGHT_BINARY_CHECK",
      message: "Playwright browser binary availability check completed",
      severity: "error",
      details: {
        available: false,
        reason: "CHROMIUM_UNAVAILABLE",
        selectedRuntimeMode: browserRuntime.mode,
        packageName: browserRuntime.packageName,
      },
    });
    pushDiagnostic(diagnostics, {
      code: "PLAYWRIGHT_BROWSER_LAUNCH_FAILED",
      severity: "error",
      message: "Playwright chromium launcher is unavailable",
      details: {
        reason: "CHROMIUM_UNAVAILABLE",
        selectedRuntimeMode: browserRuntime.mode,
        packageName: browserRuntime.packageName,
      },
    });
    pushDiagnostic(diagnostics, {
      code: "RENDERED_CAPTURE_UNAVAILABLE",
      severity: "warning",
      message: "Playwright chromium runtime unavailable; rendered capture skipped",
      details: {
        reason: "CHROMIUM_UNAVAILABLE",
        selectedRuntimeMode: browserRuntime.mode,
        packageName: browserRuntime.packageName,
      },
    });
    pushDiagnostic(diagnostics, {
      code: "RENDERED_CAPTURE_SUPPORT_DECISION",
      message: "Rendered capture support decision finalized",
      details: {
        supported: false,
        reason: "CHROMIUM_UNAVAILABLE",
        runtimeKind: environment.runtimeKind,
        browserPackageAvailable,
        browserBinaryAvailable,
        selectedRuntimeMode: browserRuntime.mode,
        packageName: browserRuntime.packageName,
      },
    });
    return {
      status: "unavailable",
      document: null,
      screenshots: [],
      computedStyleSamples: [],
      renderedObservedAssetUrls: [],
      diagnostics,
    };
  }

  const startedAt = Date.now();
  let browser: any = null;
  let context: any = null;
  let page: any = null;
  const chromiumExecutablePath = browserRuntime.executablePath;
  const chromiumExecutablePathExists = browserRuntime.executablePathExists;
  const launchOptions = browserRuntime.launchOptions;
  const launchTimeoutMsRaw = Number(launchOptions.timeout ?? DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT_MS);
  const launchTimeoutMs =
    Number.isFinite(launchTimeoutMsRaw) && launchTimeoutMsRaw > 0
      ? Math.floor(launchTimeoutMsRaw)
      : DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT_MS;
  const launchArgs = Array.isArray(launchOptions.args)
    ? launchOptions.args.filter((entry): entry is string => typeof entry === "string")
    : [];

  try {
    try {
      pushDiagnostic(diagnostics, {
        code: "BROWSER_LAUNCH_STARTED",
        message: "Starting browser launch for rendered capture",
        details: {
          timeoutMs: launchTimeoutMs,
          launchArgs,
          executablePath: chromiumExecutablePath,
          executablePathExists: chromiumExecutablePathExists,
          executablePathResolution: browserRuntime.executablePathResolution,
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
        },
      });
      const launchResult = await withTimeout({
        operation: chromium.launch(launchOptions),
        timeoutMs: launchTimeoutMs,
        timeoutMessage: `PLAYWRIGHT_LAUNCH_TIMEOUT:${launchTimeoutMs}`,
      });
      if (launchResult.timedOut) {
        pushDiagnostic(diagnostics, {
          code: "PLAYWRIGHT_LAUNCH_TIMEOUT",
          severity: "error",
          message: "Playwright launch probe timed out before browser became ready",
          details: {
            timeoutMs: launchTimeoutMs,
            launchArgs,
            executablePath: chromiumExecutablePath,
            executablePathExists: chromiumExecutablePathExists,
            selectedRuntimeMode: browserRuntime.mode,
            packageName: browserRuntime.packageName,
          },
        });
        pushDiagnostic(diagnostics, {
          code: "PLAYWRIGHT_BINARY_CHECK",
          message: "Playwright browser binary availability check completed via launch probe",
          severity: "error",
          details: {
            available: false,
            reason: "PLAYWRIGHT_LAUNCH_TIMEOUT",
            launchProbe: "failed",
            timeoutMs: launchTimeoutMs,
            launchArgs,
            executablePath: chromiumExecutablePath,
            executablePathExists: chromiumExecutablePathExists,
            executablePathResolution: browserRuntime.executablePathResolution,
            selectedRuntimeMode: browserRuntime.mode,
            packageName: browserRuntime.packageName,
            binariesPresentAtRuntime: chromiumExecutablePathExists,
          },
        });
        pushDiagnostic(diagnostics, {
          code: "ENVIRONMENT_UNSUPPORTED",
          severity: "error",
          message: "Rendered capture launch probe failed; chromium is not launchable in this runtime",
          details: {
            reason: "PLAYWRIGHT_LAUNCH_TIMEOUT",
            timeoutMs: launchTimeoutMs,
            launchArgs,
            executablePath: chromiumExecutablePath,
            executablePathExists: chromiumExecutablePathExists,
            selectedRuntimeMode: browserRuntime.mode,
            packageName: browserRuntime.packageName,
          },
        });
        pushDiagnostic(diagnostics, {
          code: "RENDERED_CAPTURE_UNAVAILABLE",
          severity: "warning",
          message: "Rendered capture unavailable because launch probe timed out",
          details: {
            reason: "PLAYWRIGHT_LAUNCH_TIMEOUT",
            timeoutMs: launchTimeoutMs,
            selectedRuntimeMode: browserRuntime.mode,
            packageName: browserRuntime.packageName,
          },
        });
        pushDiagnostic(diagnostics, {
          code: "RENDERED_CAPTURE_SUPPORT_DECISION",
          message: "Rendered capture support decision finalized",
          details: {
            supported: false,
            reason: "LAUNCH_PROBE_FAILED",
            runtimeKind: environment.runtimeKind,
            browserPackageAvailable,
            browserBinaryAvailable: false,
            executablePath: chromiumExecutablePath,
            launchFailureCode: "PLAYWRIGHT_LAUNCH_TIMEOUT",
            selectedRuntimeMode: browserRuntime.mode,
            packageName: browserRuntime.packageName,
            executablePathResolution: browserRuntime.executablePathResolution,
          },
        });
        return {
          status: "unavailable",
          document: null,
          screenshots: [],
          computedStyleSamples: [],
          renderedObservedAssetUrls: [],
          diagnostics,
        };
      }
      browser = launchResult.value;
      browserBinaryAvailable = true;
      pushDiagnostic(diagnostics, {
        code: "PLAYWRIGHT_BINARY_CHECK",
        message: "Playwright browser binary availability check completed via launch probe",
        details: {
          available: true,
          launchProbe: "passed",
          launchArgs,
          executablePath: chromiumExecutablePath,
          executablePathExists: chromiumExecutablePathExists,
          executablePathResolution: browserRuntime.executablePathResolution,
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
          binariesPresentAtRuntime: chromiumExecutablePathExists,
        },
      });
      pushDiagnostic(diagnostics, { code: "BROWSER_LAUNCH_SUCCEEDED", message: "Browser launch succeeded for rendered capture" });
    } catch (error) {
      const reason = classifyPlaywrightLaunchFailure({
        error,
        timedOut: false,
        executablePathExists: chromiumExecutablePathExists,
      });
      pushDiagnostic(diagnostics, {
        code: reason,
        severity: "error",
        message: "Playwright launch probe failed",
        details: {
          error: toErrorString(error),
          launchArgs,
          executablePath: chromiumExecutablePath,
          executablePathExists: chromiumExecutablePathExists,
          executablePathResolution: browserRuntime.executablePathResolution,
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
        },
      });
      pushDiagnostic(diagnostics, {
        code: "PLAYWRIGHT_BINARY_CHECK",
        message: "Playwright browser binary availability check completed via launch probe",
        severity: "error",
        details: {
          available: false,
          reason,
          launchProbe: "failed",
          error: toErrorString(error),
          launchArgs,
          executablePath: chromiumExecutablePath,
          executablePathExists: chromiumExecutablePathExists,
          executablePathResolution: browserRuntime.executablePathResolution,
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
          binariesPresentAtRuntime: chromiumExecutablePathExists,
        },
      });
      pushDiagnostic(diagnostics, {
        code: "ENVIRONMENT_UNSUPPORTED",
        severity: "error",
        message: "Rendered capture launch probe failed; chromium is not launchable in this runtime",
        details: {
          reason,
          error: toErrorString(error),
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
          executablePath: chromiumExecutablePath,
          executablePathExists: chromiumExecutablePathExists,
        },
      });
      pushDiagnostic(diagnostics, {
        code: "RENDERED_CAPTURE_UNAVAILABLE",
        severity: "warning",
        message: "Rendered capture unavailable due to browser launch incompatibility",
        details: {
          reason,
          error: toErrorString(error),
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
        },
      });
      pushDiagnostic(diagnostics, {
        code: "BROWSER_LAUNCH_FAILED",
        severity: "error",
        message: "Rendered capture browser failed to start",
        details: {
          error: toErrorString(error),
          launchFailureCode: reason,
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
        },
      });
      pushDiagnostic(diagnostics, {
        code: "RENDERED_CAPTURE_BROWSER_START_FAILED",
        severity: "error",
        message: "Rendered capture browser failed to start",
        details: {
          error: toErrorString(error),
          launchFailureCode: reason,
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
        },
      });
      pushDiagnostic(diagnostics, {
        code: "RENDERED_CAPTURE_SUPPORT_DECISION",
        message: "Rendered capture support decision finalized",
        details: {
          supported: false,
          reason: "LAUNCH_PROBE_FAILED",
          runtimeKind: environment.runtimeKind,
          browserPackageAvailable,
          browserBinaryAvailable: false,
          executablePath: chromiumExecutablePath,
          launchFailureCode: reason,
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
          executablePathResolution: browserRuntime.executablePathResolution,
        },
      });
      return {
        status: "unavailable",
        document: null,
        screenshots: [],
        computedStyleSamples: [],
        renderedObservedAssetUrls: [],
        diagnostics,
      };
    }

    try {
      pushDiagnostic(diagnostics, { code: "PAGE_CREATION_STARTED", message: "Starting browser context/page initialization" });
      const contextResult = await withTimeout({
        operation: browser.newContext({
          viewport: {
            width: input.viewport.width,
            height: input.viewport.height,
          },
        }),
        timeoutMs: Math.min(6_000, launchTimeoutMs),
        timeoutMessage: "PLAYWRIGHT_CONTEXT_TIMEOUT",
      });
      if (contextResult.timedOut) {
        browserBinaryAvailable = false;
        pushDiagnostic(diagnostics, {
          code: "PLAYWRIGHT_BINARY_CHECK",
          message: "Playwright browser binary availability check completed via launch probe",
          severity: "error",
          details: {
            available: false,
            reason: "PLAYWRIGHT_BROWSER_CONTEXT_FAILED",
            launchProbe: "failed",
            timeoutMs: Math.min(6_000, launchTimeoutMs),
            launchArgs,
            executablePath: chromiumExecutablePath,
            executablePathExists: chromiumExecutablePathExists,
            executablePathResolution: browserRuntime.executablePathResolution,
            selectedRuntimeMode: browserRuntime.mode,
            packageName: browserRuntime.packageName,
            binariesPresentAtRuntime: chromiumExecutablePathExists,
          },
        });
        pushDiagnostic(diagnostics, {
          code: "PLAYWRIGHT_BROWSER_CONTEXT_FAILED",
          severity: "error",
          message: "Playwright browser context creation timed out",
          details: {
            timeoutMs: Math.min(6_000, launchTimeoutMs),
            selectedRuntimeMode: browserRuntime.mode,
            packageName: browserRuntime.packageName,
          },
        });
        pushDiagnostic(diagnostics, {
          code: "RENDERED_CAPTURE_SUPPORT_DECISION",
          message: "Rendered capture support decision finalized",
          details: {
            supported: false,
            reason: "CONTEXT_PROBE_FAILED",
            runtimeKind: environment.runtimeKind,
            browserPackageAvailable,
            browserBinaryAvailable: false,
            executablePath: chromiumExecutablePath,
            launchFailureCode: "PLAYWRIGHT_BROWSER_CONTEXT_FAILED",
            selectedRuntimeMode: browserRuntime.mode,
            packageName: browserRuntime.packageName,
            executablePathResolution: browserRuntime.executablePathResolution,
          },
        });
        return {
          status: "unavailable",
          document: null,
          screenshots: [],
          computedStyleSamples: [],
          renderedObservedAssetUrls: [],
          diagnostics,
        };
      }
      context = contextResult.value;
      page = await context.newPage();
      pushDiagnostic(diagnostics, { code: "PAGE_CREATION_SUCCEEDED", message: "Browser context/page initialization succeeded" });
    } catch (error) {
      browserBinaryAvailable = false;
      pushDiagnostic(diagnostics, {
        code: "PLAYWRIGHT_BINARY_CHECK",
        message: "Playwright browser binary availability check completed via launch probe",
        severity: "error",
        details: {
          available: false,
          reason: "PLAYWRIGHT_BROWSER_CONTEXT_FAILED",
          launchProbe: "failed",
          error: toErrorString(error),
          launchArgs,
          executablePath: chromiumExecutablePath,
          executablePathExists: chromiumExecutablePathExists,
          executablePathResolution: browserRuntime.executablePathResolution,
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
          binariesPresentAtRuntime: chromiumExecutablePathExists,
        },
      });
      pushDiagnostic(diagnostics, {
        code: "PLAYWRIGHT_BROWSER_CONTEXT_FAILED",
        severity: "error",
        message: "Playwright browser context/page probe failed",
        details: {
          error: toErrorString(error),
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
        },
      });
      pushDiagnostic(diagnostics, {
        code: "BROWSER_LAUNCH_FAILED",
        severity: "error",
        message: "Rendered capture context/page initialization failed",
        details: {
          error: toErrorString(error),
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
        },
      });
      pushDiagnostic(diagnostics, {
        code: "RENDERED_CAPTURE_BROWSER_START_FAILED",
        severity: "error",
        message: "Rendered capture context/page initialization failed",
        details: {
          error: toErrorString(error),
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
        },
      });
      pushDiagnostic(diagnostics, {
        code: "RENDERED_CAPTURE_SUPPORT_DECISION",
        message: "Rendered capture support decision finalized",
        details: {
          supported: false,
          reason: "CONTEXT_PROBE_FAILED",
          runtimeKind: environment.runtimeKind,
          browserPackageAvailable,
          browserBinaryAvailable: false,
          executablePath: chromiumExecutablePath,
          launchFailureCode: "PLAYWRIGHT_BROWSER_CONTEXT_FAILED",
          selectedRuntimeMode: browserRuntime.mode,
          packageName: browserRuntime.packageName,
          executablePathResolution: browserRuntime.executablePathResolution,
        },
      });
      return {
        status: "unavailable",
        document: null,
        screenshots: [],
        computedStyleSamples: [],
        renderedObservedAssetUrls: [],
        diagnostics,
      };
    }

    pushDiagnostic(diagnostics, {
      code: "RENDERED_CAPTURE_SUPPORT_DECISION",
      message: "Rendered capture support decision finalized",
      details: {
        supported: true,
        reason: "LAUNCH_PROBE_PASSED",
        runtimeKind: environment.runtimeKind,
        browserPackageAvailable,
        browserBinaryAvailable,
        executablePath: chromiumExecutablePath,
        launchArgs,
        executablePathExists: chromiumExecutablePathExists,
        executablePathResolution: browserRuntime.executablePathResolution,
        selectedRuntimeMode: browserRuntime.mode,
        packageName: browserRuntime.packageName,
        binariesPresentAtRuntime: chromiumExecutablePathExists,
      },
    });

    try {
      pushDiagnostic(diagnostics, {
        code: "NAVIGATION_STARTED",
        message: "Starting browser navigation for rendered capture",
        details: { sourceUrl: input.sourceUrl, timeoutMs: input.readiness.navigationTimeoutMs },
      });
      await page.goto(input.sourceUrl, {
        waitUntil: "domcontentloaded",
        timeout: input.readiness.navigationTimeoutMs,
      });
      pushDiagnostic(diagnostics, {
        code: "NAVIGATION_SUCCEEDED",
        message: "Browser navigation completed for rendered capture",
        details: { finalUrl: typeof page.url === "function" ? page.url() : input.sourceUrl },
      });
    } catch (error) {
      pushDiagnostic(diagnostics, {
        code: "NAVIGATION_FAILED",
        severity: "error",
        message: "Rendered capture navigation failed",
        details: {
          error: toErrorString(error),
          sourceUrl: input.sourceUrl,
          navigationTimeoutMs: input.readiness.navigationTimeoutMs,
        },
      });
      pushDiagnostic(diagnostics, {
        code: "BROWSER_NAVIGATION_FAILED",
        severity: "error",
        message: "Browser navigation failed before rendered capture could complete",
        details: {
          error: toErrorString(error),
          sourceUrl: input.sourceUrl,
          navigationTimeoutMs: input.readiness.navigationTimeoutMs,
        },
      });
      return {
        status: "failed",
        document: null,
        screenshots: [],
        computedStyleSamples: [],
        renderedObservedAssetUrls: [],
        diagnostics,
      };
    }

    const shellContentMinLength = resolveReadinessNumber(input.readiness.shellContentMinLength, 120);
    const retryCount = resolveReadinessNumber(input.readiness.shellDetectionRetryCount, 1);
    const retryDelayMs = resolveReadinessNumber(input.readiness.shellDetectionRetryDelayMs, 1_500);

    let selectedReadinessState: "network_quiet" | "dom_stable" | "timeout_partial" = "dom_stable";
    let selectedDomCapture: DomCaptureResult | null = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      pushDiagnostic(diagnostics, {
        code: "READINESS_WAIT_STARTED",
        message: "Starting rendered capture readiness wait",
        details: { attempt: attempt + 1, maxAttempts: retryCount + 1 },
      });
      const readinessPhase = await executeBoundedCapturePhase({
        phase: "stabilization",
        diagnostics,
        startedAt,
        readiness: input.readiness,
        maxPhaseMs: Math.max(input.readiness.networkQuietTimeoutMs, input.readiness.domStabilizationWindowMs) + 750,
        details: { attempt: attempt + 1, maxAttempts: retryCount + 1 },
        operation: async () =>
          waitForReadinessPass({
            page,
            diagnostics,
            readiness: input.readiness,
            startedAt,
            attempt,
          }),
      });
      const readinessState = readinessPhase.value ?? "timeout_partial";
      if (readinessPhase.timedOut) {
        selectedReadinessState = "timeout_partial";
      } else {
        selectedReadinessState = readinessState;
      }
      pushDiagnostic(diagnostics, {
        code: "READINESS_WAIT_COMPLETED",
        message: "Rendered capture readiness wait completed",
        details: { attempt: attempt + 1, readinessState: selectedReadinessState },
      });

      pushDiagnostic(diagnostics, {
        code: "DOM_SERIALIZATION_STARTED",
        message: "Starting DOM serialization for rendered capture",
        details: { attempt: attempt + 1 },
      });
      const domPhase = await executeBoundedCapturePhase({
        phase: "dom_serialization",
        diagnostics,
        startedAt,
        readiness: input.readiness,
        details: { attempt: attempt + 1 },
        operation: async () => captureDomState(page),
      });
      if (domPhase.timedOut) {
        selectedReadinessState = "timeout_partial";
      }
      if (!domPhase.value) break;
      const domCapture = domPhase.value;
      selectedDomCapture = domCapture;
      if (!domCapture.domSerializationFailed) {
        pushDiagnostic(diagnostics, {
          code: "DOM_SERIALIZATION_SUCCEEDED",
          message: "Rendered capture DOM serialization succeeded",
          details: { attempt: attempt + 1, domLength: domCapture.html.trim().length },
        });
      }

      const isShellLike = isShellLikeContent({ quality: domCapture.quality, minLength: shellContentMinLength });
      if (!isShellLike) {
        if (attempt > 0) {
          pushDiagnostic(diagnostics, {
            code: "RENDERED_CAPTURE_RECOVERED_ON_RETRY",
            message: "Rendered capture recovered from shell-like output on retry",
            details: {
              retriesUsed: attempt,
              bodyTextLength: domCapture.quality.bodyTextLength,
            },
          });
        }
        break;
      }

      pushDiagnostic(diagnostics, {
        code: "RENDERED_CAPTURE_DOM_STILL_SHELL",
        severity: attempt < retryCount ? "warning" : "error",
        message:
          attempt < retryCount
            ? "Rendered DOM still appears shell-like; performing bounded retry"
            : "Rendered DOM remained shell-like after bounded retries",
        details: {
          attempt: attempt + 1,
          maxAttempts: retryCount + 1,
          quality: domCapture.quality,
          shellContentMinLength,
        },
      });

      if (attempt >= retryCount) break;
      if (hasExceededCaptureBudget({ startedAt, readiness: input.readiness })) {
        selectedReadinessState = "timeout_partial";
        break;
      }
      await sleep(retryDelayMs);
    }

    const screenshots: RenderedCaptureExecutorResult["screenshots"] = [];
    pushDiagnostic(diagnostics, {
      code: "SCREENSHOT_CAPTURE_STARTED",
      message: "Starting viewport screenshot capture",
      details: { captureType: "desktop_viewport" },
    });
    const viewportScreenshotPhase = await executeBoundedCapturePhase({
      phase: "screenshot_viewport",
      diagnostics,
      startedAt,
      readiness: input.readiness,
      details: { captureType: "desktop_viewport" },
      operation: async () => new Uint8Array(await page.screenshot({ type: "png", fullPage: false })),
    });
    if (viewportScreenshotPhase.timedOut) {
      selectedReadinessState = "timeout_partial";
      pushDiagnostic(diagnostics, {
        code: "SCREENSHOT_FAILED",
        severity: "warning",
        message: "Viewport screenshot capture timed out",
        details: { captureType: "desktop_viewport" },
      });
      pushDiagnostic(diagnostics, {
        code: "SCREENSHOT_CAPTURE_FAILED",
        severity: "warning",
        message: "Failed to capture desktop viewport screenshot",
        details: { captureType: "desktop_viewport", reason: "phase_timeout" },
      });
    } else if (viewportScreenshotPhase.value) {
      screenshots.push({
        captureType: "desktop_viewport",
        bytes: viewportScreenshotPhase.value,
        width: input.viewport.width,
        height: input.viewport.height,
        fullPage: false,
      });
      pushDiagnostic(diagnostics, {
        code: "SCREENSHOT_CAPTURE_SUCCEEDED",
        message: "Viewport screenshot capture succeeded",
        details: { captureType: "desktop_viewport", byteLength: viewportScreenshotPhase.value.length },
      });
    } else {
      pushDiagnostic(diagnostics, {
        code: "SCREENSHOT_FAILED",
        severity: "warning",
        message: "Viewport screenshot capture failed",
        details: { captureType: "desktop_viewport", reason: "phase_failed" },
      });
      pushDiagnostic(diagnostics, {
        code: "SCREENSHOT_CAPTURE_FAILED",
        severity: "warning",
        message: "Failed to capture desktop viewport screenshot",
        details: { captureType: "desktop_viewport", reason: "phase_failed" },
      });
    }

    pushDiagnostic(diagnostics, {
      code: "STYLE_SAMPLING_STARTED",
      message: "Starting computed style sampling for rendered capture",
    });
    const stylePhase = await executeBoundedCapturePhase({
      phase: "style_sampling",
      diagnostics,
      startedAt,
      readiness: input.readiness,
      operation: async () => captureComputedStyles(page),
    });
    let computedStyleSamples: ComputedStyleSample[] = [];
    let styleSamplingFailed = false;
    let styleSamplingError: string | null = null;
    let observedAssetUrls: string[] = [];
    if (stylePhase.timedOut) {
      selectedReadinessState = "timeout_partial";
      styleSamplingFailed = true;
      styleSamplingError = "phase_timeout";
    } else if (stylePhase.value) {
      computedStyleSamples = stylePhase.value.computedStyleSamples;
      styleSamplingFailed = stylePhase.value.styleSamplingFailed;
      styleSamplingError = stylePhase.value.styleSamplingError;
      observedAssetUrls = stylePhase.value.observedAssetUrls;
      if (!styleSamplingFailed) {
        pushDiagnostic(diagnostics, {
          code: "STYLE_SAMPLING_SUCCEEDED",
          message: "Computed style sampling completed",
          details: { sampleCount: computedStyleSamples.length },
        });
      }
    } else {
      styleSamplingFailed = true;
      styleSamplingError = "phase_failed";
    }

    pushDiagnostic(diagnostics, {
      code: "SCREENSHOT_CAPTURE_STARTED",
      message: "Starting full-page screenshot capture",
      details: { captureType: "desktop_fullpage" },
    });
    const fullPageScreenshotPhase = await executeBoundedCapturePhase({
      phase: "screenshot_fullpage",
      diagnostics,
      startedAt,
      readiness: input.readiness,
      details: { captureType: "desktop_fullpage" },
      operation: async () => new Uint8Array(await page.screenshot({ type: "png", fullPage: true })),
    });
    if (fullPageScreenshotPhase.timedOut) {
      selectedReadinessState = "timeout_partial";
      pushDiagnostic(diagnostics, {
        code: "SCREENSHOT_FAILED",
        severity: "warning",
        message: "Full-page screenshot capture timed out",
        details: { captureType: "desktop_fullpage" },
      });
      pushDiagnostic(diagnostics, {
        code: "SCREENSHOT_CAPTURE_FAILED",
        severity: "warning",
        message: "Failed to capture desktop full-page screenshot",
        details: { captureType: "desktop_fullpage", reason: "phase_timeout" },
      });
    } else if (fullPageScreenshotPhase.value) {
      screenshots.push({
        captureType: "desktop_fullpage",
        bytes: fullPageScreenshotPhase.value,
        width: input.viewport.width,
        height: input.viewport.height,
        fullPage: true,
      });
      pushDiagnostic(diagnostics, {
        code: "SCREENSHOT_CAPTURE_SUCCEEDED",
        message: "Full-page screenshot capture succeeded",
        details: { captureType: "desktop_fullpage", byteLength: fullPageScreenshotPhase.value.length },
      });
    } else {
      pushDiagnostic(diagnostics, {
        code: "SCREENSHOT_FAILED",
        severity: "warning",
        message: "Full-page screenshot capture failed",
        details: { captureType: "desktop_fullpage", reason: "phase_failed" },
      });
      pushDiagnostic(diagnostics, {
        code: "SCREENSHOT_CAPTURE_FAILED",
        severity: "warning",
        message: "Failed to capture desktop full-page screenshot",
        details: { captureType: "desktop_fullpage", reason: "phase_failed" },
      });
    }

    const assetManifestPhase = await executeBoundedCapturePhase({
      phase: "asset_manifest_finalization",
      diagnostics,
      startedAt,
      readiness: input.readiness,
      operation: async () => uniqueSortedStrings(observedAssetUrls),
    });
    if (assetManifestPhase.timedOut) {
      selectedReadinessState = "timeout_partial";
    }
    const finalizedObservedAssets = assetManifestPhase.value ?? [];

    const selectedDom = selectedDomCapture;
    const domHtml = selectedDom?.html.trim() ?? "";
    const hasScreenshots = screenshots.length > 0;

    if (selectedDom?.domSerializationFailed) {
      pushDiagnostic(diagnostics, {
        code: "DOM_EMPTY_AFTER_RENDER",
        severity: "warning",
        message: "Rendered capture could not serialize DOM HTML from browser context",
        details: { error: selectedDom.domSerializationError ?? "unknown" },
      });
      pushDiagnostic(diagnostics, {
        code: "RENDERED_CAPTURE_DOM_SERIALIZATION_FAILED",
        severity: "warning",
        message: "Rendered capture could not serialize DOM HTML from browser context",
        details: { error: selectedDom.domSerializationError ?? "unknown" },
      });
    }

    if (!domHtml) {
      pushDiagnostic(diagnostics, {
        code: "DOM_EMPTY_AFTER_RENDER",
        severity: hasScreenshots ? "warning" : "error",
        message: "Rendered capture produced empty DOM HTML after navigation/readiness",
      });
      pushDiagnostic(diagnostics, {
        code: "RENDERED_CAPTURE_DOM_EMPTY_AFTER_NAVIGATION",
        severity: hasScreenshots ? "warning" : "error",
        message: "Rendered capture produced empty DOM HTML after navigation/readiness",
      });
    }

    if (!domHtml && hasScreenshots) {
      pushDiagnostic(diagnostics, {
        code: "RENDERED_CAPTURE_SCREENSHOT_ONLY",
        severity: "warning",
        message: "Rendered capture produced screenshots without usable DOM HTML",
      });
    }

    if (styleSamplingFailed) {
      pushDiagnostic(diagnostics, {
        code: "STYLE_SAMPLING_FAILED",
        severity: "warning",
        message: "Computed style sampling failed during rendered capture",
        details: { error: styleSamplingError ?? "unknown" },
      });
      pushDiagnostic(diagnostics, {
        code: "RENDERED_CAPTURE_STYLE_SAMPLING_FAILED",
        severity: "warning",
        message: "Computed style sampling failed during rendered capture",
        details: { error: styleSamplingError ?? "unknown" },
      });
    }

    if (computedStyleSamples.length === 0 && hasScreenshots && domHtml.length > 0) {
      pushDiagnostic(diagnostics, {
        code: "STYLE_SAMPLING_FAILED",
        severity: "warning",
        message: "Rendered page was visible but computed style sampling yielded no samples",
      });
      pushDiagnostic(diagnostics, {
        code: "RENDERED_CAPTURE_STYLE_SAMPLING_FAILED",
        severity: "warning",
        message: "Rendered page was visible but computed style sampling yielded no samples",
      });
    }

    if (computedStyleSamples.length < 3) {
      pushDiagnostic(diagnostics, {
        code: "COMPUTED_STYLE_SAMPLE_WEAK",
        severity: "warning",
        message: "Computed style sampling captured fewer than three targets",
        details: { sampleCount: computedStyleSamples.length },
      });
    }

    if (selectedReadinessState === "timeout_partial") {
      pushDiagnostic(diagnostics, {
        code: "RENDERED_CAPTURE_PARTIAL",
        severity: "warning",
        message: "Rendered capture completed with partial confidence",
      });
    }

    const responseAssemblyPhase = await executeBoundedCapturePhase({
      phase: "response_assembly",
      diagnostics,
      startedAt,
      readiness: input.readiness,
      operation: async () => {
        const status = resolveCaptureStatus({
          requestedStatus: selectedReadinessState === "timeout_partial" ? "partial" : "available",
          html: domHtml,
          screenshots,
          computedStyleSamples,
        });
        if (status === "partial") {
          pushDiagnostic(diagnostics, {
            code: "RENDERED_CAPTURE_PARTIAL",
            severity: "warning",
            message: "Rendered capture produced partial evidence",
          });
        }

        const hasDomEvidence = domHtml.length > 0;
        const hasAnyEvidence = hasDomEvidence || hasScreenshots || computedStyleSamples.length > 0;
        const document =
          hasDomEvidence
            ? {
                html: selectedDom?.html ?? "",
                readinessState: selectedReadinessState,
              }
            : null;

        return {
          status: hasAnyEvidence ? status : "failed",
          document,
          screenshots,
          computedStyleSamples,
          renderedObservedAssetUrls: finalizedObservedAssets,
        };
      },
    });
    if (responseAssemblyPhase.timedOut || !responseAssemblyPhase.value) {
      pushDiagnostic(diagnostics, {
        code: "RENDERED_CAPTURE_FAILED",
        severity: "error",
        message: "Rendered capture timed out while assembling response",
      });
      return {
        status: "failed",
        document: null,
        screenshots,
        computedStyleSamples,
        renderedObservedAssetUrls: finalizedObservedAssets,
        diagnostics,
      };
    }

    return {
      ...responseAssemblyPhase.value,
      diagnostics,
    };
  } catch (error) {
    pushDiagnostic(diagnostics, {
      code: "RENDERED_CAPTURE_FAILED",
      severity: "error",
      message: "Rendered capture execution failed",
      details: { error: toErrorString(error) },
    });
    return {
      status: "failed",
      document: null,
      screenshots: [],
      computedStyleSamples: [],
      renderedObservedAssetUrls: [],
      diagnostics,
    };
  } finally {
    pushDiagnostic(diagnostics, {
      code: "CLEANUP_STARTED",
      message: "Rendered capture cleanup started",
    });
    try {
      await page?.close?.();
    } catch {
      // no-op
    }
    try {
      await context?.close?.();
    } catch {
      // no-op
    }
    try {
      await browser?.close?.();
    } catch {
      // no-op
    }
    pushDiagnostic(diagnostics, {
      code: "CLEANUP_COMPLETED",
      message: "Rendered capture cleanup completed",
    });
  }
}

export async function runRenderedCapture(input: {
  sourceUrl: string;
  snapshotRootDirAbs: string;
  executor?: RenderedCaptureExecutor;
  viewport?: RenderedCaptureViewport;
  readinessPolicy?: RenderedCaptureReadinessPolicy;
}): Promise<RenderedCaptureResult> {
  const viewport = input.viewport ?? DEFAULT_RENDERED_CAPTURE_VIEWPORT;
  const readiness = input.readinessPolicy ?? DEFAULT_RENDERED_CAPTURE_READINESS_POLICY;
  const executor = input.executor ?? defaultRenderedCaptureExecutor;

  const result = await executor({
    sourceUrl: input.sourceUrl,
    snapshotRootDirAbs: input.snapshotRootDirAbs,
    viewport,
    readiness,
  });

  const screenshotsDirAbs = path.resolve(input.snapshotRootDirAbs, "rendered-capture", "screenshots");
  fs.mkdirSync(screenshotsDirAbs, { recursive: true });

  const screenshots: RenderedCaptureResult["screenshots"] = [];
  for (const screenshot of result.screenshots) {
    const fileName = `${screenshot.captureType}.png`;
    const filePathAbs = path.resolve(screenshotsDirAbs, fileName);
    fs.writeFileSync(filePathAbs, screenshot.bytes);
    screenshots.push({
      kind: "rendered_screenshot_artifact_v1",
      screenshotId: sha256Hex(`${screenshot.captureType}:${fileName}`).slice(0, 16),
      captureType: screenshot.captureType,
      filePathAbs,
      width: screenshot.width,
      height: screenshot.height,
      fullPage: screenshot.fullPage,
    });
  }

  const documents: RenderedCaptureResult["documents"] = [];
  if (result.document?.html && result.document.html.trim().length > 0) {
    const renderedHtmlPathAbs = path.resolve(input.snapshotRootDirAbs, "rendered-capture", "rendered-dom.html");
    fs.mkdirSync(path.dirname(renderedHtmlPathAbs), { recursive: true });
    fs.writeFileSync(renderedHtmlPathAbs, result.document.html, "utf8");
    documents.push({
      kind: "rendered_document_snapshot_v1",
      sourceUrl: input.sourceUrl,
      htmlPathAbs: renderedHtmlPathAbs,
      htmlSha256: sha256Hex(result.document.html),
      readinessState: result.document.readinessState,
    });
  }

  const computedStyleSamples = [...result.computedStyleSamples];
  const resolvedStatus = resolveCaptureStatus({
    requestedStatus: result.status,
    html: result.document?.html ?? "",
    screenshots: result.screenshots,
    computedStyleSamples,
  });
  const resolvedSourceMode = documents.length > 0 && (resolvedStatus === "available" || resolvedStatus === "partial") ? "rendered_dom" : "raw_html";

  return {
    kind: "rendered_capture_result_v1",
    version: RENDERED_CAPTURE_FOUNDATION_VERSION,
    status: resolvedStatus,
    sourceMode: resolvedSourceMode,
    documents,
    screenshots,
    computedStyleSamples,
    renderedObservedAssetUrls: uniqueSortedStrings(result.renderedObservedAssetUrls),
    diagnostics: [...result.diagnostics],
  };
}
