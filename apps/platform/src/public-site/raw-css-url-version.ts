/** Bump when runtime CSS bytes change. Legacy URLs keep the legacy transform. */
export const RAW_CSS_REVISION = "2";
export const RAW_CSS_REVISION_PARAM = "gnr8css";
export function versionRawCssUrl(reference: string): string {
  const hashAt = reference.indexOf("#");
  const base = hashAt < 0 ? reference : reference.slice(0, hashAt);
  const hash = hashAt < 0 ? "" : reference.slice(hashAt);
  const queryAt = base.indexOf("?");
  const pathname = queryAt < 0 ? base : base.slice(0, queryAt);
  if (!pathname.startsWith("/api/gnr8/runtime/preview-assets/") || !pathname.toLowerCase().endsWith(".css")) return reference;
  const params = new URLSearchParams(queryAt < 0 ? "" : base.slice(queryAt + 1));
  params.set(RAW_CSS_REVISION_PARAM, RAW_CSS_REVISION);
  return `${pathname}?${params}${hash}`;
}
