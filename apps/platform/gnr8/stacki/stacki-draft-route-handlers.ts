import {
  STACKI_REQUEST_MAX_BYTES, STACKI_DRAFT_MAX_REVISIONS, createStackiManifest, StackiDraftError, parseStackiSave, parseStackiScope,
  type StackiDraftScope, type StackiDraftFile,
} from "./stacki-draft-contract";
import type { SupabaseStackiDraftStore } from "./stacki-draft-store";

export type StackiDraftRouteDependencies = {
  enabled(): boolean;
  authorize(scope: StackiDraftScope): Promise<{ userId: string; agencyId: string }>;
  store(): Pick<SupabaseStackiDraftStore, "latest" | "revision" | "save">;
  source?(scope: StackiDraftScope): Promise<StackiDraftFile[]>;
};
type Context = { params: Promise<{ clientId: string; siteId: string; siteVersionId: string }> };
const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };

export function createStackiDraftRouteHandlers(deps: StackiDraftRouteDependencies) {
  async function access(request: Request, context: Context) {
    if (!deps.enabled()) throw new StackiDraftError(404, "STACKI_DRAFTS_DISABLED");
    const scope = parseStackiScope({ ...await context.params, agencyId: new URL(request.url).searchParams.get("agencyId") });
    const actor = await deps.authorize(scope);
    if (actor.agencyId !== scope.agencyId) throw new StackiDraftError(404, "STACKI_DRAFT_NOT_FOUND");
    const confirm = async () => {
      const current = await deps.authorize(scope);
      if (current.userId !== actor.userId || current.agencyId !== scope.agencyId)
        throw new StackiDraftError(403, "STACKI_ACTOR_CHANGED");
    };
    return { scope, actor, confirm };
  }
  return {
    /** Explicit mutation only; opening/rendering a page never creates a draft. */
    async PREPARE(request: Request, context: Context) {
      try {
        const { scope, actor, confirm } = await access(request, context);
        requireSameOriginJson(request);
        const body = await readBoundedJson(request);
        // Source content, actor and revision are server-owned in this operation.
        if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length)
          throw new StackiDraftError(422, "STACKI_PREPARE_BODY_INVALID");
        const store = deps.store();
        const existing = await store.latest(scope);
        if (existing) return Response.json({ ok: true, reused: true, revision: existing.revision, sha256: existing.sha256 }, { headers });
        if (!deps.source) throw new StackiDraftError(503, "STACKI_SOURCE_UNAVAILABLE");
        const files = await deps.source(scope);
        // Recheck membership after source/asset loading before the first write.
        const confirmed = await deps.authorize(scope);
        if (confirmed.userId !== actor.userId || confirmed.agencyId !== scope.agencyId)
          throw new StackiDraftError(403, "STACKI_ACTOR_CHANGED");
        let checkpoint;
        let reused = false;
        try { checkpoint = await store.save(scope, actor.userId, { expectedRevision: 0, files }, confirm); }
        catch (error) {
          // Another request may have prepared (and even edited) this version.
          // Never reset it to the original; return the authoritative latest copy.
          if (!(error instanceof StackiDraftError) || error.code !== "STACKI_DRAFT_CONFLICT") throw error;
          checkpoint = await store.latest(scope);
          if (!checkpoint) throw error;
          reused = true;
        }
        return Response.json({ ok: true, reused, revision: checkpoint.revision, sha256: checkpoint.sha256 }, { status: reused ? 200 : 201, headers });
      } catch (error) { return failure(error); }
    },
    async GET(request: Request, context: Context) {
      try {
        const { scope } = await access(request, context);
        const query = new URL(request.url).searchParams;
        const revision = query.get("revision");
        if (revision !== null && (!/^[1-9][0-9]*$/.test(revision) || Number(revision) > STACKI_DRAFT_MAX_REVISIONS))
          throw new StackiDraftError(422, "STACKI_REVISION_INVALID");
        const store = deps.store();
        const checkpoint = revision === null ? await store.latest(scope) : await store.revision(scope, Number(revision));
        // Verify every durable byte through the same dual reader before returning
        // a small recovery receipt. Large projects exceed serverless response limits.
        if (query.get("verify") === "1")
          return Response.json({ ok: true, verification: checkpoint ? createStackiManifest(checkpoint) : null }, { headers });
        return Response.json({ ok: true, checkpoint }, { headers });
      } catch (error) { return failure(error); }
    },
    async POST(request: Request, context: Context) {
      try {
        const { scope, actor, confirm } = await access(request, context);
        requireSameOriginJson(request);
        const save = parseStackiSave(await readBoundedJson(request));
        const checkpoint = await deps.store().save(scope, actor.userId, save, confirm);
        return Response.json({ ok: true, revision: checkpoint.revision, sha256: checkpoint.sha256 }, { headers });
      } catch (error) { return failure(error); }
    },
  };
}

export function requireSameOriginJson(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new StackiDraftError(403, "STACKI_ORIGIN_INVALID");
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json")
    throw new StackiDraftError(415, "STACKI_JSON_REQUIRED");
}

export async function readBoundedJson(request: Request): Promise<unknown> {
  if (!request.body) throw new StackiDraftError(422, "STACKI_CHECKPOINT_INVALID");
  const reader = request.body.getReader();
  const bytes = Buffer.alloc(STACKI_REQUEST_MAX_BYTES);
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > STACKI_REQUEST_MAX_BYTES) {
        await reader.cancel();
        throw new StackiDraftError(413, "STACKI_CHECKPOINT_TOO_LARGE");
      }
      bytes.set(chunk.value, size - chunk.value.byteLength);
    }
    return JSON.parse(bytes.subarray(0, size).toString("utf8"));
  } catch (error) {
    if (error instanceof StackiDraftError) throw error;
    throw new StackiDraftError(422, "STACKI_CHECKPOINT_INVALID");
  } finally { reader.releaseLock(); }
}

export function failure(error: unknown) {
  const code = error instanceof StackiDraftError ? error.code : "STACKI_DRAFT_UNAVAILABLE";
  const authStatus = error instanceof Error ? Number(error.message.split("|", 1)[0]) : 0;
  const status = error instanceof StackiDraftError ? error.status
    : [400, 401, 403, 404].includes(authStatus) ? authStatus : 503;
  return Response.json({ ok: false, reason: code }, { status, headers });
}
