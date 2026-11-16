/**
 * Local-only acceptance replay; never imported by the application.
 *
 * Prerequisites: inspect/check out PINNED_STACKI, install its studio lockfile with
 * --ignore-scripts, then assemble and build Studio. Populate an npm cache with
 * Astro 7.4.4 dependencies; run with Node 26.13.0. This replay installs from that cache OFFLINE.
 *
 * From the GNR8 root:
 * TSX_TSCONFIG_PATH=apps/platform/tsconfig.json node --import tsx \
 *   apps/platform/gnr8/output-adapters/run-stacki-local-proof.ts \
 *   /absolute/path/to/stacki/studio /absolute/path/to/npm-cache
 *
 * Add --prepare-only to check acquisition/versions without launching a browser.
 * It explicitly does not claim the full browser/recovery/export checks passed.
 * Uses the existing GNR8 workspace producer and retained real-site-01 fixture.
 * Exercises actual browser edits, the GNR8 checkpoint routes, the real Supabase
 * SDK with local filesystem transport, fresh-workspace recovery, and the
 * existing static-export inspector. No hosted Supabase/Vercel calls.
 * Retains evidence and disposable workspaces under the OS temporary directory.
 */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { chromium, type Browser, type Page } from "playwright";
import { astroDevServerSmokeProofFixture } from "./astro-static-site-dev-server-smoke-proof";
import { inspectAstroStaticExport } from "./astro-static-site-build-export-proof";
import { prepareAstroStaticSiteWorkspace, readAstroStaticSiteSourceSnapshot } from "./astro-static-site-workspace-preparation";
import { prepareStackiThroughGnr8, recoverStackiThroughGnr8, STACKI_PROOF_ASSET_PREFIX } from "../stacki/stacki-draft-recovery-proof";
import { startStackiEditorRuntime } from "../stacki/stacki-editor-runtime";

const PINNED_STACKI = "2ed510fbaf19e120c642f96a8e3047f15bcd71ab";
const HEADING = "GNR8 in Stacki: lokalni preizkus deluje.";
const IMAGE = "gnr8-proof-logo.svg";
const exec = promisify(execFile);
const cleanEnv = {
  PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}`, TMPDIR: process.env.TMPDIR,
  NODE_ENV: "development" as const, ASTRO_TELEMETRY_DISABLED: "1",
};
const checkpointEntries = ["src", "public", ".studio-state", "package.json", "package-lock.json", "tsconfig.json", "astro.config.mjs"];

async function command(executable: string, args: string[], cwd: string) {
  const result = await exec(executable, args, {
    cwd, env: { ...cleanEnv, NODE_ENV: args.includes("build") ? "production" : "development" },
    encoding: "utf8", timeout: 120_000, maxBuffer: 1_000_000,
  });
  return result.stdout.trim();
}

async function sourcePaths(root: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    assert(!entry.isSymbolicLink(), `Checkpoint cannot contain symlinks: ${entry.name}`);
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) paths.push(...await sourcePaths(root, path));
    else {
      assert(entry.isFile(), `Checkpoint must contain regular files: ${path}`);
      paths.push(path);
    }
    assert(paths.length <= 500, "Proof checkpoint file limit exceeded");
  }
  return paths.sort();
}

async function checkpoint(from: string, to: string) {
  await mkdir(to, { recursive: false });
  for (const entry of checkpointEntries) {
    try { await cp(join(from, entry), join(to, entry), { recursive: true }); }
    catch (error) { if (entry !== "tsconfig.json" || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  const paths = await sourcePaths(to);
  const snapshot = await readAstroStaticSiteSourceSnapshot({ workspacePath: to, sourcePaths: paths });
  const source = await readAstroStaticSiteSourceSnapshot({ workspacePath: from, sourcePaths: paths });
  assert.equal(snapshot.aggregateSha256, source.aggregateSha256, "Checkpoint bytes differ from saved draft");
  return snapshot;
}

async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port;
}

async function launch(workspace: string, studio: string, logPath: string) {
  const astroPort = await freePort();
  let gatewayPort = await freePort();
  while (gatewayPort === astroPort) gatewayPort = await freePort();
  const url = `http://127.0.0.1:${gatewayPort}`;
  const runtime = await startStackiEditorRuntime({
    workspace, studio, publicOrigin: url, astroPort, gatewayPort,
    entryTicket: randomBytes(32).toString("base64url"),
    expiresAt: Date.now() + 10 * 60_000, allowLocalHttp: true,
  });
  try {
    assert.equal((await fetch(`${url}/studio`)).status, 403);
    return { url, entryUrl: runtime.entryUrl, close: runtime.close,
      saveLog: () => writeFile(logPath, runtime.readLog()) };
  } catch (error) { await runtime.close(); throw error; }
}

async function openEditor(browser: Browser, url: string, entryUrl: string, errors: string[], blocked: string[]) {
  // A new context on each launch prevents IndexedDB from masking failed recovery.
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route("**/*", route => {
    const target = new URL(route.request().url());
    if (target.origin === url) return route.continue();
    blocked.push(target.origin);
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    if (response.status() >= 400 && new URL(response.url()).pathname !== "/favicon.ico")
      errors.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`);
  });
  await page.goto(entryUrl);
  await page.frameLocator("iframe").locator("h1").waitFor();
  await page.locator(".save-state").filter({ hasText: "Saved" }).waitFor();
  return { context, page };
}

async function edit(page: Page, imageBytes: Buffer) {
  await page.getByRole("button", { name: "Expand all", exact: true }).click();
  await page.locator(".structure-node").filter({ has: page.locator(".label", { hasText: /^h1$/ }) }).click();
  await page.locator(".rich-content").fill(HEADING);
  await page.frameLocator("iframe").getByRole("heading", { name: HEADING, exact: true }).waitFor();
  await page.getByRole("button", { name: "Assets", exact: true }).click();
  await page.locator(".asset-folder").filter({ hasText: /^public$/ }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload assets", exact: true }).click();
  await (await chooser).setFiles({ name: IMAGE, mimeType: "image/svg+xml", buffer: imageBytes });
  await page.locator(".asset-name").filter({ hasText: IMAGE }).waitFor();
  await page.getByRole("button", { name: "Navigator", exact: true }).click();
  await page.getByRole("button", { name: "Expand all", exact: true }).click();
  await page.locator(".structure-node").filter({ has: page.locator(".label", { hasText: /^img$/ }) }).click();
  await page.locator(".props-group-head").filter({ hasText: "Settings" }).click();
  await page.locator(".attr-row").filter({ has: page.locator(".attr-name", { hasText: /^src$/ }) }).click();
  if (await page.locator(".af-choose").count() === 0) {
    await page.getByTitle("Choose a file from public/", { exact: true }).click();
  }
  await page.locator(".af-choose").click();
  await page.locator(".asset-folder").filter({ hasText: /^public$/ }).click();
  await page.locator(".asset-tile").filter({ hasText: IMAGE }).click();
  await verifyPreview(page);
  await page.keyboard.press("Escape");
}

async function verifyPreview(page: Page) {
  await page.frameLocator("iframe").getByRole("heading", { name: HEADING, exact: true }).waitFor();
  const image = page.frameLocator("iframe").locator(`.hero__visual img[src="/${IMAGE}"]`);
  await image.waitFor();
  await image.evaluate(node => {
    const image = node as HTMLImageElement;
    return image.decode();
  });
  assert(await image.evaluate(node => (node as HTMLImageElement).naturalWidth > 0));
  await page.locator(".save-state").filter({ hasText: "Saved" }).waitFor();
}

async function main() {
  assert.equal(process.versions.node, "26.13.0");
  assert(process.argv[2] && process.argv[3], "Provide built Stacki studio path and populated npm cache path");
  const studio = await realpath(resolve(process.argv[2]));
  const cache = await realpath(resolve(process.argv[3]));
  assert.equal(await command("git", ["rev-parse", "HEAD"], dirname(studio)), PINNED_STACKI);
  const root = await mkdtemp(join(await realpath(tmpdir()), "gnr8-stacki-replay-"));
  const evidence: Record<string, unknown> = {
    kind: "local-only", stackiCommit: PINNED_STACKI, stackiVersion: "0.1.94", astroVersion: "7.4.4", nodeVersion: process.versions.node,
    sourceFixture: "apps/platform/gnr8/validation/fixtures/real-site-01", root,
    hostedExecution: false, supabaseExecution: false, productionMutation: false,
  };
  let browser: Browser | undefined;
  let server: Awaited<ReturnType<typeof launch>> | undefined;
  try {
    const fixture = resolve("apps/platform/gnr8/validation/fixtures/real-site-01");
    const html = await readFile(join(fixture, "index.html"), "utf8");
    const body = html.split("<body>")[1]?.split("</body>")[0];
    assert(body, "Retained fixture body missing");
    const source = await prepareAstroStaticSiteWorkspace({
      workspaceRoot: root,
      content: { ...astroDevServerSmokeProofFixture(), pages: [{
        path: "/", title: "Northstar Widgets",
        headHtml: `<link rel="stylesheet" href="${STACKI_PROOF_ASSET_PREFIX}styles.css" />`,
        bodyHtml: body.replaceAll("assets/", STACKI_PROOF_ASSET_PREFIX),
      }] },
    });
    await cp(join(fixture, "assets"), join(source.workspacePath, "public/assets"), { recursive: true });
    const packagePath = join(source.workspacePath, "package.json");
    const manifest = JSON.parse(await readFile(packagePath, "utf8"));
    assert.equal(manifest.dependencies.astro, "7.4.4");
    assert.equal(manifest.engines.node, "26.x");
    const sourceFiles = await sourcePaths(source.workspacePath);
    console.log("Preparing isolated fixture dependencies from the offline cache.");
    await command("npm", ["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "--cache", cache], source.workspacePath);
    const baseline = await readAstroStaticSiteSourceSnapshot({ workspacePath: source.workspacePath, sourcePaths: sourceFiles });
    const draft = join(root, "draft");
    console.log("Preparing the retained source through the GNR8 draft route and reading it back.");
    const sourcePreparation = await prepareStackiThroughGnr8({
      source: source.workspacePath, draft, storageRoot: join(root, "storage-transport"),
      snapshot: await readAstroStaticSiteSourceSnapshot({
        workspacePath: source.workspacePath, sourcePaths: await sourcePaths(source.workspacePath),
      }),
    });
    await symlink(join(source.workspacePath, "node_modules"), join(draft, "node_modules"), "dir");
    const original = await readFile(join(draft, "src/pages/index.astro"), "utf8");
    const expected = original.replace("Launch a clean landing page in one afternoon.", HEADING)
      .replace(`src="${STACKI_PROOF_ASSET_PREFIX}hero.svg"`, `src="/${IMAGE}"`);
    assert.notEqual(expected, original);
    const imageBytes = await readFile(join(fixture, "assets/logo.svg"));
    if (process.argv.includes("--prepare-only")) {
      Object.assign(evidence, { preparationPassed: true, fullReplayExecuted: false, source: source.workspacePath, draft, sourcePreparation,
        limitations: ["Preparation only; browser edit, recovery and export assertions have not run."] });
      return;
    }
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      headless: true, env: cleanEnv,
    });
    const errors: string[] = [], blocked: string[] = [];
    server = await launch(draft, studio, join(root, "first-server.log"));
    console.log("Editing text and uploading/selecting an image in the actual Stacki UI.");
    const first = await openEditor(browser, server.url, server.entryUrl, errors, blocked);
    await edit(first.page, imageBytes);
    assert.equal(await readFile(join(draft, "src/pages/index.astro"), "utf8"), expected);
    await first.page.screenshot({ path: join(root, "edited.png") });
    await first.context.close();
    await server.close();
    await server.saveLog();
    server = undefined;
    const saved = await checkpoint(draft, join(root, "checkpoint"));
    const restored = join(root, "restored");
    const storageRecovery = await recoverStackiThroughGnr8({
      draft, checkpoint: join(root, "checkpoint"), restored,
      storageRoot: join(root, "storage-transport"), snapshot: saved,
      expectedRevision: sourcePreparation.revision,
    });
    const restoredSnapshot = await readAstroStaticSiteSourceSnapshot({
      workspacePath: restored, sourcePaths: saved.files.map(file => file.path),
    });
    assert.equal(restoredSnapshot.aggregateSha256, saved.aggregateSha256);
    await symlink(join(source.workspacePath, "node_modules"), join(restored, "node_modules"), "dir");
    server = await launch(restored, studio, join(root, "restored-server.log"));
    console.log("Verifying recovery in a new workspace, process, port, and browser context.");
    const second = await openEditor(browser, server.url, server.entryUrl, errors, blocked);
    await verifyPreview(second.page);
    assert.equal(await readFile(join(restored, "src/pages/index.astro"), "utf8"), expected);
    assert.deepEqual(await readFile(join(restored, "public", IMAGE)), imageBytes);
    await second.page.screenshot({ path: join(root, "restored.png") });
    await second.context.close();
    await server.close();
    await server.saveLog();
    server = undefined;
    console.log("Building the restored page with the normal Astro config.");
    await writeFile(join(root, "build.log"), await command(process.execPath, [
      join(restored, "node_modules/astro/bin/astro.mjs"), "build", "--config", "./astro.config.mjs",
    ], restored));
    // The production source-backed generator supplies its retained stylesheet
    // references too: these version-scoped paths are not ordinary /assets URLs.
    const exported = await inspectAstroStaticExport(restored, {
      expectedContent: [HEADING], expectedThemeToken: null,
      expectedStylesheetReferences: [`${STACKI_PROOF_ASSET_PREFIX}styles.css`],
    });
    for (const name of ["styles.css", "hero.svg", "logo.svg"]) {
      const assetPath = `${STACKI_PROOF_ASSET_PREFIX.slice(1)}${name}`;
      assert.deepEqual(await readFile(join(restored, "dist", assetPath)), await readFile(join(restored, "public", assetPath)));
    }
    assert.deepEqual(await readFile(join(restored, "dist", IMAGE)), imageBytes);
    const finalSource = await readAstroStaticSiteSourceSnapshot({ workspacePath: source.workspacePath, sourcePaths: sourceFiles });
    assert.equal(finalSource.aggregateSha256, baseline.aggregateSha256);
    assert.deepEqual(errors, [], "Browser reported runtime errors");
    assert.deepEqual(blocked, [], "Editor attempted an external browser request");
    Object.assign(evidence, {
      passed: true, sourceRoundtripExact: true, originalSourceUnchanged: true,
      storageRecovery,
      sourcePreparation,
      editorGateway: {
        authenticatedEntry: true, unauthenticatedAccessStatus: 403,
        isolatedPublicOrigin: true, upstreamBrowserRequests: blocked,
        textAndImageEditsThroughGateway: true, restoredThroughFreshSession: true,
      },
      uploadedImageSha256: createHash("sha256").update(imageBytes).digest("hex"),
      checkpoint: saved, recoveredCheckpoint: restoredSnapshot.aggregateSha256,
      oldWorkspaceDeleted: true, freshBrowserContext: true, browserErrors: errors,
      externalBrowserRequests: blocked, staticExport: exported.manifest,
      limitations: ["Real Supabase SDK exercised with local filesystem transport; hosted persistence untested",
        "Injected owner identity in replay; live sign-in and membership queries untested",
        "Checkpoint save is explicit; Stacki's continuous Saved indicator is still local",
        "Vercel Sandbox, hosted authentication/origins and cost untested",
        "GNR8 candidate registration/publication and general source-to-canonical mapping untested",
        "Single retained static page; not a complete component compatibility certification"],
    });
  } catch (error) {
    evidence.passed = false;
    evidence.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    await server?.close();
    await server?.saveLog();
    await browser?.close();
    await writeFile(join(root, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n");
    console.log(`Evidence: ${join(root, "evidence.json")}`);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
