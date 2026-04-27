import { buildVercelUrl, getVercelConfig, vercelFetch } from "@/src/lib/vercel/vercel-api";

export type VercelDomainVerificationType = "cname" | "txt";

export type VercelDomainDnsRecordType = "a" | "cname" | "txt";

export type VercelDomainDnsRecord = {
  type: VercelDomainDnsRecordType;
  host: string;
  value: string;
};

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
  routing: VercelDomainDnsRecord | null;
  lastCheckedAt: string;
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

function asDnsRecordType(value: string | null): VercelDomainDnsRecordType | null {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "a") return "a";
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

function parseRoutingRecord(input: {
  domain: string;
  payload: Record<string, unknown> | null;
}): VercelDomainDnsRecord | null {
  const arrays = [
    input.payload?.config,
    input.payload?.configs,
    input.payload?.dnsRecords,
    input.payload?.records,
    input.payload?.configuredBy,
  ].filter((candidate): candidate is unknown[] => Array.isArray(candidate));

  const allCandidates = arrays.flatMap((records) => records as Array<Record<string, unknown>>);
  if (allCandidates.length === 0) return null;

  const apexName = readStringField(input.payload, "apexName") ?? input.domain;
  const candidate = allCandidates.find((record) => {
    const type = asDnsRecordType(readStringField(record, "type") ?? readStringField(record, "recordType"));
    const value = readStringField(record, "value") ?? readStringField(record, "target");
    const host =
      readStringField(record, "domain") ??
      readStringField(record, "host") ??
      readStringField(record, "name") ??
      readStringField(record, "subdomain");
    return (type === "a" || type === "cname") && Boolean(value) && Boolean(host);
  });

  if (!candidate) return null;

  const type = asDnsRecordType(readStringField(candidate, "type") ?? readStringField(candidate, "recordType"));
  const value = readStringField(candidate, "value") ?? readStringField(candidate, "target");
  const hostRaw =
    readStringField(candidate, "domain") ??
    readStringField(candidate, "host") ??
    readStringField(candidate, "name") ??
    readStringField(candidate, "subdomain");
  if (!type || !value || !hostRaw || (type !== "a" && type !== "cname")) return null;

  return {
    type,
    host: toRelativeHost(hostRaw, apexName),
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
  method: "GET" | "POST";
  body?: Record<string, unknown>;
  env?: NodeJS.ProcessEnv;
}): Promise<{ ok: boolean; status: number; payload: Record<string, unknown> | null }> {
  const response = await vercelFetch(
    input.url,
    {
      method: input.method,
      body: input.body ? JSON.stringify(input.body) : undefined,
      cache: "no-store",
    },
    input.env,
  );

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

  const { projectId } = getVercelConfig(env);
  const url = buildVercelUrl(`/v10/projects/${encodeURIComponent(projectId)}/domains`, undefined, env);

  const response = await vercelRequest({
    url,
    method: "POST",
    body: { name: normalizedDomain },
    env,
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

  const { projectId } = getVercelConfig(env);
  const url = buildVercelUrl(
    `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(normalizedDomain)}`,
    undefined,
    env,
  );

  const response = await vercelRequest({
    url,
    method: "GET",
    env,
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
  const routing = parseRoutingRecord({
    domain: normalizedDomain,
    payload: response.payload,
  });

  return {
    domain: normalizedDomain,
    domainId: readStringField(response.payload, "id"),
    verified,
    status: verified ? "active" : "verifying",
    verification,
    routing,
    lastCheckedAt: new Date().toISOString(),
  };
}
