/**
 * Editor-runtime entry point, not a Platform request handler.
 *
 * Hosted use requires an isolated Sandbox with the pinned Studio/Astro packages
 * already installed, only gatewayPort exposed, a provider-enforced timeout, and
 * an owner-authorized one-use entry ticket. No package installation, provider
 * calls, production publication or credential injection happens here.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createStackiEditorGateway } from "./stacki-editor-gateway";

export async function startStackiEditorRuntime(input: {
  workspace: string;
  studio: string;
  publicOrigin: string;
  gatewayPort: number;
  astroPort: number;
  entryTicket: string;
  expiresAt: number;
  allowLocalHttp?: boolean;
  /** Bundled module exporting captureStackiRuntimeFiles; requires patched Studio. */
  checkpointModule?: string;
  persistence?: { platformOrigin: string; sessionId: string; revision: number };
}) {
  if (!Number.isInteger(input.gatewayPort) || input.gatewayPort < 1 || input.gatewayPort > 65535 ||
      input.gatewayPort === input.astroPort) throw new Error("STACKI_RUNTIME_PORT_INVALID");
  const gateway = createStackiEditorGateway({
    publicOrigin: input.publicOrigin, upstreamPort: input.astroPort,
    entryTicket: input.entryTicket, expiresAt: input.expiresAt, allowLocalHttp: input.allowLocalHttp,
  });
  let child: ChildProcess | undefined;
  let closing: Promise<void> | undefined;
  let log = "";
  const expiry = setTimeout(() => { void close().catch(() => { /* caller may also await close */ }); }, input.expiresAt - Date.now());
  expiry.unref();
  function close() {
    if (closing) return closing;
    closing = (async () => {
      clearTimeout(expiry);
      gateway.revoke();
      await gateway.close();
      if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
      const current = child;
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => current.kill("SIGKILL"), 3000);
        current.once("exit", () => { clearTimeout(timer); resolve(); });
        current.kill("SIGTERM");
      });
    })();
    return closing;
  }
  try {
    const workspace = await realpath(input.workspace);
    const studio = await realpath(input.studio);
    const astro = JSON.parse(await readFile(join(workspace, "node_modules/astro/package.json"), "utf8"));
    const manifest = JSON.parse(await readFile(join(studio, "package.json"), "utf8"));
    if (astro.version !== "5.18.2" || astro.bin?.astro !== "astro.js" || manifest.version !== "0.1.59")
      throw new Error("STACKI_RUNTIME_VERSION_NOT_VERIFIED");
    await mkdir(join(workspace, ".studio-state"), { recursive: true });
    await writeFile(join(workspace, "astro.studio.config.ts"),
      `import config from './astro.config.mjs';\nimport studio from ${JSON.stringify(pathToFileURL(join(studio, "dist/integration.mjs")).href)};\n` +
      (input.checkpointModule ? `import {captureStackiRuntimeFiles} from ${JSON.stringify(pathToFileURL(input.checkpointModule).href)};\n` : "") +
      `export default {...config,devToolbar:{enabled:false},integrations:[...(config.integrations??[]),` +
      `studio({...${JSON.stringify({ root: workspace, assets: join(studio, "dist"), port: input.astroPort })}` +
      (input.checkpointModule ? `,gnr8Checkpoint:()=>captureStackiRuntimeFiles(${JSON.stringify(workspace)})` : "") +
      (input.persistence ? `,gnr8Persistence:${JSON.stringify(input.persistence)}` : "") + `})]};\n`);
    if (closing) throw new Error("STACKI_RUNTIME_EXPIRED");
    child = spawn(process.execPath, [
      join(workspace, "node_modules/astro/astro.js"),
      "dev", "--config", "./astro.studio.config.ts", "--port", String(input.astroPort), "--host", "127.0.0.1",
    ], {
      cwd: workspace, stdio: ["ignore", "pipe", "pipe"],
      env: { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR,
        NODE_ENV: "development", ASTRO_TELEMETRY_DISABLED: "1" },
    });
    const record = (bytes: Buffer) => { log = (log + bytes.toString()).slice(-40_000); };
    child.stdout?.on("data", record); child.stderr?.on("data", record);
    let processError: Error | undefined;
    child.once("error", error => { processError = error; });
    child.once("exit", () => { void close().catch(() => { /* exposed through close */ }); });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (processError || child.exitCode !== null || child.signalCode !== null || closing)
        throw new Error("STACKI_RUNTIME_START_FAILED");
      let ready = false;
      try {
        ready = (await fetch(`http://127.0.0.1:${input.astroPort}/studio/api/session`, {
          signal: AbortSignal.timeout(1000),
        })).ok;
      } catch { /* bounded startup retry */ }
      if (ready) {
        if (closing) throw new Error("STACKI_RUNTIME_EXPIRED");
        await gateway.listen(input.gatewayPort);
        if (closing) { await gateway.close(); throw new Error("STACKI_RUNTIME_EXPIRED"); }
        return { entryUrl: gateway.entryUrl, close, freeze: gateway.revoke, readLog: () => log };
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error("STACKI_RUNTIME_START_TIMEOUT");
  } catch (error) {
    await close();
    throw error;
  }
}
