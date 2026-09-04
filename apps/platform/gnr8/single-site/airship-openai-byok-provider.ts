import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

import { getSuperadminPool } from "@/src/superadmin/db";
import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";
import type { SingleSitePgClient } from "./single-site-state-writer-repository";

export const AIRSHIP_OPENAI_BYOK_PROVIDER_VERSION = "airship-6-openai-byok-provider:v1" as const;
export const AIRSHIP_OPENAI_DEFAULT_MODEL = "gpt-5" as const;
export const AIRSHIP_OPENAI_ENCRYPTION_KEY_ENV = "GNR8_AIRSHIP_BYOK_ENCRYPTION_KEY" as const;
export const AIRSHIP_OPENAI_ENCRYPTION_FALLBACK_ENVS = ["SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL"] as const;

export type AirshipOpenAIProviderStatus = {
  provider: "openai";
  scope: "airship_editor";
  ownerScope: "internal_superadmin";
  connected: boolean;
  status: "missing" | "connected" | "revoked" | "encryption_not_configured" | "read_error";
  maskedKey: string | null;
  model: string;
  lastTestedAt: string | null;
  lastTestStatus: "passed" | "failed" | null;
  createdAt: string | null;
  updatedAt: string | null;
  canUseAiCommands: boolean;
};

export type AirshipOpenAIProviderCredential = {
  id: string;
  provider: "openai";
  scope: "airship_editor";
  ownerScope: "internal_superadmin";
  encryptedSecret: string;
  encryptionIv: string;
  encryptionTag: string;
  secretFingerprintSha256: string;
  maskedKey: string;
  model: string;
  status: "active" | "revoked";
  lastTestedAt: string | null;
  lastTestStatus: "passed" | "failed" | null;
  createdAt: string;
  updatedAt: string;
};

type AirshipOpenAIProviderStatusCredential = Pick<
  AirshipOpenAIProviderCredential,
  "id" | "provider" | "scope" | "ownerScope" | "maskedKey" | "model" | "status" | "lastTestedAt" | "lastTestStatus" | "createdAt" | "updatedAt"
>;

export type AirshipOpenAIByokRepository = {
  readActiveCredentialStatus?(): Promise<AirshipOpenAIProviderStatusCredential | null>;
  readActiveCredential(): Promise<AirshipOpenAIProviderCredential | null>;
  upsertCredential(input: StoredCredentialInput): Promise<AirshipOpenAIProviderCredential>;
  markTestResult(input: { credentialId: string; passed: boolean; actorId: string; summary: Record<string, unknown> }): Promise<void>;
  revokeCredential(input: { actorId: string }): Promise<void>;
  insertEvent(input: AirshipOpenAIProviderEventInput): Promise<void>;
};

type StoredCredentialInput = {
  encryptedSecret: string;
  encryptionIv: string;
  encryptionTag: string;
  secretFingerprintSha256: string;
  maskedKey: string;
  model: string;
  actorId: string;
};

type AirshipOpenAIProviderEventInput = {
  action: "credential_created" | "credential_updated" | "connection_tested" | "credential_revoked";
  actorId: string;
  credentialId?: string | null;
  summary: Record<string, unknown>;
};

type QueryResult<T> = {
  rows: T[];
  rowCount?: number | null;
};

type PoolLike = {
  connect(): Promise<SingleSitePgClient & { release?: () => void }>;
};

const ACTIVE_SCOPE_KEY = "openai:airship_editor:internal_superadmin";
const SAFE_SUMMARY_VALUE = /secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key|sk-/i;
const MODEL_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;
const OPENAI_KEY_PATTERN = /^sk-[A-Za-z0-9_-]{12,}$/;

function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function normalizeAirshipOpenAIModel(value: unknown): string {
  const normalized = text(value, 80) || AIRSHIP_OPENAI_DEFAULT_MODEL;
  if (!MODEL_PATTERN.test(normalized)) return AIRSHIP_OPENAI_DEFAULT_MODEL;
  return normalized;
}

export function maskAirshipOpenAIKey(apiKey: string): string {
  const normalized = text(apiKey, 400);
  const tail = normalized.slice(-4);
  return tail ? `sk-...${tail}` : "sk-...";
}

export function fingerprintAirshipOpenAIKey(apiKey: string): string {
  return createHash("sha256").update(text(apiKey, 400)).digest("hex");
}

function safeSummary(input: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = text(key, 80);
    if (!normalizedKey || SAFE_SUMMARY_VALUE.test(normalizedKey)) continue;
    if (typeof value === "boolean" || typeof value === "number") {
      safe[normalizedKey] = value;
      continue;
    }
    const normalizedValue = text(value, 220);
    if (!normalizedValue || SAFE_SUMMARY_VALUE.test(normalizedValue)) continue;
    safe[normalizedKey] = normalizedValue;
  }
  return safe;
}

function dateText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function rowToCredential(row: Record<string, unknown>): AirshipOpenAIProviderCredential {
  return {
    id: String(row.id),
    provider: "openai",
    scope: "airship_editor",
    ownerScope: "internal_superadmin",
    encryptedSecret: String(row.encrypted_secret),
    encryptionIv: String(row.encryption_iv),
    encryptionTag: String(row.encryption_tag),
    secretFingerprintSha256: String(row.secret_fingerprint_sha256),
    maskedKey: String(row.masked_secret),
    model: normalizeAirshipOpenAIModel(row.model),
    status: row.status === "revoked" ? "revoked" : "active",
    lastTestedAt: dateText(row.last_tested_at),
    lastTestStatus: row.last_test_status === "passed" || row.last_test_status === "failed" ? row.last_test_status : null,
    createdAt: dateText(row.created_at) ?? "",
    updatedAt: dateText(row.updated_at) ?? "",
  };
}

function rowToStatusCredential(row: Record<string, unknown>): AirshipOpenAIProviderStatusCredential {
  return {
    id: String(row.id),
    provider: "openai",
    scope: "airship_editor",
    ownerScope: "internal_superadmin",
    maskedKey: String(row.masked_secret),
    model: normalizeAirshipOpenAIModel(row.model),
    status: row.status === "revoked" ? "revoked" : "active",
    lastTestedAt: dateText(row.last_tested_at),
    lastTestStatus: row.last_test_status === "passed" || row.last_test_status === "failed" ? row.last_test_status : null,
    createdAt: dateText(row.created_at) ?? "",
    updatedAt: dateText(row.updated_at) ?? "",
  };
}

function encryptionSecretFromEnv(): string {
  const secret =
    text(process.env[AIRSHIP_OPENAI_ENCRYPTION_KEY_ENV], 400) ||
    AIRSHIP_OPENAI_ENCRYPTION_FALLBACK_ENVS.map((envName) => text(process.env[envName], 400)).find((value) => value.length >= 32) ||
    "";
  if (secret.length < 32) throw new Error("airship_openai_encryption_key_missing");
  return secret;
}

function encryptionKey(secret = encryptionSecretFromEnv()): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptAirshipOpenAIKey(apiKey: string, secret?: string): Pick<StoredCredentialInput, "encryptedSecret" | "encryptionIv" | "encryptionTag" | "secretFingerprintSha256" | "maskedKey"> {
  const normalized = text(apiKey, 400);
  if (!OPENAI_KEY_PATTERN.test(normalized)) throw new Error("airship_openai_api_key_invalid");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  return {
    encryptedSecret: encrypted.toString("base64"),
    encryptionIv: iv.toString("base64"),
    encryptionTag: cipher.getAuthTag().toString("base64"),
    secretFingerprintSha256: fingerprintAirshipOpenAIKey(normalized),
    maskedKey: maskAirshipOpenAIKey(normalized),
  };
}

export function decryptAirshipOpenAIKey(credential: Pick<AirshipOpenAIProviderCredential, "encryptedSecret" | "encryptionIv" | "encryptionTag">, secret?: string): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(secret),
    Buffer.from(credential.encryptionIv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(credential.encryptionTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(credential.encryptedSecret, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

async function withTransaction<T>(pool: PoolLike, fn: (client: SingleSitePgClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let started = false;
  try {
    await client.query("begin");
    started = true;
    const result = await fn(client);
    await client.query("commit");
    started = false;
    return result;
  } catch (error) {
    if (started) {
      try {
        await client.query("rollback");
      } catch {
        // Best-effort cleanup only.
      }
    }
    throw error;
  } finally {
    client.release?.();
  }
}

export class PostgresAirshipOpenAIByokRepository implements AirshipOpenAIByokRepository {
  constructor(
    private readonly pool: PoolLike | null = null,
    private readonly getStatusClient: () => { from: (table: string) => unknown } | null = getSupabaseServiceRoleClient,
  ) {}

  private getPool(): PoolLike {
    return this.pool ?? getSuperadminPool();
  }

  async readActiveCredentialStatus(): Promise<AirshipOpenAIProviderStatusCredential | null> {
    const client = this.getStatusClient();
    if (!client) return this.readLatestCredentialStatusViaPg();

    const result = await (client.from("gnr8_airship_ai_provider_credentials") as {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            eq: (column: string, value: string) => {
              eq: (column: string, value: string) => {
                order: (column: string, options: { ascending: boolean }) => {
                  limit: (count: number) => {
                    maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { code?: string } | null }>;
                  };
                };
              };
            };
          };
        };
      };
    })
      .select("id,provider,scope,owner_scope,masked_secret,model,status,last_tested_at,last_test_status,created_at,updated_at")
      .eq("credential_scope_key", ACTIVE_SCOPE_KEY)
      .eq("provider", "openai")
      .eq("scope", "airship_editor")
      .eq("owner_scope", "internal_superadmin")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result.error) throw new Error(`airship_openai_provider_status_read_failed:${result.error.code ?? "unknown"}`);
    return result.data ? rowToStatusCredential(result.data) : null;
  }

  private async readLatestCredentialStatusViaPg(): Promise<AirshipOpenAIProviderStatusCredential | null> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `
        select
          c.id,
          c.provider,
          c.scope,
          c.owner_scope,
          c.masked_secret,
          c.model,
          c.status,
          c.last_tested_at::text as last_tested_at,
          c.last_test_status,
          c.created_at::text as created_at,
          c.updated_at::text as updated_at
        from public.gnr8_airship_ai_provider_credentials as c
        where c.credential_scope_key = $1 and c.provider = 'openai' and c.scope = 'airship_editor' and c.owner_scope = 'internal_superadmin'
        order by c.updated_at desc
        limit 1
        `,
        [ACTIVE_SCOPE_KEY],
      ) as QueryResult<Record<string, unknown>>;
      return result.rows[0] ? rowToStatusCredential(result.rows[0]) : null;
    } finally {
      client.release?.();
    }
  }

  async readActiveCredential(): Promise<AirshipOpenAIProviderCredential | null> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `
        select
          c.id,
          c.provider,
          c.scope,
          c.owner_scope,
          c.encrypted_secret,
          c.encryption_iv,
          c.encryption_tag,
          c.secret_fingerprint_sha256,
          c.masked_secret,
          c.model,
          c.status,
          c.last_tested_at::text as last_tested_at,
          c.last_test_status,
          c.created_at::text as created_at,
          c.updated_at::text as updated_at
        from public.gnr8_airship_ai_provider_credentials as c
        where c.credential_scope_key = $1 and c.provider = 'openai' and c.scope = 'airship_editor' and c.owner_scope = 'internal_superadmin'
        order by c.updated_at desc
        limit 1
        `,
        [ACTIVE_SCOPE_KEY],
      ) as QueryResult<Record<string, unknown>>;
      const credential = result.rows[0] ? rowToCredential(result.rows[0]) : null;
      return credential?.status === "active" ? credential : null;
    } finally {
      client.release?.();
    }
  }

  async upsertCredential(input: StoredCredentialInput): Promise<AirshipOpenAIProviderCredential> {
    return withTransaction(this.getPool(), async (client) => {
      const existing = await client.query(
        "select id from public.gnr8_airship_ai_provider_credentials where credential_scope_key = $1 limit 1",
        [ACTIVE_SCOPE_KEY],
      ) as QueryResult<Record<string, unknown>>;
      const action: AirshipOpenAIProviderEventInput["action"] = existing.rows[0] ? "credential_updated" : "credential_created";
      const result = await client.query(
        `
        insert into public.gnr8_airship_ai_provider_credentials (
          credential_scope_key,
          provider,
          scope,
          owner_scope,
          encrypted_secret,
          encryption_iv,
          encryption_tag,
          secret_fingerprint_sha256,
          masked_secret,
          model,
          status,
          created_by_actor_id,
          updated_by_actor_id
        )
        values ($1, 'openai', 'airship_editor', 'internal_superadmin', $2, $3, $4, $5, $6, $7, 'active', $8, $8)
        on conflict (credential_scope_key) do update
        set
          encrypted_secret = excluded.encrypted_secret,
          encryption_iv = excluded.encryption_iv,
          encryption_tag = excluded.encryption_tag,
          secret_fingerprint_sha256 = excluded.secret_fingerprint_sha256,
          masked_secret = excluded.masked_secret,
          model = excluded.model,
          status = 'active',
          updated_by_actor_id = excluded.updated_by_actor_id,
          revoked_at = null,
          revoked_by_actor_id = null,
          updated_at = now()
        returning *, last_tested_at::text as last_tested_at, created_at::text as created_at, updated_at::text as updated_at
        `,
        [
          ACTIVE_SCOPE_KEY,
          input.encryptedSecret,
          input.encryptionIv,
          input.encryptionTag,
          input.secretFingerprintSha256,
          input.maskedKey,
          normalizeAirshipOpenAIModel(input.model),
          text(input.actorId, 160),
        ],
      ) as QueryResult<Record<string, unknown>>;
      const credential = rowToCredential(result.rows[0]);
      await this.insertEventInTx(client, {
        action,
        actorId: input.actorId,
        credentialId: credential.id,
        summary: { provider: "openai", scope: "airship_editor", model: credential.model, status: "active" },
      });
      return credential;
    });
  }

  async markTestResult(input: { credentialId: string; passed: boolean; actorId: string; summary: Record<string, unknown> }): Promise<void> {
    return withTransaction(this.getPool(), async (client) => {
      await client.query(
        `
        update public.gnr8_airship_ai_provider_credentials
        set last_tested_at = now(), last_test_status = $2, updated_by_actor_id = $3, updated_at = now()
        where id = $1::uuid
        `,
        [input.credentialId, input.passed ? "passed" : "failed", text(input.actorId, 160)],
      );
      await this.insertEventInTx(client, {
        action: "connection_tested",
        actorId: input.actorId,
        credentialId: input.credentialId,
        summary: { ...input.summary, provider: "openai", scope: "airship_editor", passed: input.passed },
      });
    });
  }

  async revokeCredential(input: { actorId: string }): Promise<void> {
    return withTransaction(this.getPool(), async (client) => {
      const result = await client.query(
        `
        update public.gnr8_airship_ai_provider_credentials
        set status = 'revoked', revoked_at = now(), revoked_by_actor_id = $2, updated_by_actor_id = $2, updated_at = now()
        where credential_scope_key = $1 and status = 'active'
        returning id
        `,
        [ACTIVE_SCOPE_KEY, text(input.actorId, 160)],
      ) as QueryResult<Record<string, unknown>>;
      await this.insertEventInTx(client, {
        action: "credential_revoked",
        actorId: input.actorId,
        credentialId: result.rows[0]?.id ? String(result.rows[0].id) : null,
        summary: { provider: "openai", scope: "airship_editor", status: "revoked" },
      });
    });
  }

  async insertEvent(input: AirshipOpenAIProviderEventInput): Promise<void> {
    return withTransaction(this.getPool(), async (client) => {
      await this.insertEventInTx(client, input);
    });
  }

  private async insertEventInTx(client: SingleSitePgClient, input: AirshipOpenAIProviderEventInput): Promise<void> {
    await client.query(
      `
      insert into public.gnr8_airship_ai_provider_credential_events (
        credential_id,
        credential_scope_key,
        event_action,
        actor_id,
        summary_json,
        metadata_json,
        idempotency_key
      )
      values ($1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
      on conflict (idempotency_key) do nothing
      `,
      [
        input.credentialId ?? null,
        ACTIVE_SCOPE_KEY,
        input.action,
        text(input.actorId, 160),
        JSON.stringify(safeSummary(input.summary)),
        JSON.stringify({ serviceVersion: AIRSHIP_OPENAI_BYOK_PROVIDER_VERSION }),
        `${ACTIVE_SCOPE_KEY}:${input.action}:${randomUUID()}`,
      ],
    );
  }
}

export class AirshipOpenAIByokProviderService {
  constructor(private readonly repository: AirshipOpenAIByokRepository = new PostgresAirshipOpenAIByokRepository()) {}

  async status(): Promise<AirshipOpenAIProviderStatus> {
    try {
      encryptionSecretFromEnv();
    } catch {
      return {
        provider: "openai",
        scope: "airship_editor",
        ownerScope: "internal_superadmin",
        connected: false,
        status: "encryption_not_configured",
        maskedKey: null,
        model: AIRSHIP_OPENAI_DEFAULT_MODEL,
        lastTestedAt: null,
        lastTestStatus: null,
        createdAt: null,
        updatedAt: null,
        canUseAiCommands: false,
      };
    }

    try {
      const credential = this.repository.readActiveCredentialStatus
        ? await this.repository.readActiveCredentialStatus()
        : await this.repository.readActiveCredential();
      return airshipOpenAIProviderStatusFromCredential(credential);
    } catch {
      return readErrorAirshipOpenAIProviderStatus();
    }
  }

  async save(input: { apiKey: string; model?: unknown; actorId: string }): Promise<AirshipOpenAIProviderStatus> {
    const encrypted = encryptAirshipOpenAIKey(input.apiKey);
    const savedCredential = await this.repository.upsertCredential({
      ...encrypted,
      model: normalizeAirshipOpenAIModel(input.model),
      actorId: input.actorId,
    });
    const readback = await this.repository.readActiveCredential();
    if (
      !readback ||
      readback.id !== savedCredential.id ||
      readback.status !== "active" ||
      readback.provider !== "openai" ||
      readback.scope !== "airship_editor" ||
      readback.ownerScope !== "internal_superadmin" ||
      readback.secretFingerprintSha256 !== encrypted.secretFingerprintSha256
    ) {
      throw new Error("airship_openai_provider_readback_failed");
    }
    return connectedAirshipOpenAIProviderStatus(readback);
  }

  async revoke(actorId: string): Promise<AirshipOpenAIProviderStatus> {
    await this.repository.revokeCredential({ actorId });
    return missingAirshipOpenAIProviderStatus("revoked");
  }

  async readServerCredential(): Promise<{ apiKey: string; model: string; credentialId: string } | null> {
    const credential = await this.repository.readActiveCredential();
    if (!credential) return null;
    return {
      apiKey: decryptAirshipOpenAIKey(credential),
      model: credential.model,
      credentialId: credential.id,
    };
  }

  async markTestResult(input: { credentialId: string; passed: boolean; actorId: string; statusCode?: number | null }): Promise<void> {
    await this.repository.markTestResult({
      credentialId: input.credentialId,
      passed: input.passed,
      actorId: input.actorId,
      summary: {
        statusCode: input.statusCode ?? "unavailable",
        rawRequestRedacted: true,
        rawResponseRedacted: true,
      },
    });
  }
}

export function missingAirshipOpenAIProviderStatus(status: "missing" | "revoked" = "missing"): AirshipOpenAIProviderStatus {
  return {
    provider: "openai",
    scope: "airship_editor",
    ownerScope: "internal_superadmin",
    connected: false,
    status,
    maskedKey: null,
    model: AIRSHIP_OPENAI_DEFAULT_MODEL,
    lastTestedAt: null,
    lastTestStatus: null,
    createdAt: null,
    updatedAt: null,
    canUseAiCommands: false,
  };
}

export function readErrorAirshipOpenAIProviderStatus(): AirshipOpenAIProviderStatus {
  return {
    provider: "openai",
    scope: "airship_editor",
    ownerScope: "internal_superadmin",
    connected: false,
    status: "read_error",
    maskedKey: null,
    model: AIRSHIP_OPENAI_DEFAULT_MODEL,
    lastTestedAt: null,
    lastTestStatus: null,
    createdAt: null,
    updatedAt: null,
    canUseAiCommands: false,
  };
}

export function connectedAirshipOpenAIProviderStatus(credential: AirshipOpenAIProviderStatusCredential): AirshipOpenAIProviderStatus {
  return {
    provider: "openai",
    scope: "airship_editor",
    ownerScope: "internal_superadmin",
    connected: true,
    status: "connected",
    maskedKey: credential.maskedKey,
    model: credential.model,
    lastTestedAt: credential.lastTestedAt,
    lastTestStatus: credential.lastTestStatus,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
    canUseAiCommands: true,
  };
}

function airshipOpenAIProviderStatusFromCredential(credential: AirshipOpenAIProviderStatusCredential | null): AirshipOpenAIProviderStatus {
  if (!credential) return missingAirshipOpenAIProviderStatus();
  if (credential.status === "revoked") {
    return {
      ...missingAirshipOpenAIProviderStatus("revoked"),
      model: credential.model,
      lastTestedAt: credential.lastTestedAt,
      lastTestStatus: credential.lastTestStatus,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }
  return connectedAirshipOpenAIProviderStatus(credential);
}
