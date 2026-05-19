import { validateProviderControlPlaneDbReadiness } from "@/gnr8/runtime/providers/provider-control-plane-db-readiness";

async function main(): Promise<void> {
  const report = await validateProviderControlPlaneDbReadiness();
  process.stdout.write(`${JSON.stringify(report)}\n`);
  process.exitCode = report.status === "ready" ? 0 : 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  process.stderr.write(`provider-control-plane-db-readiness failed: ${message}\n`);
  process.exitCode = 1;
});
