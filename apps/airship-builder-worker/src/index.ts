import { readAirshipBuilderWorkerConfig } from "./config.js";
import { createAirshipBuilderWorkerServer } from "./server.js";

const configReadback = readAirshipBuilderWorkerConfig();
const server = createAirshipBuilderWorkerServer({ configReadback });

server.listen(configReadback.config.port, configReadback.config.host, () => {
  process.stdout.write(
    `[airship-builder-worker] ${JSON.stringify({
      event: "server_started",
      host: configReadback.config.host,
      port: configReadback.config.port,
      workerId: configReadback.config.workerId,
      runtimeExecution: configReadback.config.noRuntimeExecution ? "disabled" : "enabled_but_unimplemented",
    })}\n`,
  );
});

function shutdown(signal: NodeJS.Signals): void {
  process.stdout.write(`[airship-builder-worker] ${JSON.stringify({ event: "shutdown_requested", signal })}\n`);
  server.close(() => {
    process.stdout.write(`[airship-builder-worker] ${JSON.stringify({ event: "server_stopped", signal })}\n`);
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
