import { createProviderHandoffReadinessDevSeed } from "@/gnr8/runtime/providers/provider-handoff-readiness-dev-seed";

async function main(): Promise<void> {
  const seed = await createProviderHandoffReadinessDevSeed();
  process.stdout.write(
    `${JSON.stringify({
      label: seed.label,
      handoffId: seed.handoffId,
      readinessUiPath: seed.readinessUiPath,
      reusedExisting: seed.reusedExisting,
      correlationKey: seed.correlationKey,
      executionBlocked: seed.workerPickupEvidence.executionBlocked,
      nextAllowedAction: seed.workerPickupEvidence.nextAllowedAction,
    })}\n`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  process.stderr.write(`provider-handoff-readiness-dev-seed failed: ${message}\n`);
  process.exitCode = 1;
});
