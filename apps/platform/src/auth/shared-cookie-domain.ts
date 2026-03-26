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
