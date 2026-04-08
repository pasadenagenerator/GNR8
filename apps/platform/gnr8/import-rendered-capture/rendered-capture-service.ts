import crypto from "node:crypto";
import fs from "node:fs";
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

function resolveDynamicImport(): (specifier: string) => Promise<unknown> {
  return new Function("specifier", "return import(specifier);") as (specifier: string) => Promise<unknown>;
}

function toErrorString(error: unknown): string {
  return String((error as Error)?.message ?? error);
}

type BrowserStyleProbe = {
  target: ComputedStyleSample["target"];
  selector: string;
};

const STYLE_PROBES: readonly BrowserStyleProbe[] = [
  { target: "root", selector: "body" },
  { target: "header_nav", selector: "header, nav" },
  { target: "hero", selector: "section.hero, [class*='hero'], [id*='hero'], main section" },
  { target: "h1", selector: "h1" },
  { target: "h2", selector: "h2" },
  { target: "h3", selector: "h3" },
  { target: "body_text", selector: "p, article p, main p" },
  { target: "primary_cta", selector: "a.button, button, [role='button'], a[class*='btn'], a[class*='cta']" },
  { target: "card", selector: "[class*='card'], .grid > *, .cards > *" },
  { target: "footer", selector: "footer" },
] as const;

async function defaultRenderedCaptureExecutor(input: RenderedCaptureExecutorInput): Promise<RenderedCaptureExecutorResult> {
  const diagnostics: RenderedCaptureDiagnostic[] = [];

  let playwright: any = null;
  try {
    const importDynamic = resolveDynamicImport();
    playwright = await importDynamic("playwright");
  } catch (error) {
    diagnostics.push({
      code: "RENDERED_CAPTURE_UNAVAILABLE",
      severity: "warning",
      message: "Playwright runtime unavailable; rendered capture skipped",
      details: { error: toErrorString(error) },
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

  const chromium = playwright?.chromium;
  if (!chromium) {
    diagnostics.push({
      code: "RENDERED_CAPTURE_UNAVAILABLE",
      severity: "warning",
      message: "Playwright chromium runtime unavailable; rendered capture skipped",
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

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: {
        width: input.viewport.width,
        height: input.viewport.height,
      },
    });

    page = await context.newPage();
    await page.goto(input.sourceUrl, {
      waitUntil: "domcontentloaded",
      timeout: input.readiness.navigationTimeoutMs,
    });

    let readinessState: "network_quiet" | "dom_stable" | "timeout_partial" = "dom_stable";
    try {
      await page.waitForLoadState("networkidle", { timeout: input.readiness.networkQuietTimeoutMs });
      readinessState = "network_quiet";
    } catch {
      diagnostics.push({
        code: "RENDERED_CAPTURE_TIMEOUT",
        severity: "warning",
        message: "Network quiet timeout reached; continuing with DOM stabilization fallback",
        details: { networkQuietTimeoutMs: input.readiness.networkQuietTimeoutMs },
      });
      readinessState = "timeout_partial";
    }

    const stabilizationDeadline = Date.now() + input.readiness.domStabilizationWindowMs;
    let previousHash = "";
    let stableTicks = 0;
    while (Date.now() < stabilizationDeadline) {
      const html = await page.content();
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

    if (Date.now() - startedAt > input.readiness.maxTotalCaptureMs) {
      diagnostics.push({
        code: "RENDERED_CAPTURE_TIMEOUT",
        severity: "warning",
        message: "Rendered capture reached bounded max timeout; returning partial evidence",
        details: { maxTotalCaptureMs: input.readiness.maxTotalCaptureMs },
      });
      readinessState = "timeout_partial";
    }

    const renderedHtml = await page.content();

    const screenshots: RenderedCaptureExecutorResult["screenshots"] = [];
    try {
      const viewportBytes = new Uint8Array(await page.screenshot({ type: "png", fullPage: false }));
      screenshots.push({
        captureType: "desktop_viewport",
        bytes: viewportBytes,
        width: input.viewport.width,
        height: input.viewport.height,
        fullPage: false,
      });
    } catch (error) {
      diagnostics.push({
        code: "SCREENSHOT_CAPTURE_FAILED",
        severity: "warning",
        message: "Failed to capture desktop viewport screenshot",
        details: { error: toErrorString(error), captureType: "desktop_viewport" },
      });
    }

    try {
      const fullPageBytes = new Uint8Array(await page.screenshot({ type: "png", fullPage: true }));
      screenshots.push({
        captureType: "desktop_fullpage",
        bytes: fullPageBytes,
        width: input.viewport.width,
        height: input.viewport.height,
        fullPage: true,
      });
    } catch (error) {
      diagnostics.push({
        code: "SCREENSHOT_CAPTURE_FAILED",
        severity: "warning",
        message: "Failed to capture desktop full-page screenshot",
        details: { error: toErrorString(error), captureType: "desktop_fullpage" },
      });
    }

    const styleSamplesRaw = await page.evaluate((probes: BrowserStyleProbe[]) => {
      function sampleFor(selector: string) {
        const el = document.querySelector(selector) as HTMLElement | null;
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

      const out: Array<{
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
        const sampled = sampleFor(probe.selector);
        if (!sampled) continue;
        out.push({
          target: probe.target,
          selector: probe.selector,
          tagName: sampled.tagName,
          className: sampled.className,
          styles: sampled.styles,
        });
      }

      const observedAssetUrls = Array.from(
        new Set(
          [
            ...Array.from(document.querySelectorAll("img[src]")).map((n) => (n as HTMLImageElement).src),
            ...Array.from(document.querySelectorAll("script[src]")).map((n) => (n as HTMLScriptElement).src),
            ...Array.from(document.querySelectorAll("link[href]")).map((n) => (n as HTMLLinkElement).href),
          ].filter((v): v is string => typeof v === "string" && v.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b));

      return { samples: out, observedAssetUrls };
    }, [...STYLE_PROBES]);

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

    if (computedStyleSamples.length < 3) {
      diagnostics.push({
        code: "COMPUTED_STYLE_SAMPLE_WEAK",
        severity: "warning",
        message: "Computed style sampling captured fewer than three targets",
        details: { sampleCount: computedStyleSamples.length },
      });
    }

    if (readinessState === "timeout_partial") {
      diagnostics.push({
        code: "RENDERED_CAPTURE_PARTIAL",
        severity: "warning",
        message: "Rendered capture completed with partial confidence",
      });
    }

    return {
      status: "available",
      document: {
        html: renderedHtml,
        readinessState,
      },
      screenshots,
      computedStyleSamples,
      renderedObservedAssetUrls: uniqueSortedStrings(styleSamplesRaw.observedAssetUrls),
      diagnostics,
    };
  } catch (error) {
    diagnostics.push({
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
  if (result.document?.html) {
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

  const resolvedSourceMode = documents.length > 0 && result.status === "available" ? "rendered_dom" : "raw_html";

  return {
    kind: "rendered_capture_result_v1",
    version: RENDERED_CAPTURE_FOUNDATION_VERSION,
    status: result.status,
    sourceMode: resolvedSourceMode,
    documents,
    screenshots,
    computedStyleSamples: result.computedStyleSamples,
    renderedObservedAssetUrls: uniqueSortedStrings(result.renderedObservedAssetUrls),
    diagnostics: [...result.diagnostics],
  };
}
