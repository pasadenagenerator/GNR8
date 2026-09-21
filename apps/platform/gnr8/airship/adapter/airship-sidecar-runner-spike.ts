#!/usr/bin/env tsx
/*
 * Proof-only local Airship sidecar runner spike.
 *
 * This file is intentionally outside Next routes and production runtime paths.
 * It serves a disposable CHS-derived GNR8 artifact fixture from 127.0.0.1 and
 * prints the real Airship CLI commands an operator can run manually.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

type RunnerOptions = {
  port: number;
  workspaceDir: string | null;
  smoke: boolean;
};

const HEALTH_PATH = "/__gnr8_airship_sidecar_spike/health";
const READBACK_PATH = "/__gnr8_airship_sidecar_spike/readback";

const CHS_POLISHED_ARTIFACT_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" data-gnr8-render-mode="preview" />
  <title>CHS | IT change partner</title>
  <style>
    :root {
      --chs-blue: #123f73;
      --chs-blue-deep: #09284d;
      --chs-blue-soft: #eaf3fb;
      --chs-orange: #ed7635;
      --chs-ink: #132033;
      --chs-muted: #5c6a7a;
      --chs-line: #d9e4ee;
      --chs-surface: #f7fafc;
    }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--chs-ink); font-family: Inter, Roboto, Arial, sans-serif; line-height: 1.55; }
    a { color: inherit; }
    .shell { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
    .site-header { position: sticky; top: 0; z-index: 10; background: rgba(255, 255, 255, 0.94); border-bottom: 1px solid var(--chs-line); backdrop-filter: blur(12px); }
    .nav { min-height: 74px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .brand { display: inline-flex; align-items: center; gap: 12px; text-decoration: none; font-weight: 800; }
    .brand-mark { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 8px; background: var(--chs-blue); color: #fff; letter-spacing: 0.04em; }
    .brand-copy { display: grid; line-height: 1.1; }
    .brand-copy small { color: var(--chs-muted); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .nav-links { display: flex; align-items: center; gap: 22px; color: var(--chs-blue-deep); font-weight: 700; }
    .nav-links a { text-decoration: none; }
    .button { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px; border-radius: 6px; border: 1px solid var(--chs-orange); background: var(--chs-orange); color: #fff; font-weight: 800; text-decoration: none; }
    .button.secondary { background: #fff; color: var(--chs-blue); border-color: var(--chs-line); }
    .hero { background: linear-gradient(120deg, rgba(18, 63, 115, 0.94), rgba(9, 40, 77, 0.90)); color: #fff; padding: 92px 0 74px; }
    .hero-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr); gap: 48px; align-items: center; }
    .eyebrow { margin: 0 0 14px; color: #ffd7bf; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
    h1 { margin: 0; max-width: 780px; font-size: clamp(42px, 6vw, 78px); line-height: 0.96; letter-spacing: 0; }
    .hero p { margin: 22px 0 0; max-width: 720px; color: #eaf3fb; font-size: 20px; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 30px; }
    .hero-panel { border: 1px solid rgba(255, 255, 255, 0.22); background: rgba(255, 255, 255, 0.10); border-radius: 8px; padding: 24px; }
    section { padding: 76px 0; }
    .section-kicker { margin: 0 0 10px; color: var(--chs-orange); font-weight: 800; letter-spacing: 0.10em; text-transform: uppercase; }
    h2 { margin: 0; color: var(--chs-blue-deep); font-size: clamp(30px, 4vw, 48px); line-height: 1.05; letter-spacing: 0; }
    .lead { margin: 18px 0 0; max-width: 760px; color: var(--chs-muted); font-size: 18px; }
    .identity-grid { display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 46px; align-items: start; }
    .value-list { display: grid; gap: 14px; margin: 0; padding: 0; list-style: none; }
    .value-list li { border-left: 4px solid var(--chs-orange); background: var(--chs-surface); padding: 18px 20px; }
    .value-list strong { display: block; color: var(--chs-blue-deep); font-size: 18px; }
    .proof { background: var(--chs-blue-soft); }
    .proof-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 34px; }
    .proof-card { min-height: 210px; border: 1px solid var(--chs-line); border-radius: 8px; background: #fff; padding: 24px; }
    .proof-card b { color: var(--chs-orange); font-size: 34px; line-height: 1; }
    .team-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; align-items: center; border-top: 1px solid var(--chs-line); border-bottom: 1px solid var(--chs-line); padding: 32px 0; }
    .contact { background: var(--chs-blue-deep); color: #fff; }
    .contact h2 { color: #fff; }
    .contact .lead { color: #dbe9f6; }
    .contact-grid { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 44px; align-items: start; }
    .contact-card { border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 8px; background: rgba(255, 255, 255, 0.08); padding: 24px; }
    .form { display: grid; gap: 12px; border-radius: 8px; background: #fff; padding: 22px; color: var(--chs-ink); }
    .form label { display: grid; gap: 6px; color: var(--chs-blue-deep); font-weight: 800; }
    .form input, .form textarea { width: 100%; border: 1px solid var(--chs-line); border-radius: 6px; padding: 12px 14px; font: inherit; }
    .form textarea { min-height: 112px; resize: vertical; }
    footer { padding: 26px 0; color: var(--chs-muted); background: #fff; }
    @media (max-width: 820px) {
      .nav { align-items: flex-start; flex-direction: column; padding: 14px 0; }
      .nav-links { width: 100%; gap: 14px; flex-wrap: wrap; }
      .hero-grid, .identity-grid, .team-strip, .contact-grid { grid-template-columns: 1fr; }
      .proof-grid { grid-template-columns: 1fr; }
      .hero { padding: 68px 0 58px; }
      section { padding: 58px 0; }
    }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="shell nav">
      <a class="brand" href="#top" aria-label="CHS home">
        <span class="brand-mark">CHS</span>
        <span class="brand-copy"><span>CHS</span><small>IT change partner</small></span>
      </a>
      <nav class="nav-links" aria-label="Main navigation">
        <a href="#identity" data-airship-element="nav-item" data-airship-element-index="0">About</a>
        <a href="#proof" data-airship-element="nav-item" data-airship-element-index="1">Approach</a>
        <a href="#contact" data-airship-element="nav-item" data-airship-element-index="2">Contact</a>
        <a class="button secondary" href="https://www.chs.si/" data-airship-element="nav-item" data-airship-element-index="3">Original site</a>
      </nav>
    </div>
  </header>
  <main id="top">
    <section class="hero" data-section="hero" data-airship-section="hero">
      <div class="shell hero-grid">
        <div>
          <p class="eyebrow">Computer Help Specialists</p>
          <h1 data-airship-element="hero-headline">The CHS team helps your IT change with every technology wave.</h1>
          <p data-airship-element="hero-body">The people behind the technology matter more than the technology itself. We bring deep, lived expertise and the practical discipline to drive real change, so your organization can move forward with confidence.</p>
          <div class="hero-actions">
            <a class="button" href="#contact" data-airship-element="hero-cta">Contact Us</a>
            <a class="button secondary" href="#proof">See how CHS works</a>
          </div>
        </div>
        <aside class="hero-panel" aria-label="CHS promise">
          <strong data-airship-element="hero-proof-title">Strategy, implementation, and support in one experienced team.</strong>
          <span data-airship-element="hero-proof-body">From advisory conversations to hands-on delivery, CHS keeps business goals, people, and technology aligned.</span>
        </aside>
      </div>
    </section>
    <section id="identity" data-section="identity" data-airship-section="offers">
      <div class="shell identity-grid">
        <div>
          <p class="section-kicker">Who CHS helps</p>
          <h2 data-airship-element="offers-headline">Technology change works when people can actually adopt it.</h2>
          <p class="lead" data-airship-element="offers-body">CHS brings calm senior guidance to complex IT moments: infrastructure modernization, service improvement, security-minded operations, and everyday support that keeps teams moving.</p>
        </div>
        <ul class="value-list">
          <li data-airship-element="offer-card" data-airship-element-index="0"><strong>Experienced guidance</strong> Clear decisions for organizations that need technology to serve the business, not distract from it.</li>
          <li data-airship-element="offer-card" data-airship-element-index="1"><strong>Practical execution</strong> Plans become working systems, documented handovers, and support rhythms that teams can trust.</li>
          <li data-airship-element="offer-card" data-airship-element-index="2"><strong>Human adoption</strong> CHS focuses on the people behind the technology, making change understandable and sustainable.</li>
        </ul>
      </div>
    </section>
    <section id="proof" class="proof" data-section="proof" data-airship-section="proof">
      <div class="shell">
        <p class="section-kicker">Approach</p>
        <h2 data-airship-element="proof-headline">A focused partner for real IT progress.</h2>
        <p class="lead" data-airship-element="proof-body">This MVP demo keeps the imported CHS direction simple: a branded page with a clear promise, proof of expertise, and an immediate contact path.</p>
        <div class="proof-grid">
          <article class="proof-card" data-airship-element="proof-card" data-airship-element-index="0"><b>01</b><h3>Assess</h3><p>Understand the current environment, risks, people, and business priorities before proposing change.</p></article>
          <article class="proof-card" data-airship-element="proof-card" data-airship-element-index="1"><b>02</b><h3>Improve</h3><p>Shape practical improvements across infrastructure, support, security, and digital workflows.</p></article>
          <article class="proof-card" data-airship-element="proof-card" data-airship-element-index="2"><b>03</b><h3>Support</h3><p>Stay close after delivery with documentation, operational care, and clear next steps.</p></article>
        </div>
      </div>
    </section>
    <section data-section="team" data-airship-section="approach">
      <div class="shell team-strip">
        <h2 data-airship-element="approach-headline">CHS is built around trusted specialists, not generic technology promises.</h2>
        <p data-airship-element="approach-body">For clients, that means direct conversations, visible accountability, and a team that knows how to translate technical change into business confidence.</p>
      </div>
    </section>
    <section id="contact" class="contact" data-section="contact" data-airship-section="cta">
      <div class="shell contact-grid">
        <div>
          <p class="section-kicker">Start a conversation</p>
          <h2 data-airship-element="cta-headline">Tell CHS what needs to change.</h2>
          <p class="lead" data-airship-element="cta-body">Use this GNR8-controlled demo page to review the improved direction. The real external CHS site remains untouched.</p>
          <div class="contact-card" data-airship-element="contact-card">
            <dl>
              <div><dt>Website</dt><dd>www.chs.si</dd></div>
              <div><dt>Focus</dt><dd>IT consulting, implementation, support, and change enablement.</dd></div>
              <div><dt>Demo host</dt><dd>chs-airship.app.pasadenagenerator.com</dd></div>
            </dl>
          </div>
        </div>
        <form class="form" aria-label="Contact form">
          <label>Name<input name="name" autocomplete="name" /></label>
          <label>Email<input name="email" type="email" autocomplete="email" /></label>
          <label>How can CHS help?<textarea name="message"></textarea></label>
          <button class="button" type="button" data-airship-element="contact-cta">Send inquiry</button>
        </form>
      </div>
    </section>
  </main>
  <footer data-airship-section="footer">
    <div class="shell">CHS Airship MVP demo. GNR8 preview render for review.</div>
  </footer>
</body>
</html>`;

function parseOptions(argv: string[]): RunnerOptions {
  const options: RunnerOptions = {
    port: 0,
    workspaceDir: null,
    smoke: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--smoke") {
      options.smoke = true;
      continue;
    }
    if (arg === "--port") {
      options.port = parsePort(argv[index + 1], "--port");
      index += 1;
      continue;
    }
    if (arg.startsWith("--port=")) {
      options.port = parsePort(arg.slice("--port=".length), "--port");
      continue;
    }
    if (arg === "--workspace") {
      options.workspaceDir = resolveRequiredValue(argv[index + 1], "--workspace");
      index += 1;
      continue;
    }
    if (arg.startsWith("--workspace=")) {
      options.workspaceDir = resolveRequiredValue(arg.slice("--workspace=".length), "--workspace");
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function parsePort(value: string | undefined, flag: string): number {
  if (!value) throw new Error(`${flag} requires a value`);
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`${flag} must be an integer from 0 to 65535`);
  return port;
}

function resolveRequiredValue(value: string | undefined, flag: string): string {
  if (!value) throw new Error(`${flag} requires a value`);
  return resolve(value);
}

function printHelp(): void {
  console.log(`Usage: pnpm exec tsx apps/platform/gnr8/airship/adapter/airship-sidecar-runner-spike.ts [options]

Options:
  --port <port>          Local target server port. Default: 0, choose an available port.
  --workspace <dir>      Disposable workspace directory. Default: /tmp/gnr8-airship-sidecar-runner-spike-*
  --smoke                Start, fetch health/readback/root, then stop.
  -h, --help             Print this help.

This proof runner does not install or launch Airship. It prints manual Airship commands.`);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function materializeWorkspace(input: { workspaceDir: string | null }): Promise<{ workspaceDir: string; indexPath: string; htmlSha256: string }> {
  const workspaceDir = input.workspaceDir ?? join(tmpdir(), `gnr8-airship-sidecar-runner-spike-${process.pid}`);
  await mkdir(workspaceDir, { recursive: true });

  const indexPath = join(workspaceDir, "index.html");
  await writeFile(indexPath, CHS_POLISHED_ARTIFACT_HTML, "utf8");
  await writeFile(
    join(workspaceDir, "package.json"),
    `${JSON.stringify({ private: true, name: "gnr8-airship-sidecar-runner-spike", version: "0.0.0" }, null, 2)}\n`,
    "utf8",
  );

  return {
    workspaceDir,
    indexPath,
    htmlSha256: sha256(CHS_POLISHED_ARTIFACT_HTML),
  };
}

function writeJson(response: ServerResponse, statusCode: number, body: Record<string, unknown>): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(`${JSON.stringify(body, null, 2)}\n`);
}

async function routeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  proof: { workspaceDir: string; indexPath: string; htmlSha256: string; startedAt: string },
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if (url.pathname === HEALTH_PATH) {
    writeJson(response, 200, {
      ok: true,
      proofOnly: true,
      localOnly: true,
      fixture: "chs-polished-artifact-derived-minimal",
      startedAt: proof.startedAt,
    });
    return;
  }

  if (url.pathname === READBACK_PATH) {
    const currentHtml = await readFile(proof.indexPath, "utf8");
    writeJson(response, 200, {
      ok: true,
      route: "/",
      workspaceDir: proof.workspaceDir,
      indexPath: proof.indexPath,
      bytes: Buffer.byteLength(currentHtml, "utf8"),
      sha256: sha256(currentHtml),
      initialFixtureSha256: proof.htmlSha256,
      containsAirshipMarkers: currentHtml.includes("data-airship-section="),
    });
    return;
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    const currentHtml = await readFile(proof.indexPath, "utf8");
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-gnr8-airship-sidecar-runner-spike": "proof-only-local",
    });
    response.end(currentHtml);
    return;
  }

  writeJson(response, 404, { ok: false, error: "not_found" });
}

async function startServer(options: RunnerOptions) {
  const workspace = await materializeWorkspace({ workspaceDir: options.workspaceDir });
  const proof = { ...workspace, startedAt: new Date().toISOString() };
  const server = createServer((request, response) => {
    void routeRequest(request, response, proof).catch((error: unknown) => {
      writeJson(response, 500, { ok: false, error: error instanceof Error ? error.message : "unknown_error" });
    });
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(options.port, "127.0.0.1", () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Failed to read local server address");
  return { server, proof, port: address.port };
}

async function smokeFetch(url: string): Promise<{ url: string; status: number; bytes: number }> {
  const response = await fetch(url);
  const body = await response.text();
  return { url, status: response.status, bytes: Buffer.byteLength(body, "utf8") };
}

function printRunbook(input: { port: number; proof: { workspaceDir: string; indexPath: string; htmlSha256: string } }): void {
  const targetUrl = `http://127.0.0.1:${input.port}/`;
  const healthUrl = `http://127.0.0.1:${input.port}${HEALTH_PATH}`;
  const readbackUrl = `http://127.0.0.1:${input.port}${READBACK_PATH}`;
  const proxyPort = input.port + 1 <= 65535 ? input.port + 1 : input.port - 1;

  console.log("GNR8 Airship sidecar runner spike");
  console.log(`targetUrl=${targetUrl}`);
  console.log(`healthUrl=${healthUrl}`);
  console.log(`readbackUrl=${readbackUrl}`);
  console.log(`workspaceDir=${input.proof.workspaceDir}`);
  console.log(`indexPath=${input.proof.indexPath}`);
  console.log(`fixtureSha256=${input.proof.htmlSha256}`);
  console.log("");
  console.log("Airship dry preflight command, manual only:");
  console.log(`pnpm dlx @airshiplabs/cli doctor --target ${input.port} --agent codex --json --cwd ${shellQuote(input.proof.workspaceDir)}`);
  console.log("");
  console.log("Airship sidecar launch command, manual only:");
  console.log(
    `pnpm dlx @airshiplabs/cli --target ${input.port} --port ${proxyPort} --host 127.0.0.1 --agent codex --safe --cwd ${shellQuote(input.proof.workspaceDir)} --mode canvas`,
  );
  console.log("");
  console.log(`Expected Airship proxy URL after launch: http://127.0.0.1:${proxyPort}/`);
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const running = await startServer(options);
  printRunbook({ port: running.port, proof: running.proof });

  if (options.smoke) {
    const targetUrl = `http://127.0.0.1:${running.port}/`;
    const healthUrl = `http://127.0.0.1:${running.port}${HEALTH_PATH}`;
    const readbackUrl = `http://127.0.0.1:${running.port}${READBACK_PATH}`;
    const results = await Promise.all([smokeFetch(targetUrl), smokeFetch(healthUrl), smokeFetch(readbackUrl)]);
    console.log("");
    console.log("smokeReadback=");
    console.log(JSON.stringify(results, null, 2));
    await new Promise<void>((resolveClose, rejectClose) => {
      running.server.close((error) => (error ? rejectClose(error) : resolveClose()));
    });
    return;
  }

  console.log("");
  console.log("Serving until SIGINT/SIGTERM. This process does not launch Airship.");
  await new Promise<void>((resolveStop) => {
    const stop = () => {
      running.server.close(() => resolveStop());
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
