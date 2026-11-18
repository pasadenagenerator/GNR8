/** Bundled into the clean Linux runtime image; never imported by Next.js. */
import { createServer } from "node:http";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { startStackiEditorRuntime } from "./stacki-editor-runtime";
import { createStackiRuntimeCheckpoint } from "./stacki-runtime-checkpoint";

const root = "/vercel/sandbox/gnr8";
const config = JSON.parse(await readFile(`${root}/session.json`, "utf8"));
await unlink(`${root}/session.json`);
let aiProxy: ReturnType<typeof createServer> | undefined;
if (config.nativeAi) {
  const endpoint = new URL(config.nativeAi.endpoint);
  if (endpoint.protocol !== "https:" || endpoint.origin !== config.persistence?.platformOrigin ||
      endpoint.pathname !== "/api/gnr8/stacki/native-ai/chat/completions" ||
      !/^[A-Za-z0-9_-]{43}$/.test(config.nativeAi.token)) throw new Error("STACKI_AI_PROXY_CONFIG_INVALID");
  aiProxy = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/v1/chat/completions" ||
        request.headers["content-type"] !== "application/json") { response.writeHead(404).end(); return; }
    try {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of request) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += bytes.length;
        if (size > 256_000) { response.writeHead(413).end(); return; }
        chunks.push(bytes);
      }
      const body = Buffer.concat(chunks);
      const upstream = await fetch(endpoint, {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${config.nativeAi.token}`,
          "x-gnr8-stacki-session": config.persistence.sessionId },
        body, signal: AbortSignal.timeout(55_000),
      });
      response.writeHead(upstream.status, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(await upstream.text());
    } catch { response.writeHead(502).end(); }
  });
  await new Promise<void>((resolve, reject) => aiProxy!.listen(4359, "127.0.0.1", () => resolve()).once("error", reject));
}
const runtime = await startStackiEditorRuntime({
  ...config, workspace: `${root}/site`, studio: `${root}/studio`,
  checkpointModule: `${root}/capture.mjs`, gatewayPort: 4357, astroPort: 4356,
});
const capture = createStackiRuntimeCheckpoint(root, 4356);
// Control port is loopback-only and NEVER published through Vercel.
const control = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/checkpoint") { response.writeHead(404).end(); return; }
  try {
    let body = "";
    for await (const chunk of request) {
      body += chunk.toString();
      if (body.length > 1024) throw new Error("Invalid operation");
    }
    await capture(JSON.parse(body));
    response.writeHead(200).end("OK");
  }
  catch { response.writeHead(503).end("Capture failed"); }
});
control.listen(4358, "127.0.0.1");
await writeFile(`${root}/ready.json`, JSON.stringify({ entryUrl: runtime.entryUrl }));
setTimeout(() => { control.close(); aiProxy?.close(); void runtime.close(); }, config.expiresAt - Date.now()).unref();
