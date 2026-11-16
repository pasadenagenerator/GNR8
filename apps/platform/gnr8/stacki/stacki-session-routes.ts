import type { StackiAssetDelivery } from './stacki-github-delivery';
import type { StackiAssetProgress } from './stacki-asset-preparation';
import type { StackiRuntimeAsset } from './stacki-retained-assets';
import { stackiSourceSha256, parseStackiScope, parseStackiSave, STACKI_DRAFT_MAX_REVISIONS, StackiDraftError, type StackiDraftScope, type StackiDraftFile, type StackiDraftRecord } from "./stacki-draft-contract";
import { failure, readBoundedJson, requireSameOriginJson } from "./stacki-draft-route-handlers";
import type { SupabaseStackiDraftStore } from "./stacki-draft-store";
import { validateId, type StackiSession, type StackiSaveOperation, type StackiSessionStore } from "./stacki-session-store";

export interface StackiSessionProvider {
  start(session: StackiSession, files: StackiDraftFile[], retainedAssets?: StackiRuntimeAsset[], delivery?: StackiAssetDelivery): Promise<{ entryUrl: string }>;
  capture(session: StackiSession, operation: StackiSaveOperation): Promise<StackiDraftFile[]>;
  stop(session: StackiSession): Promise<void>;
}
type Dependencies = {
  enabled(): boolean;
  authorize(scope: StackiDraftScope): Promise<{ userId: string; agencyId: string }>;
  drafts(scope: StackiDraftScope): Pick<SupabaseStackiDraftStore, "latest" | "save" | "revision"> |
    Promise<Pick<SupabaseStackiDraftStore, "latest" | "save" | "revision">>;
  sessions(): StackiSessionStore;
  provider(): StackiSessionProvider;
  prepare(request: Request, context: Context): Promise<Response>;
  retainedAssets?(scope:StackiDraftScope):Promise<StackiRuntimeAsset[]>;
  loadPrepared?(scope:StackiDraftScope):Promise<{draft:StackiDraftRecord;retainedAssets:StackiRuntimeAsset[];delivery?:(expiresAt:number)=>Promise<StackiAssetDelivery>}|null>;
  prepareAssets?(scope:StackiDraftScope,index:number,identity:string|null,confirm:()=>Promise<void>):Promise<StackiAssetProgress>;
  history?(scope:StackiDraftScope):Promise<Array<{revision:number;sha256:string;commit:string}>>;
};
type Context = { params: Promise<{ clientId: string; siteId: string; siteVersionId: string }> };
const headers = { "cache-control": "private, no-store", "referrer-policy": "no-referrer" };

export function createStackiSessionRoutes(deps: Dependencies) {
  return { async POST(request: Request, context: Context) {
    const startedAt = Date.now();
    let phase = "authorize";
    try {
      if (!deps.enabled()) throw new StackiDraftError(404, "STACKI_SESSIONS_DISABLED");
      requireSameOriginJson(request);
      const scope = parseStackiScope({ ...await context.params, agencyId: new URL(request.url).searchParams.get("agencyId") });
      const actor = await deps.authorize(scope);
      if (actor.agencyId !== scope.agencyId) throw new StackiDraftError(404, "STACKI_SESSION_NOT_FOUND");
      const body = await readBoundedJson(request) as { action?: unknown; id?: unknown; operationId?: unknown; expectedRevision?: unknown; index?:unknown; identity?:unknown };
      const saving = body?.action === "save" || body?.action === "save-and-close";
      const preparing = body?.action === "prepare-assets";
      if (!body || Object.keys(body).sort().join(",") !== (saving ? "action,expectedRevision,id,operationId" : preparing ? "action,id,identity,index" : "action,id") || !["open", "save", "save-and-close", "discard", "prepare-assets", "history"].includes(String(body.action)))
        throw new StackiDraftError(422, "STACKI_SESSION_ACTION_INVALID");
      validateId(body.id);
      const sessions = deps.sessions();
      const provider = deps.provider();
      const confirm = async () => {
        const current = await deps.authorize(scope);
        if (current.userId !== actor.userId || current.agencyId !== scope.agencyId)
          throw new StackiDraftError(403, "STACKI_ACTOR_CHANGED");
      };
      if (preparing) {
        phase = "prepare-assets";
        if (!deps.prepareAssets || !Number.isInteger(body.index) || Number(body.index)<0 ||
            !(body.identity===null || (typeof body.identity==='string' && /^[a-f0-9]{64}$/.test(body.identity))))
          throw new StackiDraftError(422,"STACKI_ASSET_STEP_INVALID");
        const progress=await deps.prepareAssets(scope,Number(body.index),body.identity as string|null,confirm);
        return Response.json({ok:true,state:"preparing-assets",...progress},{headers});
      }
      if (body.action === "open") {
        // Reopening an existing session needs only its verified receipts. Do not
        // reload the source/assets or spend the remaining runtime on preparation.
        phase = "existing-session";
        let existing: StackiSession | undefined;
        try { existing = await sessions.find(body.id, scope, actor.userId); }
        catch (error) {
          if (!(error instanceof StackiDraftError) || error.code !== "STACKI_SESSION_NOT_FOUND") throw error;
        }
        if (existing) {
          const saved = await sessions.saved(existing);
          const closed = await sessions.closed(existing);
          await confirm();
          if (saved) return Response.json({ ok: true, state: "saved", ...saved }, { headers });
          if (closed) return Response.json({ ok: true, state: "closed" }, { headers });
          if (Date.now() >= existing.expiresAt - 60_000)
            throw new StackiDraftError(410, "STACKI_SESSION_EXPIRED");
          const ready = await sessions.ready(existing);
          if (!ready) throw new StackiDraftError(409, "STACKI_SESSION_START_PENDING");
          const revision = await sessions.revision(existing);
          await confirm();
          if (Date.now() >= existing.expiresAt - 60_000)
            throw new StackiDraftError(410, "STACKI_SESSION_EXPIRED");
          return Response.json({ ok: true, state: "editing", id: existing.id, ...ready,
            expiresAt: existing.expiresAt - 60_000, revision }, { headers });
        }
        phase = "prepare-draft";
        const loaded = await deps.loadPrepared?.(scope) ?? null;
        if (!loaded) {
          const prepared = await deps.prepare(new Request(request.url, {
            method: "POST", headers: request.headers, body: "{}",
          }), context);
          if (!prepared.ok) return prepared;
        }
        const draft = loaded?.draft ?? await (await deps.drafts(scope)).latest(scope);
        if (!draft) throw new StackiDraftError(503, "STACKI_DRAFT_UNAVAILABLE");
        if (draft.revision >= STACKI_DRAFT_MAX_REVISIONS) throw new StackiDraftError(429, "STACKI_DRAFT_REVISION_LIMIT");
        phase = "retained-assets";
        const retainedAssets = loaded?.retainedAssets ?? await deps.retainedAssets?.(scope) ?? [];
        await confirm();
        // Keep half of the 120s route budget for reservation, upload and readiness.
        // A slow read must not consume a pilot start seconds before the host kills us.
        if (Date.now() - startedAt >= 60_000)
          throw new StackiDraftError(503, "STACKI_PREPARATION_TIMEOUT");
        phase = "claim";
        if (loaded) console.info("gnr8-stacki-session-progress", { phase, elapsedMs: Date.now() - startedAt });
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
            phase = "provider-start";
            if (loaded) console.info("gnr8-stacki-session-progress", { phase, elapsedMs: Date.now() - startedAt });
            const delivery = await loaded?.delivery?.(session.expiresAt - 60_000);
            await confirm();
            ready = await provider.start(session, draft.files, retainedAssets, delivery);
            if (loaded) console.info("gnr8-stacki-session-progress", { phase: "provider-ready", elapsedMs: Date.now() - startedAt });
            await sessions.ready(session, ready);
          } catch (error) {
            // Never retry creation. The immutable reservation remains consumed.
            await provider.stop(session).catch(() => {});
            throw error;
          }
        }
        const revision = await sessions.revision(session);
        const restored = revision === draft.revision ? draft : await (await deps.drafts(scope)).revision(scope, revision);
        await confirm();
        return Response.json({ ok: true, state: "editing", id: session.id, ...ready,
          expiresAt: session.expiresAt - 60_000, revision, sourceSha256: stackiSourceSha256(restored.files) }, { headers });
      }
      phase = String(body.action);
      const session = await sessions.find(body.id, scope, actor.userId);
      if (body.action === "history") {
        if (!deps.history) throw new StackiDraftError(404,'STACKI_GITHUB_NOT_CONFIGURED');
        const history = await deps.history(scope);
        await confirm();
        return Response.json({ok:true,state:'history',history},{headers});
      }
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
        const record = await (await deps.drafts(scope)).save(scope, actor.userId, { expectedRevision: operation.expectedRevision, files }, confirm);
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
      const verified = await (await deps.drafts(scope)).revision(scope, saved.revision);
      if (verified.sha256 !== saved.sha256) throw new StackiDraftError(409, "STACKI_DRAFT_CONFLICT");
      await confirm();
      return Response.json({ ok: true, state: "saved", closed: body.action === "save-and-close",
        operationId: operation.operationId, ...saved, sourceSha256: stackiSourceSha256(verified.files) }, { headers });
    } catch (error) {
      // No tickets, URLs, source content, actor identifiers or raw provider errors.
      console.warn("gnr8-stacki-session-failure", { phase, elapsedMs: Date.now() - startedAt,
        reason: error instanceof StackiDraftError ? error.code : "STACKI_DRAFT_UNAVAILABLE" });
      return failure(error);
    }
  } };
}
