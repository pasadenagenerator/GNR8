import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer, request, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createStackiEditorGateway, STACKI_SESSION_MAX_MS } from "./stacki-editor-gateway";

async function fixture(t: test.TestContext, lifetime = 60_000) {
  let seen: IncomingHttpHeaders = {};
  const upstream = createServer((req, res) => {
    seen = req.headers;
    if (req.url?.startsWith("/studio/api/preview-url")) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ url: "/#avb-design", origin: `http://${req.headers.host}` }));
    } else {
      res.setHeader("Set-Cookie", "upstream-secret=bad");
      res.end("editor");
    }
  });
  upstream.on("upgrade", (req, socket) => {
    seen = req.headers;
    socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: test\r\n\r\n");
    socket.on("data", bytes => socket.write(bytes));
    socket.on("end", () => socket.destroy());
  });
  await new Promise<void>(resolve => upstream.listen(0, "127.0.0.1", resolve));
  const reservation = createServer();
  await new Promise<void>(resolve => reservation.listen(0, "127.0.0.1", resolve));
  const port = (reservation.address() as AddressInfo).port;
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const ticket = randomBytes(32).toString("base64url");
  const gateway = createStackiEditorGateway({
    publicOrigin: origin, upstreamPort: (upstream.address() as AddressInfo).port,
    entryTicket: ticket, expiresAt: Date.now() + lifetime, allowLocalHttp: true,
  });
  await gateway.listen(port);
  t.after(async () => {
    await gateway.close();
    upstream.closeAllConnections();
    await new Promise<void>(resolve => upstream.close(() => resolve()));
  });
  const redeem = (value = ticket) => fetch(`${origin}/__gnr8/enter`, {
    method: "POST", headers: { Origin: origin, "Content-Type": "text/plain;charset=UTF-8" }, body: value,
  });
  return { origin, ticket, gateway, redeem, seen: () => seen };
}

test("entry is one-use; every editor path needs a session; no secrets reach Studio", async t => {
  const f = await fixture(t);
  for (const path of ["/studio", "/", "/assets/logo.svg", "/studio/api/session", "/@fs/etc/passwd"])
    assert.equal((await fetch(f.origin + path)).status, 403);
  const entry = await fetch(`${f.origin}/__gnr8/enter`);
  const html = await entry.text();
  assert(!html.includes(f.ticket));
  assert(html.includes("history.replaceState"));
  assert.equal(entry.headers.get("referrer-policy"), "no-referrer");
  assert.equal((await f.redeem("wrong")).status, 403);
  const simultaneous = await Promise.all([f.redeem(), f.redeem()]);
  assert.deepEqual(simultaneous.map(r => r.status).sort(), [200, 403]);
  const setCookie = simultaneous.find(r => r.ok)!.headers.get("set-cookie")!;
  assert.match(setCookie, /HttpOnly; SameSite=Strict/);
  const cookie = setCookie.split(";")[0];
  const response = await fetch(f.origin + "/studio", { headers: {
    Cookie: `${cookie}; platform-session=private`, Authorization: "Bearer platform-secret",
    "X-Forwarded-Host": "evil.example",
  } });
  assert.equal(await response.text(), "editor");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(f.seen().cookie, undefined);
  assert.equal(f.seen().authorization, undefined);
  assert.equal(f.seen()["x-forwarded-host"], undefined);
  assert.equal((await fetch(f.origin + "/studio", { headers: { Cookie: `${cookie}; ${cookie}` } })).status, 403);
  const preview = await fetch(f.origin + "/studio/api/preview-url?page=%2F", { headers: { Cookie: cookie } });
  assert.deepEqual(await preview.json(), { url: "/#avb-design", origin: f.origin });
  for (const method of ["GET", "POST"]) {
    assert.equal((await fetch(f.origin + "/studio/api/session", {
      method, headers: { Cookie: cookie, Origin: "https://evil.example" },
    })).status, 403);
  }
  assert.equal((await fetch(f.origin + "/studio/api/session", {
    method: "POST", headers: { Cookie: cookie },
  })).status, 403);
  assert.equal((await fetch(f.origin + "/studio/api/session", {
    method: "POST", headers: { Cookie: cookie, Origin: f.origin }, body: "change",
  })).status, 200);
  f.gateway.revoke();
  assert.equal((await fetch(f.origin + "/studio", { headers: { Cookie: cookie } })).status, 403);
});

function upgrade(origin: string, headers: Record<string, string>) {
  return new Promise<{ status: number; socket?: import("node:stream").Duplex }>((resolve, reject) => {
    const req = request(origin + "/studio/ws", { headers: {
      Connection: "Upgrade", Upgrade: "websocket", "Sec-WebSocket-Key": "test", "Sec-WebSocket-Version": "13", ...headers,
    } });
    req.on("upgrade", (res, socket) => resolve({ status: res.statusCode!, socket }));
    req.on("response", res => { res.resume(); resolve({ status: res.statusCode! }); });
    req.on("error", reject); req.end();
  });
}

test("WebSocket needs cookie AND same origin; revocation closes a live tunnel", async t => {
  const f = await fixture(t);
  const cookie = (await f.redeem()).headers.get("set-cookie")!.split(";")[0];
  assert.equal((await upgrade(f.origin, { Origin: f.origin })).status, 403);
  assert.equal((await upgrade(f.origin, { Cookie: cookie, Origin: "https://evil.example" })).status, 403);
  assert.equal((await upgrade(f.origin, { Cookie: cookie })).status, 403);
  const connection = await upgrade(f.origin, { Cookie: cookie, Origin: f.origin });
  assert.equal(connection.status, 101);
  assert.equal(f.seen().cookie, undefined);
  const echo = new Promise<Buffer>(resolve => connection.socket!.once("data", resolve));
  connection.socket!.write("collaboration");
  assert.equal((await echo).toString(), "collaboration");
  const closed = new Promise<void>(resolve => connection.socket!.once("close", resolve));
  f.gateway.revoke();
  await closed;
});

test("session expiry rejects previously authenticated requests", async t => {
  const f = await fixture(t, 150);
  const cookie = (await f.redeem()).headers.get("set-cookie")!.split(";")[0];
  await new Promise(resolve => setTimeout(resolve, 180));
  assert.equal((await fetch(f.origin + "/studio", { headers: { Cookie: cookie } })).status, 403);
});

test("a cookie for a different editor session cannot open this session", async t => {
  const first = await fixture(t);
  const second = await fixture(t);
  const cookie = (await first.redeem()).headers.get("set-cookie")!.split(";")[0];
  await second.redeem();
  assert.equal((await fetch(second.origin + "/studio", { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await upgrade(second.origin, { Cookie: cookie, Origin: second.origin })).status, 403);
});

test("hosted mode issues a secure host-only cookie behind the TLS proxy", async t => {
  const ticket = randomBytes(32).toString("base64url");
  const gateway = createStackiEditorGateway({
    publicOrigin: "https://editor.example", upstreamPort: 4321,
    entryTicket: ticket, expiresAt: Date.now() + 60_000,
  });
  await gateway.listen(0);
  t.after(() => gateway.close());
  const port = (gateway.server.address() as AddressInfo).port;
  const response = await new Promise<{ status: number; cookie: string }>((resolve, reject) => {
    const req = request(`http://127.0.0.1:${port}/__gnr8/enter`, {
      method: "POST",
      headers: { Host: "editor.example", Origin: "https://editor.example", "Content-Type": "text/plain;charset=UTF-8" },
    }, res => { res.resume(); resolve({ status: res.statusCode!, cookie: res.headers["set-cookie"]?.[0] ?? "" }); });
    req.on("error", reject); req.end(ticket);
  });
  assert.equal(response.status, 200);
  const cookie = response.cookie;
  assert.match(cookie, /^__Host-gnr8-stacki=/);
  assert.match(cookie, /; Secure$/);
  assert(!cookie.includes("Domain="));
  assert.equal((await fetch(`http://127.0.0.1:${port}/studio`, {
    headers: { Cookie: cookie.split(";")[0] },
  })).status, 403, "unrecognized Host is rejected even with a valid cookie");
});

test("unsafe hosted configuration fails before a server starts", () => {
  const valid = { publicOrigin: "https://editor.example", upstreamPort: 4321,
    entryTicket: randomBytes(32).toString("base64url"), expiresAt: Date.now() + 60_000 };
  for (const patch of [
    { publicOrigin: "http://editor.example", allowLocalHttp: true },
    { publicOrigin: "https://editor.example/path" }, { entryTicket: "short" },
    { upstreamPort: 0 }, { expiresAt: Date.now() - 1 },
    { expiresAt: Date.now() + STACKI_SESSION_MAX_MS + 60_000 },
  ]) assert.throws(() => createStackiEditorGateway({ ...valid, ...patch }), /CONFIG_INVALID/);
});
