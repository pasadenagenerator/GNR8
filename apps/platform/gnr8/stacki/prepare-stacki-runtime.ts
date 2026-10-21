/**
 * Offline packaging only. Does not create a Sandbox, upload, install or deploy.
 * Input: pinned assembled/built Studio checkout, new output dir, optional Astro
 * dependency project. A deployable image requires all three inputs on Linux.
 * For a hosted snapshot run this on Linux with Linux-installed dependencies.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { patchStackiCheckpoint } from "./stacki-studio-patch";
import { STACKI_CHECKPOINT_MAX_BYTES } from "./stacki-draft-contract";

export async function prepareStackiRuntime(studio: string, output: string, astroProject?: string) {
  const pin = "36bab90a9ba5fb19134a13f6f1a9e71b2ea7ce24";
  if (execFileSync("git", ["rev-parse", "HEAD"], { cwd: dirname(studio), encoding: "utf8" }).trim() !== pin)
    throw new Error("STACKI_UPSTREAM_PIN_MISMATCH");
  // Reject modified tracked upstream input. Our compatibility patch is applied to
  // a separate copy; the user's editor and verified original stay untouched.
  if (execFileSync("git", ["diff", "HEAD", "--", "studio/src", "studio/package.json", "studio/package-lock.json"], { cwd: dirname(studio), encoding: "utf8" }).trim())
    throw new Error("STACKI_UPSTREAM_DIRTY");
  const require = createRequire(join(studio, "package.json"));
  const { build } = require("esbuild") as { build(options: Record<string, unknown>): Promise<void> };
  await mkdir(output, { recursive: false });
  const copy = join(output, "studio");
  await mkdir(copy);
  for (const item of ["src", "vendor", "dist", "node_modules", "package.json", "package-lock.json"])
    await cp(join(studio, item), join(copy, item), { recursive: true });
  await patchStackiCheckpoint(copy);
  // Rebuild the actual header, not an overlay on the old local "Saved" label.
  await build({ entryPoints: [join(copy, "src/app/main.tsx")], outfile: join(copy, "dist/studio.js"),
    bundle: true, platform: "browser", format: "esm", jsx: "automatic", minify: true,
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "parser-filesystem-boundary", setup(builder: {
      onResolve(options: { filter: RegExp }, callback: (args: { path: string }) => unknown): void;
      onLoad(options: { filter: RegExp; namespace: string }, callback: () => unknown): void;
    }) {
      builder.onResolve({ filter: /^node:(fs|path)$/ }, args => ({ path: args.path, namespace: "server-only" }));
      builder.onLoad({ filter: /.*/, namespace: "server-only" }, () => ({ contents:
        'const unavailable=()=>{throw new Error("File resolution is server-only")};export default new Proxy({},{get:()=>unavailable});' }));
    } }],
  });
  await build({ entryPoints: [join(copy, "src/server/integration.ts")], outfile: join(copy, "dist/integration.mjs"),
    bundle: true, platform: "node", format: "esm", packages: "external" });
  await rm(join(copy, "src"), { recursive: true });
  await rm(join(copy, "vendor"), { recursive: true });
  const here = dirname(fileURLToPath(import.meta.url));
  for (const [source, target] of [["stacki-sandbox-entry.ts", "entry.mjs"], ["stacki-runtime-files.ts", "capture.mjs"]]) {
    await build({ entryPoints: [join(here, source)], outfile: join(output, target), bundle: true,
      platform: "node", format: "esm", target: "node22",
      banner: { js: "import {createRequire as gnr8CreateRequire} from 'node:module';const require=gnr8CreateRequire(import.meta.url);" } });
  }
  const manifest = JSON.parse(await readFile(join(copy, "package.json"), "utf8"));
  if (manifest.version !== "0.1.59") throw new Error("STACKI_STUDIO_VERSION_MISMATCH");
  if (astroProject) {
    const astro = JSON.parse(await readFile(join(astroProject, "node_modules/astro/package.json"), "utf8"));
    if (astro.version !== "5.18.2") throw new Error("STACKI_ASTRO_VERSION_MISMATCH");
    await mkdir(join(output, "site"));
    // Dependency files only. No customer source, .env, draft or state is copied.
    await cp(join(astroProject, "node_modules"), join(output, "site/node_modules"), { recursive: true, dereference: true });
  }
  await writeFile(join(output, "runtime.json"), JSON.stringify({
    format: "gnr8-stacki-runtime:v1", upstreamCommit: pin, studio: manifest.version,
    astro: "5.18.2", checkpointHook: 2, checkpointMaxBytes: STACKI_CHECKPOINT_MAX_BYTES, platform: process.platform,
    requiredRoot: "/vercel/sandbox/gnr8",
    siteDependenciesInstalled: Boolean(astroProject),
  }, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2] || !process.argv[3]) throw new Error("Provide Studio checkout and NEW output directory");
  await prepareStackiRuntime(resolve(process.argv[2]), resolve(process.argv[3]), process.argv[4] ? resolve(process.argv[4]) : undefined);
}
