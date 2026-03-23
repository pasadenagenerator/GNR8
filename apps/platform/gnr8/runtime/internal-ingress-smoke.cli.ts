import assert from "node:assert/strict";

import {
  resolveActiveArtifactForHostAndPathWithDiagnostics,
  type PublicRuntimeArtifactResolution,
} from "@/gnr8/runtime/runtime-store";

type CaseStatus = "pass" | "fail";

type HttpProbeResult = {
  host: string;
  path: string;
  url: string;
  status: number;
  ok: boolean;
  bodySample: string;
  htmlLength: number;
};

type ResolutionCheckResult = {
  outcome: PublicRuntimeArtifactResolution["outcome"];
  siteResolution: PublicRuntimeArtifactResolution["siteResolution"];
  hostBindingId: string | null;
  hostBindingKind: string | null;
  hostBindingStatus: string | null;
  reasonCode: string | null;
};

type ResolutionLogPayload = {
  source: "runtime_resolver_diagnostics";
  outcome: string;
  mode: string;
  host: string;
  path: string;
  siteResolution: "host_match" | "fallback_latest_site" | "none";
  siteId: string | null;
  siteVersionId: string | null;
  artifactId: string | null;
  hostBindingId: string | null;
  hostBindingKind: string | null;
  hostBindingStatus: string | null;
  reasonCode: string | null;
  resolvedPath: string | null;
  ts: string;
};

type CaseResult = {
  name: string;
  status: CaseStatus;
  checks: Array<{ label: string; ok: boolean; details: string }>;
  http: HttpProbeResult;
  diagnostics: ResolutionCheckResult;
  runtimeLogs: ResolutionLogPayload[];
};

type SmokeReport = {
  kind: "gnr8_internal_ingress_smoke_report_v1";
  generatedAt: string;
  config: {
    boundHost: string;
    unboundHost: string;
    path: string;
    timeoutMs: number;
    enforceArtifactOnly404OnUnbound: boolean;
    httpScheme: "https" | "http";
    ingressBaseUrl: string | null;
    hostHeaderMode: "auto" | "forced";
  };
  summary: {
    passed: number;
    failed: number;
    totalCases: number;
  };
  cases: CaseResult[];
};

const DEFAULT_BOUND_HOST = "maver.gnr8.app";
const DEFAULT_UNBOUND_HOST = "unbound-shadow-host.gnr8.app";
const DEFAULT_PATH = "/";
const DEFAULT_TIMEOUT_MS = 15_000;

function readArg(flag: string): string | null {
  const prefix = `--${flag}=`;
  const entry = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!entry) return null;
  const value = entry.slice(prefix.length).trim();
  return value.length > 0 ? value : null;
}

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(`--${flag}`);
}

function parseListArg(flag: string, fallback: string[]): string[] {
  const value = readArg(flag);
  if (!value) return fallback;
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function buildTargetUrl(input: {
  scheme: "https" | "http";
  host: string;
  path: string;
  ingressBaseUrl: string | null;
}): { url: string; hostHeader: string | null; hostHeaderMode: "auto" | "forced" } {
  const normalizedPath = input.path.startsWith("/") ? input.path : `/${input.path}`;
  if (!input.ingressBaseUrl) {
    return {
      url: `${input.scheme}://${input.host}${normalizedPath}`,
      hostHeader: null,
      hostHeaderMode: "auto",
    };
  }

  const base = input.ingressBaseUrl.endsWith("/")
    ? input.ingressBaseUrl.slice(0, -1)
    : input.ingressBaseUrl;
  return {
    url: `${base}${normalizedPath}`,
    hostHeader: input.host,
    hostHeaderMode: "forced",
  };
}

async function fetchHtmlProbe(input: {
  host: string;
  path: string;
  timeoutMs: number;
  scheme: "https" | "http";
  ingressBaseUrl: string | null;
}): Promise<{ probe: HttpProbeResult; body: string; hostHeaderMode: "auto" | "forced" }> {
  const target = buildTargetUrl(input);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await fetch(target.url, {
      method: "GET",
      headers: {
        accept: "text/html,application/xhtml+xml",
        ...(target.hostHeader ? { host: target.hostHeader, "x-forwarded-host": target.hostHeader } : null),
      },
      signal: controller.signal,
      redirect: "manual",
    });

    const body = await response.text();
    return {
      hostHeaderMode: target.hostHeaderMode,
      body,
      probe: {
        host: input.host,
        path: input.path,
        url: target.url,
        status: response.status,
        ok: response.ok,
        bodySample: body.slice(0, 400),
        htmlLength: body.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    return {
      hostHeaderMode: target.hostHeaderMode,
      body: "",
      probe: {
        host: input.host,
        path: input.path,
        url: target.url,
        status: 599,
        ok: false,
        bodySample: message.slice(0, 400),
        htmlLength: 0,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function assertIncludesAll(input: { html: string; markers: string[]; label: string }): Array<{ label: string; ok: boolean; details: string }> {
  return input.markers.map((marker) => {
    const ok = input.html.includes(marker);
    return {
      label: `${input.label}: contains \"${marker}\"`,
      ok,
      details: ok ? "found" : "missing",
    };
  });
}

function assertExcludesAll(input: { html: string; markers: string[]; label: string }): Array<{ label: string; ok: boolean; details: string }> {
  return input.markers.map((marker) => {
    const ok = !input.html.includes(marker);
    return {
      label: `${input.label}: excludes \"${marker}\"`,
      ok,
      details: ok ? "not-found" : "unexpected-presence",
    };
  });
}

function buildResolutionLog(input: {
  resolution: PublicRuntimeArtifactResolution;
  mode: "artifact-only" | "artifact-with-builder-fallback";
}): ResolutionLogPayload {
  const reasonCode =
    input.resolution.outcome === "artifact_miss"
      ? input.resolution.reasonCode
      : input.resolution.siteResolution === "fallback_latest_site"
        ? "fallback_latest_site"
        : null;

  return {
    source: "runtime_resolver_diagnostics",
    outcome: input.resolution.outcome,
    mode: input.mode,
    host: input.resolution.host,
    path: input.resolution.path,
    siteResolution: input.resolution.siteResolution,
    siteId: input.resolution.siteId,
    siteVersionId: input.resolution.activeSiteVersionId,
    artifactId: input.resolution.artifactId,
    hostBindingId: input.resolution.hostBindingId,
    hostBindingKind: input.resolution.hostBindingKind,
    hostBindingStatus: input.resolution.hostBindingStatus,
    reasonCode,
    resolvedPath: input.resolution.outcome === "artifact_hit" ? input.resolution.resolvedPath : null,
    ts: new Date().toISOString(),
  };
}

function emitResolutionLog(entry: ResolutionLogPayload): void {
  console.info(`[gnr8.runtime.ingress-smoke.resolution] ${JSON.stringify(entry)}`);
}

function captureResolutionLogs(input: {
  host: string;
  path: string;
  mode: "artifact-only" | "artifact-with-builder-fallback";
  resolution: PublicRuntimeArtifactResolution;
}): ResolutionLogPayload[] {
  const log = buildResolutionLog({
    resolution: input.resolution,
    mode: input.mode,
  });
  emitResolutionLog(log);
  return [log];
}

function flattenChecks(checks: Array<{ label: string; ok: boolean; details: string }>): CaseStatus {
  return checks.every((entry) => entry.ok) ? "pass" : "fail";
}

function getReasonCode(resolution: PublicRuntimeArtifactResolution): string | null {
  if (resolution.outcome === "artifact_miss") return resolution.reasonCode;
  return resolution.siteResolution === "fallback_latest_site" ? "fallback_latest_site" : null;
}

async function evaluateBoundHostCase(input: {
  host: string;
  path: string;
  timeoutMs: number;
  htmlRequiredMarkers: string[];
  htmlForbiddenBuilderMarkers: string[];
  scheme: "https" | "http";
  ingressBaseUrl: string | null;
}): Promise<CaseResult> {
  const { probe, body } = await fetchHtmlProbe({
    host: input.host,
    path: input.path,
    timeoutMs: input.timeoutMs,
    scheme: input.scheme,
    ingressBaseUrl: input.ingressBaseUrl,
  });

  const resolution = await resolveActiveArtifactForHostAndPathWithDiagnostics({
    host: input.host,
    path: input.path,
  });

  const runtimeLogs = captureResolutionLogs({
    host: input.host,
    path: input.path,
    resolution,
    mode: "artifact-only",
  });

  const checks: Array<{ label: string; ok: boolean; details: string }> = [
    {
      label: "bound host HTTP status is 2xx",
      ok: probe.status >= 200 && probe.status <= 299,
      details: `status=${probe.status}`,
    },
    {
      label: "bound host diagnostics resolve artifact_hit",
      ok: resolution.outcome === "artifact_hit",
      details: `outcome=${resolution.outcome}`,
    },
    {
      label: "bound host diagnostics use host_match",
      ok: resolution.siteResolution === "host_match",
      details: `siteResolution=${resolution.siteResolution}`,
    },
    {
      label: "bound host diagnostics include host binding metadata",
      ok:
        resolution.hostBindingId !== null &&
        resolution.hostBindingId.length > 0 &&
        resolution.hostBindingKind !== null &&
        resolution.hostBindingKind.length > 0 &&
        resolution.hostBindingStatus !== null,
      details: `bindingId=${resolution.hostBindingId ?? "<null>"} bindingKind=${resolution.hostBindingKind ?? "<null>"} bindingStatus=${resolution.hostBindingStatus ?? "<null>"}`,
    },
    {
      label: "bound host avoids fallback_latest_site resolution path",
      ok: resolution.siteResolution !== "fallback_latest_site",
      details: `siteResolution=${resolution.siteResolution}`,
    },
    {
      label: "bound host runtime logs include artifact_hit",
      ok: runtimeLogs.some((entry) => entry.outcome === "artifact_hit"),
      details: `logCount=${runtimeLogs.length}`,
    },
    {
      label: "bound host runtime logs indicate host_match path",
      ok: runtimeLogs.some((entry) => entry.siteResolution === "host_match"),
      details: runtimeLogs.map((entry) => `outcome=${entry.outcome}:siteResolution=${entry.siteResolution}`).join(",") || "no-runtime-logs",
    },
  ];

  checks.push(
    ...assertIncludesAll({
      html: body,
      markers: input.htmlRequiredMarkers,
      label: "bound host artifact HTML marker",
    }),
  );

  checks.push(
    ...assertExcludesAll({
      html: body,
      markers: input.htmlForbiddenBuilderMarkers,
      label: "bound host builder marker",
    }),
  );

  return {
    name: "bound-shadow-host",
    status: flattenChecks(checks),
    checks,
    http: probe,
    diagnostics: {
      outcome: resolution.outcome,
      siteResolution: resolution.siteResolution,
      hostBindingId: resolution.hostBindingId,
      hostBindingKind: resolution.hostBindingKind,
      hostBindingStatus: resolution.hostBindingStatus,
      reasonCode: getReasonCode(resolution),
    },
    runtimeLogs,
  };
}

async function evaluateUnboundHostCase(input: {
  host: string;
  path: string;
  timeoutMs: number;
  enforceArtifactOnly404OnUnbound: boolean;
  scheme: "https" | "http";
  ingressBaseUrl: string | null;
}): Promise<CaseResult> {
  const { probe } = await fetchHtmlProbe({
    host: input.host,
    path: input.path,
    timeoutMs: input.timeoutMs,
    scheme: input.scheme,
    ingressBaseUrl: input.ingressBaseUrl,
  });

  const resolution = await resolveActiveArtifactForHostAndPathWithDiagnostics({
    host: input.host,
    path: input.path,
  });

  const runtimeLogs = captureResolutionLogs({
    host: input.host,
    path: input.path,
    resolution,
    mode: "artifact-only",
  });

  const checks: Array<{ label: string; ok: boolean; details: string }> = [
    {
      label: "unbound host diagnostics are observable",
      ok: resolution.siteResolution === "fallback_latest_site" || resolution.siteResolution === "none",
      details: `siteResolution=${resolution.siteResolution}`,
    },
    {
      label: "unbound host path behavior is logged",
      ok:
        runtimeLogs.some((entry) => entry.reasonCode === "fallback_latest_site") ||
        runtimeLogs.some((entry) => entry.outcome === "artifact_miss") ||
        runtimeLogs.some((entry) => entry.outcome === "artifact_only_404"),
      details: runtimeLogs.map((entry) => `outcome=${entry.outcome}:reason=${String(entry.reasonCode)}`).join(",") || "no-runtime-logs",
    },
  ];

  if (input.enforceArtifactOnly404OnUnbound) {
    checks.push({
      label: "unbound host returns controlled artifact-only 404",
      ok: probe.status === 404,
      details: `status=${probe.status}`,
    });

    checks.push({
      label: "unbound host diagnostics do not resolve to fallback artifact when 404 is enforced",
      ok: resolution.siteResolution !== "fallback_latest_site" || resolution.outcome === "artifact_miss",
      details: `siteResolution=${resolution.siteResolution} outcome=${resolution.outcome}`,
    });
  } else {
    checks.push({
      label: "unbound host HTTP response is deterministic (200/404 expected)",
      ok: probe.status === 200 || probe.status === 404,
      details: `status=${probe.status}`,
    });
  }

  return {
    name: "unbound-host-negative",
    status: flattenChecks(checks),
    checks,
    http: probe,
    diagnostics: {
      outcome: resolution.outcome,
      siteResolution: resolution.siteResolution,
      hostBindingId: resolution.hostBindingId,
      hostBindingKind: resolution.hostBindingKind,
      hostBindingStatus: resolution.hostBindingStatus,
      reasonCode: getReasonCode(resolution),
    },
    runtimeLogs,
  };
}

function printHumanSummary(report: SmokeReport): void {
  console.log("GNR8 Internal Runtime Ingress Smoke");
  console.log(
    `cases=${report.summary.totalCases} passed=${report.summary.passed} failed=${report.summary.failed} boundHost=${report.config.boundHost} unboundHost=${report.config.unboundHost} path=${report.config.path}`,
  );

  for (const item of report.cases) {
    console.log(`case=${item.name} status=${item.status} statusCode=${item.http.status} siteResolution=${item.diagnostics.siteResolution} outcome=${item.diagnostics.outcome}`);
    for (const check of item.checks) {
      console.log(`  [${check.ok ? "PASS" : "FAIL"}] ${check.label} (${check.details})`);
    }
  }
}

async function main(): Promise<void> {
  const boundHost = readArg("bound-host") ?? DEFAULT_BOUND_HOST;
  const unboundHost = readArg("unbound-host") ?? DEFAULT_UNBOUND_HOST;
  const path = readArg("path") ?? DEFAULT_PATH;
  const timeoutMs = Number(readArg("timeout-ms") ?? DEFAULT_TIMEOUT_MS);
  const enforceArtifactOnly404OnUnbound = hasFlag("expect-unbound-404");
  const jsonOnly = hasFlag("json");
  const scheme = (readArg("scheme") === "http" ? "http" : "https") as "https" | "http";
  const ingressBaseUrl = readArg("ingress-base-url");

  assert.ok(Number.isFinite(timeoutMs) && timeoutMs > 0, "timeout-ms must be a positive number");

  const htmlRequiredMarkers = parseListArg("required-markers", ["data-gnr8-"]);
  const htmlForbiddenBuilderMarkers = parseListArg("forbidden-builder-markers", [
    "@chaibuilder",
    "chaibuilder",
    "data-chai-",
    "data-builder-",
  ]);

  const boundCase = await evaluateBoundHostCase({
    host: boundHost,
    path,
    timeoutMs,
    htmlRequiredMarkers,
    htmlForbiddenBuilderMarkers,
    scheme,
    ingressBaseUrl,
  });

  const unboundCase = await evaluateUnboundHostCase({
    host: unboundHost,
    path,
    timeoutMs,
    enforceArtifactOnly404OnUnbound,
    scheme,
    ingressBaseUrl,
  });

  const cases = [boundCase, unboundCase];
  const summary = {
    passed: cases.filter((item) => item.status === "pass").length,
    failed: cases.filter((item) => item.status === "fail").length,
    totalCases: cases.length,
  };

  const hostHeaderMode = ingressBaseUrl ? "forced" : "auto";

  const report: SmokeReport = {
    kind: "gnr8_internal_ingress_smoke_report_v1",
    generatedAt: new Date().toISOString(),
    config: {
      boundHost,
      unboundHost,
      path,
      timeoutMs,
      enforceArtifactOnly404OnUnbound,
      httpScheme: scheme,
      ingressBaseUrl,
      hostHeaderMode,
    },
    summary,
    cases,
  };

  console.log(`[gnr8.runtime.ingress-smoke] ${JSON.stringify(report)}`);
  if (!jsonOnly) printHumanSummary(report);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error";
  console.error(`[gnr8.runtime.ingress-smoke.error] ${message}`);
  process.exitCode = 1;
});
