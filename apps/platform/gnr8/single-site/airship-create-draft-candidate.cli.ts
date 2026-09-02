import "server-only";

import { getSuperadminPool } from "@/src/superadmin/db";
import { AirshipSingleSiteDraftService } from "./airship-single-site-draft-service";
import { createAirshipSingleSiteDraftCandidate } from "./airship-single-site-draft-candidate-service";

const EXPECTED_MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const EXPECTED_DRAFT_ID = "f9b31666-b3b0-4455-8650-4a8c7304a559";
const EXPECTED_DRAFT_VERSION = 5;
const EXPECTED_LIVE_SITE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const EXPECTED_LIVE_ARTIFACT_ID = "1f80138a-39c2-4210-ac61-16200e5a2254";

async function main() {
  const draft = await new AirshipSingleSiteDraftService().readCurrentDraft(EXPECTED_MIGRATION_ID);
  if (!draft) throw new Error("airship_saved_draft_not_found");
  if (draft.id !== EXPECTED_DRAFT_ID) throw new Error(`airship_draft_id_mismatch:${draft.id}`);
  if (draft.version !== EXPECTED_DRAFT_VERSION) throw new Error(`airship_draft_version_mismatch:${draft.version}`);

  const output = await createAirshipSingleSiteDraftCandidate({
    draft,
    actor: "superadmin:airship-4",
    sourceLiveSiteVersionId: EXPECTED_LIVE_SITE_VERSION_ID,
    sourceLiveRuntimeArtifactId: EXPECTED_LIVE_ARTIFACT_ID,
  });

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getSuperadminPool().end().catch(() => undefined);
  });
