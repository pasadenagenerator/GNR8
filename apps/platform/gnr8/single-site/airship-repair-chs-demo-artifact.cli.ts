import "server-only";

import { getSuperadminPool } from "../../src/superadmin/db";
import { repairAirshipChsDemoArtifact } from "./airship-chs-demo-artifact-repair";

const ACTOR = "superadmin:mvp-recovery-10";
const IDEMPOTENCY_KEY = "mvp-recovery-10-chs-airship-demo-render-repair-2026-09-15";

async function main() {
  const output = await repairAirshipChsDemoArtifact({
    actor: ACTOR,
    idempotencyKey: IDEMPOTENCY_KEY,
  });

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.DATABASE_URL) await getSuperadminPool().end().catch(() => undefined);
  });
