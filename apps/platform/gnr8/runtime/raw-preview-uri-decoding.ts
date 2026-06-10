export const RAW_PREVIEW_URI_DECODE_DIAGNOSTIC = {
  RAW_PREVIEW_URI_DECODE_WARNING: "RAW_PREVIEW_URI_DECODE_WARNING",
  RAW_PREVIEW_URI_DECODE_FALLBACK_USED: "RAW_PREVIEW_URI_DECODE_FALLBACK_USED",
} as const;

export type SafeDecodeURIComponentResult = {
  value: string;
  decoded: boolean;
  warning?: typeof RAW_PREVIEW_URI_DECODE_DIAGNOSTIC.RAW_PREVIEW_URI_DECODE_WARNING;
};

export function safeDecodeURIComponent(value: unknown): SafeDecodeURIComponentResult {
  const raw = String(value ?? "");
  try {
    return { value: decodeURIComponent(raw), decoded: true };
  } catch {
    return {
      value: raw,
      decoded: false,
      warning: RAW_PREVIEW_URI_DECODE_DIAGNOSTIC.RAW_PREVIEW_URI_DECODE_WARNING,
    };
  }
}
