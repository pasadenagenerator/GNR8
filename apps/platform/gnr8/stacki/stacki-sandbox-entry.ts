/** Bundled into the clean Linux runtime image; never imported by Next.js. */
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { startStackiEditorRuntime } from "./stacki-editor-runtime";
import { createStackiRuntimeCheckpoint } from "./stacki-runtime-checkpoint";

const root = "/vercel/sandbox/gnr8";
const config = JSON.parse(await readFile(`${root}/session.json`, "utf8"));
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
setTimeout(() => { control.close(); void runtime.close(); }, config.expiresAt - Date.now()).unref();
