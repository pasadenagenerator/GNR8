import assert from "node:assert/strict";
import test from "node:test";

import { readAirshipBuilderWorkerConfig } from "../src/config.js";

test("reads conservative defaults with runtime execution disabled", () => {
  const readback = readAirshipBuilderWorkerConfig({});

  assert.equal(readback.config.workerId, "airship-builder-worker-local");
  assert.equal(readback.config.port, 3002);
  assert.equal(readback.config.maxConcurrentSessions, 1);
  assert.equal(readback.config.sessionTtlSeconds, 1800);
  assert.equal(readback.config.noRuntimeExecution, true);
  assert.match(readback.diagnostics.join("\n"), /Runtime execution is disabled/);
});

test("reads explicit VPS worker configuration", () => {
  const readback = readAirshipBuilderWorkerConfig({
    GNR8_AIRSHIP_BUILDER_WORKER_ID: "vps-worker-01",
    GNR8_AIRSHIP_BUILDER_WORKER_DISPLAY_NAME: "VPS worker 01",
    HOST: "127.0.0.1",
    PORT: "3999",
    GNR8_AIRSHIP_BUILDER_PUBLIC_BASE_URL: "https://airship-builder.example.test",
    GNR8_AIRSHIP_CONTROL_PLANE_BASE_URL: "https://app.example.test",
    GNR8_AIRSHIP_BUILDER_WORKSPACE_ROOT: "/srv/gnr8-airship/sessions",
    GNR8_AIRSHIP_BUILDER_MAX_CONCURRENT_SESSIONS: "2",
    GNR8_AIRSHIP_BUILDER_SESSION_TTL_SECONDS: "1200",
    GNR8_AIRSHIP_BUILDER_HEARTBEAT_INTERVAL_SECONDS: "15",
    GNR8_AIRSHIP_BUILDER_HEARTBEAT_STALE_SECONDS: "60",
    GNR8_AIRSHIP_CLI_VERSION: "1.2.3",
  });

  assert.equal(readback.config.workerId, "vps-worker-01");
  assert.equal(readback.config.port, 3999);
  assert.equal(readback.config.maxConcurrentSessions, 2);
  assert.equal(readback.config.airshipCliVersion, "1.2.3");
  assert.deepEqual(readback.diagnostics, ["Runtime execution is disabled; session start/capture routes must remain inert."]);
});
