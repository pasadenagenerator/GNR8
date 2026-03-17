import crypto from "node:crypto";

import type { JsonValue } from "../../import/import-contract";
import type { PipelineDiagnosticIssue, PipelineDiagnosticSeverity, PipelineStageId } from "../pipeline-contract";

const SEVERITY_RANK: Record<PipelineDiagnosticSeverity, number> = {
  fatal: 0,
  error: 1,
  warning: 2,
  info: 3,
};

export function stableStringify(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const v = value[key];
      if (v === undefined) continue;
      parts.push(`${JSON.stringify(key)}:${stableStringify(v)}`);
    }
    return `{${parts.join(",")}}`;
  }
  return "null";
}

export function sha256Hex(data: Uint8Array | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function createPipelineDiagnosticIssue(input: {
  stageId: PipelineStageId;
  source: PipelineDiagnosticIssue["source"];
  severity: PipelineDiagnosticSeverity;
  code: string;
  message: string;
  location: PipelineDiagnosticIssue["location"];
  details: JsonValue | null;
}): PipelineDiagnosticIssue {
  const idPayload: JsonValue = {
    stageId: input.stageId,
    source: input.source,
    severity: input.severity,
    code: input.code,
    message: input.message,
    location: input.location,
  };

  return {
    id: sha256Hex(stableStringify(idPayload)),
    stageId: input.stageId,
    source: input.source,
    severity: input.severity,
    code: input.code,
    message: input.message,
    location: input.location,
    details: input.details,
  };
}

export function sortPipelineDiagnosticIssues(issues: PipelineDiagnosticIssue[]): PipelineDiagnosticIssue[] {
  return [...issues].sort((a, b) => {
    if (a.stageId !== b.stageId) return a.stageId < b.stageId ? -1 : 1;

    const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sev !== 0) return sev;
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;

    const aPath = a.location?.path ?? "";
    const bPath = b.location?.path ?? "";
    if (aPath !== bPath) return aPath < bPath ? -1 : 1;

    if (a.message !== b.message) return a.message < b.message ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

