import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ASTRO_CANDIDATE_PERSISTENCE_RESULT_MARKER,
  runAstroCandidatePersistenceProof,
  runAstroCandidatePersistenceReader,
  runAstroCandidatePersistenceWriter,
} from "./astro-candidate-persistence-proof";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const command = argv[0] ?? "run";
  const controller = new AbortController();
  const interrupt = () => controller.abort(new Error("interrupt_signal_received"));
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    if (command === "run") {
      const evidence = await runAstroCandidatePersistenceProof({ signal: controller.signal });
      process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
      return;
    }
    if (command === "writer") {
      const storageRoot = requiredPath(argv[1], "storage root");
      const workspaceRoot = requiredPath(argv[2], "workspace root");
      const evidence = await runAstroCandidatePersistenceWriter({
        storageRoot,
        workspaceRoot,
        signal: controller.signal,
      });
      writeChildResult(evidence);
      return;
    }
    if (command === "reader") {
      const storageRoot = requiredPath(argv[1], "storage root");
      const sourceWorkspacePath = requiredPath(argv[2], "source workspace path");
      const evidence = await runAstroCandidatePersistenceReader({
        storageRoot,
        sourceWorkspacePath,
        signal: controller.signal,
      });
      writeChildResult(evidence);
      return;
    }
    throw new Error(`Unknown command: ${command}`);
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
}

function requiredPath(value: string | undefined, label: string): string {
  if (!value) throw new Error(`Astro persistence proof ${label} is required.`);
  return resolve(value);
}

function writeChildResult(value: unknown): void {
  const encoded = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  process.stdout.write(`${ASTRO_CANDIDATE_PERSISTENCE_RESULT_MARKER}${encoded}\n`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${String(error instanceof Error ? error.stack ?? error.message : error)}\n`);
    process.exitCode = 1;
  });
}
