import { randomBytes } from "node:crypto";
import { parseStackiScope, StackiDraftError, STACKI_DRAFT_MAX_REVISIONS, type StackiDraftScope } from "./stacki-draft-contract";
import type { StackiStorageClient } from "./stacki-draft-store";
import { isCanonicalUuid } from "../output-adapters/astro-production-candidate-record";

// Fixed pilot ceiling across ALL actors/sites, not a per-browser allowance.
// Reservations are never refunded, including failed/ambiguous starts.
export const STACKI_MONTHLY_STARTS = 10;
export const STACKI_PROVIDER_TIMEOUT_MS = 20 * 60_000;
export type StackiSession = {
  id: string; scope: StackiDraftScope; actorUserId: string; baseRevision: number; platformOrigin: string;
  expiresAt: number; ticket: string; month: string; slot: number;
};
export type StackiSessionReady = { entryUrl: string };
export type StackiSessionSaved = { revision: number; sha256: string };
export type StackiSaveOperation = { operationId: string; expectedRevision: number };

export class StackiSessionStore {
  constructor(private readonly client: StackiStorageClient, private readonly bucket: string) {}
  private async storage() {
    if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(this.bucket)) unavailable();
    const result = await this.client.storage.getBucket(this.bucket);
    if (result.error || result.data?.public !== false) unavailable();
    return this.client.storage.from(this.bucket);
  }
  private async read<T>(key: string): Promise<T | null> {
    const result = await (await this.storage()).download(key);
    if (result.error) {
      const status = (result.error as { statusCode?: string | number }).statusCode;
      if (String(status) === "404") return null;
      // storage-js download uses noResolveJson and wraps its Response in
      // StorageUnknownError (unlike list/upload). Recognize only explicit absence.
      const original = (result.error as { originalError?: unknown }).originalError;
      if (original instanceof Response) {
        if (original.status === 404) return null;
        if (original.status === 400) {
          const body = await original.json().catch(() => null);
          if (String(body?.statusCode) === "404" || body?.code === "NoSuchKey") return null;
        }
      }
      unavailable();
    }
    if (!result.data || result.data.size > 16_384) unavailable();
    try { return JSON.parse(await result.data.text()) as T; } catch { return unavailable(); }
  }
  private async put(key: string, value: unknown) {
    const result = await (await this.storage()).upload(key, Buffer.from(JSON.stringify(value)), {
      contentType: "application/json", cacheControl: "0", upsert: false,
    });
    return !result.error;
  }
  async claim(input: Omit<StackiSession, "ticket" | "expiresAt" | "month" | "slot">) {
    validateId(input.id);
    parseStackiScope(input.scope);
    const origin = new URL(input.platformOrigin);
    if (origin.origin !== input.platformOrigin || !(origin.protocol === "https:" ||
        (origin.protocol === "http:" && origin.hostname === "127.0.0.1")))
      throw new StackiDraftError(422, "STACKI_PLATFORM_ORIGIN_INVALID");
    if (!isCanonicalUuid(input.actorUserId)) throw new StackiDraftError(403, "STACKI_ACTOR_INVALID");
    // Reuse a request that crossed a UTC month boundary, too.
    try {
      return { session: await this.find(input.id, input.scope, input.actorUserId), claimed: false };
    } catch (error) {
      if (!(error instanceof StackiDraftError) || error.code !== "STACKI_SESSION_NOT_FOUND") throw error;
    }
    const month = new Date().toISOString().slice(0, 7);
    for (let slot = 1; slot <= STACKI_MONTHLY_STARTS; slot++) {
      const key = `stacki-sessions/v1/${month}/${slot}.json`;
      const candidate: StackiSession = { ...input, month, slot,
        expiresAt: Date.now() + STACKI_PROVIDER_TIMEOUT_MS, ticket: randomBytes(32).toString("base64url") };
      const existing = await this.read<StackiSession>(key);
      if (existing) {
        if (existing.id === input.id) { this.assertOwner(existing, input); return { session: existing, claimed: false }; }
        continue;
      }
      const won = await this.put(key, candidate);
      const stored = await this.read<StackiSession>(key);
      if (!stored) unavailable();
      if (stored.id === input.id) {
        this.assertOwner(stored, input);
        // A lost upload response must NEVER authorize another provider creation.
        return { session: stored, claimed: won };
      }
    }
    throw new StackiDraftError(429, "STACKI_PILOT_LIMIT");
  }
  async find(id: string, scope: StackiDraftScope, actorUserId: string) {
    validateId(id);
    // Include previous month for sessions opened immediately before UTC rollover.
    const previous = new Date(); previous.setUTCDate(0);
    const months = [new Date().toISOString().slice(0, 7), previous.toISOString().slice(0, 7)];
    for (const month of months) for (let slot = 1; slot <= STACKI_MONTHLY_STARTS; slot++) {
      const session = await this.read<StackiSession>(`stacki-sessions/v1/${month}/${slot}.json`);
      if (session?.id === id) { this.assertOwner(session, { scope, actorUserId }); return session; }
    }
    throw new StackiDraftError(404, "STACKI_SESSION_NOT_FOUND");
  }
  private assertOwner(session: StackiSession, owner: { scope: StackiDraftScope; actorUserId: string }) {
    if (session.actorUserId !== owner.actorUserId ||
        JSON.stringify(parseStackiScope(session.scope)) !== JSON.stringify(parseStackiScope(owner.scope)))
      throw new StackiDraftError(404, "STACKI_SESSION_NOT_FOUND");
  }
  async ready(session: StackiSession, value?: StackiSessionReady) {
    return this.receipt<StackiSessionReady>(session, "ready", value);
  }
  async saved(session: StackiSession, value?: StackiSessionSaved) {
    return this.receipt<StackiSessionSaved>(session, "saved", value);
  }
  async revision(session: StackiSession) {
    let revision = session.baseRevision;
    while (revision < STACKI_DRAFT_MAX_REVISIONS && await this.operationSaved(session, revision)) revision++;
    return revision;
  }
  async operationSaved(session: StackiSession, expectedRevision: number, value?: StackiSessionSaved) {
    return this.receipt<StackiSessionSaved>(session, `save-${expectedRevision}-saved`, value);
  }
  async operation(session: StackiSession, operation: StackiSaveOperation) {
    const key = `stacki-sessions/v1/${session.month}/${session.slot}-save-${operation.expectedRevision}.json`;
    const existing = await this.read<StackiSaveOperation>(key);
    if (!existing) {
      // Reconcile even a lost upload response. This intent owns a single revision.
      await this.put(key, operation).catch(() => {});
    }
    const stored = existing ?? await this.read<StackiSaveOperation>(key);
    if (!stored) unavailable();
    if (JSON.stringify(stored) !== JSON.stringify(operation))
      throw new StackiDraftError(409, "STACKI_SAVE_OPERATION_CONFLICT");
  }
  async closed(session: StackiSession, write = false) {
    return this.receipt(session, "closed", write ? { closed: true } : undefined);
  }
  private async receipt<T>(session: StackiSession, kind: string, value?: T): Promise<T | null> {
    const key = `stacki-sessions/v1/${session.month}/${session.slot}-${kind}.json`;
    if (value) await this.put(key, value);
    const result = await this.read<T>(key);
    if (value && JSON.stringify(result) !== JSON.stringify(value)) unavailable();
    return result;
  }
}
export function validateId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))
    throw new StackiDraftError(422, "STACKI_SESSION_ID_INVALID");
}
function unavailable(): never { throw new StackiDraftError(503, "STACKI_SESSION_STORAGE_UNAVAILABLE"); }
