import { StackiDraftError, parseStackiScope, type StackiDraftRecord, type StackiDraftScope } from "./stacki-draft-contract";
import { failure, readBoundedJson, requireSameOriginJson } from "./stacki-draft-route-handlers";
import { checkStackiAiText, locateStackiAiText, replaceStackiAiText, stackiAiTextPrompt, STACKI_AI_TEXT_SCHEMA } from "./stacki-ai-text";

type Store = {
  latest(scope: StackiDraftScope): Promise<StackiDraftRecord | null>;
  save(scope: StackiDraftScope, actor: string, input: { expectedRevision: number; files: StackiDraftRecord["files"] }, confirm: () => Promise<void>): Promise<StackiDraftRecord>;
};
type Context = { params: Promise<{ clientId: string; siteId: string; siteVersionId: string }> };
type Dependencies = {
  enabled(): boolean;
  canGenerate(): boolean;
  authorize(scope: StackiDraftScope): Promise<{ userId: string; agencyId: string }>;
  store(scope: StackiDraftScope): Promise<Store>;
  generate(prompt: string, schema: typeof STACKI_AI_TEXT_SCHEMA): Promise<string>;
};
const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };

function bodyRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new StackiDraftError(422, "STACKI_AI_BODY_INVALID");
  return value as Record<string, unknown>;
}
function exactKeys(body: Record<string, unknown>, keys: string[]) {
  if (Object.keys(body).sort().join(",") !== keys.sort().join(","))
    throw new StackiDraftError(422, "STACKI_AI_BODY_INVALID");
}
function expectedDraft(body: Record<string, unknown>, draft: StackiDraftRecord | null): StackiDraftRecord {
  if (!draft || !Number.isInteger(body.revision) || body.revision !== draft.revision || body.sha256 !== draft.sha256)
    throw new StackiDraftError(409, "STACKI_DRAFT_CONFLICT");
  return draft;
}

/** Platform-owned adapter: no Stacki Studio imports, DOM selectors or runtime API. */
export function createStackiAiTextRoute(deps: Dependencies) {
  return { async POST(request: Request, context: Context): Promise<Response> {
    try {
      if (!deps.enabled()) throw new StackiDraftError(404, "STACKI_DRAFTS_DISABLED");
      requireSameOriginJson(request);
      const scope = parseStackiScope({ ...await context.params, agencyId: new URL(request.url).searchParams.get("agencyId") });
      const actor = await deps.authorize(scope);
      if (actor.agencyId !== scope.agencyId) throw new StackiDraftError(404, "STACKI_DRAFT_NOT_FOUND");
      const body = bodyRecord(await readBoundedJson(request));
      const proposing = body.action === "propose";
      exactKeys(body, proposing ? ["action", "revision", "sha256", "original", "instruction"]
        : ["action", "revision", "sha256", "original", "replacement"]);
      if (!proposing && body.action !== "apply") throw new StackiDraftError(422, "STACKI_AI_BODY_INVALID");
      const original = checkStackiAiText(body.original, "original");
      const store = await deps.store(scope);
      const draft = expectedDraft(body, await store.latest(scope));
      locateStackiAiText(draft.files, original);
      const confirm = async () => {
        const current = await deps.authorize(scope);
        if (current.userId !== actor.userId || current.agencyId !== actor.agencyId)
          throw new StackiDraftError(403, "STACKI_ACTOR_CHANGED");
      };
      if (proposing) {
        if (!deps.canGenerate()) throw new StackiDraftError(409, "STACKI_AI_DISABLED");
        const instruction = checkStackiAiText(body.instruction, "instruction");
        const output = await deps.generate(stackiAiTextPrompt(original, instruction), STACKI_AI_TEXT_SCHEMA);
        let replacement: string;
        try { replacement = checkStackiAiText(JSON.parse(output).replacement, "replacement"); }
        catch { throw new StackiDraftError(502, "STACKI_AI_RESPONSE_INVALID"); }
        if (replacement === original) throw new StackiDraftError(422, "STACKI_AI_TEXT_UNCHANGED");
        await confirm();
        return Response.json({ ok: true, revision: draft.revision, sha256: draft.sha256, original, replacement }, { headers });
      }
      const replacement = checkStackiAiText(body.replacement, "replacement");
      const files = replaceStackiAiText(draft.files, original, replacement);
      await confirm();
      const saved = await store.save(scope, actor.userId, { expectedRevision: draft.revision, files }, confirm);
      return Response.json({ ok: true, revision: saved.revision, sha256: saved.sha256 }, { headers });
    } catch (error) { return failure(error); }
  } };
}
