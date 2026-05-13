import { createHash } from "node:crypto";

export type RuntimeTenantIdentity = {
  agencyId: string;
};

export type RuntimeClientIdentity = RuntimeTenantIdentity & {
  clientId: string;
};

export type RuntimeSiteIdentity = RuntimeClientIdentity & {
  siteId: string;
};

export type RuntimeSiteVersionIdentity = RuntimeSiteIdentity & {
  siteVersionId: string;
};

export type RuntimeArtifactIdentity = RuntimeSiteVersionIdentity & {
  artifactId: string;
  artifactType: string;
};

export type RuntimePreviewIdentity = RuntimeSiteVersionIdentity & {
  previewMode: string;
  sourceMode: string;
  path: string;
  correlationKey: string;
};

export type RuntimePublishIdentity = RuntimeSiteVersionIdentity & {
  environment: string;
  correlationKey: string;
};

export type RuntimeDomainBindingIdentity = RuntimeSiteVersionIdentity & {
  host: string;
  domain: string;
  environment: string;
  correlationKey: string;
};

function normalizeIdentityToken(value: string, fallback: string): string {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function decodePathToken(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripProtocolAuthority(value: string): string {
  const withoutProtocol = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  if (withoutProtocol.startsWith("//")) {
    return withoutProtocol.slice(2);
  }
  return withoutProtocol;
}

function normalizeHostOrDomain(value: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  const withoutProtocol = stripProtocolAuthority(trimmed);
  const withoutPath = withoutProtocol.split(/[/?#]/, 1)[0] ?? "";
  return withoutPath.trim().toLowerCase();
}

export function normalizeRuntimeHost(host: string): string {
  return normalizeHostOrDomain(host);
}

export function normalizeRuntimeDomain(domain: string): string {
  return normalizeHostOrDomain(domain);
}

export function normalizeRuntimePath(path: string): string {
  const trimmed = String(path ?? "").trim();
  if (!trimmed) return "/";

  let rawPath = trimmed;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    try {
      rawPath = new URL(trimmed).pathname;
    } catch {
      rawPath = trimmed;
    }
  }

  const withoutQueryOrHash = rawPath.split(/[?#]/, 1)[0] ?? "";
  const slashNormalized = withoutQueryOrHash.replaceAll("\\", "/").replace(/\/+/g, "/");
  const prefixed = slashNormalized.startsWith("/") ? slashNormalized : `/${slashNormalized}`;

  const resolvedSegments: string[] = [];
  for (const rawSegment of prefixed.split("/")) {
    const segment = decodePathToken(rawSegment).trim();
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      resolvedSegments.pop();
      continue;
    }
    resolvedSegments.push(segment);
  }

  if (resolvedSegments.length === 0) return "/";
  return `/${resolvedSegments.join("/")}`;
}

function createCanonicalPayload(input: Record<string, string>): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(input)
        .map(([key, value]) => [key, String(value)])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  );
}

export function createRuntimeCorrelationKey(input: Record<string, string>): string {
  const canonicalPayload = createCanonicalPayload(input);
  return createHash("sha256").update(canonicalPayload).digest("hex");
}

export function createRuntimeSiteIdentity(input: {
  agencyId: string;
  clientId: string;
  siteId: string;
}): RuntimeSiteIdentity {
  return {
    agencyId: normalizeIdentityToken(input.agencyId, "unknown_agency"),
    clientId: normalizeIdentityToken(input.clientId, "unknown_client"),
    siteId: normalizeIdentityToken(input.siteId, "unknown_site"),
  };
}

export function createRuntimeSiteVersionIdentity(input: {
  agencyId: string;
  clientId: string;
  siteId: string;
  siteVersionId: string;
}): RuntimeSiteVersionIdentity {
  return {
    ...createRuntimeSiteIdentity(input),
    siteVersionId: normalizeIdentityToken(input.siteVersionId, "unknown_site_version"),
  };
}

export function createRuntimeArtifactIdentity(input: {
  agencyId: string;
  clientId: string;
  siteId: string;
  siteVersionId: string;
  artifactId: string;
  artifactType: string;
}): RuntimeArtifactIdentity {
  return {
    ...createRuntimeSiteVersionIdentity(input),
    artifactId: normalizeIdentityToken(input.artifactId, "unknown_artifact"),
    artifactType: normalizeIdentityToken(input.artifactType, "unknown_artifact_type"),
  };
}

export function createRuntimePreviewIdentity(input: {
  agencyId: string;
  clientId: string;
  siteId: string;
  siteVersionId: string;
  previewMode: string;
  sourceMode: string;
  path: string;
}): RuntimePreviewIdentity {
  const base = createRuntimeSiteVersionIdentity(input);
  const previewMode = normalizeIdentityToken(input.previewMode, "unknown_preview_mode");
  const sourceMode = normalizeIdentityToken(input.sourceMode, "unknown_source_mode");
  const path = normalizeRuntimePath(input.path);
  const correlationKey = createRuntimeCorrelationKey({
    agencyId: base.agencyId,
    clientId: base.clientId,
    siteId: base.siteId,
    siteVersionId: base.siteVersionId,
    previewMode,
    sourceMode,
    path,
  });
  return {
    ...base,
    previewMode,
    sourceMode,
    path,
    correlationKey,
  };
}

export function createRuntimeDomainBindingIdentity(input: {
  agencyId: string;
  clientId: string;
  siteId: string;
  siteVersionId: string;
  host: string;
  domain: string;
  environment: string;
}): RuntimeDomainBindingIdentity {
  const base = createRuntimeSiteVersionIdentity(input);
  const host = normalizeRuntimeHost(input.host);
  const domain = normalizeRuntimeDomain(input.domain);
  const environment = normalizeIdentityToken(input.environment, "unknown_environment");
  const correlationKey = createRuntimeCorrelationKey({
    agencyId: base.agencyId,
    clientId: base.clientId,
    siteId: base.siteId,
    siteVersionId: base.siteVersionId,
    host,
    domain,
    environment,
  });
  return {
    ...base,
    host,
    domain,
    environment,
    correlationKey,
  };
}
