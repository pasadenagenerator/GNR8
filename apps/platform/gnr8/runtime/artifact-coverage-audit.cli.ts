import { runArtifactCoverageAudit } from "@/gnr8/runtime/artifact-coverage-audit";

function readArg(flag: string): string | null {
  const prefix = `--${flag}=`;
  const entry = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!entry) return null;
  const value = entry.slice(prefix.length).trim();
  return value.length > 0 ? value : null;
}

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(`--${flag}`);
}

function printHumanSummary(report: Awaited<ReturnType<typeof runArtifactCoverageAudit>>): void {
  console.log("GNR8 Artifact Coverage Audit");
  console.log(
    `hosts=${report.totals.hosts} ready=${report.totals.artifactOnlyReadyHosts} fallbackResolution=${report.totals.hostsWithFallbackResolution} missingRoot=${report.totals.hostsWithMissingRootPath} missingKnownPaths=${report.totals.hostsWithMissingKnownPaths} noActivePointer=${report.totals.hostsWithNoActivePointer}`,
  );

  for (const host of report.hosts) {
    const readiness = host.artifactOnlyReady ? "READY" : "NOT_READY";
    const missingPaths = host.artifactOnlyWouldFailPaths.length > 0 ? host.artifactOnlyWouldFailPaths.join(",") : "-";
    const reasons = host.reasonCodes.length > 0 ? host.reasonCodes.join(",") : "-";
    console.log(
      [
        `host=${host.host}`,
        `readiness=${readiness}`,
        `risk=${host.fallbackDependenceRisk}`,
        `siteResolution=${host.siteResolution}`,
        `pointer=${host.activePointerExists ? "yes" : "no"}`,
        `artifact=${host.activeArtifactExists ? "yes" : "no"}`,
        `root=${host.rootPathCovered ? "yes" : "no"}`,
        `knownPaths=${host.knownPaths.length}`,
        `missingKnownPaths=${host.missingKnownPaths.length}`,
        `artifactOnlyFailPaths=${missingPaths}`,
        `reasonCodes=${reasons}`,
      ].join(" "),
    );
  }
}

async function main(): Promise<void> {
  const host = readArg("host");
  const jsonOnly = hasFlag("json");

  const report = await runArtifactCoverageAudit({ host });
  console.log(`[gnr8.runtime.coverage-audit] ${JSON.stringify(report)}`);
  if (!jsonOnly) printHumanSummary(report);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[gnr8.runtime.coverage-audit.error] ${message}`);
  process.exitCode = 1;
});
