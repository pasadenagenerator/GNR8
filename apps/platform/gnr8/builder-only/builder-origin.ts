import { registerBuilderOnlyModule } from "@gnr8/builder-only/builder-boundary-guard";

registerBuilderOnlyModule(import.meta.url);

const BUILDER_ALLOWED_ORIGINS = new Set([
  "https://app.pasadenagenerator.com",
  "https://builder.pasadenagenerator.com",
]);

export function isBuilderApiCorsOriginAllowed(origin: string | null | undefined): origin is string {
  if (!origin) return false;
  return BUILDER_ALLOWED_ORIGINS.has(origin);
}

export function getSharedCookieDomainForHost(rawHost: string): string | undefined {
  const host = String(rawHost ?? "")
    .split(":")[0]
    .trim()
    .toLowerCase();

  const isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
  const isPasadena = host === "pasadenagenerator.com" || host.endsWith(".pasadenagenerator.com");
  if (isLocal || !isPasadena) return undefined;
  return ".pasadenagenerator.com";
}
