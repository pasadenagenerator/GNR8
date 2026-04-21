import os from "node:os";
import path from "node:path";

export const URL_IMPORT_SNAPSHOT_ROOT_ENV_VAR = "GNR8_URL_IMPORT_SNAPSHOT_ROOT_ABS" as const;
export const URL_IMPORT_SNAPSHOT_ROOT_RULE =
  "explicit_input_or_env_override_else_tmp_v2" as const;

function envValue(name: string): string | null {
  const raw = process.env[name];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function defaultUrlImportSnapshotRootDirAbs(): string {
  const envOverride = envValue(URL_IMPORT_SNAPSHOT_ROOT_ENV_VAR);
  if (envOverride) return path.resolve(envOverride);

  return path.resolve(os.tmpdir(), "gnr8", "validation", "url-import-snapshots");
}

export function resolveUrlImportSnapshotRootDirAbs(inputRootDirAbs?: string): string {
  return path.resolve(inputRootDirAbs ?? defaultUrlImportSnapshotRootDirAbs());
}
