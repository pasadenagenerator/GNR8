import "server-only";

import { getSuperadminPool } from "../../src/superadmin/db";
import { refreshAirshipDemoArtifactSectionMarkers } from "./airship-demo-artifact-section-marker-repair";

const ACTOR = "superadmin:airship-editor-02e";
const IDEMPOTENCY_KEY = "airship-editor-02e-existing-demo-artifact-section-markers-2026-09-17";

async function main() {
  const output = await refreshAirshipDemoArtifactSectionMarkers({
    actor: ACTOR,
    idempotencyKey: IDEMPOTENCY_KEY,
  });

  process.stdout.write(`${JSON.stringify({
    serviceVersion: output.serviceVersion,
    targets: output.targets,
  }, null, 2)}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.DATABASE_URL) await getSuperadminPool().end().catch(() => undefined);
  });
