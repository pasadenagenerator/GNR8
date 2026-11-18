import assert from "node:assert/strict";
import test from "node:test";
import { createStackiRecord, StackiDraftError, type StackiDraftScope } from "./stacki-draft-contract";
import { createStackiAiTextRoute } from "./stacki-ai-text-route";
import { locateStackiAiText } from "./stacki-ai-text";
import { createAstroStaticSiteProjectManifest } from "../output-adapters/astro-static-site-adapter";
import { astroDevServerSmokeProofFixture } from "../output-adapters/astro-static-site-dev-server-smoke-proof";

const scope: StackiDraftScope = {
  agencyId: "00000000-0000-4000-8000-000000000001",
  clientId: "00000000-0000-4000-8000-000000000002",
  siteId: "00000000-0000-4000-8000-000000000003",
  siteVersionId: "00000000-0000-4000-8000-000000000004",
};
const actor = "00000000-0000-4000-8000-000000000005";
const file = (path: string, text: string) => ({ path, base64: Buffer.from(text).toString("base64") });
const source = "---\ntitle: Example\n---\n<h1>  Hello world  </h1><p>Other text</p>";
const files = [file("package.json", "{}"), file("astro.config.mjs", "export default {}"), file("src/pages/index.astro", source)];
const context = { params: Promise.resolve({ clientId: scope.clientId, siteId: scope.siteId, siteVersionId: scope.siteVersionId }) };
const url = `https://example.test/api/gnr8/agency/clients/${scope.clientId}/sites/${scope.siteId}/stacki-drafts/${scope.siteVersionId}/ai-text?agencyId=${scope.agencyId}`;

function fixture() {
  let draft = createStackiRecord(scope, actor, { expectedRevision: 0, files });
  let calls = 0, writes = 0, enabled = true, allow = true;
  const route = createStackiAiTextRoute({
    enabled: () => true, canGenerate: () => enabled,
    authorize: async () => {
      if (!allow) throw new StackiDraftError(403, "STACKI_PILOT_ONLY");
      return { userId: actor, agencyId: scope.agencyId };
    },
    store: async () => ({
      latest: async () => draft,
      save: async (_scope, _actor, input, confirm) => {
        if (input.expectedRevision !== draft.revision) throw new StackiDraftError(409, "STACKI_DRAFT_CONFLICT");
        await confirm(); writes++;
        return draft = createStackiRecord(scope, actor, input);
      },
    }),
    generate: async () => { calls++; return JSON.stringify({ replacement: "Welcome home" }); },
  });
  const send = async (body: Record<string, unknown>, origin = "https://example.test") => {
    const response = await route.POST(new Request(url, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }), context);
    return { status: response.status, body: await response.json() };
  };
  return { send, get draft() { return draft; }, get calls() { return calls; }, get writes() { return writes; },
    disable: () => { enabled = false; }, deny: () => { allow = false; } };
}

test("proposal is preview only, then explicit apply saves exactly one new revision", async () => {
  const f = fixture();
  const base = { revision: f.draft.revision, sha256: f.draft.sha256, original: "Hello world" };
  const proposal = await f.send({ action: "propose", ...base, instruction: "Make it welcoming" });
  assert.equal(proposal.status, 200);
  assert.equal(proposal.body.replacement, "Welcome home");
  assert.equal(f.calls, 1); assert.equal(f.writes, 0);
  const applied = await f.send({ action: "apply", ...base, replacement: proposal.body.replacement });
  assert.equal(applied.status, 200);
  assert.equal(f.writes, 1); assert.equal(f.calls, 1);
  assert.match(Buffer.from(f.draft.files.find(item => item.path === "src/pages/index.astro")!.base64, "base64").toString(), /<h1>  Welcome home  <\/h1>/);
  assert.equal((await f.send({ action: "apply", ...base, replacement: proposal.body.replacement })).status, 409);
});

test("closed gate, wrong origin, missing text and missing access fail without AI calls", async () => {
  const f = fixture();
  const base = { revision: f.draft.revision, sha256: f.draft.sha256, original: "Hello world", instruction: "Improve" };
  f.disable();
  assert.equal((await f.send({ action: "propose", ...base })).body.reason, "STACKI_AI_DISABLED");
  assert.equal((await f.send({ action: "propose", ...base }, "https://wrong.test")).status, 403);
  assert.equal((await f.send({ action: "propose", ...base, original: "missing" })).status, 422);
  f.deny();
  assert.equal((await f.send({ action: "propose", ...base })).status, 403);
  assert.equal(f.calls, 0); assert.equal(f.writes, 0);
});

test("markup in generated replacement is rejected before writing", async () => {
  const f = fixture();
  const base = { revision: f.draft.revision, sha256: f.draft.sha256, original: "Hello world" };
  const result = await f.send({ action: "apply", ...base, replacement: "<script>bad</script>" });
  assert.equal(result.status, 422);
  assert.equal(f.writes, 0);
});

test("adapter finds a real generated Astro headline without Studio internals", () => {
  const fixture = astroDevServerSmokeProofFixture();
  const manifest = createAstroStaticSiteProjectManifest(fixture);
  const sourceFiles = manifest.files.map(item => file(item.path, item.contents));
  const location = locateStackiAiText(sourceFiles, fixture.hero.headline);
  assert.equal(location.source.slice(location.offset, location.offset + fixture.hero.headline.length), fixture.hero.headline);
});
