import { parseStackiScope, parseStackiSave, STACKI_DRAFT_MAX_REVISIONS, StackiDraftError, type StackiDraftScope, type StackiDraftFile } from "./stacki-draft-contract";
import { failure, readBoundedJson, requireSameOriginJson } from "./stacki-draft-route-handlers";
import type { SupabaseStackiDraftStore } from "./stacki-draft-store";
import { validateId, type StackiSession, type StackiSaveOperation, type StackiSessionStore } from "./stacki-session-store";

export interface StackiSessionProvider {
  start(session: StackiSession, files: StackiDraftFile[]): Promise<{ entryUrl: string }>;
  capture(session: StackiSession, operation: StackiSaveOperation): Promise<StackiDraftFile[]>;
  stop(session: StackiSession): Promise<void>;
}
type Dependencies = {
  enabled(): boolean;
  authorize(scope: StackiDraftScope): Promise<{ userId: string; agencyId: string }>;
  drafts(): Pick<SupabaseStackiDraftStore, "latest" | "save">;
  sessions(): StackiSessionStore;
  provider(): StackiSessionProvider;
  prepare(request: Request, context: Context): Promise<Response>;
};
type Context = { params: Promise<{ clientId: string; siteId: string; siteVersionId: string }> };
const headers = { "cache-control": "private, no-store", "referrer-policy": "no-referrer" };

export function createStackiSessionRoutes(deps: Dependencies) {
  return { async POST(request: Request, context: Context) {
    try {
      if (!deps.enabled()) throw new StackiDraftError(404, "STACKI_SESSIONS_DISABLED");
      requireSameOriginJson(request);
      const scope = parseStackiScope({ ...await context.params, agencyId: new URL(request.url).searchParams.get("agencyId") });
      const actor = await deps.authorize(scope);
      if (actor.agencyId !== scope.agencyId) throw new StackiDraftError(404, "STACKI_SESSION_NOT_FOUND");
      const body = await readBoundedJson(request) as { action?: unknown; id?: unknown; operationId?: unknown; expectedRevision?: unknown };
      const saving = body?.action === "save" || body?.action === "save-and-close";
      if (!body || Object.keys(body).sort().join(",") !== (saving ? "action,expectedRevision,id,operationId" : "action,id") || !["open", "save", "save-and-close", "discard"].includes(String(body.action)))
        throw new StackiDraftError(422, "STACKI_SESSION_ACTION_INVALID");
      validateId(body.id);
      const sessions = deps.sessions();
      const provider = deps.provider();
      const confirm = async () => {
        const current = await deps.authorize(scope);
        if (current.userId !== actor.userId || current.agencyId !== scope.agencyId)
          throw new StackiDraftError(403, "STACKI_ACTOR_CHANGED");
      };
      if (body.action === "open") {
        const prepared = await deps.prepare(new Request(request.url, {
          method: "POST", headers: request.headers, body: "{}",
        }), context);
        if (!prepared.ok) return prepared;
        const draft = await deps.drafts().latest(scope);
        if (!draft) throw new StackiDraftError(503, "STACKI_DRAFT_UNAVAILABLE");
        if (draft.revision >= STACKI_DRAFT_MAX_REVISIONS) throw new StackiDraftError(429, "STACKI_DRAFT_REVISION_LIMIT");
        await confirm();
        const { session, claimed } = await sessions.claim({
          id: body.id, scope, actorUserId: actor.userId, baseRevision: draft.revision, platformOrigin: new URL(request.url).origin,
        });
        const saved = await sessions.saved(session);
        if (saved) return Response.json({ ok: true, state: "saved", ...saved }, { headers });
        if (await sessions.closed(session)) return Response.json({ ok: true, state: "closed" }, { headers });
        if (Date.now() >= session.expiresAt - 60_000) throw new StackiDraftError(410, "STACKI_SESSION_EXPIRED");
        let ready = await sessions.ready(session);
        if (!ready && !claimed) throw new StackiDraftError(409, "STACKI_SESSION_START_PENDING");
        if (!ready) {
          try {
            await confirm();
            ready = await provider.start(session, draft.files);
            await sessions.ready(session, ready);
          } catch (error) {
            // Never retry creation. The immutable reservation remains consumed.
            await provider.stop(session).catch(() => {});
            throw error;
          }
        }
        return Response.json({ ok: true, state: "editing", id: session.id, ...ready,
          expiresAt: session.expiresAt - 60_000, revision: await sessions.revision(session) }, { headers });
      }
      const session = await sessions.find(body.id, scope, actor.userId);
      if (body.action === "discard") {
        await provider.stop(session);
        await sessions.closed(session, true);
        return Response.json({ ok: true, state: "closed" }, { headers });
      }
      validateId(body.operationId);
      if (!Number.isInteger(body.expectedRevision) || Number(body.expectedRevision) < session.baseRevision ||
          Number(body.expectedRevision) >= STACKI_DRAFT_MAX_REVISIONS)
        throw new StackiDraftError(422, "STACKI_SAVE_REVISION_INVALID");
      const operation = { operationId: body.operationId, expectedRevision: Number(body.expectedRevision) };
      // Validate the session's contiguous receipts, never adopt another session's head.
      if (operation.expectedRevision > await sessions.revision(session))
        throw new StackiDraftError(409, "STACKI_DRAFT_CONFLICT");
      await sessions.operation(session, operation);
      let saved = await sessions.operationSaved(session, operation.expectedRevision);
      if (!saved) {
        if (await sessions.closed(session) || Date.now() >= session.expiresAt - 60_000)
          throw new StackiDraftError(410, "STACKI_SESSION_EXPIRED");
        const files = parseStackiSave({ expectedRevision: operation.expectedRevision,
          files: await provider.capture(session, operation) }).files;
        await confirm();
        const record = await deps.drafts().save(scope, actor.userId, { expectedRevision: operation.expectedRevision, files }, confirm);
        saved = { revision: record.revision, sha256: record.sha256 };
        await sessions.operationSaved(session, operation.expectedRevision, saved);
      }
      if (body.action === "save-and-close") {
        if (saved.revision !== await sessions.revision(session))
          throw new StackiDraftError(409, "STACKI_DRAFT_CONFLICT");
        await confirm();
        // This terminal receipt also lets a recovered panel recognize completion.
        await sessions.saved(session, saved);
        await provider.stop(session);
        await sessions.closed(session, true);
      }
      return Response.json({ ok: true, state: "saved", closed: body.action === "save-and-close",
        operationId: operation.operationId, ...saved }, { headers });
    } catch (error) { return failure(error); }
  } };
}
