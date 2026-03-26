import path from "node:path";

import { runOwnershipBackfillActivation } from "@/gnr8/runtime/ownership-backfill-activation";

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(`--${flag}`);
}

function readArg(flag: string): string | null {
  const prefix = `--${flag}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!found) return null;
  const value = found.slice(prefix.length).trim();
  return value.length > 0 ? value : null;
}

async function main(): Promise<void> {
  const apply = hasFlag("apply");
  const jsonOnly = hasFlag("json");
  const reportPath = readArg("report") ?? path.resolve(process.cwd(), "gnr8/platform-audits/ownership-backfill-activation-report.md");

  const result = await runOwnershipBackfillActivation({
    dryRun: !apply,
    reportPath,
  });

  console.log(`[gnr8.ownership.backfill] ${JSON.stringify(result)}`);

  if (jsonOnly) return;

  console.log("GNR8 Ownership Backfill Activation");
  console.log(`mode=${result.dryRun ? "dry-run" : "apply"} report=${result.reportPath}`);
  console.log(
    [
      `versionsScanned=${result.totals.runtimeSiteVersionsScanned}`,
      `sitesCreated=${result.totals.sitesCreated}`,
      `ownershipBindings=${result.totals.ownershipSiteBindingsApplied}`,
      `migrationJobsBackfilled=${result.totals.migrationJobsBackfilled}`,
      `unresolved=${result.totals.unresolvedRecords}`,
    ].join(" "),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[gnr8.ownership.backfill.error] ${message}`);
  process.exitCode = 1;
});
