import { createRenderedCaptureWorkerServer } from "./server";

function normalizePort(raw: string | undefined): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 3001;
  const port = Math.floor(value);
  if (port < 1 || port > 65535) return 3001;
  return port;
}

const host = process.env.HOST?.trim() || "0.0.0.0";
const port = normalizePort(process.env.PORT);

const server = createRenderedCaptureWorkerServer();

server.listen(port, host, () => {
  process.stdout.write(`[gnr8-rendered-capture-worker] listening on http://${host}:${port}\n`);
});
