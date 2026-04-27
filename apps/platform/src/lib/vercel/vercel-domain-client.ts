const VERCEL_API_BASE_URL = "https://api.vercel.com";

export type VercelDomainVerificationType = "cname" | "txt";

export type VercelDomainVerificationRecord = {
  type: VercelDomainVerificationType;
  host: string;
  value: string;
};

export type VercelAddDomainOutcome = {
  outcome: "added" | "already_exists";
  domainId: string | null;
};

export type VercelDomainStatus = {
  domain: string;
  domainId: string | null;
  verified: boolean;
  status: "active" | "verifying";
  verification: VercelDomainVerificationRecord | null;
  lastCheckedAt: string;
};

type VercelClientConfig = {
  token: string;
  projectId: string;
  teamId: string | null;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeDomain(value: string): string {
  const raw = normalizeText(value).toLowerCase();
  const withoutProtocol = raw.replace(/^https?:\/\//, "");
  const authority = withoutProtocol.split("/")[0] ?? "";
  const hostOnly = authority.split(":")[0] ?? "";
  return hostOnly.replace(/\.+$/, "").trim();
}

function readClientConfig(env: NodeJS.ProcessEnv = process.env): VercelClientConfig {
  const token = normalizeText(env.VERCEL_API_TOKEN);
  const projectId = normalizeText(env.VERCEL_PROJECT_ID_PLATFORM);
  const teamId = normalizeText(env.VERCEL_TEAM_ID) || null;

  if (!token) throw new Error("VERCEL_API_TOKEN is required for Vercel domain automation.");
  if (!projectId) throw new Error("VERCEL_PROJECT_ID_PLATFORM is required for Vercel domain automation.");

  return { token, projectId, teamId };
}

function buildProjectDomainUrl(input: {
  projectId: string;
  domain?: string;
  teamId?: string | null;
  apiVersion: "v9" | "v10";
}): string {
  const path = input.domain
    ? `/${input.apiVersion}/projects/${encodeURIComponent(input.projectId)}/domains/${encodeURIComponent(input.domain)}`
    : `/${input.apiVersion}/projects/${encodeURIComponent(input.projectId)}/domains`;
  const url = new URL(path, `${VERCEL_API_BASE_URL}/`);
  if (input.teamId) {
    url.searchParams.set("teamId", input.teamId);
  }
  return url.toString();
}

function parseJson(input: string): Record<string, unknown> | null {
  const trimmed = normalizeText(input);
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function readStringField(input: Record<string, unknown> | null, key: string): string | null {
  if (!input) return null;
  const value = input[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asVerificationType(value: string | null): VercelDomainVerificationType | null {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "cname") return "cname";
  if (normalized === "txt") return "txt";
  return null;
}

function toRelativeHost(recordDomain: string, rootDomain: string): string {
  const normalizedRecord = normalizeDomain(recordDomain);
  const normalizedRoot = normalizeDomain(rootDomain);
  if (!normalizedRecord || !normalizedRoot) return normalizedRecord;
  if (normalizedRecord === normalizedRoot) return "@";
  if (normalizedRecord.endsWith(`.${normalizedRoot}`)) {
    const candidate = normalizedRecord.slice(0, -(normalizedRoot.length + 1)).trim();
    return candidate || "@";
  }
  return normalizedRecord;
}

function parseVerificationRecord(input: {
  domain: string;
  payload: Record<string, unknown> | null;
}): VercelDomainVerificationRecord | null {
  const verificationRaw = Array.isArray(input.payload?.verification)
    ? (input.payload?.verification as Array<Record<string, unknown>>)
    : [];

  const candidate = verificationRaw.find((record) => {
    const type = asVerificationType(readStringField(record, "type"));
    const value = readStringField(record, "value");
    const domain = readStringField(record, "domain");
    return type !== null && Boolean(value) && Boolean(domain);
  });

  if (!candidate) return null;

  const type = asVerificationType(readStringField(candidate, "type"));
  const value = readStringField(candidate, "value");
  const recordDomain = readStringField(candidate, "domain");
  const apexName = readStringField(input.payload, "apexName") ?? input.domain;
  if (!type || !value || !recordDomain) return null;

  return {
    type,
    host: toRelativeHost(recordDomain, apexName),
    value,
  };
}

function isAlreadyExistsResponse(status: number, payload: Record<string, unknown> | null): boolean {
  if (status === 409) return true;
  const code = normalizeText(readStringField(payload, "code")).toLowerCase();
  const message = normalizeText(readStringField(payload, "error") ?? readStringField(payload, "message")).toLowerCase();
  if (code.includes("already") || code.includes("exists")) return true;
  if (message.includes("already") && message.includes("exist")) return true;
  return false;
}

async function vercelRequest(input: {
  url: string;
  token: string;
  method: "GET" | "POST";
  body?: Record<string, unknown>;
}): Promise<{ ok: boolean; status: number; payload: Record<string, unknown> | null }> {
  const response = await fetch(input.url, {
    method: input.method,
    headers: {
      authorization: `Bearer ${input.token}`,
      "content-type": "application/json",
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
    cache: "no-store",
  });

  const text = await response.text().catch(() => "");
  return {
    ok: response.ok,
    status: response.status,
    payload: parseJson(text),
  };
}

export async function addDomainToVercel(domain: string, env: NodeJS.ProcessEnv = process.env): Promise<VercelAddDomainOutcome> {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) throw new Error("Domain is required.");

  const config = readClientConfig(env);
  const url = buildProjectDomainUrl({
    apiVersion: "v10",
    projectId: config.projectId,
    teamId: config.teamId,
  });

  const response = await vercelRequest({
    url,
    token: config.token,
    method: "POST",
    body: { name: normalizedDomain },
  });

  if (response.ok) {
    return {
      outcome: "added",
      domainId: readStringField(response.payload, "id"),
    };
  }

  if (isAlreadyExistsResponse(response.status, response.payload)) {
    return {
      outcome: "already_exists",
      domainId: readStringField(response.payload, "id"),
    };
  }

  throw new Error(`VERCEL_DOMAIN_ADD_FAILED:${JSON.stringify({
    status: response.status,
    message: readStringField(response.payload, "error") ?? readStringField(response.payload, "message") ?? "Vercel domain add failed",
  })}`);
}

export async function checkDomainStatus(domain: string, env: NodeJS.ProcessEnv = process.env): Promise<VercelDomainStatus> {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) throw new Error("Domain is required.");

  const config = readClientConfig(env);
  const url = buildProjectDomainUrl({
    apiVersion: "v9",
    projectId: config.projectId,
    domain: normalizedDomain,
    teamId: config.teamId,
  });

  const response = await vercelRequest({
    url,
    token: config.token,
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`VERCEL_DOMAIN_STATUS_FAILED:${JSON.stringify({
      status: response.status,
      message: readStringField(response.payload, "error") ?? readStringField(response.payload, "message") ?? "Vercel domain status check failed",
    })}`);
  }

  const verified = Boolean(response.payload?.verified);
  const verification = parseVerificationRecord({
    domain: normalizedDomain,
    payload: response.payload,
  });

  return {
    domain: normalizedDomain,
    domainId: readStringField(response.payload, "id"),
    verified,
    status: verified ? "active" : "verifying",
    verification,
    lastCheckedAt: new Date().toISOString(),
  };
}
