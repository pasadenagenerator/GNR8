import path from "node:path";

import type { ExecutionMode } from "./execution-plan-model";
import type { ExecutionMaterialization, ExecutionMaterializationStatus } from "./execution-result-model";

export const TEMP_PREVIEW_ROUTE_RULE = "validation_previews_by_output_key_v1" as const;

export type ExecutionPreviewHostingStatus =
  | "available"
  | "not_available_simulation_mode"
  | "not_available_materialization_not_ready"
  | "not_available_missing_output_root"
  | "not_available_unsupported_output_root";

export type ExecutionPreviewHosting = {
  status: ExecutionPreviewHostingStatus;
  available: boolean;
  routeRule: typeof TEMP_PREVIEW_ROUTE_RULE;
  previewRootUrl: string | null;
  previewEntryUrl: string | null;
  previewKey: string | null;
  reasonCode: string | null;
};

export type PreviewBundleResolveFailureCode =
  | "INVALID_PREVIEW_KEY"
  | "UNSUPPORTED_OUTPUT_ROOT"
  | "INVALID_PREVIEW_PATH"
  | "MISSING_BUNDLE_ROOT";

export type PreviewBundleResolveResult =
  | {
      ok: true;
      outputRootPath: string;
      relativePath: string;
      absolutePath: string;
    }
  | {
      ok: false;
      code: PreviewBundleResolveFailureCode;
      message: string;
    };

function isMaterializationReady(status: ExecutionMaterializationStatus): boolean {
  return status === "materialized" || status === "materialized_with_warnings";
}

function normalizeOutputRootPath(outputRootPath: string): string {
  return path.resolve(outputRootPath);
}

export function isSupportedPreviewOutputRoot(outputRootPath: string): boolean {
  const normalized = normalizeOutputRootPath(outputRootPath);
  const marker = `${path.sep}.gnr8-static-output${path.sep}`;
  return normalized.includes(marker);
}

export function encodePreviewOutputRootKey(outputRootPath: string): string {
  return Buffer.from(normalizeOutputRootPath(outputRootPath), "utf8").toString("base64url");
}

export function decodePreviewOutputRootKey(previewKey: string): string | null {
  try {
    const decoded = Buffer.from(previewKey, "base64url").toString("utf8");
    if (!decoded.trim()) return null;
    return normalizeOutputRootPath(decoded);
  } catch {
    return null;
  }
}

export function buildExecutionPreviewHosting(input: {
  executionMode: ExecutionMode;
  materialization: ExecutionMaterialization;
}): ExecutionPreviewHosting {
  if (input.executionMode !== "materialize") {
    return {
      status: "not_available_simulation_mode",
      available: false,
      routeRule: TEMP_PREVIEW_ROUTE_RULE,
      previewRootUrl: null,
      previewEntryUrl: null,
      previewKey: null,
      reasonCode: "SIMULATION_MODE",
    };
  }

  if (!isMaterializationReady(input.materialization.status)) {
    return {
      status: "not_available_materialization_not_ready",
      available: false,
      routeRule: TEMP_PREVIEW_ROUTE_RULE,
      previewRootUrl: null,
      previewEntryUrl: null,
      previewKey: null,
      reasonCode: input.materialization.status.toUpperCase(),
    };
  }

  if (!input.materialization.outputRootPath) {
    return {
      status: "not_available_missing_output_root",
      available: false,
      routeRule: TEMP_PREVIEW_ROUTE_RULE,
      previewRootUrl: null,
      previewEntryUrl: null,
      previewKey: null,
      reasonCode: "MISSING_OUTPUT_ROOT",
    };
  }

  if (!isSupportedPreviewOutputRoot(input.materialization.outputRootPath)) {
    return {
      status: "not_available_unsupported_output_root",
      available: false,
      routeRule: TEMP_PREVIEW_ROUTE_RULE,
      previewRootUrl: null,
      previewEntryUrl: null,
      previewKey: null,
      reasonCode: "UNSUPPORTED_OUTPUT_ROOT",
    };
  }

  const previewKey = encodePreviewOutputRootKey(input.materialization.outputRootPath);
  const previewRootUrl = `/validation/previews/by-output/${previewKey}/`;
  return {
    status: "available",
    available: true,
    routeRule: TEMP_PREVIEW_ROUTE_RULE,
    previewRootUrl,
    previewEntryUrl: `${previewRootUrl}index.html`,
    previewKey,
    reasonCode: null,
  };
}

export function resolvePreviewBundleRequest(input: { previewKey: string; previewPath?: string[] | undefined }): PreviewBundleResolveResult {
  const outputRootPath = decodePreviewOutputRootKey(input.previewKey);
  if (!outputRootPath) {
    return { ok: false, code: "INVALID_PREVIEW_KEY", message: "Preview key could not be decoded." };
  }

  if (!isSupportedPreviewOutputRoot(outputRootPath)) {
    return { ok: false, code: "UNSUPPORTED_OUTPUT_ROOT", message: "Preview output root is not in the controlled bundle area." };
  }

  const rawPath = (input.previewPath ?? []).join("/");
  const normalizedRelativePath = path.posix.normalize(rawPath).replace(/^\/+/, "");
  const relativePath = normalizedRelativePath === "" || normalizedRelativePath === "." ? "index.html" : normalizedRelativePath;
  if (relativePath === ".." || relativePath.startsWith("../")) {
    return { ok: false, code: "INVALID_PREVIEW_PATH", message: "Preview path traversal is not allowed." };
  }

  const absolutePath = path.resolve(outputRootPath, ...relativePath.split("/"));
  const relCheck = path.relative(outputRootPath, absolutePath);
  if (relCheck === "" || relCheck === ".." || relCheck.startsWith(`..${path.sep}`) || path.isAbsolute(relCheck)) {
    return { ok: false, code: "INVALID_PREVIEW_PATH", message: "Resolved preview path is outside bundle root." };
  }

  return {
    ok: true,
    outputRootPath,
    relativePath,
    absolutePath,
  };
}
