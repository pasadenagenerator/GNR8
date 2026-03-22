import { createHash } from "node:crypto";

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortValue((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function sha256Hex(input: string | Uint8Array): string {
  const hash = createHash("sha256");
  hash.update(input);
  return hash.digest("hex");
}

export function deterministicId(prefix: string, input: string): string {
  return `${prefix}_${sha256Hex(input).slice(0, 20)}`;
}

export function normalizePagePath(path: string): string {
  const trimmed = String(path ?? "").trim();
  if (!trimmed || trimmed === "/") return "/";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+/g, "/");
}
