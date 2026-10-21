/**
 * Runs beside Studio inside an isolated editor runtime, never inside Next.js.
 * Only this port may be exposed by the runtime provider. Astro stays on loopback.
 * The GNR8 control plane must authorize the owner before issuing the one-use ticket.
 * No platform cookies, provider credentials, or storage credentials enter Studio.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer, request as upstreamRequest, type IncomingHttpHeaders, type IncomingMessage, type ServerResponse } from "node:http";
import type { Duplex } from "node:stream";

export const STACKI_SESSION_MAX_MS = 20 * 60_000;
export const STACKI_ENTRY_MAX_MS = 60_000;
const ENTRY = "/__gnr8/enter";
const COOKIE = "__Host-gnr8-stacki";
const LOCAL_COOKIE = "gnr8-stacki-local";

export type StackiEditorGatewayOptions = {
  publicOrigin: string;
  upstreamPort: number;
  entryTicket: string;
  expiresAt: number;
  allowLocalHttp?: boolean;
};

export function createStackiEditorGateway(options: StackiEditorGatewayOptions) {
  const origin = new URL(options.publicOrigin);
  const local = options.allowLocalHttp === true && origin.protocol === "http:" &&
    ["127.0.0.1", "localhost"].includes(origin.hostname);
  if ((!local && origin.protocol !== "https:") || origin.origin !== options.publicOrigin ||
      !Number.isSafeInteger(options.upstreamPort) || options.upstreamPort < 1 || options.upstreamPort > 65535 ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(options.entryTicket) ||
      !Number.isSafeInteger(options.expiresAt) || options.expiresAt <= Date.now() ||
      options.expiresAt > Date.now() + STACKI_SESSION_MAX_MS) {
    throw new Error("STACKI_GATEWAY_CONFIG_INVALID");
  }
  const cookieName = local ? LOCAL_COOKIE : COOKIE;
  const ticketDigest = digest(options.entryTicket);
  const entryExpiresAt = Math.min(Date.now() + STACKI_ENTRY_MAX_MS, options.expiresAt);
  const sessionCookie = randomBytes(32).toString("base64url");
  let consumed = false;
  let revoked = false;
  const tunnels = new Set<Duplex>();
  const requests = new Set<ReturnType<typeof upstreamRequest>>();
  const loopback = `http://127.0.0.1:${options.upstreamPort}`;

  function active() { return !revoked && Date.now() < options.expiresAt; }
  function sameHost(req: IncomingMessage) { return req.headers.host === origin.host; }
  function authorized(req: IncomingMessage) {
    const values = (req.headers.cookie ?? "").split(";").map(value => value.trim())
      .filter(value => value.startsWith(`${cookieName}=`));
    return active() && consumed && values.length === 1 &&
      equal(values[0].slice(cookieName.length + 1), sessionCookie);
  }
  function sameOrigin(req: IncomingMessage) { return req.headers.origin === origin.origin; }
  function acceptableOrigin(req: IncomingMessage) {
    return req.headers.origin ? sameOrigin(req) : ["GET", "HEAD"].includes(req.method ?? "");
  }

  const server = createServer(async (req, res) => {
    securityHeaders(res);
    if (!sameHost(req) || !active()) return respond(res, 403, "Urejevalna seja ni na voljo.");
    // Raw path equality prevents alternate encodings from becoming entry routes.
    if (req.url === ENTRY && req.method === "GET") {
      if (authorized(req)) { res.writeHead(303, { Location: "/studio" }); res.end(); return; }
      const nonce = randomBytes(16).toString("base64");
      res.setHeader("Content-Security-Policy", `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(entryHtml(nonce));
      return;
    }
    if (req.url === ENTRY && req.method === "POST") {
      if (!sameOrigin(req) || consumed || Date.now() >= entryExpiresAt ||
          req.headers["content-type"] !== "text/plain;charset=UTF-8")
        return respond(res, 403, "Povezava je potekla. Ponovno odpri urejevalnik iz GNR8.");
      let ticket = "";
      try {
        for await (const chunk of req) {
          ticket += chunk.toString();
          if (ticket.length > 128) return respond(res, 413, "Neveljavna povezava.");
        }
      } catch { return respond(res, 400, "Neveljavna povezava."); }
      // Check again after the asynchronous body read: simultaneous redemption
      // must not mint two sessions, and a slow request must not outlive the ticket.
      if (!active() || consumed || Date.now() >= entryExpiresAt ||
          !timingSafeEqual(digest(ticket), ticketDigest))
        return respond(res, 403, "Povezava je potekla. Ponovno odpri urejevalnik iz GNR8.");
      consumed = true;
      res.setHeader("Set-Cookie", `${cookieName}=${sessionCookie}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor((options.expiresAt - Date.now()) / 1000)}${local ? "" : "; Secure"}`);
      return respond(res, 200, "OK");
    }
    if (!authorized(req) || !acceptableOrigin(req))
      return respond(res, 403, "Odpri urejevalnik iz GNR8.");
    if (!req.url?.startsWith("/") || req.url.startsWith("//"))
      return respond(res, 400, "Neveljavna pot.");
    const proxy = upstreamRequest({
      hostname: "127.0.0.1", port: options.upstreamPort,
      path: req.url, method: req.method, headers: proxyHeaders(req.headers, loopback),
      timeout: 30_000,
    }, response => {
      res.statusCode = response.statusCode ?? 502;
      for (const [name, value] of Object.entries(response.headers)) {
        if (value !== undefined && !RESPONSE_PRIVATE.has(name)) res.setHeader(name, value);
      }
      // Studio must not set authentication cookies or redirect to its private port.
      if (response.headers.location) {
        let target: URL;
        try { target = new URL(response.headers.location, loopback); }
        catch {
          response.destroy(); return respond(res, 502, "Neveljavna preusmeritev.");
        }
        if (target.origin !== loopback && target.origin !== origin.origin) {
          response.destroy(); return respond(res, 502, "Neveljavna preusmeritev.");
        }
        res.setHeader("Location", target.pathname + target.search + target.hash);
      }
      securityHeaders(res);
      response.on("error", () => res.destroy());
      // Upstream computes this URL using its trusted loopback Host. The browser
      // needs the public origin for iframe validation and postMessage checks.
      if (req.url?.split("?")[0] === "/studio/api/preview-url" && response.statusCode === 200) {
        let body = "";
        response.on("data", chunk => {
          body += chunk.toString();
          if (body.length > 8192) { response.destroy(); res.destroy(); }
        });
        response.on("end", () => {
          try {
            const value = JSON.parse(body);
            if (value.origin !== loopback || typeof value.url !== "string" ||
                new URL(value.url, loopback).origin !== loopback) throw new Error();
            const rewritten = JSON.stringify({ ...value, origin: origin.origin });
            res.removeHeader("content-length"); res.removeHeader("etag");
            res.end(rewritten);
          } catch { res.destroy(); }
        });
        return;
      }
      response.pipe(res);
    });
    track(proxy);
    proxy.on("error", () => {
      if (!res.headersSent) respond(res, 502, "Urejevalnik trenutno ni dosegljiv.");
      else res.destroy();
    });
    res.on("close", () => proxy.destroy());
    req.pipe(proxy);
  });

  server.on("upgrade", (req, socket, head) => {
    if (!sameHost(req) || !authorized(req) || !sameOrigin(req) ||
        req.headers.upgrade?.toLowerCase() !== "websocket" ||
        !req.url?.startsWith("/") || req.url.startsWith("//")) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    const proxy = upstreamRequest({
      hostname: "127.0.0.1", port: options.upstreamPort, path: req.url,
      headers: { ...proxyHeaders(req.headers, loopback), connection: "Upgrade", upgrade: "websocket" },
      timeout: 30_000,
    });
    track(proxy);
    proxy.on("upgrade", (response, upstream, upstreamHead) => {
      if (!active()) { upstream.destroy(); socket.destroy(); return; }
      const headers = Object.entries(response.headers)
        .filter(([name]) => ["upgrade", "connection", "sec-websocket-accept", "sec-websocket-protocol", "sec-websocket-extensions"].includes(name))
        .flatMap(([name, value]) => (Array.isArray(value) ? value : [value]).map(v => `${name}: ${v}`)).join("\r\n");
      socket.write(`HTTP/1.1 101 Switching Protocols\r\n${headers}\r\n\r\n`);
      if (head.length) upstream.write(head);
      if (upstreamHead.length) socket.write(upstreamHead);
      // A quiet collaborative editing connection may live until session expiry.
      upstream.setTimeout(0);
      tunnels.add(socket); tunnels.add(upstream);
      const close = () => { tunnels.delete(socket); tunnels.delete(upstream); upstream.destroy(); socket.destroy(); };
      socket.on("close", close); upstream.on("close", close);
      socket.on("error", close); upstream.on("error", close);
      upstream.pipe(socket); socket.pipe(upstream);
    });
    proxy.on("response", response => { response.resume(); socket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n"); });
    proxy.on("error", () => socket.destroy());
    socket.on("error", () => proxy.destroy());
    proxy.end();
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.on("clientError", (_error, socket) => socket.destroy());
  const timer = setTimeout(revoke, options.expiresAt - Date.now());
  timer.unref();
  server.once("close", () => { clearTimeout(timer); revoke(); });
  function track(proxy: ReturnType<typeof upstreamRequest>) {
    requests.add(proxy);
    proxy.once("close", () => requests.delete(proxy));
    proxy.on("timeout", () => proxy.destroy(new Error("STACKI_UPSTREAM_TIMEOUT")));
  }
  function revoke() {
    revoked = true;
    for (const socket of tunnels) socket.destroy();
    for (const proxy of requests) proxy.destroy();
  }
  return {
    server, revoke,
    // The fragment never reaches HTTP access logs or Referrer headers.
    entryUrl: `${origin.origin}${ENTRY}#${options.entryTicket}`,
    listen: (port: number) => new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, local ? "127.0.0.1" : "0.0.0.0", () => {
        server.off("error", reject); resolve();
      });
    }),
    close: () => new Promise<void>((resolve, reject) => {
      revoke(); clearTimeout(timer); server.closeAllConnections();
      if (!server.listening) { resolve(); return; }
      server.close(error => error ? reject(error) : resolve());
    }),
  };
}

const RESPONSE_PRIVATE = new Set(["set-cookie", "location", "connection", "transfer-encoding",
  "content-security-policy", "cache-control", "referrer-policy", "x-frame-options"]);
function proxyHeaders(headers: IncomingHttpHeaders, loopback: string): IncomingHttpHeaders {
  // Allowlist prevents platform cookies, bearer tokens and spoofed forwarding
  // headers reaching editable source code. Studio's own origin check sees loopback.
  const safe: IncomingHttpHeaders = {};
  for (const name of ["accept", "accept-language", "content-type", "content-length",
    "if-none-match", "if-modified-since", "range", "sec-websocket-key", "sec-websocket-version",
    "sec-websocket-protocol", "sec-websocket-extensions"]) {
    if (headers[name]) safe[name] = headers[name];
  }
  return { ...safe, host: new URL(loopback).host, origin: loopback };
}
function digest(value: string) { return createHash("sha256").update(value).digest(); }
function equal(a: string, b: string) { return timingSafeEqual(digest(a), digest(b)); }
function securityHeaders(res: ServerResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  // Open as a separate tab; embedding requires a separately reviewed origin policy.
  res.setHeader("Content-Security-Policy", "frame-ancestors 'self'; base-uri 'self'");
}
function respond(res: ServerResponse, status: number, message: string) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" }); res.end(message);
}
function entryHtml(nonce: string) {
  return `<!doctype html><html lang="sl"><meta charset="utf-8"><title>GNR8 · Urejevalnik</title>
<p id="status">Odpiram urejevalnik …</p><script nonce="${nonce}">
const ticket = location.hash.slice(1); history.replaceState(null, '', location.pathname);
fetch(location.pathname, {method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:ticket})
.then(response => {if (!response.ok) throw new Error(); location.replace('/studio');})
.catch(() => {document.getElementById('status').textContent='Povezava je potekla. Ponovno odpri urejevalnik iz GNR8.';});
</script></html>`;
}
