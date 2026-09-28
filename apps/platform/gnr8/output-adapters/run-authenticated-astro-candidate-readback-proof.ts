import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runAuthenticatedAstroCandidateReadbackProof } from "./authenticated-astro-candidate-readback-proof";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const command = argv[0] ?? "run";
  if (command !== "run") throw new Error(`Unknown command: ${command}`);
  const evidence = await runAuthenticatedAstroCandidateReadbackProof();
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${String(error instanceof Error ? error.stack ?? error.message : error)}\n`);
    process.exitCode = 1;
  });
}
