import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ASTRO_CANDIDATE_READBACK_OUTPUT_DIRECTORY,
  finalizeAstroCandidateReadback,
  runAstroCandidateReadback,
  startAstroCandidateReadbackServer,
} from "./astro-candidate-readback";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const command = argv[0] ?? "run";
  const outputDirectory = resolve(argv[1] ?? ASTRO_CANDIDATE_READBACK_OUTPUT_DIRECTORY);
  if (command === "run") {
    const controller = new AbortController();
    const interrupt = () => controller.abort(new Error("interrupt_signal_received"));
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", interrupt);
    try {
      const evidence = await runAstroCandidateReadback({ outputDirectory, signal: controller.signal });
      process.stdout.write(`${JSON.stringify({ outputDirectory, readiness: evidence.readiness }, null, 2)}\n`);
    } finally {
      process.removeListener("SIGINT", interrupt);
      process.removeListener("SIGTERM", interrupt);
    }
    return;
  }
  if (command === "serve") {
    const handle = await startAstroCandidateReadbackServer(outputDirectory);
    process.stdout.write(`${JSON.stringify({ url: handle.url, outputDirectory })}\n`);
    const close = async () => {
      if (handle.server.listening) await handle.close();
    };
    process.once("SIGINT", () => void close().finally(() => process.exit(0)));
    process.once("SIGTERM", () => void close().finally(() => process.exit(0)));
    await new Promise<void>(() => undefined);
    return;
  }
  if (command === "finalize") {
    const evidence = await finalizeAstroCandidateReadback(outputDirectory);
    process.stdout.write(`${JSON.stringify({ outputDirectory, readiness: evidence.readiness }, null, 2)}\n`);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${String(error instanceof Error ? error.stack ?? error.message : error)}\n`);
    process.exitCode = 1;
  });
}
